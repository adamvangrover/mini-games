from playwright.sync_api import sync_playwright

def verify_mobile_interface():
    with sync_playwright() as p:
        iphone_12 = p.devices['iPhone 12 Pro']
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(**iphone_12)
        page = context.new_page()

        page.on("console", lambda msg: print(f"Console: {msg.text}"))

        page.goto("http://localhost:8000/index.html")

        # Wait for specific text that confirms the grid is populated
        try:
            # Wait for the last game or a known game to appear
            page.wait_for_selector("text=Neon Flow", timeout=10000)
            print("Neon Flow text found.")
        except:
            print("Timeout waiting for Neon Flow text.")
            page.screenshot(path="verification/timeout_flow.png")
            browser.close()
            return

        # Click it
        page.locator("text=Neon Flow").click()

        # Wait for game container
        page.wait_for_selector("#neon-flow-game")
        page.wait_for_timeout(1000) # wait for render

        page.screenshot(path="verification/neon_flow_game.png")
        print("Screenshot of Neon Flow game saved.")

        # Interact
        page.mouse.move(100, 300)
        page.mouse.down()
        page.mouse.move(200, 400, steps=20)
        page.mouse.move(300, 300, steps=20)
        page.mouse.up()

        page.wait_for_timeout(500)
        page.screenshot(path="verification/neon_flow_interaction.png")

        # Exit
        # Find the button. It has an icon.
        exit_btn = page.locator("#neon-flow-game button").first
        exit_btn.click()

        # Back to menu
        page.wait_for_selector("text=Neon Flow")

        # Verify Snake
        snake_card = page.locator(".game-card", has_text="Snake").first
        snake_card.scroll_into_view_if_needed()
        snake_card.click()

        page.wait_for_selector("#snake-game")
        page.wait_for_timeout(1000)

        dpad = page.locator(".mobile-dpad")
        if dpad.is_visible():
            print("Mobile D-Pad is visible.")
            page.screenshot(path="verification/mobile_controls.png")
        else:
            print("Mobile D-Pad NOT visible.")

        browser.close()

if __name__ == "__main__":
    verify_mobile_interface()
