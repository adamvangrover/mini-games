from playwright.sync_api import sync_playwright, expect
import time
import sys

def verify_fix():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture browser console logs
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Browser Error: {err}"))

        print("Navigating to app...")
        try:
            page.goto("http://localhost:8000", timeout=10000)
            page.wait_for_load_state("domcontentloaded", timeout=10000)
        except Exception as e:
            print(f"Navigation error: {e}")

        # Handle loader
        try:
            loader = page.locator("#app-loader")
            if loader.is_visible():
                print("Clicking loader...")
                loader.click()
                time.sleep(1)
        except:
            pass

        print("Forcing Boss Mode Desktop...")
        page.evaluate("""
            if(window.BossMode && window.BossMode.instance) {
                window.BossMode.instance.systemState = 'desktop';
                window.BossMode.instance.toggle(true);
            }
        """)

        # Wait for overlay
        expect(page.locator("#boss-mode-overlay")).to_be_visible(timeout=5000)

        # Wait for desktop to be ready
        time.sleep(1)

        print("Opening Code Editor...")
        page.evaluate("BossMode.instance.openApp('code-editor')")

        # Wait for editor input area
        expect(page.locator("#code-input")).to_be_visible(timeout=5000)

        print("Injecting test code...")
        test_code = """
        try {
            window.rce_attempt = true;
        } catch(e) {
            console.log("Blocked window access");
        }
        console.log("Valid Log Entry");
        """

        # Set content directly via BossModeEditor instance
        page.evaluate(f"""
            if (window.BossModeEditor) {{
                window.BossModeEditor.activeFile.content = `{test_code}`;
                window.BossModeEditor.runCode();
            }} else {{
                console.error("BossModeEditor not found on window");
            }}
        """)

        # Wait for async worker execution - Increased wait time
        time.sleep(5)

        print("Checking for Main Thread Pollution...")
        rce_success = page.evaluate("window.rce_attempt")

        if rce_success:
            print("🚨 FAIL: window.rce_attempt is true! Code ran in main thread.")
            return False
        else:
            print("✅ PASS: window.rce_attempt is undefined. Code isolated.")

        # Check logs
        logs = page.evaluate("window.BossModeEditor ? window.BossModeEditor.consoleOutput : []")

        blocked_log = any("Blocked window access" in log['text'] for log in logs)
        valid_log = any("Valid Log Entry" in log['text'] for log in logs)

        if blocked_log:
             print("✅ PASS: Error caught (window access blocked).")
        else:
             print("⚠️  Warning: 'Blocked window access' log not found. Did it fail to throw?")

        if valid_log:
             print("✅ PASS: Normal console.log works.")
        else:
             print("🚨 FAIL: Normal console.log did not appear.")
             print("Logs:", logs)
             return False

        browser.close()
        return True

if __name__ == "__main__":
    try:
        success = verify_fix()
        if success:
            sys.exit(0)
        else:
            sys.exit(1)
    except Exception as e:
        print(f"Script failed with error: {e}")
        sys.exit(1)
