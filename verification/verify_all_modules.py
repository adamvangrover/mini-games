
import asyncio
import json
import subprocess
import time
from playwright.async_api import async_playwright

async def run():
    # Start python server in background
    server = subprocess.Popen(["python3", "-m", "http.server", "8000"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2) # Wait for server to start

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()

            # Capture console logs
            results = {}
            def handle_console(msg):
                try:
                    data = json.loads(msg.text)
                    if isinstance(data, dict):
                        results.update(data)
                except:
                    pass

            page.on("console", handle_console)

            await page.goto("http://localhost:8000/verification/verify.html")
            await page.wait_for_timeout(5000) # Wait for modules to load

            # Check results
            failed = []
            for key, status in results.items():
                print(f"{key}: {status}")
                if status != "OK":
                    failed.append(key)

            if failed:
                print(f"\nFAILED MODULES: {failed}")
                exit(1)
            else:
                print("\nALL MODULES VERIFIED SUCCESSFULLY")
                exit(0)

    finally:
        server.kill()

if __name__ == "__main__":
    asyncio.run(run())
