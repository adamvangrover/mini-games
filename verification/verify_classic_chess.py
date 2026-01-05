from playwright.sync_api import sync_playwright

def verify_classic_chess():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:8080/index.html")

        # Handle Loader
        try:
            loader = page.locator("#app-loader")
            if loader.is_visible():
                loader.click()
                page.wait_for_selector("#app-loader", state="hidden")
        except: pass

        # Transition to Classic Chess
        print("Starting Classic Chess...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'classic-chess-game' })")

        # Verify Main Menu
        page.wait_for_selector("#chess-main-menu", state="visible")
        print("Chess Menu Visible.")
        page.screenshot(path="verification/chess_menu.png")

        # Verify Tutorials
        print("Opening Tutorials...")
        page.evaluate("document.querySelector('#chess-main-menu button:nth-child(3)').click()")
        # Or dispatch event
        # page.evaluate("document.querySelector('.menu-btn:nth-child(3)').dispatchEvent(new CustomEvent('mode', {bubbles:true, detail:'TUTORIAL'}))")

        page.wait_for_selector("#chess-tutorials", state="visible")
        print("Tutorials Visible.")
        page.screenshot(path="verification/chess_tutorials.png")

        # Go Back
        page.evaluate("document.getElementById('chess-tutorials').classList.add('hidden'); document.getElementById('chess-main-menu').classList.remove('hidden');")

        # Verify AI Setup
        print("Opening AI vs AI Setup...")
        page.evaluate("document.querySelector('#chess-main-menu button:nth-child(2)').click()")
        page.wait_for_selector("#chess-setup-aivai", state="visible")
        print("AI Setup Visible.")
        page.screenshot(path="verification/chess_aivai.png")

        browser.close()

if __name__ == "__main__":
    verify_classic_chess()
