from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the hub
        page.goto("http://localhost:8000")

        # Take a screenshot of the initial state (likely 3D hub)
        page.screenshot(path="verification/hub_initial.png")
        print("Initial Hub screenshot taken.")

        # Force toggle to 2D Grid view by clicking the button
        # The ID is 'view-toggle-btn'
        print("Attempting to switch to Grid View...")
        try:
             page.wait_for_selector("#view-toggle-btn", timeout=5000)
             page.click("#view-toggle-btn", force=True)
             print("Clicked toggle button.")
        except Exception as e:
             print(f"Could not click toggle: {e}")
             # Fallback: force remove hidden class via JS if button failed
             page.evaluate("document.getElementById('menu-grid').classList.remove('hidden')")

        # Now wait for grid
        try:
            page.wait_for_selector("#menu-grid", state="visible", timeout=5000)
            print("Menu grid is visible.")
        except:
             print("Menu grid still not visible. Forcing visible via JS.")
             page.evaluate("document.getElementById('menu-grid').classList.remove('hidden')")
             page.evaluate("document.getElementById('menu-grid').style.display = 'grid'")

        # 1. Verify Aetheria Classic Entry
        print("Checking Aetheria Classic...")
        page.screenshot(path="verification/menu_grid.png")
        if page.is_visible("text=Aetheria (Classic)"):
            print("Found Aetheria Classic.")
        else:
            print("Aetheria Classic NOT found.")

        # 2. Verify Life Sim Entry
        print("Checking Life Sim...")
        if page.is_visible("text=Neon Life"):
             print("Found Neon Life.")
        else:
             print("Neon Life NOT found.")

        # 3. Enter Life Sim
        print("Entering Life Sim...")
        # Find card with Neon Life
        try:
            page.click("text=Neon Life", force=True)

            # Wait for Life Sim UI
            page.wait_for_selector("#ls-wrapper", timeout=10000)
            page.wait_for_selector("#ls-name-display")

            # Interact with Life Sim
            # Click 'Work'
            page.click("#btn-work")
            # Wait for Work View
            page.wait_for_selector("#view-work", state="visible") # Ensure it's not hidden?
            # Actually toggle removes hidden class.

            # Click 'Social'
            page.click("#btn-social")

            # Take screenshot of Life Sim
            page.screenshot(path="verification/lifesim.png")
            print("LifeSim screenshot taken.")

            # Return to menu
            page.click("#btn-exit")
            page.wait_for_selector("#menu-grid", state="visible")
        except Exception as e:
            print(f"Life Sim Verification Failed: {e}")
            page.screenshot(path="verification/lifesim_fail.png")

        # 4. Enter Matterhorn
        print("Entering Matterhorn...")
        try:
            page.click("text=Matterhorn Ascent")
            page.wait_for_selector("#mh-start-screen", timeout=10000)
            page.screenshot(path="verification/matterhorn.png")

            # Start game
            page.click("#mh-start-btn")
            # Wait a bit for game to init
            page.wait_for_timeout(2000)
            page.screenshot(path="verification/matterhorn_game.png")
            print("Matterhorn screenshot taken.")

            # Exit Matterhorn
            page.evaluate("if(window.miniGameHub) window.miniGameHub.goBack()")
        except Exception as e:
             print(f"Matterhorn Verification Failed: {e}")
             page.screenshot(path="verification/matterhorn_fail.png")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
