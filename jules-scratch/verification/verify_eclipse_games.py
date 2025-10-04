import os
from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Get the absolute path to the index.html file
    file_path = os.path.abspath("index.html")

    # Navigate to the local HTML file
    page.goto(f"file://{file_path}")

    menu = page.locator("#menu")
    expect(menu).to_be_visible()

    # --- Verify Eclipse Game ---
    menu.get_by_role("button", name="☀️ Eclipse").click()
    eclipse_container = page.locator("#eclipse-game")
    expect(eclipse_container).to_be_visible()
    page.screenshot(path="jules-scratch/verification/eclipse_game.png")
    eclipse_container.get_by_role("button", name="Back").click()

    # --- Verify Eclipse Puzzle Game ---
    expect(menu).to_be_visible() # Wait for menu to reappear
    menu.get_by_role("button", name="🧩 Eclipse Puzzle").click()
    eclipse_puzzle_container = page.locator("#eclipse-puzzle-game")
    expect(eclipse_puzzle_container).to_be_visible()
    page.screenshot(path="jules-scratch/verification/eclipse_puzzle_game.png")
    eclipse_puzzle_container.get_by_role("button", name="Back").click()

    # --- Verify Eclipse Logic Puzzle Game ---
    expect(menu).to_be_visible() # Wait for menu to reappear
    menu.get_by_role("button", name="💡 Eclipse Logic Puzzle").click()
    eclipse_logic_puzzle_container = page.locator("#eclipse-logic-puzzle-game")
    expect(eclipse_logic_puzzle_container).to_be_visible()
    page.screenshot(path="jules-scratch/verification/eclipse_logic_puzzle_game.png")

    browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)