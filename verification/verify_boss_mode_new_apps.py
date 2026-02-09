
import os
import sys
import time
from playwright.sync_api import sync_playwright

def verify_boss_mode_apps():
    print("Starting verification for Boss Mode New Apps...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto("http://localhost:8000")

        # Wait for BossMode to be available
        page.wait_for_function("() => window.BossMode && window.BossMode.instance")

        # Trigger Boss Mode via button or key
        page.evaluate("window.BossMode.instance.toggle()")
        print("Boss Mode toggled.")

        # Wait for overlay
        page.wait_for_selector("#boss-mode-overlay", state="visible")

        # Cheat: Fast forward boot and login
        page.evaluate("""() => {
            const os = window.BossMode.instance;
            os.systemState = 'desktop';
            os.login(); // This sets state and renders desktop
        }""")
        print("Forced Desktop state.")

        # Check for icons on desktop or taskbar
        # BossMode.js renders icons with createIconHTML which doesn't seem to use IDs for icons,
        # but the taskbar uses IDs like #boss-switch-spotify in BossModeOS.js.
        # In BossMode.js, renderTaskbarWindows uses:
        # <div ... onclick="BossMode.instance.openApp('${app.id}')"> ... </div>
        # It doesn't seem to have IDs on the buttons themselves easily accessible, wait:
        # It iterates `apps` and creates divs. No IDs on divs.
        # But it has `onclick="BossMode.instance.openApp('spotify')"`

        # We can find by onclick attribute or icon class

        # Test launching Spotify
        print("Launching Spotify...")
        # Use evaluate to open directly to be robust against UI changes
        page.evaluate("window.BossMode.instance.openApp('spotify')")

        # Wait for window content
        # Window ID is dynamic (win-1, win-2). We look for content inside.
        try:
            # Look for Spotify header or content. SpotifyApp renders "Neonify" or similar.
            # If we used the class, it renders what we defined in BossModeApps.js.
            # If we haven't updated BossMode.js yet, it uses inline renderer.
            page.wait_for_selector(".fa-spotify", timeout=5000)
            print("Spotify App opened successfully.")
        except:
            print("Error: Spotify window did not open.")
            browser.close()
            return False

        # Test Marketplace
        print("Launching Marketplace...")
        page.evaluate("window.BossMode.instance.openApp('marketplace')")
        try:
            page.wait_for_selector("text=Spicy Marketplace", timeout=5000)
            print("Marketplace App opened successfully.")
        except:
            print("Error: Marketplace content missing.")
            browser.close()
            return False

        browser.close()
        print("Verification PASSED.")
        return True

if __name__ == "__main__":
    if not verify_boss_mode_apps():
        sys.exit(1)
