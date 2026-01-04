from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    # Set a large viewport to ensure desktop UI
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    page = context.new_page()

    # Mock SpeechSynthesis
    page.add_init_script("""
        window.speechSynthesis = {
            speak: () => {},
            cancel: () => {},
            getVoices: () => [],
            onvoiceschanged: null
        };
        window.SpeechSynthesisUtterance = class {
            constructor(text) { this.text = text; }
        };
    """)

    try:
        page.goto("http://localhost:8000")

        # Click body to clear any splash screen
        page.click("body", force=True)
        time.sleep(2)

        # Open Boss Mode (Alt+B)
        page.keyboard.press("Alt+b")
        page.wait_for_selector("#boss-mode-overlay", state="visible", timeout=5000)
        print("Boss Mode opened.")

        # --- Test Podcast App ---
        # Switch to Podcast
        page.click("#boss-switch-podcast")
        # Check UI - Target the header specifically
        expect(page.locator("span.font-bold.text-sm:has-text('PodCaster')")).to_be_visible()
        expect(page.locator("text=The Daily Standup")).to_be_visible()

        # Click a podcast
        page.click("text=The Daily Standup")
        # Check playback UI
        expect(page.locator("button:has-text('Stop Playback')")).to_be_visible()
        print("Podcast app playback verified.")

        # Take screenshot of Podcast App
        page.screenshot(path="verification/boss_podcast.png")

        # --- Test Audiobook App ---
        # Switch to Audiobook
        page.click("#boss-switch-audiobook")
        expect(page.locator("span.font-bold.text-sm:has-text('BookWorm Audio')")).to_be_visible()
        expect(page.locator("text=The 7 Habits")).to_be_visible()

        # Start listening
        page.click("text=Start Listening")
        expect(page.locator("button:has-text('Pause')")).to_be_visible()
        print("Audiobook app playback verified.")

        # Take screenshot of Audiobook App
        page.screenshot(path="verification/boss_audiobook.png")

        # --- Test Spotify Expanded Genres ---
        page.click("#boss-switch-spotify")
        # Check for new genres in playlist list
        expect(page.locator("text=Jazz Cafe")).to_be_visible()
        expect(page.locator("text=Dad Rock")).to_be_visible()
        print("Spotify expanded genres verified.")

    except Exception as e:
        print(f"Verification failed: {e}")
        page.screenshot(path="verification/fail_audio_features_v3.png")
        raise e
    finally:
        browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
