from playwright.sync_api import sync_playwright
import time
import os

def verify_interactables():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load local index.html
        url = f"http://localhost:8000/index.html"
        print(f"Loading {url}...")
        page.goto(url)

        # Bypass app loader
        print("Clicking to start...")
        page.click("body", force=True)
        time.sleep(2) # Wait for init

        # 1. Verify Cursor Trail
        print("Verifying cursor trail...")
        # Simulate mouse movement
        page.mouse.move(100, 100)
        page.mouse.move(200, 200)
        page.mouse.move(300, 300)
        time.sleep(0.5)

        # Check if trail dots exist and are visible (opacity > 0)
        # We injected divs directly into body with specific styles
        dots = page.evaluate("""() => {
            const dots = Array.from(document.querySelectorAll('div')).filter(el =>
                el.style.width === '6px' &&
                el.style.height === '6px' &&
                el.style.background === 'cyan'
            );
            return dots.length;
        }""")
        print(f"Found {dots} cursor trail dots.")
        if dots < 5:
             print("FAILURE: Cursor trail dots not found.")
        else:
             print("SUCCESS: Cursor trail verified.")

        # 2. Verify Job Board Overlay
        print("Verifying Job Board Overlay...")
        # We can't click the 3D object easily, but we can dispatch the event
        page.evaluate("window.dispatchEvent(new CustomEvent('open-quest-board'))")
        time.sleep(1)

        overlay = page.query_selector("#global-overlay")
        is_visible = not overlay.get_attribute("class") or "hidden" not in overlay.get_attribute("class")
        title = page.text_content("#overlay-title")

        if is_visible and "JOB BOARD" in title:
            print("SUCCESS: Job Board overlay opened.")
            page.screenshot(path="verification/screenshot_job_board.png")
        else:
            print(f"FAILURE: Job Board overlay state: Visible={is_visible}, Title={title}")

        # 3. Verify Boss Mode Teams App
        print("Verifying Boss Mode Teams App...")
        # Open Boss Mode
        page.evaluate("BossMode.instance.toggle(true)")
        time.sleep(1)
        # Login (Modern OS is default)
        page.click("#boss-login-input")
        page.keyboard.press("Enter")
        time.sleep(1)

        # Open Teams
        page.evaluate("BossMode.instance.openApp('teams')")
        time.sleep(1)

        # Check for specific text
        teams_text = page.inner_text("#boss-windows-container")
        if "The Boss" in teams_text and "Q3 reports" in teams_text:
            print("SUCCESS: Teams App loaded correctly.")
            page.screenshot(path="verification/screenshot_boss_teams.png")
        else:
            print("FAILURE: Teams App text not found.")
            print("Text found:", teams_text[:200])

        browser.close()

if __name__ == "__main__":
    # Ensure server is running (assumed based on environment)
    verify_interactables()
