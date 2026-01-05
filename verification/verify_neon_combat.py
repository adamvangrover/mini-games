from playwright.sync_api import sync_playwright

def verify_combat():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PageError: {err}"))

        print("Loading...")
        page.goto("http://localhost:8000/index.html")
        page.wait_for_selector("#app-loader", state="hidden", timeout=5000)

        print("Launching Neon Combat...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-combat' })")

        # Wait for game container
        page.wait_for_selector("#neon-combat canvas", timeout=3000)
        page.wait_for_timeout(1000)

        # Check for UI elements
        hp_bar = page.query_selector("#p1-hp")
        if hp_bar:
            print("HP Bar found.")
        else:
            print("HP Bar NOT found.")

        # Simulate Input (Jump)
        print("Simulating Jump...")
        page.keyboard.press("w")
        page.wait_for_timeout(500)

        # Simulate Attack
        print("Simulating Attack...")
        page.keyboard.press("f")
        page.wait_for_timeout(500)

        page.screenshot(path="verification/verify_neon_combat.png")
        print("Screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_combat()
