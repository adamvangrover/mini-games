from playwright.sync_api import sync_playwright

def verify_neon_stack():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile viewport
        context = browser.new_context(viewport={'width': 412, 'height': 915})
        page = context.new_page()

        print("Loading Main Menu...")
        page.goto("http://localhost:8000/index.html")
        page.wait_for_timeout(2000)

        # Test Neon Stack
        print("Testing Neon Stack...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-stack' })")
        page.wait_for_timeout(1000)

        if page.query_selector('#neon-stack canvas'):
            print("Neon Stack loaded successfully.")
        else:
            print("ERROR: Neon Stack canvas not found.")

        page.screenshot(path="verification/neon_stack.png")

        browser.close()

if __name__ == "__main__":
    verify_neon_stack()
