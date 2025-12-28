from playwright.sync_api import sync_playwright, expect
import time

def verify_hub(page):
    # Navigate
    page.goto('http://localhost:8000')

    # Wait for loader
    expect(page.locator('#app-loader')).to_be_hidden(timeout=10000)

    # 1. Verify Grid View Initial State
    toggle_btn = page.locator('#view-toggle-btn')
    if toggle_btn.is_visible():
        if page.locator('#view-toggle-text').inner_text() == 'Grid View':
             toggle_btn.click() # Switch to Grid
             time.sleep(1)

    # Verify Categories in Grid - Use specific selector to avoid conflict
    # The header has class "col-span-full" and contains "ACTION"
    expect(page.locator('.col-span-full:has-text("ACTION")')).to_be_visible()

    # Screenshot Grid
    page.screenshot(path='verification/grid_view.png')
    print("Grid View Screenshot taken.")

    # 2. Verify 3D View
    if toggle_btn.is_visible():
         toggle_btn.click() # Switch to 3D
         time.sleep(2)
         # Wait for canvas
         expect(page.locator('#arcade-hub-container canvas')).to_be_visible()

         # Screenshot 3D
         page.screenshot(path='verification/3d_view.png')
         print("3D View Screenshot taken.")

    # 3. Verify Trophy Room
    page.locator('#trophy-btn-menu').click(force=True)
    time.sleep(2)

    page.screenshot(path='verification/trophy_room.png')
    print("Trophy Room Screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a context that allows touch to test joystick visibility if needed
        context = browser.new_context(viewport={'width': 1280, 'height': 720}, has_touch=True)
        page = context.new_page()
        try:
            verify_hub(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path='verification/error.png')
        finally:
            browser.close()
