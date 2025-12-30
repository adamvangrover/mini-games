from playwright.sync_api import sync_playwright, expect
import time

def verify_boss_mode():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to app
        page.goto("http://localhost:8000")

        # Wait for loader to disappear
        loader = page.locator("#app-loader")
        expect(loader).to_have_count(0, timeout=10000) # Wait for it to be removed from DOM

        # Wait for HUD
        hud_btn = page.locator("#boss-btn-hud")
        expect(hud_btn).to_be_visible(timeout=5000)

        print("HUD loaded. Clicking Boss Mode button...")
        hud_btn.click()

        # Verify Overlay
        overlay = page.locator("#boss-mode-overlay")
        expect(overlay).to_be_visible()
        expect(overlay).to_contain_text("Financial_Projections_FY25_DRAFT.xlsx")

        print("Boss Mode (Excel) active. Taking screenshot...")
        page.screenshot(path="verification/boss_mode_excel.png")

        # Switch to PPT
        ppt_btn = page.locator("#boss-switch-ppt")
        ppt_btn.click()

        expect(overlay).to_contain_text("Q3_Synergy_Deck_FINAL_v2.pptx")
        print("Boss Mode (PPT) active. Taking screenshot...")
        page.screenshot(path="verification/boss_mode_ppt.png")

        # Test Clippy (in Excel mode mostly, but checking if overlay still active)
        # Close
        close_btn = page.locator("#boss-close-x")
        close_btn.click()

        expect(overlay).to_be_hidden()
        print("Boss Mode closed.")

        browser.close()

if __name__ == "__main__":
    verify_boss_mode()
