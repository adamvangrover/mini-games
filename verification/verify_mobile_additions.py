from playwright.sync_api import sync_playwright

def verify_new_mobile_games():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a mobile viewport to test touch readiness if possible, though click works for mouse events
        context = browser.new_context(viewport={'width': 412, 'height': 915})
        page = context.new_page()

        # 1. Load the Hub
        print("Loading Main Menu...")
        page.goto("http://localhost:8000/index.html")
        page.wait_for_timeout(2000)

        # Force Grid View for easier selection or just use direct JS transition
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-jump' })")
        page.wait_for_timeout(1000)

        # Verify Neon Jump canvas exists
        if page.query_selector('#neon-jump canvas'):
            print("Neon Jump loaded successfully.")
        else:
            print("ERROR: Neon Jump canvas not found.")

        page.screenshot(path="verification/neon_jump.png")

        # Go Back
        page.evaluate("window.miniGameHub.goBack()")
        page.wait_for_timeout(1000)

        # Test Neon Slice
        print("Testing Neon Slice...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-slice' })")
        page.wait_for_timeout(1000)

        # Verify Neon Slice canvas exists
        if page.query_selector('#neon-slice canvas'):
            print("Neon Slice loaded successfully.")
        else:
            print("ERROR: Neon Slice canvas not found.")

        page.screenshot(path="verification/neon_slice.png")

        browser.close()

if __name__ == "__main__":
    verify_new_mobile_games()
