from playwright.sync_api import sync_playwright, expect
import time
import sys

def verify_fix():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:8000")

        print("Clicking loader...")
        try:
            page.locator("#app-loader").click(timeout=3000)
        except:
            print("Loader not found or already gone.")

        time.sleep(1)

        print("Opening Boss Mode...")
        page.keyboard.down("Alt")
        page.keyboard.press("b")
        page.keyboard.up("Alt")

        expect(page.locator("#boss-mode-overlay")).to_be_visible(timeout=5000)

        print("Forcing Desktop State via JS...")
        page.evaluate("""
            BossMode.instance.user.password = '123';
            BossMode.instance.login();
        """)

        time.sleep(1)

        print("Opening Code Editor...")
        page.evaluate("BossMode.instance.openApp('code-editor')")
        expect(page.locator("#code-input")).to_be_visible(timeout=5000)

        print("Injecting test code...")
        # Inject code that prints to console (check functionality) AND tries to set localStorage (check security)
        # Note: In Worker, window is not defined, so window.localStorage will throw error.
        # We wrap it in try-catch or just let it fail silently (it shouldn't set the item).
        # Actually, if we just execute it, it will throw "window is not defined" which catches in the worker error handler.
        # So we should try to access self.localStorage or just try to break out.
        # But for this specific RCE which relied on 'window' being the main window:

        test_code = "console.log('Safe Hello World'); try { window.localStorage.setItem('rce_proof', 'vulnerable'); } catch(e) { console.log('Access Denied'); }"

        page.evaluate(f"""
            if (window.BossModeEditor) {{
                window.BossModeEditor.activeFile.content = "{test_code}";
                window.BossModeEditor.render();
            }} else {{
                console.error("BossModeEditor not found");
            }}
        """)

        print("Running code...")
        page.locator("button[title='Run Code (F5)']").click()

        # Verify Functionality: Check if console log appears in the output
        print("Verifying console output...")
        # The output is in #editor-console. We look for text "Safe Hello World"
        expect(page.locator("#editor-console")).to_contain_text("Safe Hello World", timeout=5000)
        print("SUCCESS: Console output verified.")

        # Verify Security: Check localStorage
        print("Verifying localStorage...")
        proof = page.evaluate("window.localStorage.getItem('rce_proof')")

        if proof == 'vulnerable':
            print("FAILURE: LocalStorage WAS accessed. Vulnerability persists.")
            sys.exit(1)
        else:
            print("SUCCESS: LocalStorage was NOT accessed. Vulnerability fixed.")

        browser.close()

if __name__ == "__main__":
    verify_fix()
