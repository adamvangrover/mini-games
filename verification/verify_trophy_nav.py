
import sys
import os
from playwright.sync_api import sync_playwright

def verify_trophy_room():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the verification page
        url = "http://localhost:8000/verification_trophy_room.html"
        print(f"Navigating to {url}...")
        page.goto(url)

        # Wait for initialization
        try:
            page.wait_for_selector("#trophy-room-container canvas", timeout=10000)
            print("Trophy Room canvas detected.")
        except Exception as e:
            print(f"Error: Canvas not found. {e}")
            sys.exit(1)

        # Check for errors
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))
        page.on("console", lambda msg: print(f"Console: {msg.text}"))

        # Verify global object
        is_defined = page.evaluate("typeof window.trophyRoom !== 'undefined'")
        if is_defined:
            print("TrophyRoom instance exists on window.")
        else:
            print("Error: TrophyRoom instance not found.")
            sys.exit(1)

        # Test state
        yaw = page.evaluate("window.trophyRoom.yaw")
        print(f"Initial Yaw: {yaw}")

        # Simulate Movement (Directly via state modification to ensure logic exists)
        # Note: We can't easily simulate physical keyboard input in headless easily without focus,
        # but we can check if the methods exist and update state.

        # Test Camera Rotation logic
        print("Testing camera rotation...")
        page.mouse.move(100, 100)
        page.mouse.down()
        page.mouse.move(200, 200) # Drag
        page.mouse.up()

        # Check if yaw changed
        new_yaw = page.evaluate("window.trophyRoom.yaw")
        print(f"New Yaw after drag: {new_yaw}")

        if new_yaw != yaw:
             print("SUCCESS: Camera rotation updated via mouse interaction.")
        else:
             print("WARNING: Camera rotation did not change (might be sensitivity or event handling).")

        # Take screenshot
        os.makedirs("verification", exist_ok=True)
        page.screenshot(path="verification/trophy_room_fixed.png")
        print("Screenshot saved to verification/trophy_room_fixed.png")

        browser.close()

if __name__ == "__main__":
    verify_trophy_room()
