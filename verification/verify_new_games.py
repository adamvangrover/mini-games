from playwright.sync_api import sync_playwright, expect
import time

def verify_new_games(page):
    # Go to the local server
    page.goto("http://localhost:8000")

    # Bypass loading screen
    page.locator("body").click()
    time.sleep(1)

    # Wait for the menu
    expect(page.locator("#menu")).to_be_visible(timeout=10000)

    # Switch to Grid View to see the menu buttons
    # Since 3D mode is default on desktop, menu-grid is hidden
    page.evaluate("if(window.miniGameHub && window.miniGameHub.is3DView) window.miniGameHub.toggleView()")
    time.sleep(1)

    # Wait for menu grid to be visible
    expect(page.locator("#menu-grid")).to_be_visible()

    # Look for Neon Grid Strike
    grid_strike_btn = page.locator("button[aria-label*='Neon Grid Strike']")

    # Scroll it into view since the grid is long
    grid_strike_btn.scroll_into_view_if_needed()
    expect(grid_strike_btn).to_be_visible()

    # Look for Neon Vaults
    vaults_btn = page.locator("button[aria-label*='Neon Vaults']")
    expect(vaults_btn).to_be_visible()

    # --- Verify Grid Strike UI ---
    grid_strike_btn.click()
    expect(page.locator("#neon-grid-strike")).not_to_have_class("hidden", timeout=5000)
    time.sleep(1) # Let UI settle
    page.screenshot(path="verification/grid_strike_ui.png")

    # Execute programmatic exit to menu
    page.evaluate("window.miniGameHub.transitionToState('MENU')")
    time.sleep(1)

    # Force back to 2D view if it reset
    page.evaluate("if(window.miniGameHub && window.miniGameHub.is3DView) window.miniGameHub.toggleView()")
    time.sleep(1)

    # --- Verify Vaults UI ---
    vaults_btn = page.locator("button[aria-label*='Neon Vaults']")
    vaults_btn.scroll_into_view_if_needed()
    vaults_btn.click()
    expect(page.locator("#neon-vaults")).not_to_have_class("hidden", timeout=5000)
    time.sleep(1) # Let UI settle
    page.screenshot(path="verification/vaults_ui.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--window-size=1280,1024'])
        page = browser.new_page(viewport={'width': 1280, 'height': 1024})
        try:
            verify_new_games(page)
            print("Verification successful.")
        finally:
            browser.close()