
import pytest
from playwright.sync_api import sync_playwright
import time
import sys

def test_user_accounts_and_store():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture Console Logs
        page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

        try:
            print("Navigating to index.html...")
            page.goto("http://localhost:8000/index.html")
            page.wait_for_load_state("networkidle")

            # 0. Inject currency BEFORE opening store
            print("Injecting currency...")
            page.evaluate("window.miniGameHub.saveSystem.addCurrency(1000)")

            # 1. Check Store
            print("Checking Store...")
            # Open Store (using HUD button)
            page.click("#shop-btn-hud")
            page.wait_for_selector("#store-overlay:not(.hidden)")

            # Check for new items
            assert page.is_visible("text=Robot Avatar")
            assert page.is_visible("text=Silver Trophy")

            # Buy Robot Avatar
            print("Buying Avatar...")
            # Locator for button
            buy_btn_locator = "button[data-id='avatar_robot']"

            # Debug: Check button text/state
            btn_text = page.locator(buy_btn_locator).inner_text()
            print(f"Buy Button Text before click: {btn_text}")

            if page.is_visible(buy_btn_locator):
                page.click(buy_btn_locator)
                print("Clicked Buy.")

                # Wait longer for transition
                try:
                    page.wait_for_selector("button.equip-btn", timeout=5000)
                    print("Equip button appeared.")
                    assert page.is_visible("text=Equip")
                except Exception as e:
                    print("Timeout waiting for Equip button. Taking screenshot.")
                    page.screenshot(path="verification/failure_store_equip.png")
                    print(page.content()) # Print DOM dump for debug
                    raise e

            # Equip it
            print("Equipping Avatar...")
            page.click("button.equip-btn")
            # Should now say "Active"
            page.wait_for_selector("text=Active", timeout=5000)

            # Close Store
            page.click("#store-close-btn")

            # 2. Check Trophy Room
            print("Checking Trophy Room...")
            # Open Menu Grid
            page.click("#view-toggle-btn")
            page.wait_for_selector("#menu:not(.hidden)")

            # Click Trophy Button
            page.click("#trophy-btn-menu")

            time.sleep(1) # Wait for init

            # Check if renderer exists in that container
            assert page.is_visible("#trophy-back-btn")

            print("Trophy Room Verified.")

            # Go back
            page.click("#trophy-back-btn")
            # Should return to menu
            assert page.is_visible("#menu:not(.hidden)")

        except Exception as e:
            print(f"Test Exception: {e}")
            page.screenshot(path="verification/failure_general.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    try:
        test_user_accounts_and_store()
        print("All tests passed!")
    except Exception as e:
        print(f"Test failed details above.")
        exit(1)
