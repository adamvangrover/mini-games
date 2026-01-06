from playwright.sync_api import sync_playwright
import time

def verify_daily_challenge():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console messages
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        try:
            page.goto("http://localhost:8000/index.html")

            # Click to start (dismiss loader)
            try:
                page.wait_for_selector("#app-loader", timeout=5000)
                page.click("body", force=True)
                page.wait_for_selector("#app-loader", state="hidden", timeout=5000)
            except Exception as e:
                print(f"Loader handling info: {e}")

            # Wait for game registry
            print("Waiting for window.miniGameHub...")
            page.wait_for_function("() => window.miniGameHub && window.miniGameHub.gameRegistry", timeout=10000)
            print("miniGameHub loaded.")

            # Force Grid View if in 3D mode (to see the cards)
            page.evaluate("() => { if(window.miniGameHub.is3DView) document.getElementById('view-toggle-btn').click(); }")

            # Reload loop
            for i in range(20):
                if i > 0:
                    page.reload()
                    # Click loader again if it appears
                    try:
                        page.wait_for_selector("#app-loader", timeout=2000)
                        page.click("body", force=True)
                    except:
                        pass

                    page.wait_for_function("() => window.miniGameHub && window.miniGameHub.gameRegistry")

                    # Force Grid View again
                    # We can access internal state via exposed API or just click button if visible
                    # Or we can just inspect the dailyChallengeGameId variable via a custom exposed function or DOM
                    # But simpler to just read DOM

                    # Ensure menu grid is visible (Grid View)
                    # js/main.js logic: default might be 3D.
                    # We can check is3DView
                    page.evaluate("""() => {
                        const btn = document.getElementById('view-toggle-btn');
                        const text = document.getElementById('view-toggle-text');
                        if (text && text.textContent.includes('Grid View')) {
                            // It says 'Grid View', which means we are currently in 3D view (button toggles TO grid view? No, text usually shows current mode or target mode?)
                            // Let's check main.js:
                            // if (is3DView) btnText.textContent = 'Grid View'; -> Clicking it goes to Grid View?
                            // No, typically button says "Switch to Grid View".
                            // main.js says: if (is3DView) btnText.textContent = 'Grid View';
                            // wait... if is3DView is true, text is 'Grid View'. Does that mean "Current is Grid" or "Click for Grid"?
                            // The icon is fa-cube.
                            // toggleView() flips is3DView.
                            // If is3DView becomes true: btnText = 'Grid View'.
                            // If is3DView becomes false: btnText = '3D View'.
                            // So if text is 'Grid View', we are in 3D mode. We want 2D mode to see the grid.
                            // So we should click it.
                            btn.click();
                        }
                    }""")

                    # Wait for grid
                    page.wait_for_selector("#menu-grid .group", timeout=5000)

                # Find the card with "DAILY CHALLENGE" text
                # Note: The text is inside a div with specific text.
                daily_card_count = page.locator("#menu-grid .group", has_text="DAILY CHALLENGE").count()

                if daily_card_count == 0:
                    print(f"Iteration {i}: No daily challenge found yet. Waiting...")
                    time.sleep(1)
                    daily_card_count = page.locator("#menu-grid .group", has_text="DAILY CHALLENGE").count()

                if daily_card_count == 0:
                    # Maybe it's not rendered yet?
                    print(f"Iteration {i}: Still no daily challenge found.")
                    continue

                daily_card = page.locator("#menu-grid .group", has_text="DAILY CHALLENGE").first

                # Get the game name
                game_name = daily_card.locator("h3").inner_text()
                print(f"Iteration {i}: Daily Challenge is '{game_name}'")

                # Verify category
                is_system = page.evaluate(f"""
                    () => {{
                        const registry = window.miniGameHub.gameRegistry;
                        const game = Object.values(registry).find(g => g.name === "{game_name}");
                        return game ? game.category === 'System' : false;
                    }}
                """)

                if is_system:
                    print(f"FAILURE: System game '{game_name}' selected as Daily Challenge!")
                    browser.close()
                    exit(1)

            print("Verification passed: No System games selected in 20 reloads.")

        except Exception as e:
            print(f"Script Error: {e}")
            browser.close()
            exit(1)

        browser.close()

if __name__ == "__main__":
    verify_daily_challenge()
