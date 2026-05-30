from playwright.sync_api import sync_playwright, expect

def verify_standalone(page):
    # Capture console logs
    page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))
    page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))

    print("Navigating to standalone test page...")
    page.goto("http://localhost:8000/verification/test.html")

    print("Waiting for canvas...")
    canvas = page.locator("#bullet-hell-canvas")
    expect(canvas).to_be_visible(timeout=5000)

    # Let the game run for a bit to spawn patterns
    page.wait_for_timeout(3000)

    page.screenshot(path="verification/neon_bullet_hell_standalone.png")
    print("Screenshot saved: verification/neon_bullet_hell_standalone.png")

    print("Standalone Verification Complete.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_standalone(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_neon_bullet_hell_standalone.png")
        finally:
            browser.close()
