from playwright.sync_api import sync_playwright, expect
import time

def verify_changes(page):
    # Navigate to the app
    page.goto("http://localhost:8000/index.html")

    # Wait for the loader to be visible and click to start
    loader = page.locator("#app-loader")
    expect(loader).to_be_visible()
    page.mouse.click(100, 100) # Click anywhere to start

    # Wait for initialization (Daily Login Toast might appear)
    time.sleep(3)

    # Take screenshot of Main Hub with Ambient Particles (hard to see in static shot, but we check if loaded)
    page.screenshot(path="verification/hub_ambient.png")
    print("Screenshot taken: hub_ambient.png")

    # Switch to Grid View to see Menu
    page.evaluate("window.miniGameHub.transitionToState('MENU')")
    time.sleep(1)

    # Verify Store Descriptions
    # Open Store
    page.evaluate("window.miniGameHub.showToast('Checking Store...')")
    page.locator("#shop-btn-menu").click(force=True)
    time.sleep(1)
    page.screenshot(path="verification/store_descriptions.png")
    print("Screenshot taken: store_descriptions.png")

    # Close Store
    page.locator("#store-close-btn").click()
    time.sleep(0.5)

    # Verify Game Over Titles (Simulate)
    page.evaluate("window.miniGameHub.showGameOver(100)")
    time.sleep(1)
    page.screenshot(path="verification/game_over_title.png")
    print("Screenshot taken: game_over_title.png")

    # Verify Daily Login (Check logs or Toast presence)
    # We can't easily verify the toast history, but the screenshot might catch it if timed right.

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_changes(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
