from playwright.sync_api import sync_playwright
import time

def verify_neon_broker():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        print("Navigating to Neon Broker...")
        page.goto("http://localhost:3001")

        # Click to resume audio (and start interaction)
        page.mouse.click(640, 360)
        time.sleep(1) # Wait for initial render and ticker

        print("Taking initial screenshot...")
        page.screenshot(path="verification/neon_broker_initial.png")

        # Test Help Overlay
        print("Testing Help Overlay...")
        page.keyboard.press("h")
        time.sleep(0.5)
        page.screenshot(path="verification/neon_broker_help.png")
        page.keyboard.press("h") # Close help
        time.sleep(0.5)

        # Test Dark Web
        print("Testing Dark Web...")
        page.keyboard.press("Tab")
        time.sleep(0.5)
        page.screenshot(path="verification/neon_broker_darkweb.png")
        page.keyboard.press("Escape") # Close dark web
        time.sleep(0.5)

        # Test Buying (Particles)
        print("Testing Buy Action...")
        # Select first stock (already selected)
        page.keyboard.press("b")
        time.sleep(0.1) # Capture particles
        page.screenshot(path="verification/neon_broker_buy.png")

        browser.close()
        print("Verification complete.")

if __name__ == "__main__":
    verify_neon_broker()
