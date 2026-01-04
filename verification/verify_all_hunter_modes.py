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
            page.wait_for_selector("#app-loader", state="visible", timeout=3000)
            page.click("#app-loader")
            page.wait_for_selector("#app-loader", state="hidden", timeout=3000)
        except:
            pass

        print("Forcing transition to Neon Hunter 64...")
        page.evaluate("if(window.miniGameHub) window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-hunter' })")

        # Wait for game menu
        print("Waiting for menu...")
        try:
            page.wait_for_selector("#neon-hunter h1:has-text('NEON HUNTER 64')", state="visible", timeout=10000)
            print("Menu visible.")
        except:
            print("Menu not found!")
            page.screenshot(path="verification/debug_menu_fail.png")
            return

        # Test Cycle Modes
        modes = ['clay', 'duck', 'deer', 'safari', 'shark']

        for mode in modes:
            print(f"Testing mode: {mode}")

            # Click mode button via JS to ensure it triggers
            page.evaluate(f"document.querySelector('button[data-mode=\"{mode}\"]').click()")

            # Check HUD
            try:
                page.wait_for_selector("#nh-score", state="visible", timeout=5000)
            except:
                print(f"HUD not visible for {mode}")
                page.screenshot(path=f"verification/debug_fail_{mode}.png")
                return

            # Wait a bit
            page.wait_for_timeout(500)

            # Check for canvas
            if page.locator("#neon-hunter canvas").count() == 0:
                print(f"FAILED: Canvas missing in {mode}")
                return

            print(f"Mode {mode} active.")

            # Reset by forcing a transition via console to reload the game module cleanly
            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-hunter' })")
            page.wait_for_selector("#neon-hunter h1:has-text('NEON HUNTER 64')", state="visible", timeout=5000)

            # Small pause to ensure menu is ready
            page.wait_for_timeout(500)

        print("All modes verified successfully.")
        browser.close()

if __name__ == "__main__":
    run()
