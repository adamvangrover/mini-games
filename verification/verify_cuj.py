from playwright.sync_api import sync_playwright
import os

def run_cuj(page):
    # Navigate to standalone battleship
    page.goto("http://localhost:8000/battleship.html")
    page.wait_for_timeout(1000)
    page.screenshot(path="verification/screenshots/battleship_start.png")

    page.get_by_role("button", name="INITIATE LINK").click()
    page.wait_for_timeout(1000)
    page.screenshot(path="verification/screenshots/battleship_game.png")

    # Navigate to standalone vaultbreaker
    page.goto("http://localhost:8000/vaultbreaker.html")
    page.wait_for_timeout(1000)
    page.screenshot(path="verification/screenshots/vaultbreaker_start.png")

    page.get_by_role("button", name="> RUN EXPLOIT").click()
    page.wait_for_timeout(1000)
    page.screenshot(path="verification/screenshots/vaultbreaker_game.png")

    # Navigate to main hub
    page.goto("http://localhost:8000/index.html")
    page.wait_for_timeout(2000)
    # Start the app
    page.mouse.click(10, 10)
    page.wait_for_timeout(1000)

    # Try to find the new games in the grid
    page.evaluate("if(window.miniGameHub.is3DView) window.miniGameHub.toggleView()")
    page.wait_for_timeout(1000)
    page.screenshot(path="verification/screenshots/hub_grid.png")

if __name__ == "__main__":
    os.makedirs("verification/screenshots", exist_ok=True)
    os.makedirs("verification/videos", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="verification/videos",
            viewport={'width': 1280, 'height': 720}
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
