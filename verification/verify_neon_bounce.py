import os
import sys
import time
from playwright.sync_api import sync_playwright

def verify_neon_bounce():
    print("Verifying Neon Bounce game...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # We need a local server running for Playwright to hit it.
        # Assuming the caller has started one on port 8000
        try:
            page.goto('http://localhost:8000', wait_until='networkidle')
        except Exception as e:
            print(f"Error connecting to local server: {e}")
            print("Make sure to run 'python3 -m http.server 8000 &' before this script.")
            sys.exit(1)

        # Wait for the Arcade Hub splash/loader to finish
        try:
            page.wait_for_selector('#app-loader', state='hidden', timeout=10000)
        except Exception:
            # Fallback if CSS transition doesn't trigger hidden state reliably
            pass

        time.sleep(2) # Give it a moment to initialize

        # Click to dismiss introductory splash screen
        page.mouse.click(10, 10)
        time.sleep(1)

        # Launch the game programmatically (wrap in try-catch to prevent navigation interruption)
        try:
            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-bounce' })")
        except Exception as e:
            print(f"Evaluate warning (often ignorable if transition happens): {e}")
            time.sleep(1)

        # Wait for the game container to become visible
        try:
            page.wait_for_selector('#neon-bounce', state='visible', timeout=5000)
            print("Game container is visible.")
        except Exception as e:
            print("Failed to find or display the neon-bounce game container.")
            sys.exit(1)

        # Let JS instantiate the game inside the container
        time.sleep(2)

        # Check for the canvas
        canvas = page.query_selector('#neon-bounce-canvas')
        if not canvas:
            print("Error: #neon-bounce-canvas not found. Dumping innerHTML of container...")
            html = page.evaluate("document.getElementById('neon-bounce').innerHTML")
            print(html)
            sys.exit(1)
        print("Canvas found.")

        # Check for UI elements
        score_el = page.query_selector('#nb-score')
        if not score_el:
            print("Error: Score element not found.")
            sys.exit(1)

        # Wait for animation frames to render
        time.sleep(2)

        # Check for Javascript errors
        errors = []
        page.on("pageerror", lambda err: errors.append(err))

        if errors:
            print(f"JavaScript errors detected during gameplay: {errors}")
            sys.exit(1)

        print("Neon Bounce verification passed successfully.")
        browser.close()

if __name__ == "__main__":
    verify_neon_bounce()
