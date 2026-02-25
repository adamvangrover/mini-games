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
    # Suppress server logs
    import logging
    logging.getLogger("http.server").setLevel(logging.ERROR)

    with socketserver.TCPServer(("", port), Handler) as httpd:
        print(f"Serving at port {port}")
        httpd.serve_forever()

def verify_neon_blocks_enhanced():
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

        # Capture errors
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(str(exc)))

        url = f"http://localhost:{port}/index.html"
        print(f"Navigating to {url}")
        page.goto(url)

        # Wait for initialization
        page.wait_for_load_state('networkidle')

        # Trigger Game Load
        print("Launching Neon Blocks...")
        page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-blocks' })")

        # Wait for canvas
        try:
            page.wait_for_selector("#neon-blocks canvas", timeout=10000)
            print("Canvas found!")
        except Exception as e:
            print(f"Canvas not found: {e}")
            if errors:
                print("Console Errors:")
                for e in errors: print(f"- {e}")
            sys.exit(1)

        time.sleep(2)

        if errors:
            print("Console Errors detected:")
            for e in errors: print(f"- {e}")
            # Don't exit yet, check content

        # Verify UI Elements
        content = page.content()
        if "NEON BLOCKS" not in content:
            print("ERROR: Title not found in page content")
            # Dump a bit of content
            print("Content snippet:", content[:500])
            sys.exit(1)

        # Verify Block Name Display
        try:
            block_name = page.evaluate("document.getElementById('block-name-display').textContent")
            print(f"Initial Block Name: {block_name}")
            if "Grass" not in block_name: # Default is 0 -> Grass
                print("ERROR: Expected 'Grass' as initial block")
                sys.exit(1)
        except Exception as e:
            print(f"Error getting block name: {e}")
            sys.exit(1)

        # Verify Terrain Generation & Persistence
        print("Verifying Persistence...")

        # Check initial save data (should be present after terrain gen)
        save_data = page.evaluate("window.miniGameHub.saveSystem.getGameConfig('neon-blocks')")
        if not save_data or not save_data.get('blocks'):
            print("ERROR: No save data found after initialization (Terrain Gen failed?)")
            sys.exit(1)

        block_count = len(save_data['blocks'])
        print(f"Initial Block Count: {block_count}")
        if block_count < 100:
            print("ERROR: Block count too low for generated terrain")
            sys.exit(1)

        # Simulate Adding a Block
        print("Simulating Block Placement...")
        page.evaluate("""
            const game = window.miniGameHub.getCurrentGame();
            if(game) {
                game.addBlock(0, 50, 0, 9); // Add Neon block at 0,50,0
            }
        """)

        time.sleep(1) # Wait for save

        # Verify Save Update
        new_save_data = page.evaluate("window.miniGameHub.saveSystem.getGameConfig('neon-blocks')")
        new_block_count = len(new_save_data['blocks'])
        print(f"New Block Count: {new_block_count}")

        if new_block_count != block_count + 1:
             print("ERROR: Block count did not increase after adding block")
             sys.exit(1)

        # Check for specific block
        has_neon = page.evaluate("""
            window.miniGameHub.saveSystem.getGameConfig('neon-blocks').blocks.some(b => b.x===0 && b.y===50 && b.z===0 && b.t===9)
        """)
        if not has_neon:
            print("ERROR: New block not found in save data")
            sys.exit(1)

        # Verify Fly Mode Toggle
        print("Toggling Fly Mode...")
        page.keyboard.press("f")
        time.sleep(0.5)

        is_flying = page.evaluate("window.miniGameHub.getCurrentGame().player.isFlying")
        print(f"Is Flying: {is_flying}")
        if not is_flying:
            print("ERROR: Fly Mode did not toggle on")
            sys.exit(1)

        # Take screenshot
        os.makedirs("test-results", exist_ok=True)
        page.screenshot(path="test-results/neon_blocks_enhanced.png")
        print("Screenshot saved.")

        browser.close()
        print("Verification Successful!")

if __name__ == "__main__":
    verify_neon_blocks_enhanced()
