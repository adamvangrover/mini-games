from playwright.sync_api import sync_playwright

def verify_hub():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Attach listeners for console and errors
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        print("Navigating to index.html...")
        page.goto("http://localhost:8000/index.html")

        try:
            page.wait_for_selector("#app-loader", state="detached", timeout=5000)
        except:
             print("Loader timeout, checking if menu is visible anyway.")

        # Switch to Grid View
        print("Switching to Grid View...")
        try:
            # Force click or evaluate
            page.click("#view-toggle-btn", force=True)
        except Exception as e:
            print(f"Click failed: {e}")
            
        page.wait_for_selector("#menu-grid", state="visible", timeout=2000)

        # Check if grid has items
        count = page.evaluate("document.querySelectorAll('#menu-grid > div').length")
        print(f"Grid items found: {count}")

        if count == 0:
            print("ERROR: Grid is empty!")
        else:
            print("Grid populated successfully.")
            page.screenshot(path="verification/grid_view.png")

        browser.close()

if __name__ == "__main__":
    verify_hub()
