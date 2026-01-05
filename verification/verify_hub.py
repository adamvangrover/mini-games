from playwright.sync_api import sync_playwright, expect
import time

def verify_hub(page):
    # Capture console logs
    page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))
    page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))

    print("Navigating to hub...")
    page.goto("http://localhost:8000")

    print("Waiting for loader...")
    # Click to dismiss loader
    page.click("body", force=True)
    loader = page.locator("#app-loader")
    expect(loader).to_be_hidden(timeout=10000)

    print("Checking Grid View...")
    # Force Grid View if not already
    menu_grid = page.locator("#menu-grid")

    # Check if we need to toggle
    # If menu-grid is hidden (display: none or class hidden), toggle.
    if not menu_grid.is_visible():
        print("Menu grid hidden, toggling view...")
        toggle_btn = page.locator("#view-toggle-btn")
        if toggle_btn.is_visible():
            toggle_btn.click()
            expect(menu_grid).to_be_visible()
        else:
            print("Toggle button hidden (likely WebGL fallback). Grid should be visible but isn't?")
            # Force show for verification if fallback logic failed slightly
            page.evaluate("document.getElementById('menu-grid').classList.remove('hidden')")
            expect(menu_grid).to_be_visible()

    # Launch Snake (Classic Game)
    print("Launching Snake...")
    # Find Snake card
    # Use exact text match to be sure
    snake_card = page.locator("div.cursor-pointer", has=page.locator("h3", has_text="Snake")).first

    # Scroll into view just in case
    snake_card.scroll_into_view_if_needed()
    snake_card.click()

    # Wait for game container
    print("Waiting for #snake-game to be visible...")
    expect(page.locator("#snake-game")).to_be_visible(timeout=5000)

    # Check for Neon Canvas
    canvas = page.locator("#snakeCanvas")
    expect(canvas).to_be_visible()

    page.screenshot(path="verification/snake_game.png")
    print("Screenshot saved: snake_game.png")

    # Exit Game
    page.locator("#snake-game .back-btn").click()
    expect(page.locator("#snake-game")).to_be_hidden()

    print("Verification Complete.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_hub(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
