import asyncio
from playwright.async_api import async_playwright
import os

async def verify_deployment():
    print("Starting Deployment Integrity Check...")

    # 1. File Structure Check
    required_files = [
        "index.html",
        "js/main.js",
        "css/style.css",
        "GAMES.md"
    ]

    missing = []
    for f in required_files:
        if not os.path.exists(f):
            missing.append(f)

    if missing:
        print(f"❌ FAILED: Missing critical files: {missing}")
        exit(1)
    else:
        print("✅ Critical files present.")

    # 2. Browser Verification
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1280, 'height': 720})

        # Capture errors
        page.on("pageerror", lambda err: print(f"❌ PAGE ERROR: {err}"))
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}") if msg.type == "error" else None)

        try:
            print("Navigating to app...")
            await page.goto("http://localhost:8000")

            # Check Title
            title = await page.title()
            if "Neon Arcade Hub" not in title:
                print(f"❌ FAILED: Incorrect title '{title}'")
            else:
                print(f"✅ Title matches: {title}")

            # Wait for Hub Init (canvas or grid)
            try:
                # Wait for either the 3D canvas or the loader to finish
                await page.wait_for_function("typeof window.miniGameHub !== 'undefined'", timeout=10000)
                print("✅ Global object initialized.")
            except:
                print("❌ FAILED: window.miniGameHub undefined after timeout.")
                await browser.close()
                exit(1)

            # Check for 3D Hub Canvas presence (assuming 3D view is default)
            # The canvas might be '#arcade-hub-container canvas' or similar depending on Three.js
            # But ArcadeHub.js appends to the container

            await page.wait_for_timeout(2000) # Give WebGL a moment

            # Dismiss loader if present
            if await page.is_visible("#app-loader"):
                print("Dismissing loader...")
                await page.click("body", force=True)
                await page.wait_for_selector("#app-loader", state="hidden")

            # Screenshot
            screenshot_path = "verification/deployment_verified.png"
            await page.screenshot(path=screenshot_path)
            print(f"✅ Screenshot saved to {screenshot_path}")

            print("✅ DEPLOYMENT CHECK PASSED")

        except Exception as e:
            print(f"❌ FAILED: {e}")
            await browser.close()
            exit(1)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_deployment())
