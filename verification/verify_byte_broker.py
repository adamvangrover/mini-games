import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

def verify_byte_broker():
    # Start HTTP server
    server = subprocess.Popen([sys.executable, "-m", "http.server", "8084"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Started HTTP server on port 8084")
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

            print("Navigating...")
            page.goto("http://localhost:8084/index.html")

            # Dismiss Loader
            try:
                page.click("body", timeout=2000)
            except:
                pass

            # Inject Byte Broker directly to test logic quickly
            print("Injecting Game...")
            page.evaluate("""async () => {
                const container = document.createElement('div');
                container.id = 'test-container';
                container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;';
                document.body.appendChild(container);

                const module = await import('./js/games/byteBroker.js');
                const Game = module.default;
                window.gameInstance = new Game();
                await window.gameInstance.init(container);
            }""")

            # Verify Render
            page.wait_for_selector("#bb-stock-list")
            print("PASS: Dashboard rendered")

            # Verify Tutorial stock or empty state
            # My code has Tutorial.txt added by default in init()
            page.wait_for_selector("#bb-stock-list > div", state="visible")

            stocks = page.evaluate("() => document.querySelectorAll('#bb-stock-list > div').length")
            print(f"Stocks found: {stocks}")
            if stocks < 1:
                print("FAIL: No default stock found")
                sys.exit(1)

            # Upload File
            print("Uploading file...")
            with open("dummy_stock.txt", "w") as f:
                f.write("Some random data to create entropy " * 100)

            # The input is hidden, so we need to set input files
            # Wait for input
            page.wait_for_selector("#bb-file-input", state="attached")

            page.set_input_files("#bb-file-input", "dummy_stock.txt")

            # Wait for processing
            time.sleep(3)

            stocks_after = page.evaluate("() => document.querySelectorAll('#bb-stock-list > div').length")
            print(f"Stocks after upload: {stocks_after}")

            if stocks_after <= stocks:
                print("FAIL: File upload did not add stock")
                sys.exit(1)

            # Select the new stock (last one)
            page.evaluate("""() => {
                const list = document.querySelectorAll('#bb-stock-list > div');
                list[list.length - 1].click();
            }""")

            # Verify Detail View
            page.wait_for_selector("#bb-stock-name")
            name = page.text_content("#bb-stock-name")
            print(f"Selected Stock: {name}")
            if "dummy_stock.txt" not in name:
                 print("FAIL: Correct stock not selected")

            # Verify Buy
            cash_before = page.evaluate("() => window.gameInstance.cash")
            print(f"Cash Before: {cash_before}")

            page.click("#bb-btn-buy")

            cash_after = page.evaluate("() => window.gameInstance.cash")
            print(f"Cash After: {cash_after}")

            if cash_after >= cash_before:
                print("FAIL: Buy button didn't deduct cash")
                sys.exit(1)

            # Verify Sell
            page.click("#bb-btn-sell")

            cash_final = page.evaluate("() => window.gameInstance.cash")
            print(f"Cash Final: {cash_final}")

            if cash_final <= cash_after:
                 print("FAIL: Sell button didn't add cash")
                 sys.exit(1)

            # Verify Chart
            has_ctx = page.evaluate("() => !!window.gameInstance.chartCtx")
            if has_ctx:
                print("PASS: Chart Context exists")
            else:
                print("FAIL: Chart Context missing")
                sys.exit(1)

            try:
                os.remove("dummy_stock.txt")
            except:
                pass

            page.screenshot(path="verification/byte_broker_verified.png")
            browser.close()
            print("--- Verification Successful ---")

    except Exception as e:
        print(f"Error: {e}")
        try:
            os.remove("dummy_stock.txt")
        except:
            pass
        sys.exit(1)
    finally:
        server.terminate()

if __name__ == "__main__":
    verify_byte_broker()
