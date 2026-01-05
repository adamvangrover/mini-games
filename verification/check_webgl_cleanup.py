import os

def check_games_for_cleanup():
    games_dir = 'js/games'
    files_to_check = []

    # Walk through games dir
    for root, dirs, files in os.walk(games_dir):
        for file in files:
            if file.endswith('.js'):
                path = os.path.join(root, file)
                with open(path, 'r') as f:
                    content = f.read()
                    if 'new THREE.WebGLRenderer' in content:
                        files_to_check.append(path)

    print(f"Found {len(files_to_check)} files using WebGLRenderer:")

    for path in files_to_check:
        with open(path, 'r') as f:
            content = f.read()

        has_shutdown = 'shutdown(' in content
        has_force_loss = 'forceContextLoss' in content
        has_dispose = '.dispose()' in content

        status = "✅ OK"
        if not has_shutdown:
            status = "❌ MISSING shutdown()"
        elif not has_force_loss:
            status = "⚠️ MISSING forceContextLoss"
        elif not has_dispose:
            status = "⚠️ MISSING dispose()"

        print(f"{status} - {path}")

if __name__ == "__main__":
    check_games_for_cleanup()
