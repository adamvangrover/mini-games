from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('http://localhost:8000')
    time.sleep(5)
    page.mouse.click(10, 10)
    time.sleep(2)
    page.evaluate('window.miniGameHub.transitionToState("IN_GAME", { gameId: "whale-scanner" })')
    time.sleep(2)

    # Simulate clicks
    page.mouse.click(200, 200)
    time.sleep(0.5)
    page.mouse.click(300, 300, button="right")
    time.sleep(0.5)

    # Get game state
    agents = page.evaluate('''
        () => {
            const game = window.miniGameHub.getCurrentGame();
            return game ? game.agents : "NO GAME";
        }
    ''')
    print("Agents:", agents)
    browser.close()
