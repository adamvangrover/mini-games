from playwright.sync_api import sync_playwright
import time

def verify_hof():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            page.goto("http://localhost:8000/index.html")

            # Dismiss loader
            loader = page.locator("#app-loader")
            if loader.is_visible():
                page.mouse.click(100, 100)
                loader.wait_for(state="hidden", timeout=5000)

            # Wait for registry
            page.wait_for_function("() => window.miniGameHub && window.miniGameHub.gameRegistry")

            print("Entering Hall of Fame...")
            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'hall-of-fame' })")

            # Wait for HOF
            page.locator("#hall-of-fame").wait_for(state="visible", timeout=5000)
            print("HOF Visible.")

            # Check content
            text = page.locator("h1.glitched-text").inner_text()
            print(f"Title: {text}")
            if "HALL_OF_FAME" not in text:
                raise Exception("HOF Title mismatch")

            # Exit
            print("Exiting...")
            page.evaluate("window.miniGameHub.goBack()")

            # Wait for Menu
            page.locator("#menu").wait_for(state="visible", timeout=5000)
            print("Menu Visible.")

        except Exception as e:
            print(f"FAILED: {e}")
            exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    verify_hof()
