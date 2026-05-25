def verify_neon_swarm(page):
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

    print("Launching Neon Swarm...")
    page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-swarm' })")

    print("Waiting for #neon-swarm to be visible...")
    game_container = page.locator("#neon-swarm")
    game_container.wait_for(state="visible", timeout=5000)

    # Check for Canvas
    canvas = page.locator("#neon-swarm canvas")
    canvas.wait_for(state="visible", timeout=5000)

    # Start the game
    print("Starting the game...")
    page.keyboard.press("Enter")
    page.wait_for_timeout(1000)

    # Simulate movement
    page.keyboard.press("w")
    page.keyboard.press("d")
    page.wait_for_timeout(100)

    # Simulate aiming and firing
    box = canvas.bounding_box()
    if box:
        page.mouse.move(box["x"] + box["width"] / 4, box["y"] + box["height"] / 4)
        page.mouse.down()
        page.wait_for_timeout(500)
        page.mouse.up()

    page.screenshot(path="verification/neon_swarm_game.png")
    print("Screenshot saved: neon_swarm_game.png")

    # Exit Game
    page.locator("#neon-swarm button").click()
    game_container.wait_for(state="hidden")

    print("Verification Complete.")

if __name__ == "__main__":
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_neon_swarm(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()