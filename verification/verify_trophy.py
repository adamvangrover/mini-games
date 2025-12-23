from playwright.sync_api import sync_playwright
import time

def verify_full_trophy_experience():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"ERROR: {exc}"))

        print("Navigating to http://localhost:8000")
        try:
            page.goto("http://localhost:8000", timeout=10000)
        except Exception as e:
            print(f"Navigation failed: {e}")
            return

        time.sleep(3)

        # Force 2D view if needed
        grid = page.locator('#menu-grid')
        if not grid.is_visible():
             print("Toggling to 2D view...")
             btn = page.locator('#view-toggle-btn')
             if btn.is_visible():
                 btn.click(force=True)
                 time.sleep(1)
             else:
                 print("Toggle button missing!")

        # 1. Enter Trophy Room
        print("Finding Trophy Room...")
        card = page.locator("h3", has_text="Trophy Room")
        if card.count() > 0:
            card.first.click(force=True)
            print("Clicked Trophy Room")
        else:
            print("Trophy Room card NOT found.")
            return

        time.sleep(2)

        # Verify Trophy Room
        tr_header = page.locator("h1", has_text="TROPHY ROOM")
        if tr_header.count() > 0:
            print("SUCCESS: Trophy Room Header Verified.")
        else:
            print("FAILURE: Trophy Room Header not found.")
            print(page.locator("body").inner_html())
            return

        # 2. Navigate to Hall of Fame from Trophy Room
        print("Clicking 'Hall of Fame' button...")
        # Use JS click to avoid viewport issues in headless mode
        page.evaluate("document.getElementById('tr-hof-btn').click()")

        time.sleep(2)

        # Verify Hall of Fame
        hof_header = page.locator("h1", has_text="HALL_OF_FAME")
        if hof_header.count() > 0:
            print("SUCCESS: Hall of Fame Header Verified.")
        else:
            print("FAILURE: Hall of Fame Header not found.")
            return

        # 3. Navigate back to Trophies
        print("Clicking 'View Trophies' button...")
        page.evaluate("document.getElementById('hof-trophy-btn').click()")

        time.sleep(2)

        # Verify Trophy Room again
        if tr_header.is_visible():
             print("SUCCESS: Returned to Trophy Room.")
        else:
             print("FAILURE: Did not return to Trophy Room.")

        # 4. Back to Hub
        print("Clicking 'Back to Hub'...")
        page.evaluate("document.getElementById('tr-back-btn').click()")

        time.sleep(2)

        if grid.is_visible():
            print("SUCCESS: Returned to Main Menu.")
        else:
             print("FAILURE: Did not return to Main Menu.")

        browser.close()

if __name__ == "__main__":
    verify_full_trophy_experience()
