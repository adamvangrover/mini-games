from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:8080")

        # Handle loader
        try:
            page.wait_for_selector("#app-loader", state="visible", timeout=5000)
            page.click("#app-loader")
            page.wait_for_selector("#app-loader", state="hidden", timeout=5000)
            print("Loader dismissed.")
        except Exception as e:
            print("Loader handling issue (might be already hidden):", e)

        # Switch to Grid View
        try:
            page.click("#view-toggle-btn")
            print("Switched to Grid View.")
        except:
            print("Could not click view toggle (maybe already in grid view or mobile?)")

        # Find and click game
        print("Starting Neon Hunter 64...")
        # Search for text "Neon Hunter 64"
        game_card = page.locator("text=Neon Hunter 64")
        if game_card.count() > 0:
            game_card.first.click()
        else:
            print("Game card not found via text, trying attribute...")
            # Fallback logic if needed
            return

        # Wait for game container
        page.wait_for_selector("#neon-hunter", state="visible", timeout=10000)
        print("Game container visible.")

        # Wait for game menu
        menu = page.frame_locator("#neon-hunter iframe").locator("h1:has-text('NEON HUNTER 64')")
        # Wait, it's not an iframe, it's a div.
        menu = page.locator("#neon-hunter h1:has-text('NEON HUNTER 64')")
        menu.wait_for(state="visible", timeout=5000)
        print("In-game menu visible.")

        # Start Deer Hunt
        print("Starting Deer Hunt mode...")
        page.click("button[data-mode='deer']")

        # Check HUD
        page.wait_for_selector("#nh-score", state="visible", timeout=2000)
        print("HUD visible. Game running.")

        # Wait a bit
        page.wait_for_timeout(2000)

        # Check for canvas
        if page.locator("#neon-hunter canvas").count() > 0:
            print("Canvas is present.")
        else:
            print("Canvas missing!")

        browser.close()

if __name__ == "__main__":
    run()
