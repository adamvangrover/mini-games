from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Verify standalone HTML
        print("Testing standalone corp_risk.html...")
        page.goto("http://localhost:8000/corp_risk.html")
        page.wait_for_selector("#start-screen", state="visible")
        assert page.inner_text("h1") == "CORP RISK"
        print("Standalone page loaded successfully.")

        # Test hub integration
        print("Testing hub integration...")
        page.goto("http://localhost:8000")

        # Dismiss loader
        page.mouse.click(10, 10)
        page.wait_for_selector("#menu", state="visible")

        # Start game programmatically
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'corp-risk-game' })")

        # Ensure game container is visible and has the iframe
        page.wait_for_selector("#corp-risk-game iframe", state="visible")
        print("Game adapter loaded in Hub successfully.")

        browser.close()

if __name__ == "__main__":
    run()
