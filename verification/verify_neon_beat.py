def verify_neon_beat(page):
    # Capture console logs
    page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))
    page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))

    print("Navigating to hub...")
    page.goto("http://localhost:8000")

    print("Waiting for loader...")
    # Click to dismiss loader
    page.click("body", force=True)
    loader = page.locator("#app-loader")
    loader.wait_for(state="hidden", timeout=10000)

    print("Launching Neon Beat...")
    page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-beat' })")

    print("Waiting for #neon-beat to be visible...")
    game_container = page.locator("#neon-beat")
    game_container.wait_for(state="visible", timeout=5000)

    # Check for Canvas
    canvas = page.locator("#neon-beat canvas")
    canvas.wait_for(state="visible", timeout=5000)

    # Start the game
    print("Starting the game...")
    page.keyboard.press("Enter")
    page.wait_for_timeout(1000)

    page.screenshot(path="verification/neon_beat_game.png")
    print("Screenshot saved: neon_beat_game.png")

    # Exit Game
    page.locator("#neon-beat button").click()
    game_container.wait_for(state="hidden")

    print("Verification Complete.")

if __name__ == "__main__":
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_neon_beat(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()