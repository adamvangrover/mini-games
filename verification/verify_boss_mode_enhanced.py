
from playwright.sync_api import sync_playwright, expect
import time

def verify_boss_mode_enhanced():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a larger viewport to see the full UI and taskbar
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
        page.on("pageerror", lambda msg: print(f"PAGE ERROR: {msg}"))

        # Navigate to the app (ensure server is running on port 8000)
        page.goto("http://localhost:8000/index.html")

        # Wait for the app to load and click to dismiss loader
        loader = page.locator("#app-loader")
        if loader.is_visible():
            loader.click()
        expect(loader).to_be_hidden(timeout=10000)

        # Trigger Boss Mode
        page.keyboard.press("Alt+b")

        # Check if overlay exists
        overlay = page.locator("#boss-mode-overlay")
        if not overlay.is_visible():
            print("Overlay not visible. Checking DOM...")
            html = page.content()
            if "boss-mode-overlay" in html:
                print("Overlay IS in DOM but hidden.")
                # check class
                cls = overlay.get_attribute("class")
                print(f"Overlay classes: {cls}")
            else:
                print("Overlay NOT in DOM.")

        # 1. Verify Boot Screen
        boot_screen = page.locator("#boss-boot-screen")
        expect(boot_screen).to_be_visible(timeout=5000)
        print("Boot screen visible")

        # Wait for Boot to finish (2000ms in code + buffer)
        page.wait_for_timeout(2500)

        # 2. Verify Login Screen
        login_screen = page.locator("#boss-login-screen")
        expect(login_screen).to_be_visible()
        print("Login screen visible")

        # 3. Perform Login
        page.locator("#boss-login-btn").click(force=True)

        # 4. Verify Desktop (Wait for wallpaper/desktop icons)
        desktop_icons = page.locator("#desktop-icons")
        expect(desktop_icons).to_be_visible(timeout=5000)
        print("Desktop loaded")

        # Take screenshot of Desktop
        page.screenshot(path="verification/boss_mode_os_desktop.png")
        print("Screenshot saved: verification/boss_mode_os_desktop.png")

        # 5. Verify Start Menu Toggle
        page.locator("#boss-start-btn").click(force=True)
        start_menu = page.locator("#boss-start-menu")
        expect(start_menu).to_be_visible()
        page.screenshot(path="verification/boss_mode_os_start.png")
        print("Screenshot saved: verification/boss_mode_os_start.png")
        page.locator("#boss-start-btn").click(force=True) # Close it

        # 6. Verify Excel (Default App)
        excel_body = page.locator("#boss-excel-body")
        expect(excel_body).to_be_visible()

        # 7. Switch to Word
        page.locator("#boss-app-word").click(force=True)
        word_editor = page.locator("#word-editor")
        expect(word_editor).to_be_visible()
        page.screenshot(path="verification/boss_mode_os_word.png")
        print("Screenshot saved: verification/boss_mode_os_word.png")

        # 8. Switch to Outlook
        page.locator("#boss-app-outlook").click(force=True)
        expect(page.get_by_text("Inbox")).to_be_visible()
        page.screenshot(path="verification/boss_mode_os_outlook.png")

        browser.close()

if __name__ == "__main__":
    verify_boss_mode_enhanced()
