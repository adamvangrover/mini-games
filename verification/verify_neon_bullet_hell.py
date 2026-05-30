from playwright.sync_api import sync_playwright, expect

def verify_game(page):
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

    if not menu_grid.is_visible():
        print("Menu grid hidden, toggling view...")
        toggle_btn = page.locator("#view-toggle-btn")
        if toggle_btn.is_visible():
            toggle_btn.click()
            expect(menu_grid).to_be_visible()
        else:
            page.evaluate("document.getElementById('menu-grid').classList.remove('hidden')")
            expect(menu_grid).to_be_visible()

    # Launch Neon Bullet Hell
    print("Launching Neon Bullet Hell...")
    # Find the game card
    game_card = page.locator("div.cursor-pointer", has=page.locator("h3", has_text="Neon Bullet Hell")).first

    game_card.scroll_into_view_if_needed()
    game_card.click()

    # Wait for game container
    print("Waiting for #neon-bullet-hell to be visible...")
    game_container = page.locator("#neon-bullet-hell")
    expect(game_container).to_be_visible(timeout=5000)

    # Check for Canvas
    canvas = page.locator("#bullet-hell-canvas")
    expect(canvas).to_be_visible()

    page.screenshot(path="verification/neon_bullet_hell.png")
    print("Screenshot saved: verification/neon_bullet_hell.png")

    # Exit Game
    page.locator("#neon-bullet-hell .back-btn").click()
    expect(game_container).to_be_hidden()

    print("Verification Complete.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_game(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_neon_bullet_hell.png")
        finally:
            browser.close()
