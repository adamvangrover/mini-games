import sys
import os
from playwright.sync_api import sync_playwright, expect

def verify_hunter_modes():
    print("Starting Neon Hunter Modes Verification...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        # Navigate to the game
        page.goto("http://localhost:8000/index.html")

        # Wait for initialization and handle App Loader
        print("Waiting for App Loader...")
        try:
            loader = page.locator("#app-loader")
            if loader.is_visible(timeout=3000):
                print("Dismissing app loader...")
                page.click("body")
                expect(loader).to_be_hidden(timeout=5000)
        except Exception as e:
            print(f"Loader handling warning: {e}")

        print("Launching Neon Hunter via Hub...")
        page.evaluate("if(window.miniGameHub) window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-hunter' })")

        expect(page.locator("h1:has-text('NEON HUNTER 64')")).to_be_visible(timeout=5000)
        print("Neon Hunter Menu loaded.")

        modes = ['clay', 'duck', 'deer', 'safari', 'shark']

        for mode in modes:
            print(f"Testing Mode: {mode}")

            # Restart game to get to menu (if not already)
            page.evaluate("if(window.miniGameHub) window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-hunter' })")
            page.wait_for_timeout(2000)

            # Click mode button
            btn_selector = f"button[data-mode='{mode}']"
            # Ensure menu is visible
            expect(page.locator(btn_selector)).to_be_visible()

            # Use force=True to click through any overlays
            page.click(btn_selector, force=True)

            # Wait for HUD to appear
            try:
                # Wait for score to be visible
                expect(page.locator("#nh-score")).to_be_visible(timeout=3000)
            except:
                print(f"HUD not visible for {mode}. Attempting retry click...")
                # Retry click
                page.click(btn_selector, force=True)
                expect(page.locator("#nh-score")).to_be_visible(timeout=3000)

            expect(page.locator("h1:has-text('NEON HUNTER 64')")).not_to_be_visible()

            # Verify Ammo Init
            ammo_text = page.locator("#nh-ammo").inner_text()
            print(f"  Initial Ammo: {ammo_text}")

            expected_ammo = "2" if mode == 'clay' else "3" if mode == 'duck' else "6"
            if ammo_text != expected_ammo:
                print(f"  ERROR: Expected ammo {expected_ammo}, got {ammo_text}")
            else:
                print("  Ammo check passed.")

            if mode in ['deer', 'safari', 'shark']:
                print("  Simulating shooting to empty...")
                # To simulate shooting we click the canvas
                # We need to make sure we are not clicking UI elements.
                # Canvas is usually behind HUD which is pointer-events: none.

                for _ in range(int(expected_ammo) + 2):
                    page.mouse.click(400, 300)
                    page.wait_for_timeout(100)

                msg_text = page.locator("#nh-center-msg").inner_text()
                print(f"  Message after emptying: '{msg_text}'")

                if "RELOADING" in msg_text:
                    print("  Reload text detected.")
                    page.wait_for_timeout(2500)
                    ammo_text_reloaded = page.locator("#nh-ammo").inner_text()
                    print(f"  Ammo after reload: {ammo_text_reloaded}")
                    if ammo_text_reloaded == expected_ammo:
                         print("  Reload successful.")
                    else:
                         print("  ERROR: Ammo did not reset.")
                else:
                    print(f"  WARNING: Reload message not detected. HUD Msg: '{msg_text}'")

        print("Verification Complete.")
        browser.close()

if __name__ == "__main__":
    verify_hunter_modes()
