from playwright.sync_api import sync_playwright, expect

def verify_boss_spotify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8000")

            # 1. Click to dismiss loader
            page.click("body")

            # 2. Wait for loader
            expect(page.locator("#app-loader")).to_be_hidden(timeout=10000)

            # 3. Trigger Boss Mode via HUD button
            page.locator("#boss-btn-hud").click()

            # 4. Wait for Boss Mode Overlay
            boss_overlay = page.locator("#boss-mode-overlay")
            expect(boss_overlay).to_be_visible()

            # 5. Click Spotify Icon in Taskbar
            spotify_icon = page.locator("#boss-switch-spotify")
            spotify_icon.click()

            # 6. Verify Spotify Content (use first match)
            expect(page.locator("text=Deep Work Focus").first).to_be_visible()

            # 7. Click Play
            play_btn = page.locator(".fa-play").first
            play_btn.click()

            # 8. Screenshot
            page.screenshot(path="verification/screenshot_boss_spotify.png")
            print("Boss Mode Spotify verification successful.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_spotify.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_boss_spotify()
