from playwright.sync_api import sync_playwright

def verify_hub():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000/index.html")

        # Wait for canvas to be present
        page.wait_for_selector("#bg-canvas")

        # Wait for menu to be hidden (since 3D view is default)
        # Actually #menu-grid is hidden, but #menu container is visible
        page.wait_for_timeout(3000) # Give 3D scene time to render

        # Take screenshot of the 3D view
        page.screenshot(path="verification/hub_3d.png")

        # Click the toggle button
        page.click("#view-toggle-btn")
        page.wait_for_timeout(1000)

        # Take screenshot of the Grid view
        page.screenshot(path="verification/hub_grid.png")

        browser.close()

if __name__ == "__main__":
    verify_hub()
