import asyncio
import os
import sys
from playwright.async_api import async_playwright

# Ensure we're running in the repo root
REPO_ROOT = os.getcwd()
sys.path.append(REPO_ROOT)

async def verify_trophy_room_decorations():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        context = await browser.new_context()
        page = await context.new_page()

        # Route console logs to python stdout
        page.on("console", lambda msg: print(f"BROWSER: {msg.text}"))
        page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))

        # Start a local server if not running (Assuming running on port 8000 externally or we just file:// with args if allowed, but module support needs http)
        # For simplicity in this env, we assume the user/env has a server or we use file:// with strict checks disabled if possible,
        # but modules require http. Let's assume http://localhost:8000 is available as per standard procedure.

        # Inject Save Data with decorations unlocked
        mock_save_data = {
            "version": 1.2,
            "unlockedItems": ["deco_plant", "deco_rug", "deco_vending", "deco_stool"],
            "achievements": [],
            "totalCurrency": 9999
        }

        # We need a way to serve the files.
        # Assuming there is a server running on port 8000 as per common practice in this repo
        url = "http://localhost:8000/index.html"

        print(f"Navigating to {url}...")
        try:
            await page.goto(url, timeout=10000)
        except Exception as e:
            print(f"Failed to load {url}. Is the server running? {e}")
            await browser.close()
            return

        # Inject mock data into localStorage
        import json
        save_str = json.dumps(mock_save_data)
        encoded = save_str.encode("utf-8")
        import base64
        b64_save = base64.b64encode(encoded).decode("utf-8")

        print("Injecting save data...")
        await page.evaluate(f"""
            localStorage.setItem('miniGameHub_v1', '{b64_save}');
            // Reload to apply
            // location.reload();
        """)

        # Since we can't easily reload without losing the playwright context hook sometimes,
        # let's just manually re-init the save system or reload the page
        await page.reload()
        await page.wait_for_load_state("networkidle")

        # Wait for app loader
        try:
            # Dismiss "Click to Start" if present
            if await page.is_visible("#app-loader"):
                await page.click("body", force=True)
                await page.wait_for_selector("#app-loader", state="hidden", timeout=5000)
        except:
            print("Loader interaction skipped or failed.")

        # Transition to Trophy Room directly
        print("Transitioning to Trophy Room...")
        await page.evaluate("""
            window.miniGameHub.transitionToState('TROPHY_ROOM');
        """)

        # Wait for Three.js scene initialization
        await asyncio.sleep(3)

        print("Verifying decorations in 3D scene...")

        # Check scene children
        decorations = await page.evaluate("""
            () => {
                if (!window.trophyRoomInstance || !window.trophyRoomInstance.scene) return [];
                const decos = [];
                window.trophyRoomInstance.scene.traverse(obj => {
                    if (obj.userData && obj.userData.type === 'decoration') {
                        decos.push(obj.userData.decoId);
                    }
                });
                return decos;
            }
        """)

        print(f"Found decorations: {decorations}")

        expected = ["deco_plant", "deco_rug", "deco_vending", "deco_stool"]
        # Allow partial match if scene loading is staggered, but we expect all
        missing = [d for d in expected if d not in decorations]

        if not missing:
            print("SUCCESS: All expected decorations found in the scene.")
        else:
            print(f"FAILURE: Missing decorations: {missing}")
            # Take screenshot
            os.makedirs("verification/screenshots", exist_ok=True)
            await page.screenshot(path="verification/screenshots/trophy_decorations_fail.png")
            sys.exit(1)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_trophy_room_decorations())
