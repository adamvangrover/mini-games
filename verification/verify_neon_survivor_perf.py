import time
from playwright.sync_api import sync_playwright

def main():
    print("Starting Playwright verification for Neon Survivor optimization...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        errors = []
        page.on("pageerror", lambda err: errors.append(err.message))
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)

        try:
            print("Navigating to index.html...")
            page.goto("http://localhost:8000/index.html", timeout=10000)

            # Wait for any generic body container or just time sleep to ensure loading
            print("Waiting for page load...")
            time.sleep(3)

            # Dismiss click anywhere screen
            page.mouse.click(10, 10)
            time.sleep(1)

            # Launch Neon Survivor
            print("Launching Neon Survivor...")
            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-survivor' })")

            # Wait a few seconds to let the game run and spawn enemies/projectiles
            print("Letting game run for 4 seconds...")
            time.sleep(4)

            # Let's also evaluate the score or health to see if it's changing
            hp = page.evaluate("window.currentGameInstance ? window.currentGameInstance.player.hp : 'Not found'")
            print(f"Player HP: {hp}")

            if errors:
                print("❌ Errors detected during execution:")
                for err in errors:
                    print(f"  - {err}")
                exit(1)
            else:
                print("✅ Game ran successfully with no errors. Optimization verified.")

        except Exception as e:
            print(f"❌ Verification failed due to exception: {e}")
            exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    main()
