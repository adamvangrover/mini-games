
import os
import sys
from playwright.sync_api import sync_playwright, expect

def verify_trophy_room_visual(page):
    page.goto("http://localhost:8000/index.html")
    expect(page.locator("#app-loader")).to_be_hidden(timeout=10000)

    # Wait for initial load
    page.wait_for_timeout(1000)

    # Transition to Trophy Room
    # Force the state transition directly
    page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'trophy-room' })")

    # Wait for Trophy Room container
    expect(page.locator("#trophy-room")).to_be_visible(timeout=10000)

    # Wait a bit for Three.js to render
    page.wait_for_timeout(2000)

    # Take screenshot
    page.screenshot(path="verification/verify_trophy_room_decorations.png")
    print("Trophy Room verification successful.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_trophy_room_visual(page)
        except Exception as e:
            print(f"Verification failed: {e}")
            sys.exit(1)
        finally:
            browser.close()
