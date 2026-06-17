from playwright.sync_api import sync_playwright
import time
import sys

def verify_whalescanner():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        try:
            print("Navigating to http://localhost:8000...")
            page.goto("http://localhost:8000")
            page.wait_for_load_state("networkidle")

            # Start the app
            loader = page.locator("#app-loader")
            if loader.is_visible():
                page.click("body")
                time.sleep(1)

            print("Launching WhaleScanner via JS...")
            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'whale-scanner' })")
            time.sleep(3) # Wait slightly longer for UI to render

            print("Checking UI Overlays...")

            # Check for header
            header_text = page.locator(".glitch-text").inner_text()
            if "OPERATION ABSOLUTE RESOLVE" not in header_text:
                print(f"FAILED: Expected header text, got {header_text}")
                sys.exit(1)

            # Evaluate JS directly to find the heat bar since it might be deeply nested or hidden from Playwright's locator somehow
            heat_bar_exists = page.evaluate('document.getElementById("ws-heat-bar") !== null')
            if not heat_bar_exists:
                 print("FAILED: Heat bar ID not found in DOM via JS evaluation.")
                 sys.exit(1)

            print("UI verified successfully. Testing interactions...")

            # Click canvas a few times to test deployment and heat generation
            canvas = page.locator("#whale-scanner canvas")
            for _ in range(5):
                # Ensure we click within the canvas bounds to deploy agents
                box = canvas.bounding_box()
                if box:
                    page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                time.sleep(0.1)

            time.sleep(1)

            # Check heat value from width
            width_style = page.evaluate('document.getElementById("ws-heat-bar").style.width')
            print(f"Heat bar width after clicks: {width_style}")
            if width_style == "0%" or not width_style:
                print("FAILED: Heat bar did not increase.")
                sys.exit(1)

            print("WhaleScanner Overhaul verification SUCCESS.")
            sys.exit(0)

        except Exception as e:
            print(f"FAILED with error: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    verify_whalescanner()
