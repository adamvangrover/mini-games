import sys
import os
import time
import subprocess
import threading
from playwright.sync_api import sync_playwright

def run_server(port):
    """Runs a simple HTTP server on the specified port."""
    subprocess.run([sys.executable, "-m", "http.server", str(port)], cwd=".", stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def verify_game():
    port = 0  # Let OS pick a port if possible, but http.server usually needs one.
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(('', 0))
    port = sock.getsockname()[1]
    sock.close()

    print(f"Starting server on port {port}...")
    server_thread = threading.Thread(target=run_server, args=(port,))
    server_thread.daemon = True
    server_thread.start()

    # Wait for server
    time.sleep(2)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for console logs
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Browser Error: {err}"))

        url = f"http://localhost:{port}/index.html"
        print(f"Navigating to {url}...")
        page.goto(url)

        # 1. Start Game
        print("Waiting for game load...")
        try:
            # Check if loader exists and is visible
            if page.is_visible("#app-loader"):
                page.click("#app-loader")
                page.wait_for_selector("#app-loader", state="hidden", timeout=5000)
        except Exception as e:
            print(f"Loader handling error (ignorable): {e}")

        print("Searching for game card...")
        try:
            # Ensure grid view
            page.evaluate("window.miniGameHub.toggleView()")

            # Wait for grid
            page.wait_for_selector("#menu-grid", state="visible", timeout=10000)

            # Find the game card
            card = page.locator("h3", has_text="Smarter Than Chatbot?")
            if card.count() == 0:
                print("Game card not found!")
                print(page.inner_text("body"))
                browser.close()
                return False

            print("Game card found. Clicking...")
            card.click()

            # 2. Wait for Game Container
            print("Waiting for game container...")
            page.wait_for_selector("#smarter-than-chatbot", state="visible", timeout=10000)

            # 3. Wait for INITIATE CHALLENGE button
            print("Waiting for start button...")
            start_btn = page.wait_for_selector("#start-btn", timeout=5000)
            start_btn.click()

            # ---------------------------------------------------------
            # NEW STEP: Category Selection
            # ---------------------------------------------------------
            print("Waiting for Category Selection...")
            page.wait_for_selector(".cat-select-grid", timeout=5000)

            print("Randomizing categories...")
            page.click("#random-btn")

            # Verify 5 selected (check play button enabled)
            play_btn = page.locator("#play-btn")
            if play_btn.is_disabled():
                print("Error: Play button is still disabled after randomize!")
                browser.close()
                return False

            print("Starting game...")
            play_btn.click()
            # ---------------------------------------------------------

            # 4. Wait for Board (Grid of points)
            print("Waiting for board...")
            page.wait_for_selector(".chatbot-grid", timeout=5000)

            # 5. Click a 100 point question (first one)
            print("Selecting a question...")
            questions = page.query_selector_all(".point-btn")
            if len(questions) == 0:
                print("No question buttons found!")
                browser.close()
                return False

            questions[0].click()

            # 6. Wait for Question Screen
            print("Waiting for question...")
            page.wait_for_selector("#timer-bar", timeout=5000)

            # Verify question text is present
            q_text = page.locator("#smarter-than-chatbot h3").inner_text()
            print(f"Question: {q_text}")

            # 7. Answer a question (Option A)
            print("Answering...")
            options = page.query_selector_all(".option-btn")
            if len(options) == 0:
                print("No options found!")
                browser.close()
                return False

            options[0].click()

            # 8. Wait for feedback
            print("Waiting for feedback...")
            page.wait_for_function("""
                () => {
                    const btn = document.querySelector('.option-btn');
                    return btn && (btn.classList.contains('bg-green-600') || btn.classList.contains('bg-red-600'));
                }
            """, timeout=5000)

            # 9. Wait for return to board (2s delay)
            print("Waiting for return to board...")
            page.wait_for_selector(".chatbot-grid", timeout=8000)

            # 10. Verify that the clicked question is now disabled
            print("Verifying question is marked as used...")
            # We clicked the first one. Re-query.
            questions_after = page.query_selector_all(".point-btn")
            if not questions_after[0].is_disabled():
                print("Error: Button should be disabled!")
                browser.close()
                return False

            print("Taking screenshot...")
            page.screenshot(path="verification/smarter_than_chatbot_gameplay.png")

            print("Verification Successful!")
            browser.close()
            return True

        except Exception as e:
            print(f"Verification Failed: {e}")
            page.screenshot(path="verification/smarter_than_chatbot_failure.png")
            browser.close()
            return False

if __name__ == "__main__":
    if verify_game():
        sys.exit(0)
    else:
        sys.exit(1)
