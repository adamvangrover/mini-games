import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def verify_corp_risk():
    server = subprocess.Popen([sys.executable, "-m", "http.server", "8087"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Started HTTP server on port 8087")
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

            print("Navigating...")
            page.goto("http://localhost:8087/index.html")

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

                const module = await import('./js/games/corpRisk.js');
                const Game = module.default;
                window.gameInstance = new Game();
                await window.gameInstance.init(container);
            }""")

            time.sleep(2)
            page.screenshot(path="verification/corp_risk.png")
            print("PASS: Screenshot saved to verification/corp_risk.png")

            # Click on Player node 0
            page.evaluate("""() => {
                const canvas = window.gameInstance.canvas;
                const rect = canvas.getBoundingClientRect();
                const node0 = window.gameInstance.nodes[0];
                const x = node0.x * canvas.width + rect.left;
                const y = node0.y * canvas.height + rect.top;

                const event = new MouseEvent('click', {
                    clientX: x,
                    clientY: y
                });
                canvas.dispatchEvent(event);
            }""")
            time.sleep(1)

            selected = page.evaluate("() => window.gameInstance.selectedNode?.id")
            if selected != 0:
                print(f"FAIL: Node 0 was not selected. Selected: {selected}")
                sys.exit(1)
            else:
                print("PASS: Node selected")

            print("PASS: Verification Successful")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        server.terminate()

if __name__ == "__main__":
    verify_corp_risk()
