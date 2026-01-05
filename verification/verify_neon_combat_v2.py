
import sys
import os
from playwright.sync_api import sync_playwright
import time

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture console logs to see JS errors
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"JS ERROR: {err}"))

        url = "http://localhost:8000/index.html"
        try:
            page.goto(url)
        except Exception as e:
            print(f"Failed to load {url}: {e}")
            return

        print("Waiting for app to load...")
        try:
            page.wait_for_selector("#app-loader", state="hidden", timeout=10000)
        except Exception:
             print("App loader didn't hide. Checking for JS errors...")
             return

        # Transition to Neon Combat
        print("Launching Neon Combat...")
        # We use a slight delay or retry to ensure Hub is ready
        time.sleep(2)
        try:
            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-combat' })")
        except Exception as e:
            print(f"Failed to transition: {e}")
            # Try once more
            time.sleep(1)
            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-combat' })")

        # Verify Character Select Screen
        print("Verifying Select Screen...")
        try:
            page.wait_for_selector("#combat-select-ui", timeout=5000)
        except Exception:
            print("Select UI not found. Taking screenshot of failure state...")
            os.makedirs("verification", exist_ok=True)
            page.screenshot(path="verification/combat_fail.png")
            raise

        # Check for Character Buttons
        buttons = page.locator("#p1-grid button")
        count = buttons.count()
        print(f"Found {count} character buttons for P1")
        if count < 3:
            raise Exception("Expected at least 3 character buttons")

        # Test Selection
        print("Selecting Viper-7...")
        page.locator("#p1-grid button").filter(has_text="V").click()

        # Verify Preview Update
        preview = page.locator("#p1-preview").inner_text()
        print(f"P1 Preview Text: {preview}")
        if "VIPER-7" not in preview:
            raise Exception("Preview did not update to Viper-7")

        # Test Konami Code
        print("Testing Konami Code...")
        page.keyboard.press("ArrowUp")
        page.keyboard.press("ArrowUp")
        page.keyboard.press("ArrowDown")
        page.keyboard.press("ArrowDown")
        page.keyboard.press("ArrowLeft")
        page.keyboard.press("ArrowRight")
        page.keyboard.press("ArrowLeft")
        page.keyboard.press("ArrowRight")
        page.keyboard.press("b")
        page.keyboard.press("a")

        time.sleep(1)

        # Check if Glitch God appears
        buttons_new = page.locator("#p1-grid button")
        if buttons_new.count() > count:
            print("Konami Code Success: Character count increased")
        else:
            print("Konami Code: No change detected")

        # Start Game
        print("Starting Match...")
        page.click("#btn-fight")

        # Verify HUD appears (Game Started)
        page.wait_for_selector("#p1-hp", timeout=5000)
        print("Match Started. HUD visible.")

        # Take screenshot
        os.makedirs("verification", exist_ok=True)
        page.screenshot(path="verification/neon_combat_v2.png")
        print("Screenshot saved to verification/neon_combat_v2.png")

        browser.close()

if __name__ == "__main__":
    run_test()
