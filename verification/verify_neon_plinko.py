import threading
import http.server
import socketserver
import time
import os
from playwright.sync_api import sync_playwright

PORT = 8086 # Unique port for this test

def start_server():
    # Quiet server
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, format, *args):
            pass

    try:
        with socketserver.TCPServer(("", PORT), QuietHandler) as httpd:
            print(f"Serving at port {PORT}")
            httpd.serve_forever()
    except OSError:
        print(f"Port {PORT} already in use, assuming server running.")

def verify_neon_plinko():
    # Start server in thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    time.sleep(2) # Wait for server

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print("Loading Main Menu...")
            page.goto(f"http://localhost:{PORT}/index.html")
            page.wait_for_timeout(2000)

            # Transition to Plinko
            print("Testing Neon Plinko...")
            # Injecting transition
            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-plinko' })")
            page.wait_for_timeout(2000) # Wait for Matter.js to load if needed

            # Check for canvas
            canvas = page.query_selector('#neon-plinko canvas')
            if canvas:
                print("Neon Plinko canvas found.")
            else:
                print("ERROR: Neon Plinko canvas not found.")
                browser.close()
                exit(1)

            # Interact
            print("Clicking to drop balls...")
            # Click near top center
            box = canvas.bounding_box()
            center_x = box['x'] + box['width'] / 2
            top_y = box['y'] + 50

            # Click a few times
            for i in range(5):
                page.mouse.click(center_x + (i*10 - 20), top_y)
                page.wait_for_timeout(300)

            page.wait_for_timeout(3000) # Wait for physics

            # Take screenshot
            if not os.path.exists("verification/screenshots"):
                os.makedirs("verification/screenshots")
            page.screenshot(path="verification/screenshots/neon_plinko.png")
            print("Screenshot saved to verification/screenshots/neon_plinko.png")

            # Verify score updated (optional, but good)
            # We can check if 'score' variable in game instance is > 0
            score = page.evaluate("window.miniGameHub.getCurrentGame().score")
            print(f"Current Score: {score}")
            if score >= 0: # Score might be 0 if we missed buckets or it takes time
                print("Game instance accessible and score read.")
            else:
                 print("Warning: Score not readable or negative.")

        except Exception as e:
            print(f"Verification failed: {e}")
            browser.close()
            exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    verify_neon_plinko()
