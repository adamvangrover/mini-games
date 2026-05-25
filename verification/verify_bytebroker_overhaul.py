from playwright.sync_api import sync_playwright
import time

def verify_bytebroker():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the hub
        page.goto("http://localhost:8000/")

        # Wait for the loader to disappear
        page.wait_for_selector('#loader', state='hidden', timeout=10000)

        # Open Byte Broker directly via JS to bypass 3D navigation issues
        page.evaluate('window.miniGameHub.transitionToState("IN_GAME", { gameId: "byte-broker" })')

        # Wait for the game container to be visible and initialized
        page.wait_for_selector('#byte-broker', state='visible', timeout=5000)

        # Verify UI Overhauls (CRT/Glitch classes)
        crt_scanlines = page.locator('.crt-scanlines')
        assert crt_scanlines.count() > 0, "CRT scanlines class missing"

        glitch_text = page.locator('.glitch-text-bb')
        assert glitch_text.count() > 0, "Glitch text class missing"

        cyber_panel = page.locator('.cyber-panel')
        assert cyber_panel.count() > 0, "Cyber panel class missing"

        # Verify header text was changed
        header_text = page.locator('h1.glitch-text-bb').inner_text()
        assert "OPERATION ABSOLUTE RESOLVE // TERMINAL" in header_text, "Header text not updated"

        print("Byte Broker visual layout and classes successfully verified.")

        # Verify game logic hasn't crashed the loop (Wait a few ticks)
        time.sleep(2)
        cash_val = page.locator('#bb-cash').inner_text()
        assert cash_val == "10,000.00", "Starting cash is incorrect"

        risk_val = page.locator('#bb-risk').inner_text()
        # Risk should increase due to the new logic
        assert int(risk_val) >= 0, "Risk value not rendering properly"

        print("Byte Broker game loop verified. No crashes detected.")
        browser.close()

if __name__ == "__main__":
    verify_bytebroker()
