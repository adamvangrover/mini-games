import os

def verify_sw_registration():
    if not os.path.exists("sw.js"):
        print("FAIL: sw.js does not exist.")
        return

    with open("js/main.js", "r") as f:
        content = f.read()
        if "navigator.serviceWorker.register" in content:
            print("PASS: SW registration found in main.js")
        else:
            print("FAIL: SW registration NOT found in main.js")

if __name__ == "__main__":
    verify_sw_registration()
