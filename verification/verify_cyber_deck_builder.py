from playwright.sync_api import sync_playwright
import time
import os

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:8000')

        # Wait for the loader to finish and the hub to be ready
        print("Waiting for hub to load...")
        time.sleep(5)

        # Click to dismiss any overlay
        print("Clicking to dismiss loader...")
        page.mouse.click(10, 10)
        time.sleep(2)

        try:
            page.wait_for_selector('#app-loader', state='hidden', timeout=15000)
        except Exception:
            pass

        print("Transitioning to cyber-deck-builder...")
        page.evaluate('window.miniGameHub.transitionToState("IN_GAME", { gameId: "cyber-deck-builder" })')

        # Wait for game to initialize
        time.sleep(2)

        # Verify container is visible
        is_visible = page.evaluate('document.getElementById("cyber-deck-builder").classList.contains("hidden") === false')
        if not is_visible:
            print("ERROR: cyber-deck-builder container is still hidden.")
            browser.close()
            return False

        # Verify canvas exists
        has_canvas = page.evaluate('document.querySelector("#cyber-deck-builder canvas") !== null')

        if not has_canvas:
            print("ERROR: Canvas missing.")
            browser.close()
            return False

        print("Testing shutdown...")
        page.evaluate('window.miniGameHub.transitionToState("MENU")')
        time.sleep(1)

        is_hidden = page.evaluate('document.getElementById("cyber-deck-builder").classList.contains("hidden") === true')
        if not is_hidden:
            print("ERROR: cyber-deck-builder container is still visible after shutdown.")
            browser.close()
            return False

        print("Cyber Deck Builder verification passed successfully.")
        browser.close()
        return True

if __name__ == '__main__':
    if verify():
        print("SUCCESS")
    else:
        print("FAILURE")
        exit(1)
