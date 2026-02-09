from playwright.sync_api import sync_playwright, expect
import time

def verify_csp():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        csp_violations = []
        page.on("console", lambda msg: csp_violations.append(msg.text) if "Content Security Policy" in msg.text else None)

        # Also catch page errors
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))

        print("Navigating to app...")
        response = page.goto("http://localhost:8000")

        print("Checking for immediate CSP violations...")
        time.sleep(2)

        if csp_violations:
            print("CSP Violations found on load:")
            for v in csp_violations: print(v)

        print("Clicking loader...")
        try:
            page.locator("#app-loader").click(timeout=3000)
        except:
            pass
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

        print("Opening Code Editor (Worker Test)...")
        page.evaluate("BossMode.instance.openApp('code-editor')")
        # Target the window title specifically to avoid ambiguity with desktop icon
        expect(page.locator(".window-bar >> text=Neon Code")).to_be_visible()

        # Test Worker Execution
        print("Running code in editor...")
        page.locator("button[title='Run Code (F5)']").click()

        time.sleep(2)
        expect(page.locator("#editor-console")).to_contain_text("Done in", timeout=5000)

        if csp_violations:
            print("FAILURE: CSP Violations detected.")
            for v in csp_violations: print(v)
            # exit(1) # Don't exit yet, let's see them
        else:
            print("SUCCESS: No CSP violations detected.")

        browser.close()

if __name__ == "__main__":
    verify_csp()
