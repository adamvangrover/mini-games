import os

def check_js_syntax():
    # Recursively find all .js files
    js_files = []
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.js') and 'node_modules' not in root:
                js_files.append(os.path.join(root, file))

    print(f"Checking syntax for {len(js_files)} files...")

    # Using node to check syntax with the --check flag (if available) or just parsing
    # Since we can't easily rely on 'node -c', we will assume python is easier to run here.
    # Actually, we can use `node --check`

    import subprocess

    failed_files = []

    for file in js_files:
        try:
            # print(f"Checking {file}...")
            result = subprocess.run(['node', '--check', file], capture_output=True, text=True)
            if result.returncode != 0:
                print(f"❌ Syntax Error in {file}:\n{result.stderr}")
                failed_files.append(file)
        except Exception as e:
            print(f"Could not check {file}: {e}")

    if failed_files:
        print(f"Found {len(failed_files)} files with syntax errors.")
        exit(1)
    else:
        print("✅ No syntax errors found in JS files.")

if __name__ == "__main__":
    check_js_syntax()
