
import sys
import os
import time
import threading
import http.server
import socketserver
from playwright.sync_api import sync_playwright

# Change to repo root
if os.path.basename(os.getcwd()) == 'verification':
    os.chdir('..')

PORT = 0

def run_server():
    global PORT
    handler = http.server.SimpleHTTPRequestHandler
    # Bind to port 0 to get a random free port
    with socketserver.TCPServer(("localhost", 0), handler) as httpd:
        PORT = httpd.server_address[1]
        print(f"Serving on port {PORT}")
        httpd.serve_forever()

def verify():
    # Start server
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    # Wait for port assignment
    while PORT == 0:
        time.sleep(0.1)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        url = f"http://localhost:{PORT}"
        print(f"Navigating to {url}")
        page.goto(url)

        # Wait for potential initial load/splash
        time.sleep(2)

        # Click "Click Anywhere to Start" if present
        try:
            loader = page.locator("#app-loader")
            if loader.is_visible():
                print("Clicking to start...")
                page.click("body")
                time.sleep(1)
        except:
            pass

        # Switch to Grid View if needed
        try:
            # Check if grid view is active
            if not page.locator("#menu-grid").is_visible():
                print("Switching to Grid View...")
                page.click("#view-toggle-btn")
                page.wait_for_selector("#menu-grid", state="visible")
        except Exception as e:
            print(f"Error checking grid view: {e}")

        # Find File Forge button
        print("Looking for File Forge...")
        file_forge_btn = page.locator("button:has-text('File Forge')")

        if file_forge_btn.count() == 0:
             print("File Forge button not found. Dumping page content...")
             print(page.content())
             sys.exit(1)

        file_forge_btn.first.click()

        # Wait for File Forge input
        print("Waiting for File Forge input...")
        page.wait_for_selector("#ff-input", timeout=10000)

        # Inject malicious payload
        payload = "<script>alert('XSS')</script>"
        print(f"Injecting payload: {payload}")
        page.fill("#ff-input", payload)

        # Select HTML format
        print("Selecting HTML format...")
        page.select_option("#ff-format", "html")

        # Generate
        print("Generating...")
        page.click("#ff-generate-btn")

        # Wait for processing (simulated via wait_for_timeout or checking preview)
        page.wait_for_timeout(1000)

        # Wait for download button to be active
        # The class changes from cursor-not-allowed to something else
        page.wait_for_function("document.getElementById('ff-download-btn').disabled === false")

        # Download
        print("Downloading...")
        with page.expect_download() as download_info:
            page.click("#ff-download-btn")

        download = download_info.value
        path = download.path()

        print(f"Download saved to {path}")

        with open(path, 'r') as f:
            content = f.read()

        print("File Content Preview:")
        print(content[:500])

        if "<script>alert('XSS')</script>" in content:
            print("\n[FAIL] XSS Payload found in generated file!")
        elif "&lt;script&gt;alert('XSS')&lt;/script&gt;" in content:
            print("\n[SUCCESS] XSS Payload was escaped!")
        else:
            print("\n[WARN] Unexpected content format.")

        browser.close()

if __name__ == "__main__":
    verify()
