
import os
import sys
import time
import subprocess
import base64
import json
from playwright.sync_api import sync_playwright
import datetime

def verify_neon_scavenger():
    # Start HTTP server
    server = subprocess.Popen([sys.executable, "-m", "http.server", "8083"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Started HTTP server on port 8083")
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            print("Navigating...")
            page.goto("http://localhost:8083/index.html")

            # Dismiss Loader
            try:
                page.click("body", timeout=2000)
            except:
                pass

            # 1. Setup LocalStorage
            print("Setting up Quest...")
            page.wait_for_function("() => window.miniGameHub && window.miniGameHub.saveSystem")

            page.evaluate("""() => {
                const sys = window.miniGameHub.saveSystem;

                // Calculate today index exactly as SaveSystem does
                const now = new Date();
                const today = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);

                sys.data.dailyQuests = {
                    date: today,
                    quests: [
                        { id: 'test_quest', desc: 'Recover 1 Data Shard', target: 1, progress: 0, claimed: false }
                    ]
                };
                sys.save();
            }""")

            page.reload()
            try:
                page.click("body", timeout=2000) # Dismiss loader again
            except:
                pass

            # 2. Inject NeonScavenger
            print("Injecting Game...")
            page.evaluate("""async () => {
                const container = document.createElement('div');
                container.id = 'test-container';
                container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;';
                document.body.appendChild(container);

                const module = await import('./js/games/neonScavenger.js');
                const Game = module.default;
                window.gameInstance = new Game();
                await window.gameInstance.init(container);
            }""")

            # 3. Verify Render
            page.wait_for_selector("#ns-grid")
            print("PASS: Grid rendered")

            # 4. Find and Click Item
            print("Hunting for Data Shard...")
            found = page.evaluate("""() => {
                const game = window.gameInstance;
                const idx = game.grid.findIndex(i => i && i.id === 'data_shard');
                if (idx === -1) return false;

                const cell = document.querySelector(`[data-idx="${idx}"]`);
                cell.click();
                return true;
            }""")

            if found:
                print("PASS: Clicked Data Shard")
                # 5. Verify Progress
                progress = page.evaluate("""() => {
                    const sys = window.miniGameHub.saveSystem;
                    const q = sys.getDailyQuests().find(q => q.id === 'test_quest');
                    return q ? q.progress : -1;
                }""")

                if progress == 1:
                    print("PASS: Quest progress updated!")
                else:
                    print(f"FAIL: Quest progress {progress} != 1")
                    # Debug
                    quests = page.evaluate("() => window.miniGameHub.saveSystem.getDailyQuests()")
                    print(f"Quests found: {quests}")
                    sys.exit(1)
            else:
                print("WARN: No Data Shard spawned (rng).")

            browser.close()
            print("--- Verification Successful ---")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        server.terminate()

if __name__ == "__main__":
    verify_neon_scavenger()
