import asyncio
from playwright.async_api import async_playwright
import os
import subprocess

async def run_tests():
    port = os.environ.get("PORT", "8000")
    print(f"Starting server on port {port}...")

    server_process = subprocess.Popen(["python3", "-m", "http.server", port])
    await asyncio.sleep(2)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            page.on("console", lambda msg: print(f"BROWSER: {msg.text}"))

            url = f"http://127.0.0.1:{port}/index.html?2d=true"
            print(f"Navigating to {url}")
            await page.goto(url)

            # Use page.evaluate to directly initialize BossMode instances
            print("Testing BossModeV1...")
            await page.evaluate("""
                () => {
                    return new Promise((resolve) => {
                        window.XSS_TRIGGERED = false;

                        // Dynamically import module and trigger XSS
                        import('/js/core/BossModeV1.js').then(module => {
                            const BossModeV1 = module.default;
                            const div = document.createElement('div');
                            const bm = new BossModeV1(div);
                            bm.user.name = "<img src='x' onerror='window.XSS_TRIGGERED=true'>";
                            bm.renderLogin();

                            setTimeout(resolve, 500);
                        });
                    });
                }
            """)
            v1_xss = await page.evaluate("window.XSS_TRIGGERED")
            if v1_xss: print("❌ V1 XSS TRIGGERED")
            else: print("✅ V1 Secure")

            print("Testing BossModeV2...")
            await page.evaluate("""
                () => {
                    return new Promise((resolve) => {
                        window.XSS_TRIGGERED = false;

                        import('/js/core/BossModeV2.js').then(module => {
                            const BossModeV2 = module.default;
                            const div = document.createElement('div');
                            const bm = new BossModeV2(div);
                            bm.user.name = "<img src='x' onerror='window.XSS_TRIGGERED=true'>";
                            bm.renderLogin();

                            setTimeout(resolve, 500);
                        });
                    });
                }
            """)
            v2_xss = await page.evaluate("window.XSS_TRIGGERED")
            if v2_xss: print("❌ V2 XSS TRIGGERED")
            else: print("✅ V2 Secure")

            print("Testing BossModeV3...")
            await page.evaluate("""
                () => {
                    return new Promise((resolve) => {
                        window.XSS_NAME_TRIGGERED = false;
                        window.XSS_INITIALS_TRIGGERED = false;

                        import('/js/core/BossModeV3.js').then(module => {
                            const BossModeV3 = module.default;
                            const div = document.createElement('div');
                            const bm = new BossModeV3(div);
                            bm.user.name = "<img src='x' onerror='window.XSS_NAME_TRIGGERED=true'>";
                            bm.user.initials = "<img src='x' onerror='window.XSS_INITIALS_TRIGGERED=true'>";
                            bm.renderLogin();

                            setTimeout(resolve, 500);
                        });
                    });
                }
            """)
            v3_name_xss = await page.evaluate("window.XSS_NAME_TRIGGERED")
            v3_initials_xss = await page.evaluate("window.XSS_INITIALS_TRIGGERED")
            if v3_name_xss or v3_initials_xss: print("❌ V3 XSS TRIGGERED")
            else: print("✅ V3 Secure")

            await browser.close()

            if v1_xss or v2_xss or v3_name_xss or v3_initials_xss:
                raise Exception("XSS vulnerabilities still present!")
            print("All tests passed.")
    finally:
        server_process.terminate()
        server_process.wait()

if __name__ == "__main__":
    asyncio.run(run_tests())
