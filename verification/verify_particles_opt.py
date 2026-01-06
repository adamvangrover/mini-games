from playwright.sync_api import sync_playwright

def verify_particles():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (using the server we started on port 8000)
        page.goto("http://localhost:8000/index.html")

        # Click to dismiss loader (as per memory)
        page.click("body", force=True)

        # Wait for app to load
        page.wait_for_selector("#app-loader", state="hidden", timeout=10000)

        # Force 2D view to ensure rendering on canvas
        page.evaluate("window.is3DView = false;")

        # Start Neon Zip game
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-zip-game' })")

        # Wait for game container
        page.wait_for_selector("#neon-zip-game", state="visible")

        # Wait a bit for game to init and draw loop to run
        page.wait_for_timeout(1000)

        # Trigger an emission via console in the game
        # Also verify logic by checking particle count
        result = page.evaluate("""() => {
            const game = window.miniGameHub.getCurrentGame();
            if (game && game.particleSystem) {
                // Emit a huge burst in the center
                game.particleSystem.emit(window.innerWidth/2, window.innerHeight/2, '#00ff00', 500);
                return game.particleSystem.particles.length;
            }
            return -1;
        }""")

        print(f"Particle count: {result}")
        if result > 0:
            print("Particles successfully emitted!")
        else:
            print("Failed to emit particles.")

        # Capture screenshot
        page.screenshot(path="verification/particles_check.png")

        browser.close()

if __name__ == "__main__":
    verify_particles()
