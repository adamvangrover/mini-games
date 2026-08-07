from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="/home/jules/verification/videos")
        page = context.new_page()

        try:
            print("Loading Hub...")
            page.goto("http://localhost:8000")
            page.wait_for_timeout(1000)

            # Dismiss loader
            page.mouse.click(10, 10)
            page.wait_for_selector("#menu", state="visible")
            page.wait_for_timeout(1000)

            # 1. Verify Cyber Wheel
            print("Launching Cyber Wheel...")
            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'cyber-wheel-game' })")
            page.wait_for_selector("#cyber-wheel-game iframe", state="visible")
            page.wait_for_timeout(2000) # Let game load

            # Take screenshot of Cyber Wheel
            page.screenshot(path="/home/jules/verification/screenshots/cyber_wheel_hub.png")
            page.wait_for_timeout(1000)

            # Go back to menu
            page.evaluate("window.miniGameHub.goBack()")
            page.wait_for_selector("#menu", state="visible")
            page.wait_for_timeout(1000)

            # 2. Verify Corp Risk
            print("Launching Corp Risk...")
            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'corp-risk-game' })")
            page.wait_for_selector("#corp-risk-game iframe", state="visible")
            page.wait_for_timeout(2000) # Let game load

            # Take screenshot of Corp Risk
            page.screenshot(path="/home/jules/verification/screenshots/corp_risk_hub.png")
            page.wait_for_timeout(1000)

            print("Verification complete.")
        finally:
            context.close()
            browser.close()

if __name__ == "__main__":
    import os
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    run()
