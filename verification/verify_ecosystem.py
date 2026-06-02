from playwright.sync_api import sync_playwright
import time

def test_ecosystem_sim():
    print("Testing Ecosystem Sim...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the page via local server
        page.goto('http://localhost:8000/test_ecosystem.html')

        # Wait a bit for initialization
        time.sleep(2)

        # Check for errors in the console
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        # Check if the canvas exists
        canvas = page.query_selector('canvas#ecosystemSim-canvas')
        if not canvas:
            print("❌ Canvas not found!")
            return False

        # Check if UI elements rendered
        plants_display = page.query_selector('#eco-plants')
        if not plants_display:
            print("❌ UI elements not found!")
            return False

        print("✅ Ecosystem Sim loaded successfully.")

        # Click a button to test interaction
        page.click('button[data-tool="herbivore"]')
        time.sleep(0.5)

        # Take a screenshot
        page.screenshot(path="verification/ecosystem_sim.png")

        # Clean up
        browser.close()
        return True

if __name__ == "__main__":
    test_ecosystem_sim()
