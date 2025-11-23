from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the game
        page.goto("http://localhost:8080/index.html")

        # Click the Matterhorn button
        page.click("button[data-game='matterhorn-game']")

        # Wait for the game canvas to be visible
        page.wait_for_selector("#matterhornCanvas", state="visible")

        # Wait a bit for Three.js to render the scene
        time.sleep(2)

        # Take screenshot of the start screen
        page.screenshot(path="jules-scratch/matterhorn_v2_start.png")

        # Click "Begin Ascent"
        page.click("#mh-start-btn", force=True)

        # Wait for game to transition
        time.sleep(3)

        # Take screenshot of the gameplay
        page.screenshot(path="jules-scratch/matterhorn_v2_gameplay.png")

        browser.close()

if __name__ == "__main__":
    run()
