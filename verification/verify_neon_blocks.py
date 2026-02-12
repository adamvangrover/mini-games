import sys
import os
import time
import threading
import http.server
import socketserver
from playwright.sync_api import sync_playwright

def run_server(port):
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", port), Handler) as httpd:
        print(f"Serving at port {port}")
        httpd.serve_forever()

def verify_neon_blocks():
    # Find a free port
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('', 0))
    port = s.getsockname()[1]
    s.close()

    # Start server
    server_thread = threading.Thread(target=run_server, args=(port,), daemon=True)
    server_thread.start()
    time.sleep(1)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        url = f"http://localhost:{port}/index.html"
        print(f"Navigating to {url}")
        page.goto(url)

        # Wait for initialization
        page.wait_for_load_state('networkidle')

        # Check for errors
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(str(exc)))

        # Trigger Game Load
        print("Launching Neon Blocks...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-blocks' })")

        # Wait for canvas
        try:
            page.wait_for_selector("#neon-blocks canvas", timeout=10000)
            print("Canvas found!")
        except Exception as e:
            print(f"Canvas not found: {e}")
            errors.append("Canvas not found")

        # Wait a bit for rendering
        time.sleep(2)

        # Verify specific elements (UI)
        content = page.content()
        if "NEON BLOCKS" not in content:
            print("Title not found in UI")
            errors.append("UI Title missing")
        else:
            print("UI Title found")

        # Take screenshot
        os.makedirs("test-results", exist_ok=True)
        page.screenshot(path="test-results/neon_blocks_verify.png")
        print("Screenshot saved to test-results/neon_blocks_verify.png")

        browser.close()

        if errors:
            print("Errors encountered:")
            for err in errors:
                print(f"- {err}")
            sys.exit(1)
        else:
            print("Verification Successful!")

if __name__ == "__main__":
    verify_neon_blocks()
