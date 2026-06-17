import sys
import time
from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print("Loading index.html...")
            page.goto("http://localhost:8000/index.html")

            # Dismiss loader by clicking
            page.click('#app-loader')
            page.wait_for_selector('#app-loader', state='hidden', timeout=15000)

            print("Switching to Grid View...")
            # Switch to grid if in 3D
            toggle_btn = page.locator('#view-toggle-btn')
            if toggle_btn.is_visible():
                btn_text = toggle_btn.text_content()
                if "Grid" in btn_text:
                    toggle_btn.click()
                    page.wait_for_timeout(1000)

            print("Testing neon-tetrominoes...")

            # Find the card
            card = page.locator('button').filter(has=page.locator('h3').filter(has_text='Neon Tetrominoes')).first

            if not card.is_visible():
                print("Error: Could not find game card in menu grid.")
                sys.exit(1)

            card.scroll_into_view_if_needed()
            card.click()

            page.wait_for_timeout(2000)

            # Check if container is visible and has a canvas
            container = page.locator('#neon-tetrominoes')
            if not container.is_visible():
                print("Error: Game container is not visible after clicking card.")
                sys.exit(1)

            canvas = container.locator('canvas')
            if not canvas.is_visible():
                print("Error: Canvas is not visible inside game container.")
                sys.exit(1)

            # Check for BACK button
            back_btn = container.locator('button', has_text='BACK')
            if not back_btn.is_visible():
                print("Error: BACK button is missing.")
                sys.exit(1)

            print("neon-tetrominoes Loaded OK.")

            # Test BACK button functionality
            back_btn.click()
            page.wait_for_timeout(1000)

            if container.is_visible():
                print("Error: Container still visible after clicking BACK.")
                sys.exit(1)

            print("BACK button works OK.")

            print("All verifications passed.")

        except Exception as e:
            print(f"Error during verification: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == '__main__':
    verify()
