import os
import sys
import time
import http.server
import socketserver
import threading
from playwright.sync_api import sync_playwright

PORT = 8084

def start_server():
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()

def verify_boss_mode():
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    time.sleep(2)  # Give server time to start

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto(f"http://localhost:{PORT}")

            # 1. Dismiss Loader
            print("Dismissing loader...")
            page.click("body")
            time.sleep(1)

            # 2. Open Boss Mode
            print("Opening Boss Mode...")
            # Simulate Alt+B
            page.keyboard.press("Alt+b")
            time.sleep(1)

            # 3. Login
            print("Logging in...")
            # Wait for login screen (Boot sequence takes ~2.5s)
            try:
                page.wait_for_selector("#boss-login-input", timeout=5000)
                page.fill("#boss-login-input", "123")
                page.click("#boss-login-submit")

                # Wait for desktop
                page.wait_for_selector("#boss-desktop-icons", timeout=5000)
            except Exception as e:
                print(f"Login failed or timeout: {e}")
                page.screenshot(path="verification/login_fail.png")

            time.sleep(1)
            # Take screenshot of desktop
            page.screenshot(path="verification/boss_mode_desktop.png")

            # 4. Check for New Icons
            print("Checking for Desktop Icons...")

            # Helper to find icon by text
            def find_icon(name):
                # The icon text is inside a span inside the icon container
                icons = page.query_selector_all("#boss-desktop-icons .group")
                for icon in icons:
                    if name in icon.inner_text():
                        return icon
                return None

            neon_code = find_icon("Neon Code")
            if neon_code:
                print("PASS: Neon Code icon found.")
            else:
                print("FAIL: Neon Code icon not found.")

            sys_mon = find_icon("SysMon")
            if sys_mon:
                print("PASS: SysMon icon found.")
            else:
                print("FAIL: SysMon icon not found.")

            # 5. Open Neon Code
            print("Opening Neon Code...")
            if neon_code:
                neon_code.dblclick()
                time.sleep(1)
                # Check for window title
                page.screenshot(path="verification/neon_code_window.png")
                if page.is_visible("text=Neon Code"):
                    print("PASS: Neon Code window opened.")
                else:
                    print("FAIL: Neon Code window did not open.")

            # 6. Open SysMon
            print("Opening SysMon...")
            if sys_mon:
                sys_mon.dblclick()
                time.sleep(1)
                page.screenshot(path="verification/sysmon_window.png")
                if page.is_visible("text=System Monitor"):
                    print("PASS: System Monitor window opened.")
                else:
                    print("FAIL: System Monitor window did not open.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_boss_mode()
