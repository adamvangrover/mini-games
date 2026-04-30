import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def verify_repo_builder():
    # Start HTTP server
    server = subprocess.Popen([sys.executable, "-m", "http.server", "8085"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Started HTTP server on port 8085")
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

            print("Navigating...")
            page.goto("http://localhost:8085/index.html")

            # Dismiss Loader
            try:
                page.click("body", timeout=2000)
            except:
                pass

            # Inject Game directly to test logic quickly
            print("Injecting Game...")
            page.evaluate("""async () => {
                const container = document.createElement('div');
                container.id = 'test-container';
                container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;';
                document.body.appendChild(container);

                const module = await import('./js/games/repoBuilder.js');
                const Game = module.default;
                window.gameInstance = new Game();
                await window.gameInstance.init(container);
            }""")

            # Verify Render
            page.wait_for_selector("#rb-loc")
            print("PASS: Dashboard rendered")

            # Click Write Code button
            loc_before = page.evaluate("() => window.gameInstance.linesOfCode")
            print(f"LOC Before: {loc_before}")

            page.click("#rb-btn-code")

            loc_after = page.evaluate("() => window.gameInstance.linesOfCode")
            print(f"LOC After: {loc_after}")

            if loc_after <= loc_before:
                print("FAIL: Write Code button didn't increase LOC")
                sys.exit(1)
            else:
                print("PASS: Write Code button works")

            page.screenshot(path="verification/repo_builder_verified.png")
            browser.close()
            print("--- Verification Successful ---")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        server.terminate()

if __name__ == "__main__":
    verify_repo_builder()
