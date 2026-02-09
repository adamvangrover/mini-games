import sys
import time
import subprocess
from playwright.sync_api import sync_playwright, expect

def run_server():
    # Start server
    proc = subprocess.Popen([sys.executable, "-m", "http.server", "8000"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2) # Wait for server
    return proc

def verify_file_forge():
    server_proc = run_server()
    try:
        with sync_playwright() as p:
            print("Launching Browser...")
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            print("Navigating to hub...")
            page.goto("http://localhost:8000")

            # Dismiss loader
            page.click("body", force=True)
            page.wait_for_selector("#app-loader", state="hidden")

            # Force Grid View via JS to ensure cards are visible
            print("Switching to Grid View...")
            page.evaluate("if(window.miniGameHub.is3DView) window.miniGameHub.toggleView()")

            # Find File Forge Card
            print("Searching for File Forge...")
            file_forge_card = page.locator("button").filter(has_text="File Forge").first
            expect(file_forge_card).to_be_visible()

            file_forge_card.scroll_into_view_if_needed()
            file_forge_card.click()

            # Wait for Game UI
            print("Waiting for File Forge UI...")
            expect(page.locator("h1").filter(has_text="FILE FORGE")).to_be_visible(timeout=15000)

            # Wait for libraries to load (status message hidden)
            expect(page.locator(".animate-pulse").filter(has_text="Initializing")).to_be_hidden(timeout=15000)

            # Type Content
            print("Typing content...")
            page.fill("#ff-input", "List of fruits: apple, banana, cherry")

            # Select JSON Format
            print("Selecting JSON format...")
            page.select_option("#ff-format", "json")

            # Generate
            print("Clicking Generate...")
            page.click("#ff-generate-btn")

            # Check Preview
            print("Checking JSON preview...")
            preview = page.locator("#ff-preview")
            expect(preview).to_contain_text('"apple"')
            expect(preview).to_contain_text('"banana"')

            # Check Download Button Enabled
            print("Checking Download Button...")
            dl_btn = page.locator("#ff-download-btn")
            expect(dl_btn).not_to_be_disabled()

            # Take Screenshot
            print("Taking screenshot...")
            page.screenshot(path="verification/file_forge_verified.png")

            print("Verification Successful!")

    except Exception as e:
        print(f"Verification Failed: {e}")
        raise e
    finally:
        server_proc.kill()

if __name__ == "__main__":
    verify_file_forge()
