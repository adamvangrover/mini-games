import os
from playwright.sync_api import sync_playwright

def run_cuj(page):
    # Navigate to the Neon Arcade Hub
    page.goto("http://localhost:8000")
    page.wait_for_timeout(2000) # Wait for loader

    # Start the app
    page.locator('body').click()
    page.wait_for_timeout(1000)

    # We are now in 3D Hub or Grid View.
    # For testing reliability, switch to Grid View if not already
    try:
        # Check if 3D Hub is active and try to switch to Grid View
        view_toggle_btn = page.locator('#view-toggle-btn')
        if view_toggle_btn.is_visible():
            text = view_toggle_btn.text_content()
            if "Grid View" in text:
                 view_toggle_btn.click()
                 page.wait_for_timeout(1000)
    except Exception as e:
        pass # Probably already in grid view or fallback mode

    page.wait_for_timeout(1000)

    # Click the Neon Wheel game card in the menu
    # Using aria-label or just locator by text
    game_card = page.locator('button', has_text="Neon Wheel")
    game_card.click()

    page.wait_for_timeout(2000) # Wait for game to load and init

    # Interact with the game
    # Spin the wheel
    spin_btn = page.locator('#nw-spin-btn')
    spin_btn.click()

    # Wait for spin to finish (can take ~3-4 seconds based on friction)
    page.wait_for_timeout(4000)

    # Note: result is random. We will just guess 'T' as a consonant, since it's common.
    # If bankrupt/lose turn, button might be disabled, so we check first.
    try:
        t_key = page.locator('#nw-key-T')
        if t_key.is_enabled():
            t_key.click()
            page.wait_for_timeout(2000)
    except Exception:
        pass

    # Take screenshot at the key moment
    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(1000)  # Hold final state for the video

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos",
            viewport={'width': 1280, 'height': 720}
        )
        page = context.new_page()
        try:
            run_cuj(page)
        except Exception as e:
            print(f"Error during CUJ: {e}")
            page.screenshot(path="/home/jules/verification/screenshots/error.png")
            raise
        finally:
            context.close()  # MUST close context to save the video
            browser.close()
