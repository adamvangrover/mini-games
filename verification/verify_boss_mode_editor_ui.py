from playwright.sync_api import sync_playwright, expect
import time
import sys

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

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
        time.sleep(1)

        print("Opening Code Editor...")
        page.evaluate("BossMode.instance.openApp('code-editor')")
        expect(page.locator("#code-input")).to_be_visible(timeout=5000)

        print("Running valid code to generate logs...")
        valid_code = """
        console.log("Hello Security World");
        console.warn("This is a warning");
        console.error("This is an error");
        """

        page.evaluate(f"""
            window.BossModeEditor.activeFile.content = `{valid_code}`;
            window.BossModeEditor.runCode();
        """)

        # Wait for logs
        time.sleep(2)

        # Take screenshot
        screenshot_path = "verification/boss_mode_editor_fix.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()
        return screenshot_path

if __name__ == "__main__":
    try:
        verify_ui()
    except Exception as e:
        print(f"Script failed with error: {e}")
        sys.exit(1)
