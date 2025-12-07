from playwright.sync_api import sync_playwright

def verify_games():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Load the Hub
        print("Loading Main Menu...")
        page.goto("http://localhost:8000/index.html")
        page.wait_for_timeout(2000)

        # Switch to grid view if needed
        if "3D View" in page.content():
            # We are in 2D view already? Or toggle says "3D View"?
            # If default is 3D, toggle says "Grid View".
            # The code says default is 3D.
            # Let's try to click "Grid View" if it exists, or just force the grid visible via JS
            pass

        # Click toggle view button to ensure Grid is visible
        # Button ID: view-toggle-btn
        page.click('#view-toggle-btn')
        page.wait_for_timeout(1000)

        # Screenshot Menu
        page.screenshot(path="verification/menu.png")
        print("Menu screenshot taken.")

        # 2. Test Neon Golf
        print("Testing Neon Golf...")
        # Find Neon Golf card
        # Logic: transitionToState(AppState.IN_GAME, { gameId: 'neon-golf' })
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-golf' })")
        page.wait_for_timeout(1000)
        page.screenshot(path="verification/neon_golf.png")
        print("Neon Golf screenshot taken.")

        # Go Back
        page.evaluate("window.miniGameHub.goBack()")
        page.wait_for_timeout(1000)

        # 3. Test Neon Hoops
        print("Testing Neon Hoops...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-hoops' })")
        page.wait_for_timeout(1000)
        page.screenshot(path="verification/neon_hoops.png")
        print("Neon Hoops screenshot taken.")

        # Go Back
        page.evaluate("window.miniGameHub.goBack()")
        page.wait_for_timeout(1000)

        # 4. Test Neon Shooter
        print("Testing Neon Shooter...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-shooter' })")
        page.wait_for_timeout(2000) # Give Three.js time to init
        page.screenshot(path="verification/neon_shooter.png")
        print("Neon Shooter screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_games()
