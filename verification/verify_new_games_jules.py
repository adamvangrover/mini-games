from playwright.sync_api import sync_playwright

def verify_new_games():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000")

        # Dismiss loader
        try:
            page.wait_for_selector("#app-loader", state="visible", timeout=2000)
            page.click("#app-loader")
        except:
            page.click("body")

        page.wait_for_timeout(2000) # Wait for fade out and init

        # Ensure Grid View
        try:
            toggle_text = page.locator("#view-toggle-text")
            if toggle_text.is_visible():
                text = toggle_text.text_content()
                if "Grid View" in text:
                    print("Switching to Grid View")
                    page.locator("#view-toggle-btn").click()
                    page.wait_for_timeout(1000)
        except Exception as e:
            print(f"Toggle view error: {e}")

        # Wait for menu grid
        page.wait_for_selector("#menu-grid", state="visible", timeout=5000)

        # Verify Neon Match
        print("Looking for Neon Match...")
        # Use a more specific selector to avoid partial matches if any, but text is fine
        match_card = page.locator("#menu-grid").get_by_text("Neon Match", exact=True)
        # Scroll to it if needed? Playwright handles scrolling on click/visible check usually.
        match_card.wait_for(state="visible", timeout=5000)
        print("Neon Match found")

        # Click Neon Match (click the parent card roughly)
        match_card.click()

        # Check for game title
        print("Waiting for game load...")
        page.wait_for_selector("h2:has-text('NEON MATCH')", timeout=5000)
        page.screenshot(path="verification/neon_match.png")
        print("Neon Match loaded and screenshot taken")

        # Go back
        page.click(".back-btn")
        page.wait_for_timeout(1000)

        # Verify Tic Tac Toe
        print("Looking for Tic Tac Toe...")
        ttt_card = page.locator("#menu-grid").get_by_text("Tic Tac Toe", exact=True)
        ttt_card.wait_for(state="visible", timeout=5000)
        print("Tic Tac Toe found")

        # Click Tic Tac Toe
        ttt_card.click()

        # Check for game title
        print("Waiting for game load...")
        page.wait_for_selector("h2:has-text('TIC TAC TOE')", timeout=5000)
        page.screenshot(path="verification/neon_tictactoe.png")
        print("Tic Tac Toe loaded and screenshot taken")

        browser.close()

if __name__ == "__main__":
    verify_new_games()
