from playwright.sync_api import sync_playwright, expect
import time

def verify_math_blaster():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        try:
            # 1. Load the game
            page.goto("http://localhost:8000/index.html")

            # 2. Wait for initialization
            expect(page.locator("#app-loader")).to_be_hidden(timeout=10000)

            # 3. Transition to Math Blaster
            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'math-blaster' })")

            # Wait for container
            container = page.locator("#math-blaster") # ID matches the key in gameRegistry
            expect(container).to_be_visible(timeout=5000)

            # Wait for canvas inside the container
            canvas = container.locator("canvas")
            expect(canvas).to_be_visible(timeout=5000)

            # 4. Wait a bit for the game to render
            time.sleep(2)

            # Take screenshot of Trash Zapper
            page.screenshot(path="verification/math_blaster_trash.png")
            print("Trash Zapper screenshot taken.")

            # 5. Trigger transition to Recycler (cheat)
            page.evaluate("window.miniGameHub.getCurrentGame().switchState('RECYCLER')")
            time.sleep(1)
            page.screenshot(path="verification/math_blaster_recycler.png")
            print("Recycler screenshot taken.")

            # 6. Trigger transition to Boss (cheat)
            page.evaluate("window.miniGameHub.getCurrentGame().switchState('BOSS')")
            time.sleep(1)
            page.screenshot(path="verification/math_blaster_boss.png")
            print("Boss screenshot taken.")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_math_blaster()
