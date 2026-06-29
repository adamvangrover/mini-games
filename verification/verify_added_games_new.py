import time
from playwright.sync_api import sync_playwright

def verify_games():
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
            print(f"Testing game: {game}")
            # Evaluate JS to launch the game programmatically
            result = page.evaluate(f'''() => {{
                try {{
                    if (typeof window.miniGameHub !== 'undefined' && typeof window.miniGameHub.transitionToState !== 'undefined') {{
                        window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{game}' }});
                        return 'Success';
                    }} else {{
                        return 'Hub not found';
                    }}
                }} catch(e) {{
                    return e.toString();
                }}
            }}''')

            print(f"Launch command result: {result}")
            time.sleep(2) # Give it time to load module

            # Check if container is visible and canvas exists
            is_visible = page.evaluate(f'''() => {{
                const el = document.getElementById('{game}');
                if (!el) return 'Element not found';
                if (el.classList.contains('hidden')) return 'Element is hidden';
                if (!el.querySelector('canvas')) return 'Canvas not found';
                return 'OK';
            }}''')

            print(f"Container state: {is_visible}")
            if is_visible != 'OK':
                print(f"FAILED: {game} did not load correctly.")
                browser.close()
                exit(1)

            print(f"SUCCESS: {game} loaded correctly.\n")

        browser.close()

if __name__ == "__main__":
    verify_games()
