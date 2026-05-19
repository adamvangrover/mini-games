from playwright.sync_api import sync_playwright
import time

def verify_neon_genesis():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to local server
        page.goto('http://localhost:8000')

        # Wait for loading screen to disappear
        page.wait_for_selector('#loading-screen', state='hidden', timeout=10000)

        # Click body to dismiss splash/start audio context
        page.locator('body').click()

        # Wait for main menu to be visible
        page.wait_for_selector('#menu:not(.hidden)', timeout=10000)

        # Launch game programmatically
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-genesis' })")

        # Wait for game container
        page.wait_for_selector('#neon-genesis:not(.hidden)', timeout=5000)

        # Give it a moment to render the Three.js scene
        time.sleep(2)

        # Take screenshot
        page.screenshot(path='verification/neon_genesis.png')
        print("Successfully launched Neon Genesis and captured screenshot.")

        browser.close()

if __name__ == "__main__":
    verify_neon_genesis()