
import os
import time
from playwright.sync_api import sync_playwright, expect

def verify_neon_hunter():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # 1. Load the Hub
        print("Loading Hub...")
        page.goto("http://localhost:8000/index.html")

        # Click to start (bypass loader)
        # Loader fades out in 1s.
        page.click("#app-loader")
        time.sleep(2) # Wait for fade

        # Wait for WebGL initialization
        time.sleep(5)

        # 2. Verify Cabinet in 3D View
        print("Capturing Cabinet Screenshot...")

        # Move closer for better screenshot
        page.evaluate("""
            const hub = window.miniGameHub.arcadeHub;
            if(hub && hub.scene) {
                const cabinet = hub.cabinets.find(c => c.userData.gameId === 'neon-hunter');
                if(cabinet) {
                    // Move player very close
                    hub.player.position.set(cabinet.position.x, hub.player.height, cabinet.position.z + 2.5);

                    // Force camera
                    hub.camera.position.set(cabinet.position.x, 1.4, cabinet.position.z + 2.0);
                    hub.camera.lookAt(cabinet.position.x, 1.3, cabinet.position.z);
                    hub.pitch = 0;
                    hub.yaw = Math.PI;
                    hub.updateCameraRotation();
                }
            }
        """)

        time.sleep(1)
        page.screenshot(path="verification/neon_hunter_cabinet.png")
        print("Cabinet screenshot saved.")

        # 3. Launch Game via Direct Call (More reliable than clicking 3D object in headless)
        print("Launching Neon Hunter...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-hunter' })")

        # Wait for Game Menu
        page.wait_for_selector("h1.text-4xl", timeout=10000) # NEON HUNTER 64

        # 4. Start Deer Hunt
        print("Starting Deer Hunt...")
        page.click("button[data-mode='deer']")

        time.sleep(2) # Wait for init

        # Verify HUD
        # Should be 6 now that we stopped propagation (Deer Hunt has 6)
        expect(page.locator("#nh-ammo")).to_have_text("6")
        print("Ammo verified.")

        # 5. Screenshot Gameplay
        print("Capturing Gameplay Screenshot...")
        page.screenshot(path="verification/neon_hunter_gameplay.png")
        print("Gameplay screenshot saved.")

        browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    verify_neon_hunter()
