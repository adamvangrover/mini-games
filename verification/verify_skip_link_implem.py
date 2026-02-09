from playwright.sync_api import sync_playwright
import time

def verify_skip_link():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("Loading page...")
        page.goto("http://localhost:8000")

        # 1. Handle Loader
        try:
            loader = page.locator("#app-loader")
            if loader.is_visible():
                print("Loader visible. Clicking to start...")
                loader.click(force=True)
                loader.wait_for(state="hidden", timeout=5000)
                print("Loader dismissed.")
        except Exception as e:
            print(f"Loader handling note: {e}")

        # 2. Test Skip Link
        print("Pressing Tab to focus Skip Link...")
        page.keyboard.press("Tab")
        time.sleep(0.5) # Wait for transition

        # Take screenshot of focused skip link
        page.screenshot(path="verification/skip_link_focused.png")
        print("Screenshot saved to verification/skip_link_focused.png")

        # Check active element
        active_id = page.evaluate("document.activeElement.id")
        print(f"Active Element ID: {active_id}")

        if active_id != "skip-to-games":
            print(f"FAILURE: Expected 'skip-to-games', got '{active_id}'")
            browser.close()
            return

        print("Pressing Enter to activate Skip Link...")
        page.keyboard.press("Enter")

        # 3. Verify Effect
        print("Waiting for view toggle and focus shift...")
        time.sleep(1) # Wait for setTimeout(100) and transitions

        # Verify Grid View is visible
        menu_grid = page.locator("#menu-grid")
        if menu_grid.is_visible():
            print("SUCCESS: Grid View is active.")
        else:
            print("FAILURE: Grid View did not activate.")
            browser.close()
            return

        # Verify Focus on First Game
        active_el_tag = page.evaluate("document.activeElement.tagName")
        active_el_closest_grid = page.evaluate("document.activeElement.closest('#menu-grid') !== null")

        print(f"Active Element Tag: {active_el_tag}")
        print(f"Active Element in Grid: {active_el_closest_grid}")

        if active_el_tag == "BUTTON" and active_el_closest_grid:
            print("SUCCESS: Focus moved to a game card in the grid.")
        else:
            print("FAILURE: Focus did not move to a game card.")

        browser.close()

if __name__ == "__main__":
    verify_skip_link()
