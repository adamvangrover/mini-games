from playwright.sync_api import sync_playwright

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")

        # Wait for the main UI to load
        page.wait_for_timeout(2000)

        # Launch the game directly via console evaluation
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'property-tycoon' })")

        # Give the game a bit of time to transition and render
        page.wait_for_timeout(3000)

        # Take a screenshot to verify UI is rendering
        page.screenshot(path="verification/verify_property_tycoon.png")
        print("Property Tycoon loaded successfully and screenshot captured.")

        browser.close()

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        print(f"Error testing Property Tycoon: {e}")
        exit(1)
