from playwright.sync_api import sync_playwright

def verify_fix(page):
    print("Navigating to app...")
    page.goto("http://localhost:8000")
    page.wait_for_timeout(2000)

    # Force Grid View if in 3D view (3D view might be black in headless)
    print("Checking view mode...")
    try:
         text = page.inner_text("#view-toggle-text")
         if "Grid" in text:
             print("Switching to Grid View...")
             page.click("#view-toggle-btn", force=True)
             page.wait_for_timeout(1000)
    except Exception as e:
        print(f"View toggle logic failed or not needed: {e}")

    # Wait for menu grid to be populated
    page.wait_for_selector("#menu-grid")

    # Check for category headers which confirms the categorized loop is running
    headers = page.locator(".col-span-full")
    count = headers.count()
    print(f"Found {count} category headers.")

    if count > 0:
        print("Categorized view is active.")
    else:
        print("WARNING: No category headers found!")

    # Screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/menu_fix.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Emulate a desktop to ensure 3D view might try to load, but we handle fallback
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        try:
            verify_fix(page)
        finally:
            browser.close()
