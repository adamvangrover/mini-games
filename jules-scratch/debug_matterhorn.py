from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console messages
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        # Navigate
        print("Navigating...")
        page.goto("http://localhost:8080/index.html")

        # Check if matterhornGame is defined
        is_defined = page.evaluate("() => typeof window.matterhornGame !== 'undefined'")
        print(f"matterhornGame defined: {is_defined}")

        # Click button
        print("Clicking button...")
        page.click("button[data-game='matterhorn-game']")

        # Check visibility manually
        visible = page.evaluate("() => { const el = document.getElementById('matterhorn-game'); return el && !el.classList.contains('hidden'); }")
        print(f"matterhorn-game container visible (class check): {visible}")

        browser.close()

if __name__ == "__main__":
    run()
