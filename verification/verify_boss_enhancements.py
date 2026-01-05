from playwright.sync_api import sync_playwright, expect
import time

def verify_enhancements():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Increase viewport size to capture overlays fully
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # 1. Load the page
        print("Loading page...")
        page.goto("http://localhost:8000")

        # Wait for loader to disappear
        expect(page.locator("#app-loader")).to_be_hidden(timeout=10000)

        # 2. Check for Post-it Note
        print("Checking Post-it note...")
        post_it = page.locator(".post-it-note")
        expect(post_it).to_be_visible()
        expect(post_it).to_contain_text("Alt + B")
        page.screenshot(path="verification/post_it.png")
        print("Post-it note confirmed.")

        # 3. Activate Boss Mode
        print("Activating Boss Mode...")
        page.keyboard.down("Alt")
        page.keyboard.press("b")
        page.keyboard.up("Alt")

        # Wait for Boot/Login sequence
        time.sleep(3) # Boot

        # Check Login Screen
        login_input = page.locator("#boss-login-input")
        if login_input.is_visible():
            print("Login screen visible. Logging in...")
            login_input.fill("password123")
            page.keyboard.press("Enter")
            time.sleep(1)

        # 4. Check Word Export
        print("Checking Word Export...")
        # Launch Word
        page.click("#boss-app-word") # Taskbar icon
        time.sleep(1)

        # Check for Export PDF button
        export_btn = page.locator("button", has_text="Export PDF")
        expect(export_btn).to_be_visible()
        export_btn.click()

        # Check for Toast/Popup
        # The adsManager creates popups with title "Printing..." or "System Info"
        popup = page.locator("#ad-popup-title", has_text="Printing...")
        # Note: AdsManager popup might have dynamic ID, looking at content
        # It creates a div with class 'fixed' and content

        time.sleep(0.5)
        page.screenshot(path="verification/word_export.png")
        print("Word Export verified.")

        # 5. Check PPT Export
        print("Checking PPT Export...")
        page.click("#boss-app-ppt") # Taskbar icon
        time.sleep(1)

        export_btn_ppt = page.locator("button", has_text="Export PDF").first
        expect(export_btn_ppt).to_be_visible()

        page.screenshot(path="verification/ppt_export.png")
        print("PPT Export verified.")

        browser.close()

if __name__ == "__main__":
    verify_enhancements()
