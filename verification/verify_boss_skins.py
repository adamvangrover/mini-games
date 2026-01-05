from playwright.sync_api import sync_playwright, expect
import time

def verify_skins():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a larger viewport to see the full desktop clearly
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print("Navigating...")
        page.goto("http://localhost:8000/index.html")
        page.wait_for_selector("#app-loader", state="hidden")

        print("Triggering Boss Mode (Windows Default)...")
        page.keyboard.press("Alt+b")
        page.locator("#boss-login-btn").click() # Bypass login
        expect(page.locator("#boss-app-window")).to_be_visible(timeout=5000)

        print("Capturing Windows Skin...")
        page.screenshot(path="verification/skin_windows.png")

        # Switch to Mac
        print("Switching to MacOS...")
        # Right click on desktop to open context menu
        # Click coordinates (100, 100) are safe on desktop wallpaper
        page.mouse.click(100, 100, button="right")
        page.locator("text=macOS").click()

        # Verify Mac Elements
        expect(page.locator("text=Finder")).to_be_visible()
        print("Capturing MacOS Skin...")
        page.screenshot(path="verification/skin_mac.png")

        # Switch to Ubuntu
        print("Switching to Ubuntu...")
        page.mouse.click(100, 100, button="right")
        page.locator("text=Ubuntu").click()

        # Verify Ubuntu Elements
        expect(page.locator("text=Activities")).to_be_visible()
        print("Capturing Ubuntu Skin...")
        page.screenshot(path="verification/skin_ubuntu.png")

        # Switch to Android
        print("Switching to Android...")
        page.mouse.click(100, 100, button="right")
        page.locator("text=Android Tablet").click()

        # Verify Android Elements
        expect(page.locator(".fa-battery-three-quarters")).to_be_visible()
        print("Capturing Android Skin...")
        page.screenshot(path="verification/skin_android.png")

        browser.close()

if __name__ == "__main__":
    verify_skins()
