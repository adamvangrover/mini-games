from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        print("Navigating to app...")
        page.goto("http://localhost:8080")

        # Handle loader
        try:
            page.wait_for_selector("#app-loader", state="visible", timeout=5000)
            page.click("#app-loader")
            page.wait_for_selector("#app-loader", state="hidden", timeout=5000)
        except Exception as e:
            print("Loader issue (ignored):", e)

        # Switch to Grid View
        try:
            page.click("#view-toggle-btn")
        except:
            pass

        # Find and click game
        print("Starting Neon Hunter 64...")
        page.locator("text=Neon Hunter 64").first.click()

        # Wait for game menu
        page.wait_for_selector("#neon-hunter h1:has-text('NEON HUNTER 64')", state="visible", timeout=5000)

        # Take screenshot of menu
        page.screenshot(path="verification/neon_hunter_menu.png")
        print("Menu screenshot taken.")

        # Start Deer Hunt
        print("Starting Deer Hunt mode...")
        page.click("button[data-mode='deer']")

        # Check HUD
        page.wait_for_selector("#nh-score", state="visible", timeout=2000)

        # Wait for scene to render
        page.wait_for_timeout(2000)

        # Screenshot gameplay
        page.screenshot(path="verification/neon_hunter_deer.png")
        print("Gameplay screenshot taken.")

        browser.close()

if __name__ == "__main__":
    run()
