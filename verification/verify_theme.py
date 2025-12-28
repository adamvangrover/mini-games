
import time
from playwright.sync_api import sync_playwright

def verify_theme():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # 1. Load the app
        print("Loading app...")
        page.goto("http://localhost:8000/index.html")
        page.wait_for_selector("#menu", state="visible", timeout=10000)

        # 2. Force Grid View for clear CSS checking
        print("Switching to Grid View...")
        page.evaluate("window.miniGameHub.transitionToState('MENU')")
        page.evaluate("document.getElementById('view-toggle-btn').click()")
        # Force it just in case logic flips
        page.evaluate("""
            if (document.getElementById('menu-grid').classList.contains('hidden')) {
                document.getElementById('view-toggle-btn').click();
            }
        """)
        time.sleep(1)

        # 3. Equip 'Gold' theme via Console/SaveSystem
        print("Equipping 'theme-gold'...")
        page.evaluate("""
            const ss = window.miniGameHub.saveSystem;
            ss.equipItem('theme', 'gold');
            // Store.js updates body class on equip, but let's verify persistence on reload
        """)

        # Take screenshot of immediate effect
        page.screenshot(path="verification/theme_gold_immediate.png")

        # 4. Reload to verify persistence (main.js logic)
        print("Reloading to check persistence...")
        page.reload()
        page.wait_for_selector("#menu", state="visible")

        # Ensure grid view again (persistence of view mode isn't guaranteed, but theme is)
        page.evaluate("""
            const btn = document.getElementById('view-toggle-btn');
            const grid = document.getElementById('menu-grid');
            if (grid.classList.contains('hidden')) {
                btn.click();
            }
        """)
        time.sleep(1)

        # 5. Check Body Class and Screenshot
        body_class = page.evaluate("document.body.className")
        print(f"Body class after reload: {body_class}")

        page.screenshot(path="verification/theme_gold_persisted.png")

        browser.close()

if __name__ == "__main__":
    verify_theme()
