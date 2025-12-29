from playwright.sync_api import sync_playwright

def verify_games():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 720})

        # Attach listeners for console and errors
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        print("Navigating to index.html...")
        page.goto("http://localhost:8000/index.html")

        try:
            page.wait_for_selector("#app-loader", state="detached", timeout=5000)
        except:
             print("Loader timeout, proceeding anyway.")

        # --- Verify Clicker Game ---
        print("Verifying Neon Idle...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'clicker-game' })")

        page.wait_for_selector("#click-btn", timeout=5000)
        print("Clicker Game Loaded.")
        page.screenshot(path="verification/clicker_game.png")

        # Go Back
        page.evaluate("window.miniGameHub.transitionToState('MENU')")
        page.wait_for_timeout(1000)

        # --- Verify Runner Game ---
        print("Verifying Neon Runner...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'runner-game' })")

        # Look for the specific UI element we added to runner
        page.wait_for_selector("#runner-score", timeout=5000)
        print("Runner Game UI Found.")

        # Take screenshot
        page.screenshot(path="verification/runner_game.png")

        browser.close()

if __name__ == "__main__":
    verify_games()
