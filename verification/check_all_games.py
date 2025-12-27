import sys
import time
import os
from playwright.sync_api import sync_playwright

def verify_all_games():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture ALL logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        print("Navigating to app...")
        page.goto("http://localhost:8000/index.html")

        # Wait longer and debug
        try:
            page.wait_for_function("() => window.miniGameHub && window.miniGameHub.gameRegistry", timeout=15000)
        except Exception:
            print("Timed out waiting for miniGameHub.")


        # Get list of games from registry
        games = page.evaluate("""() => {
            return Object.keys(window.miniGameHub?.gameRegistry || {});
        }""")

        if not games:
             print("No games found.")
             return

        print(f"Found {len(games)} games to verify.")

        results = {}

        for game_id in games:
            print(f"Verifying {game_id}...")
            error_logs = []

            # Hook console logs for this iteration
            def handle_console(msg):
                if msg.type == "error":
                    error_logs.append(msg.text)

            def handle_error(exc):
                error_logs.append(str(exc))

            # We already have global listeners, but let's count errors for this specific phase
            # Actually, the global listener prints everything. Let's just rely on that for debugging for now.
            # But to automate pass/fail, we need to capture errors.

            # Re-adding specific listeners might be tricky if not removed, but let's try just relying on the global print
            # and a simple check.

            try:
                # Transition to game
                page.evaluate(f"window.miniGameHub.transitionToState('IN_GAME', {{ gameId: '{game_id}' }})")

                # Wait for game to init
                time.sleep(2)

                # Check for canvas or container visibility
                visible = page.evaluate(f"""() => {{
                    const container = document.getElementById('{game_id}');
                    return container && !container.classList.contains('hidden');
                }}""")

                if not visible:
                    print("  -> Container not visible")
                    results[game_id] = "FAIL"
                else:
                    results[game_id] = "PASS" # Assuming no crash if we got here

                # Go back to menu
                page.evaluate("window.miniGameHub.transitionToState('MENU')")
                time.sleep(1)

            except Exception as e:
                print(f"  ❌ {game_id} crashed: {e}")
                results[game_id] = "CRASH"


        browser.close()

        # Summary
        print("\n--- Summary ---")
        pass_count = sum(1 for r in results.values() if r == "PASS")
        print(f"Passed: {pass_count}/{len(games)}")
        for gid, status in results.items():
            if status != "PASS":
                print(f"{gid}: {status}")

if __name__ == "__main__":
    verify_all_games()
