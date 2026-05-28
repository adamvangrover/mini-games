import asyncio
from playwright.async_api import async_playwright

async def verify_ads():
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        # WE MUST USE CONTEXT to share localStorage between pages!
        context = await browser.new_context()
        page = await context.new_page()

        # Check NeonCoin Ad
        print("Checking ad_neon_coin.html...")
        await page.goto("http://localhost:8000/ad_neon_coin.html")
        await page.wait_for_selector("text=NeonCoin ICO")
        print("NeonCoin Ad loads.")

        # Click the Buy button
        await page.click("button:has-text('Buy with ETH')")
        # Wait for simulation to finish (1.5s delay + some buffer)
        await page.wait_for_selector("#status-msg:not(.hidden)", state="visible", timeout=5000)
        status_text = await page.text_content("#status-msg")
        print(f"Status message appeared: {status_text.strip()}")

        # Check Local Storage directly to see if values updated
        usdc_val = await page.evaluate("localStorage.getItem('ad_revenue_usdc')")
        print(f"ad_revenue_usdc from local storage: {usdc_val}")

        # Check Glitch Cola Ad
        print("\nChecking ad_glitch_cola.html...")
        await page.goto("http://localhost:8000/ad_glitch_cola.html")
        await page.wait_for_selector("text=GLITCH COLA")
        print("Glitch Cola Ad loads.")

        # Click Buy button
        await page.click("button:has-text('Buy Digital 12-Pack')")
        # Wait for simulation to finish (1.2s delay + some buffer)
        await page.wait_for_selector("#status-msg:not(.hidden)", state="visible", timeout=5000)
        status_text = await page.text_content("#status-msg")
        print(f"Status message appeared: {status_text.strip()}")

        usdc_val = await page.evaluate("localStorage.getItem('ad_revenue_usdc')")
        nnc_val = await page.evaluate("localStorage.getItem('pending_airdrop_nnc')")
        print(f"ad_revenue_usdc after glitch cola: {usdc_val}")
        print(f"pending_airdrop_nnc after glitch cola: {nnc_val}")

        # Check Neon Arcade Support Ad
        print("\nChecking ad_neon_arcade_support.html...")
        await page.goto("http://localhost:8000/ad_neon_arcade_support.html")
        await page.wait_for_selector("text=SUPPORT NEON ARCADE")
        print("Support Ad loads.")

        # Click Buy VIP button
        await page.evaluate("""
            const el = document.querySelector('.bg-indigo-900\\\\/40');
            el.click();
        """)

        # Wait for simulation to finish (2s delay + some buffer)
        try:
            # First it shows yellow processing, then green success. We wait for it to have check circle icon.
            await page.wait_for_selector("#status-msg i.fa-check-circle", state="visible", timeout=6000)
            status_text = await page.text_content("#status-msg")
            print(f"Status message appeared: {status_text.strip()}")
        except Exception as e:
            print(f"Timeout waiting for status message. Looking at DOM:")
            print(await page.content())
            raise e

        usdc_val = await page.evaluate("localStorage.getItem('ad_revenue_usdc')")
        print(f"ad_revenue_usdc after VIP: {usdc_val}")

        print("\nChecking if wallet sees these values...")
        # Now go to main page, open wallet, check if values propagated
        await page.goto("http://localhost:8000/")
        await page.wait_for_selector('#loader', state='hidden', timeout=15000)
        await page.click('body') # Dismiss potential "click to start"

        # Open wallet
        await page.wait_for_selector('#wallet-btn-hud')
        await page.click('#wallet-btn-hud')

        await page.wait_for_selector('#crypto-dashboard')

        usdc_display = await page.text_content("text=USDC >> xpath=.. >> span:nth-child(2)")
        nnc_display = await page.text_content("text=NeonCoin (Meme) >> xpath=.. >> span:nth-child(2)")

        print(f"Wallet USDC Display: {usdc_display.strip()}")
        print(f"Wallet NNC Display: {nnc_display.strip()}")

        # Also take a screenshot for proof
        await page.screenshot(path="verification/ads_wallet_final.png")
        print("Saved verification/ads_wallet_final.png")

        await browser.close()
        print("\nVerification Complete.")

asyncio.run(verify_ads())
