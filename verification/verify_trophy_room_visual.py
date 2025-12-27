from playwright.sync_api import sync_playwright
import time

def verify_trophy_room():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:8000/index.html")

        # Wait for initialization (miniGameHub existing)
        try:
             page.wait_for_function("() => window.miniGameHub", timeout=15000)
        except:
             print("Timed out waiting for miniGameHub")
             # Try to see console logs
             page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        print("Transitioning to Trophy Room...")
        page.evaluate("window.miniGameHub.transitionToState('TROPHY_ROOM')")

        # Wait for the trophy room container
        # Note: We aliased the ID to 'trophy-room' in main.js, so we check that
        try:
            page.wait_for_selector("#trophy-room", state="visible", timeout=10000)
        except Exception as e:
            print(f"Error waiting for trophy-room: {e}")
            page.screenshot(path="verification/trophy_fail.png")
            raise e

        # Wait a bit for Three.js to render
        time.sleep(2)

        print("Taking screenshot...")
        page.screenshot(path="verification/trophy_room_visual.png")
        print("Screenshot saved to verification/trophy_room_visual.png")

        browser.close()

if __name__ == "__main__":
    verify_trophy_room()
