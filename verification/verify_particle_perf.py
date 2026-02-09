import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
import sys
from playwright.sync_api import sync_playwright
import time
import socket

def get_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

# Use a fixed port to avoid complexity, but retry if busy?
# The instructions say verify_hub expects 8000.
PORT = 8000

def run_server():
    try:
        server = HTTPServer(('localhost', PORT), SimpleHTTPRequestHandler)
        server.serve_forever()
    except OSError:
        print(f"Port {PORT} in use, assuming server already running.")

def verify():
    # Start server in thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(2) # Wait for server

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            page.goto(f"http://localhost:{PORT}/index.html")

            # Dismiss loader
            try:
                page.click("body", force=True, timeout=2000)
            except:
                pass # Maybe no loader

            try:
                page.wait_for_selector("#app-loader", state="hidden", timeout=5000)
            except:
                print("Loader did not disappear or wasn't present.")

            # Force 2D view
            page.evaluate("window.is3DView = false;")

            # Enter game
            page.evaluate("window.miniGameHub.transitionToState('IN_GAME', { gameId: 'neon-zip-game' })")
            page.wait_for_selector("#neon-zip-game", state="visible", timeout=5000)

            # Wait for game initialization
            page.wait_for_timeout(1000)

            # Inject spy and test
            result = page.evaluate("""() => {
                const game = window.miniGameHub.getCurrentGame();
                if (!game || !game.particleSystem) return { error: "No particle system found" };

                const ps = game.particleSystem;
                const ctx = game.ctx;

                if (!ctx) return { error: "No context found" };

                let fillRectCalled = false;
                let arcCalled = false;

                const originalFillRect = ctx.fillRect.bind(ctx);
                const originalArc = ctx.arc.bind(ctx);

                ctx.fillRect = function(...args) {
                    fillRectCalled = true;
                    return originalFillRect(...args);
                };

                ctx.arc = function(...args) {
                    arcCalled = true;
                    return originalArc(...args);
                };

                // Clear existing
                ps.particles = [];

                // Emit test for drawing
                ps.emit(100, 100, '#fff', 1);
                // Force a draw
                ctx.save();
                ps.draw(ctx);
                ctx.restore();

                const drawCheck = { fillRectCalled, arcCalled };

                // Emit test for limit
                ps.particles = [];
                ps.emit(100, 100, '#fff', 2500);
                const limitCheck = ps.particles.length;

                return { drawCheck, limitCheck };
            }""")

            if 'error' in result:
                print(f"Error in browser context: {result['error']}")
                sys.exit(1)

            print(f"Draw Check: {result['drawCheck']}")
            print(f"Particle Count (emit 2500): {result['limitCheck']}")

            failed = False

            if result['drawCheck']['fillRectCalled']:
                print("PASS: fillRect used.")
            else:
                print("FAIL: fillRect NOT used.")
                failed = True

            if not result['drawCheck']['arcCalled']:
                print("PASS: arc NOT used.")
            else:
                print("FAIL: arc used (should be optimized out).")
                failed = True

            if result['limitCheck'] <= 2000:
                print("PASS: Limit enforced (<= 2000).")
            else:
                print(f"FAIL: Limit exceeded ({result['limitCheck']} > 2000).")
                failed = True

            if failed:
                sys.exit(1)
            else:
                print("ALL CHECKS PASSED")

        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    verify()
