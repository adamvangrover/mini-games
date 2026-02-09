
import os
import sys
import time
from playwright.sync_api import sync_playwright

def verify_neon_racer():
    print("Starting verification for Neon Racer...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture logs
        page.on("console", lambda msg: print(f"Console: {msg.text}"))

        # Load the page (assuming server is running on port 8000)
        page.goto("http://localhost:8000")

        # Click "Click to Start" if loader exists
        try:
            page.click("#app-loader", timeout=2000)
        except:
            pass

        # Switch to Grid View if needed
        try:
            # Check if 3D view is active (menu-grid hidden)
            # Or just blindly click Grid View button if visible
            page.click("#view-toggle-btn", timeout=2000)
            print("Clicked View Toggle.")
        except:
            print("View toggle not found or not clickable.")

        # Wait for menu grid to be visible
        try:
            page.wait_for_selector("#menu-grid", state="visible", timeout=5000)
            print("Menu grid visible.")
        except:
            # Maybe it was already visible?
            if page.locator("#menu-grid").is_visible():
                print("Menu grid visible (check 2).")
            else:
                print("Error: Menu grid not visible.")
                browser.close()
                return False

        # Look for Neon Racer card
        try:
            # wait for text
            page.wait_for_selector("text=Neon Racer", timeout=5000)
            racer_card = page.locator("text=Neon Racer").first
            if not racer_card.is_visible():
                print("Error: Neon Racer card not found in menu.")
                browser.close()
                return False
            print("Neon Racer card found.")

            # Click it
            racer_card.click()

            # Wait for game container
            page.wait_for_selector("#neon-racer", timeout=5000)

            # Check if canvas exists inside
            canvas = page.locator("#neon-racer canvas")
            if canvas.is_visible():
                print("Neon Racer game loaded successfully (canvas visible).")
            else:
                print("Error: Neon Racer container found but canvas missing.")
                browser.close()
                return False

        except Exception as e:
            print(f"Verification failed: {e}")
            browser.close()
            return False

        browser.close()
        print("Verification PASSED.")
        return True

if __name__ == "__main__":
    if not verify_neon_racer():
        sys.exit(1)
