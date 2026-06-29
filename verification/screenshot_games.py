import time
from playwright.sync_api import sync_playwright

def screenshot_games():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Loading local server...")
        page.goto("http://localhost:8000")

        # Click to dismiss initial overlay
        print("Dismissing overlay...")
        page.mouse.click(10, 10)
        time.sleep(1)

        games = ['neon-asteroids', 'neon-defender', 'neon-sort']

        for game in games:
            print(f"Taking screenshot of game: {game}")
            # Evaluate JS to launch the game programmatically
            page.evaluate(f'''() => {{
                if (typeof window.miniGameHub !== 'undefined') {{
                    window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{game}' }});
                }}
            }}''')

            time.sleep(2) # Give it time to load module

            # Dismiss the start message by pressing space (except sort which needs click)
            if game == 'neon-sort':
                 page.mouse.click(400, 300)
            else:
                 page.keyboard.press("Space")

            time.sleep(1) # Let game logic run a bit

            page.screenshot(path=f"/home/jules/verification/{game}.png")

        browser.close()

if __name__ == "__main__":
    screenshot_games()
