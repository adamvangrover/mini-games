from playwright.sync_api import sync_playwright, expect
import time
import os

def verify_boss_mode_content_and_edit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720}, accept_downloads=True)
        page = context.new_page()

        print("Navigating to Boss Mode...")
        page.goto("http://localhost:8000/index.html")
        page.wait_for_load_state("networkidle")

        try:
            page.click("#app-loader", timeout=2000)
        except:
            pass

        print("Triggering Boss Mode...")
        page.keyboard.down('Alt')
        page.keyboard.press('b')
        page.keyboard.up('Alt')

        expect(page.locator("#boss-mode-overlay")).to_be_visible(timeout=5000)

        # 1. Verify New Content (Word)
        print("Verifying Word Content...")
        page.click("#boss-switch-word")
        time.sleep(0.5)

        # Use evaluate to trigger the cycle directly since the UI hover menu is flaky in headless
        print("Triggering BossMode.instance.cycleDoc() via JS...")
        page.evaluate("BossMode.instance.cycleDoc()")
        time.sleep(0.5)

        # 2. Verify Edit and Save (Download)
        print("Verifying Edit and Download...")
        # Type something into the doc
        doc_content = page.locator("#word-doc-content")
        doc_content.click()
        page.keyboard.type(" [EDITED BY PLAYWRIGHT]")

        # Trigger Save (Export) using JS directly to avoid menu flakiness
        print("Triggering BossMode.instance.exportToDoc() via JS...")
        with page.expect_download() as download_info:
            page.evaluate("BossMode.instance.exportToDoc()")

        download = download_info.value
        path = "verification/" + download.suggested_filename
        download.save_as(path)
        print(f"Downloaded: {path}")

        # Verify content of downloaded file
        with open(path, 'r') as f:
            content = f.read()
            if "[EDITED BY PLAYWRIGHT]" in content:
                print("SUCCESS: Downloaded file contains edits.")
            else:
                print("FAILURE: Downloaded file does NOT contain edits.")
                print("Content:", content)

        # 3. Verify PPT Export
        print("Verifying PPT Export...")
        page.click("#boss-switch-ppt")
        time.sleep(0.5)

        # Trigger Export via click (this button is visible on toolbar, not submenu)
        with page.expect_download() as download_info_ppt:
            page.get_by_text("Export").click()

        download_ppt = download_info_ppt.value
        path_ppt = "verification/" + download_ppt.suggested_filename
        download_ppt.save_as(path_ppt)
        print(f"Downloaded PPT: {path_ppt}")

        # Take a final screenshot
        page.screenshot(path="verification/boss_mode_edit_verify.png")
        print("Captured verification screenshot.")

        browser.close()

if __name__ == "__main__":
    verify_boss_mode_content_and_edit()
