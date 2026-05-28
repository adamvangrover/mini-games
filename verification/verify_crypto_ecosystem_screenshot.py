import asyncio
from playwright.async_api import async_playwright

async def main():
    print("Starting Crypto Ecosystem Verification Screenshot...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            print("Navigating to hub...")
            await page.goto("http://localhost:8000/")

            print("Waiting for loader to disappear...")
            print('Clicking to dismiss loader...')
            await page.click('body')
            await page.wait_for_selector("#app-loader", state="hidden", timeout=15000)

            print("Finding Wallet button...")
            wallet_btn = page.locator("#wallet-btn-hud")
            await wallet_btn.wait_for(state="visible", timeout=5000)
            print("Clicking Wallet button...")
            await wallet_btn.click()

            print("Waiting for Crypto Dashboard to appear...")
            dashboard = page.locator("#crypto-dashboard")
            await dashboard.wait_for(state="visible", timeout=5000)

            print("Verifying initial UI state...")
            await page.wait_for_selector("#crypto-dashboard >> text=Crypto Wallet", state="visible")
            print('Taking trade screenshot...')
            await page.locator('#btn-mint-nft').click()
            await page.wait_for_timeout(3000)
            await page.locator('#btn-execute-trade').click()
            await page.wait_for_timeout(8000)
            await page.screenshot(path="verification/crypto_ecosystem_final.png")

            print("Taking screenshot...")
            await page.screenshot(path="verification/crypto_ecosystem.png")
            print("Screenshot saved to verification/crypto_ecosystem.png")

        except Exception as e:
            print(f"Error during verification: {e}")
            raise e
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
