import os

def patch_files():
    files = [
        "js/games/aetheriaClassic.js",
        "js/games/neonShooter.js",
        "js/games/rageQuit.js",
        "js/games/allInHole.js",
        "js/games/lumina.js",
        "js/games/space.js",
        "js/games/alpine.js",
        "js/games/prismRealms.js",
        "js/games/matterhorn/Game.js",
        "js/games/neonHunter/Game.js",
        "js/games/neonHunterEx/Game.js",
        "js/games/aetheria/aetheria.js"
    ]

    for path in files:
        with open(path, 'r') as f:
            content = f.read()

        if 'forceContextLoss' in content:
            print(f"Skipping {path} (already has forceContextLoss)")
            continue

        if 'renderer.dispose()' in content:
            new_content = content.replace(
                'renderer.dispose();',
                'renderer.dispose();\n            if (this.renderer.forceContextLoss) this.renderer.forceContextLoss();'
            )
            # Handle cases where it might be `this.renderer.dispose()`
            # Actually strict replacement of `renderer.dispose();` might miss `this.renderer.dispose();`
            # But usually it's `this.renderer.dispose();`

            # Let's try to be safer.
            if new_content == content:
                 new_content = content.replace(
                    'this.renderer.dispose();',
                    'this.renderer.dispose();\n            if (this.renderer.forceContextLoss) this.renderer.forceContextLoss();'
                )

            if new_content != content:
                with open(path, 'w') as f:
                    f.write(new_content)
                print(f"Patched {path}")
            else:
                print(f"⚠️ Could not automatically patch {path} (dispose found but replace failed)")
        else:
            print(f"❌ {path} has no renderer.dispose() call. Needs manual fix.")

if __name__ == "__main__":
    patch_files()
