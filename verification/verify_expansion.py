
from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Start local server
    import subprocess
    server = subprocess.Popen(["python3", "-m", "http.server", "8000"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)

    try:
        page.goto("http://localhost:8000/index.html")
        page.wait_for_selector("#menu", state="visible")

        # Switch to Grid View
        view_btn = page.locator("#view-toggle-btn")
        if view_btn.is_visible():
            view_btn.click()
            time.sleep(1)

        # 1. Test Dev Console & Add Coins
        # -----------------------------------------------
        page.keyboard.press("Backquote") # Open Console
        time.sleep(0.5)
        page.type("#dev-input", "add_coins 5000")
        page.keyboard.press("Enter")
        time.sleep(0.5)
        page.type("#dev-input", "toggle_crt") # Turn CRT ON
        page.keyboard.press("Enter")
        time.sleep(0.5)
        page.keyboard.press("Backquote") # Close Console

        page.screenshot(path="verification/console_crt.png")
        print("Dev console and CRT verification complete.")

        # 2. Test Avatar Station
        # -----------------------------------------------
        page.evaluate("document.getElementById('menu-grid').classList.remove('hidden')")
        page.get_by_text("Avatar Station").first.click(force=True)
        time.sleep(1)

        # Change color to Orange and Icon to Dragon
        page.locator("button[data-color='#f97316']").click() # Orange
        page.locator("button[data-icon='fa-dragon']").click()

        page.screenshot(path="verification/avatar_station.png")

        # Save
        page.locator("#avatar-save-btn").click()
        time.sleep(1) # Wait for back navigation
        print("Avatar verification complete.")

        # 3. Test Tech Tree
        # -----------------------------------------------
        page.get_by_text("Tech Tree").first.click(force=True)
        time.sleep(1)

        # We have 5000 coins, so we can buy upgrades.
        # Click Coin Miner I (should be clickable)
        # We need to find the node.
        # The node doesn't have ID in DOM, but has title attribute.

        # Since playwight hover/click on canvas/absolute divs can be tricky, we select by text sibling?
        # The nodes have innerHTML with icon, but we added a label sibling.
        # Use exact=True to avoid matching "Coin Miner II"
        page.get_by_text("Coin Miner I", exact=True).click(force=True)
        time.sleep(0.5)
        page.on("dialog", lambda dialog: dialog.accept()) # Accept confirmation

        page.screenshot(path="verification/tech_tree.png")
        print("Tech tree verification complete.")

        # 4. Verify Avatar in Trophy Room
        # -----------------------------------------------
        page.locator(".back-btn").click()
        time.sleep(1)
        page.get_by_text("Trophy Room").first.click(force=True)
        time.sleep(1)
        page.screenshot(path="verification/trophy_room_avatar.png")
        print("Trophy room avatar verification complete.")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error_expansion.png")
    finally:
        server.terminate()
        browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
