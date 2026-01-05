from playwright.sync_api import sync_playwright, expect
import time

def verify_enhancements():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        try:
            print("Navigating to App...")
            page.goto("http://localhost:8000")

            # Wait for loader
            expect(page.locator("#app-loader")).to_be_hidden(timeout=10000)
            time.sleep(2)

            # 1. Verify 3D Hub Drones (Indirect visual check via screenshot of hub)
            print("Taking Hub Screenshot...")
            page.screenshot(path="verification/enhanced_hub.png")

            # 2. Open Grid View to find Neon Racer
            print("Opening Grid View...")
            page.click("#view-toggle-btn")
            time.sleep(1)

            # 3. Check for Neon Racer
            print("Checking for Neon Racer...")
            racer_card = page.get_by_text("Neon Racer")
            expect(racer_card).to_be_visible()

            # 4. Open Store to check Particles
            print("Opening Store...")
            page.click("#shop-btn-menu")
            time.sleep(1)

            # 5. Check for Particle items
            print("Checking Store Items...")
            fire_trail = page.get_by_text("Fire Trail")
            expect(fire_trail).to_be_visible()

            page.screenshot(path="verification/store_particles.png")

            # 6. Play Neon Racer
            print("Playing Neon Racer...")
            page.click("#store-close-btn")
            time.sleep(0.5)
            racer_card.click()
            time.sleep(1)

            # Check for game canvas
            game_canvas = page.locator("#neon-racer canvas")
            expect(game_canvas).to_be_visible()

            page.screenshot(path="verification/neon_racer_game.png")

            print("Verification Successful!")

        except Exception as e:
            print(f"Failed: {e}")
            page.screenshot(path="verification/error_enhance.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_enhancements()
