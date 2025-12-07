from playwright.sync_api import sync_playwright

def verify_arcade_hub():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to index...")
            page.goto("http://localhost:8000/index.html")

            # --- Step 1: Verify 3D Hub (Default) ---
            print("Verifying 3D Hub...")
            # Wait for the arcade hub container (Overhaul style)
            page.wait_for_selector("#arcade-hub-container")
            
            # Wait for Three.js to render
            page.wait_for_timeout(3000)
            
            # Screenshot 3D View
            page.screenshot(path="verification/1_arcade_hub_3d.png")
            print("Snapshot: 3D Hub captured.")

            # --- Step 2: Verify Toggle to Grid View ---
            print("Verifying Grid Toggle...")
            # Click the toggle button (Main style)
            page.click("#view-toggle-btn")
            
            # Wait for grid to appear
            page.wait_for_selector("#menu-grid:not(.hidden)")
            page.wait_for_timeout(1000)
            
            # Screenshot Grid View
            page.screenshot(path="verification/2_arcade_hub_grid.png")
            print("Snapshot: Grid View captured.")

            # --- Step 3: Verify Game Transition ---
            print("Verifying Game Transition...")
            # Toggle back to 3D for completeness (optional, but good test)
            page.click("#view-toggle-btn")
            page.wait_for_timeout(1000)

            # Manually trigger transition via console to test the state machine
            # (Simulating clicking a cabinet)
            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'work-game' })")

            page.wait_for_timeout(1000)

            # Check if game container is visible
            page.wait_for_selector("#work-game:not(.hidden)")

            # Screenshot The Grind 98
            page.screenshot(path="verification/3_the_grind_98.png")
            print("Snapshot: In-Game (The Grind 98) captured.")

        except Exception as e:
            print(f"Error during verification: {e}")
        finally:
            browser.close()
            print("Verification session closed.")

if __name__ == "__main__":
    verify_arcade_hub()