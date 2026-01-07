from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # We need to serve the verification script as a module
        # Create a temporary HTML file to run the module
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        </head>
        <body>
            <script type="module" src="/verification/verify_boss_modules.js"></script>
        </body>
        </html>
        """

        with open("verification_boss.html", "w") as f:
            f.write(html_content)

        print("Navigating to verification page...")

        success = False

        def handle_console(msg):
            nonlocal success
            print(f"CONSOLE: {msg.text}")
            if "BOSS_MODULES_SUCCESS" in msg.text:
                success = True

        page.on("console", handle_console)
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        try:
            # Assumes server is running on port 8000
            page.goto("http://localhost:8000/verification_boss.html")
            page.wait_for_timeout(2000) # Wait for execution

            if success:
                print("✅ Boss Modules verification passed.")
            else:
                print("❌ Boss Modules verification failed.")

        except Exception as e:
            print(f"Exception: {e}")

        browser.close()

        # Cleanup
        if os.path.exists("verification_boss.html"):
            os.remove("verification_boss.html")

if __name__ == "__main__":
    run()
