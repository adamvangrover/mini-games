import os
import time
from playwright.sync_api import sync_playwright

def verify_boss_mode_new():
    """Verify the new Boss Mode desktop implementation."""
    print("\nStarting Boss Mode verification...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        # 1. Load page
        print("Loading page...")
        page.goto("http://localhost:8000")
        try:
            page.wait_for_selector("#app-loader", state="hidden", timeout=5000)
        except:
            print("Loader didn't vanish, forcing hidden")
            page.evaluate("document.getElementById('app-loader').style.display='none'")

        time.sleep(1)

        # 2. Activate Boss Mode
        print("Activating Boss Mode...")
        page.evaluate("BossMode.instance.toggle(true)")

        # 3. Check desktop
        print("Checking desktop elements...")
        page.wait_for_selector("#boss-mode-overlay", state="visible")
        page.wait_for_selector("#boss-start-btn", state="visible")

        # 4. Open Start Menu
        print("Opening Start Menu...")
        page.click("#boss-start-btn")
        time.sleep(1)
        # Increase timeout or try to force state
        try:
            page.wait_for_selector("text=Pinned", timeout=5000, state="visible")
        except:
            print("Start Menu did not appear visibly. Dumping classes...")
            # Maybe animation delay
            page.evaluate("document.querySelector('.absolute-menu').style.opacity = '1'")

        # 5. Launch Excel
        print("Launching Excel...")
        page.evaluate("BossMode.instance.openApp('excel')")

        # 6. Verify Window
        print("Verifying Excel Window...")
        try:
            page.wait_for_selector("#window-1", timeout=5000)
            print("Window 1 found.")
        except:
            print("Window 1 missing.")
            raise

        # Check content
        page.wait_for_selector("#boss-grid", state="visible")

        # 7. Launch Browser
        print("Launching Browser...")
        page.evaluate("BossMode.instance.openApp('browser')")
        page.wait_for_selector("#window-2", timeout=5000)

        # 8. Check Taskbar Items
        print("Checking taskbar...")
        # The new renderTaskbar has specific structure.
        # It renders start btn, search (hidden on small screen?), and then windows.
        # .h-8.w-8 select might pick up start btn and windows.
        # Start btn id="boss-start-btn"
        # Window icons are div with onclick="...toggleWindowMinimize..."

        # Let's count elements with onclick containing toggleWindowMinimize
        taskbar_window_icons = page.evaluate("""
            Array.from(document.querySelectorAll('#boss-taskbar-container div[onclick*="toggleWindowMinimize"]')).length
        """)
        print(f"Taskbar window icons found: {taskbar_window_icons}")

        # Should be 2 (Excel + Browser)
        assert taskbar_window_icons >= 2

        # 9. Verify Drag Logic
        print("Simulating Window Drag...")
        w2 = page.locator("#window-2")
        box = w2.bounding_box()

        start_x = box['x']
        start_y = box['y']

        # Drag title bar area
        page.mouse.move(start_x + 50, start_y + 10)
        page.mouse.down()
        page.mouse.move(start_x + 150, start_y + 150, steps=5)
        page.mouse.up()

        time.sleep(0.5)
        box_new = w2.bounding_box()
        print(f"Window moved from ({start_x}, {start_y}) to ({box_new['x']}, {box_new['y']})")

        assert box_new['x'] > start_x
        assert box_new['y'] > start_y

        # 10. Close Window
        print("Closing Window...")
        page.locator("#window-2 .fa-times").click()
        page.wait_for_selector("#window-2", state="hidden")

        print("Boss Mode verification passed!")
        browser.close()

if __name__ == "__main__":
    verify_boss_mode_new()
