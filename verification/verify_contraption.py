from playwright.sync_api import sync_playwright
import time

def test_contraption_maker():
    print("Testing Contraption Maker...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the page via local server
        page.goto('http://localhost:8000/test_contraption.html')

        # Wait a bit for initialization
        time.sleep(2)

        # Check for errors in the console
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        # Check if the canvas exists
        canvas = page.query_selector('canvas#contraptionMaker-canvas')
        if not canvas:
            print("❌ Canvas not found!")
            return False

        # Check UI Elements
        play_btn = page.query_selector('#cm-play-btn')
        if not play_btn:
            print("❌ Play button not found!")
            return False

        print("✅ Contraption Maker loaded successfully.")

        # Simulate placing an object
        # Select Domino tool
        page.click('button[data-tool="domino"]')
        time.sleep(0.5)

        # Click on canvas to place domino
        page.mouse.click(400, 300)
        time.sleep(0.5)

        # Click Play
        page.click('#cm-play-btn')
        time.sleep(1) # Let physics run

        # Take a screenshot
        page.screenshot(path="verification/contraption_maker.png")

        # Clean up
        browser.close()
        return True

if __name__ == "__main__":
    test_contraption_maker()
