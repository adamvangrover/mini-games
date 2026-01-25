from playwright.sync_api import sync_playwright
import time

def verify_menu_a11y():
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
                # Force click on the loader itself
                loader.click(force=True)
                # Wait for it to disappear
                loader.wait_for(state="hidden", timeout=5000)
                print("Loader dismissed.")
        except Exception as e:
            print(f"Loader handling note: {e}")

        # 2. Switch to Grid View if necessary
        # By default, if WebGL is supported, it starts in 3D view and #menu-grid is hidden
        # We need to click #view-toggle-btn until #menu-grid is visible

        print("Ensuring Grid View...")
        view_toggle = page.locator("#view-toggle-btn")
        menu_grid = page.locator("#menu-grid")

        if not menu_grid.is_visible():
             print("Menu grid hidden, clicking toggle...")
             view_toggle.click()
             page.wait_for_timeout(1000)

        if menu_grid.is_visible():
            print("Grid View Active.")
        else:
            print("ERROR: Could not activate Grid View.")
            browser.close()
            return

        # 3. Inspect Game Cards
        # Filter out headers (which have col-span-full)
        cards = page.locator("#menu-grid > div:not(.col-span-full)")
        count = cards.count()
        print(f"Found {count} game cards.")

        if count == 0:
            print("ERROR: No game cards found.")
            browser.close()
            return

        first_card = cards.first

        # Check Attributes
        role = first_card.get_attribute("role")
        tabindex = first_card.get_attribute("tabindex")
        aria_label = first_card.get_attribute("aria-label")

        print(f"Card 1 - Role: {role}")
        print(f"Card 1 - TabIndex: {tabindex}")
        print(f"Card 1 - Aria-Label: {aria_label}")

        if role == "button" and tabindex == "0" and aria_label:
             print("SUCCESS: Attributes present.")
        else:
             print("FAILURE: Missing accessibility attributes.")

        # 4. Check Keyboard Focus
        # We need to tab to the card.
        # Focus starts at body.
        # The menu buttons (Shop, Settings etc) are before the grid.
        # Let's try to focus the first card directly via JS to see if it's focusable,
        # or press Tab multiple times.

        print("Testing Keyboard Focus...")
        try:
            first_card.focus()
            focused_el = page.evaluate("document.activeElement === document.querySelector('#menu-grid > div:not(.col-span-full)')")
            if focused_el:
                print("SUCCESS: Card is focusable.")
                page.screenshot(path="verification/menu_focus.png")
                print("Screenshot saved to verification/menu_focus.png")
            else:
                 print("FAILURE: Card is NOT focusable via .focus() (needs tabindex).")
        except Exception as e:
            print(f"FAILURE: Focus Error: {e}")

        # 5. Check Keyboard Activation
        # If we can focus, try to press Enter
        if tabindex == "0":
             print("Testing Enter Key Activation...")
             # Setup a listener for 'transitionToState' or check if game container appears
             # Actually, simpler: check if a game container becomes visible or #menu becomes hidden

             first_card.focus()
             page.keyboard.press("Enter")
             page.wait_for_timeout(1000)

             if not page.locator("#menu").is_visible():
                  print("SUCCESS: Game launched via Enter key.")
             else:
                  print("FAILURE: Enter key did not launch game.")

        browser.close()

if __name__ == "__main__":
    verify_menu_a11y()
