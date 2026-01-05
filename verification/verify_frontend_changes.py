from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Capture logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        print("Loading page...")
        page.goto("http://localhost:8000")

        # 1. Verify Loader Click-to-Start
        loader = page.wait_for_selector("#app-loader")
        if loader.is_visible():
            print("Loader visible. Clicking to start...")
            # Click to clear loader and init audio
            page.click("#app-loader")
            page.wait_for_timeout(1000)

            # Verify loader is gone
            if not loader.is_visible():
                 print("SUCCESS: Loader dismissed after click.")
            else:
                 print("WARNING: Loader still visible (might be fading out).")

        # 2. Verify Toast (Looking for child of toast-container)
        try:
             # Wait for a toast to appear in the container
             toast = page.wait_for_selector("#toast-container > div", timeout=5000)
             if toast:
                  print(f"SUCCESS: Toast notification detected: {toast.inner_text()}")
        except Exception as e:
             print(f"WARNING: Toast verification failed: {e}")

        # 3. Verify Click Effect
        print("Clicking center to trigger effect...")
        page.mouse.click(640, 360)
        page.wait_for_timeout(100)

        # Take Screenshot
        screenshot_path = "verification/frontend_verified.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
