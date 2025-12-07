from playwright.sync_api import sync_playwright

def verify_arcade_hub():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8000/index.html")

            # Wait for the arcade hub container
            page.wait_for_selector("#arcade-hub-container")

            # Wait a bit for Three.js to render
            page.wait_for_timeout(3000)

            # Take screenshot of Hub
            page.screenshot(path="verification/arcade_hub.png")
            print("Arcade Hub screenshot taken.")

            # Click on "The Grind 98" cabinet if visible (hard to target 3D object with standard selectors,
            # but we can try simulated click in center or just verify hub for now).
            # The hub renders canvases. We can't easily click 3D objects with Playwright without coordinate guessing.
            # But we can verify the overlay HUD is present.

            page.wait_for_selector("#hub-hud")

            # Let's try to transition to a game via console to verify game loading logic
            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'work-game' })")

            page.wait_for_timeout(1000)

            # Check if game container is visible
            page.wait_for_selector("#work-game:not(.hidden)")

            # Take screenshot of The Grind 98
            page.screenshot(path="verification/the_grind_98.png")
            print("The Grind 98 screenshot taken.")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_arcade_hub()
