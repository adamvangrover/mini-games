import pytest
from playwright.sync_api import sync_playwright
import time

def test_client_side_compatibility():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the page
        page.goto("http://localhost:8000/index.html")

        # 1. Handle the "Click to Start" loader
        try:
            loader = page.locator("#app-loader")
            if loader.is_visible():
                print("Loader visible, clicking body to dismiss...")
                page.mouse.click(100, 100) # Click somewhere to trigger audio resume and loader dismiss
                loader.wait_for(state="hidden", timeout=5000)
        except Exception as e:
            print(f"Loader handling warning: {e}")

        # 2. Verify LocalStorage is working (Simulate Local Session)
        page.evaluate("localStorage.setItem('test_key', 'test_value')")
        val = page.evaluate("localStorage.getItem('test_key')")
        assert val == 'test_value', "LocalStorage should be writable/readable"
        print("✅ LocalStorage check passed.")

        # 3. Check for Absolute Paths that would break GitHub Pages
        # We want to ensure no src="/..." or href="/..." exists.
        # Relative paths should be "js/..." or "./js/..." or "http..."

        elements_with_src = page.evaluate("""() => {
            const bad = [];
            document.querySelectorAll('*[src]').forEach(el => {
                const raw = el.getAttribute('src');
                if (raw && raw.startsWith('/')) bad.push(raw);
            });
            return bad;
        }""")

        elements_with_href = page.evaluate("""() => {
            const bad = [];
            document.querySelectorAll('*[href]').forEach(el => {
                const raw = el.getAttribute('href');
                if (raw && raw.startsWith('/')) bad.push(raw);
            });
            return bad;
        }""")

        if elements_with_src:
            print(f"❌ Found absolute src paths: {elements_with_src}")
        else:
            print("✅ No absolute 'src' paths found.")

        if elements_with_href:
             print(f"❌ Found absolute href paths: {elements_with_href}")
        else:
             print("✅ No absolute 'href' paths found.")

        assert len(elements_with_src) == 0, "Found absolute src paths incompatible with GitHub Pages subdirectories."
        assert len(elements_with_href) == 0, "Found absolute href paths incompatible with GitHub Pages subdirectories."

        # 4. Check for mixed content (http vs https) if we were on https
        # Since we are on localhost, this is less critical, but good to check we use https for CDNs

        insecure_resources = page.evaluate("""() => {
            const bad = [];
            document.querySelectorAll('script[src], link[href], img[src]').forEach(el => {
                const url = el.src || el.href;
                if (url && url.startsWith('http://') && !url.includes('localhost')) bad.push(url);
            });
            return bad;
        }""")

        if insecure_resources:
            print(f"⚠️ Found non-https resources: {insecure_resources}")
        else:
            print("✅ All external resources use HTTPS.")

        browser.close()

if __name__ == "__main__":
    try:
        test_client_side_compatibility()
        print("ALL CHECKS PASSED: Repo is Client-Side & GitHub Pages Compatible.")
    except Exception as e:
        print(f"VERIFICATION FAILED: {e}")
        exit(1)
