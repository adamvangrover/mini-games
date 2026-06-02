import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def verify_cyber_deal():
    server = subprocess.Popen([sys.executable, "-m", "http.server", "8089"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Started HTTP server on port 8089")
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            print("Navigating...")
            page.goto("http://localhost:8089/index.html")

            try:
                page.click("body", timeout=2000)
            except:
                pass

            print("Injecting Game...")
            page.evaluate("""async () => {
                const container = document.createElement('div');
                container.id = 'test-container';
                container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;';
                document.body.appendChild(container);

                const module = await import('./js/games/cyberDeal.js');
                const Game = module.default;
                window.gameInstance = new Game();
                await window.gameInstance.init(container);
            }""")

            time.sleep(2)
            page.screenshot(path="verification/cyber_deal.png")
            print("PASS: Screenshot saved")

            # Click case 1
            page.evaluate("""() => {
                const layout = window.gameInstance.getLayout();
                const pos = layout.find(l => l.id === 1);
                const canvas = window.gameInstance.canvas;
                const rect = canvas.getBoundingClientRect();
                const event = new MouseEvent('click', { clientX: pos.x + 10 + rect.left, clientY: pos.y + 10 + rect.top });
                canvas.dispatchEvent(event);
            }""")
            time.sleep(1)

            state = page.evaluate("() => window.gameInstance.state")
            if state != 'OPEN_CASES':
                print(f"FAIL: State did not change to OPEN_CASES. State: {state}")
                sys.exit(1)
            else:
                print("PASS: Selected initial case")

            print("PASS: Verification Successful")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        server.terminate()

if __name__ == "__main__":
    verify_cyber_deal()
