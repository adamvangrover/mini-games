import asyncio
from playwright.async_api import async_playwright
import os

async def reproduce_legacy_xss():
    port = os.environ.get("PORT", "8001")
    print(f"Starting reproduction on port {port}...")

    # Server started externally

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        url = f"http://localhost:{port}/index.html"
        print(f"Navigating to {url}")
        await page.goto(url)

        # Inject local storage for Legacy OS
        print("Injecting Local Storage state...")
        await page.evaluate("""() => {
            localStorage.setItem('boss_mode_loggedin', 'true');
            localStorage.setItem('boss_mode_os', 'legacy');
            localStorage.setItem('boss_mode_skin', 'legacy');
        }""")

        # Reload to apply
        await page.reload()

        # Force hide loader
        await page.evaluate("() => { const l = document.getElementById('app-loader'); if(l) l.style.display = 'none'; }")

        # Wait for loading
        # await page.wait_for_selector("#app-loader", state="hidden", timeout=10000)

        # Open Boss Mode if not open (it should be open due to loggedin=true)
        print("Checking/Toggling Boss Mode...")
        await page.evaluate("""() => {
             if (window.BossMode && window.BossMode.instance) {
                 window.BossMode.instance.toggle(true);
             }
        }""")

        # But wait for it to be visible
        print("Waiting for Boss Mode Overlay...")
        await page.wait_for_selector("#boss-mode-overlay", state="visible", timeout=10000)

        # Wait for Legacy OS container
        print("Waiting for Legacy OS Container...")
        await page.wait_for_selector("#os-legacy-container", state="visible", timeout=10000)

        print("Legacy OS Loaded.")

        # --- Test Terminal XSS ---
        print("Testing Terminal XSS...")

        # Launch Terminal
        # We can simulate click on the terminal icon or call launchApp directly
        await page.evaluate("BossMode.instance.legacyOS.launchApp('terminal')")

        # Wait for terminal window
        await page.wait_for_selector(".window-content #term-input", state="visible")

        # Define XSS payload
        payload = "<img src=x onerror=window.xss_terminal=true>"

        # Type payload
        await page.fill("#term-input", payload)
        await page.keyboard.press("Enter")

        # Wait for XSS to trigger
        await page.wait_for_timeout(1000)

        # Debug: check DOM
        content = await page.inner_html("#term-output")
        print(f"Terminal Output Content: {content}")

        # Check if XSS executed
        xss_triggered = await page.evaluate("() => window.xss_terminal === true")

        if xss_triggered:
            print("🚨 CRITICAL: Terminal XSS vulnerability reproduced!")
        else:
            print("✅ Terminal XSS did not trigger.")

        # Close Terminal
        await page.evaluate("BossMode.instance.legacyOS.closeWindow()")

        # --- Test Chat XSS ---
        print("Testing Chat XSS...")

        await page.evaluate("BossMode.instance.legacyOS.launchApp('chat')")
        await page.wait_for_selector(".window-content #chat-input", state="visible")

        payload_chat = "<img src=x onerror=window.xss_chat=true>"

        await page.fill("#chat-input", payload_chat)
        await page.keyboard.press("Enter")

        # Wait for XSS to trigger
        await page.wait_for_timeout(1000)

        xss_chat_triggered = await page.evaluate("() => window.xss_chat === true")

        if xss_chat_triggered:
            print("🚨 CRITICAL: Chat XSS vulnerability reproduced!")
        else:
            print("✅ Chat XSS did not trigger.")

        if xss_triggered or xss_chat_triggered:
            print("Vulnerabilities confirmed.")
        else:
            print("No vulnerabilities found (or reproduction failed).")

        await browser.close()

    # proc.terminate()

if __name__ == "__main__":
    asyncio.run(reproduce_legacy_xss())
