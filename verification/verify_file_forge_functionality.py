
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
    with socketserver.TCPServer(("localhost", 0), handler) as httpd:
        PORT = httpd.server_address[1]
        print(f"Serving on port {PORT}")
        httpd.serve_forever()

def verify():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    while PORT == 0: time.sleep(0.1)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(f"http://localhost:{PORT}")
        time.sleep(2)

        try:
            if page.locator("#app-loader").is_visible():
                page.click("body")
                time.sleep(1)
        except: pass

        try:
            if not page.locator("#menu-grid").is_visible():
                page.click("#view-toggle-btn")
                page.wait_for_selector("#menu-grid", state="visible")
        except: pass

        page.click("button:has-text('File Forge')")
        page.wait_for_selector("#ff-input", timeout=10000)

        # Normal Input
        page.fill("#ff-input", "Hello World")
        page.select_option("#ff-format", "html")
        page.click("#ff-generate-btn")

        page.wait_for_function("document.getElementById('ff-download-btn').disabled === false")

        with page.expect_download() as download_info:
            page.click("#ff-download-btn")

        path = download_info.value.path()
        with open(path, 'r') as f:
            content = f.read()

        print("Content:", content)

        if "<p>Hello World</p>" in content:
            print("[SUCCESS] Legitimate input handled correctly.")
        else:
            print("[FAIL] Legitimate input corrupted.")

        browser.close()

if __name__ == "__main__":
    verify()
