from playwright.sync_api import sync_playwright
import os

def verify_background():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(f"file://{os.getcwd()}/index.html")

        # Wait a bit for the JS to run
        page.wait_for_timeout(2000)

        # We don't need to wait for it to be "visible" in the playwright sense if it's hidden by CSS initially
        # Let's just take a screenshot of the whole page
        page.screenshot(path="verification/background_shader_optimized.png")

        browser.close()

if __name__ == "__main__":
    verify_background()
