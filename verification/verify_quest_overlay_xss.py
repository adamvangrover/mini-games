
import asyncio
import base64
import json
from playwright.async_api import async_playwright
import http.server
import socketserver
import threading
import sys
import os
import datetime

# Calculate today's date index as per SaveSystem.js logic
now = datetime.datetime.now()

PORT = 9009

def run_server():
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, format, *args):
            pass

    # Allow address reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()

async def main():
    # Start server in a thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        print(f"Navigating to http://localhost:{PORT}")
        await page.goto(f"http://localhost:{PORT}/index.html")

        # Wait for app to load
        await page.wait_for_timeout(2000)

        # Click to start - Force click via JS
        print("Dismissing loader...")
        await page.evaluate("""
            const loader = document.getElementById('app-loader');
            if (loader) {
                loader.click();
                loader.style.display = 'none'; // Force hide
                loader.remove(); // Force remove
            }
        """)

        await page.wait_for_timeout(1000)

        # Get today's date index from JS
        today_index = await page.evaluate("""
            (function() {
                const now = new Date();
                return Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
            })()
        """)
        print(f"Today's date index: {today_index}")

        # Define the malicious payload with correct date
        malicious_payload = {
            "version": 1.3,
            "totalCurrency": 9999,
            "dailyQuests": {
                "date": today_index,
                "quests": [
                    {
                        "id": "xss_quest",
                        "desc": "Malicious Quest",
                        "description": "<img src=x onerror=window.xss_triggered=true>",
                        "target": 1,
                        "progress": 0,
                        "reward": 100,
                        "flavorText": "XSS",
                        "claimed": False,
                        "type": "generic"
                    }
                ]
            }
        }

        # Base64 encode the payload (simple simulation of SaveSystem.encrypt)
        encoded_payload = base64.b64encode(json.dumps(malicious_payload).encode('utf-8')).decode('utf-8')

        # Directly test importData via console to identify issues
        print("Testing importData via console...")
        result = await page.evaluate(f"""
            window.miniGameHub.saveSystem.importData('{encoded_payload}')
        """)
        print(f"Direct importData result: {result}")

        # Reload page to apply changes (importData saves to localStorage but needs reload to be fully active/safe test)
        await page.reload()
        await page.wait_for_timeout(2000)

        # Dismiss loader again after reload
        print("Dismissing loader (post-reload)...")
        await page.evaluate("""
            const loader = document.getElementById('app-loader');
            if (loader) {
                loader.click();
                loader.style.display = 'none';
                loader.remove();
            }
        """)
        await page.wait_for_timeout(2000)

        # Trigger Quest Overlay
        print("Triggering Quest Overlay...")
        await page.evaluate("window.dispatchEvent(new CustomEvent('open-quest-board'))")

        await page.wait_for_timeout(2000)

        # Check for XSS
        is_xss_triggered = await page.evaluate("window.xss_triggered === true")

        if is_xss_triggered:
            print("🚨 XSS Vulnerability Confirmed! window.xss_triggered is true.")
            sys.exit(1) # Vulnerable = Failure
        else:
            print("❌ XSS not triggered.")

            # Verify the text content is rendered safely
            content = await page.inner_text('#overlay-content')
            print(f"Overlay content text: {content}")

            if "<img src=x onerror=window.xss_triggered=true>" in content:
                 print("✅ Malicious HTML rendered as text (SAFE).")
            else:
                 print("⚠️ Malicious HTML not found in text (maybe missing?).")

            await page.screenshot(path='verification/quest_overlay_safe.png')
            sys.exit(0) # Safe = Success

if __name__ == "__main__":
    asyncio.run(main())
