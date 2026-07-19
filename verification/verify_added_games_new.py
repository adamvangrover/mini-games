import urllib.request
import time

def check_url(url, must_contain):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            for term in must_contain:
                if term not in html:
                    print(f"FAIL: {url} missing '{term}'")
                    return False
            print(f"PASS: {url} contains all required terms.")
            return True
    except Exception as e:
        print(f"FAIL: Error fetching {url} - {e}")
        return False

time.sleep(1) # wait for server

success = True
success &= check_url("http://localhost:8000/battleship.html", ["Neon Fleet", "NeonFleet"])
success &= check_url("http://localhost:8000/vaultbreaker.html", ["Vault Breaker", "VaultBreaker"])
success &= check_url("http://localhost:8000/index.html", ["neon-fleet", "vault-breaker"])

if success:
    print("All checks passed.")
else:
    print("Some checks failed.")
