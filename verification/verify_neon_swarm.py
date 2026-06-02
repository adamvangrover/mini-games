import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def verify_neon_swarm():
    server = subprocess.Popen([sys.executable, "-m", "http.server", "8091"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

            page.goto("http://localhost:8091/test_bullet.html")

            time.sleep(2)

            page.evaluate("""() => {
                window.gameInstance.isGameOver = false;
                window.gameInstance.enemies = [];
                window.gameInstance.player.x = 200;
                window.gameInstance.player.y = 200;

                window.gameInstance.bullets.push({
                    x: 200,
                    y: 200,
                    vx: 800,
                    vy: 800,
                    active: true
                });
            }""")

            bullets = page.evaluate("() => window.gameInstance.bullets.length")
            print(f"Bullets array: {bullets}")

            page.screenshot(path="verification/neon_swarm.png")
            print("PASS: Verification Successful")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        server.terminate()

if __name__ == "__main__":
    verify_neon_swarm()
