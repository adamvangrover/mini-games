from playwright.sync_api import sync_playwright

def verify_neon_city():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the game hub
        try:
            page.goto("http://localhost:8000/index.html", timeout=10000)
        except Exception as e:
            print(f"Navigation timed out or failed: {e}")

        # Wait for something basic to ensure load
        page.wait_for_selector("#menu", state="attached")

        # Switch to Grid View to find the game easily
        page.evaluate("window.miniGameHub.transitionToState('MENU')")

        # Click on Neon City
        # We can simulate the transition directly to be safe and fast
        print("Launching Neon City...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-city-game' })")

        # Wait for game container to be visible
        page.wait_for_selector("#neon-city-game")

        # Wait a bit for game init and canvas render
        page.wait_for_timeout(2000)

        # Take screenshot of the game running
        page.screenshot(path="verification/neon_city_game.png")
        print("Screenshot taken: neon_city_game.png")

        # Test Interaction
        # Let's try to trigger the Ad manually to verify AdManager
        print("Triggering Ad...")
        page.evaluate("window.miniGameHub.saveSystem.addCurrency(100)") # Ensure we have currency just in case
        page.evaluate("""
            (async () => {
                const AdsManager = (await import('./js/core/AdsManager.js')).default;
                // Ensure singleton or new instance
                const instance = AdsManager.getInstance ? AdsManager.getInstance() : new AdsManager();
                // showAd is the method name in main.js usage, let's try showAd or showInterstitial
                // Based on main.js: adsManager.showAd(callback)
                instance.showAd(() => console.log('Ad finished'));
            })()
        """)

        page.wait_for_timeout(1000)
        page.screenshot(path="verification/ad_overlay.png")
        print("Screenshot taken: ad_overlay.png")

        browser.close()

if __name__ == "__main__":
    verify_neon_city()
