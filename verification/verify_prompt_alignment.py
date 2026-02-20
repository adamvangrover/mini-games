import os
import sys

def verify_file_contains(filepath, required_strings):
    if not os.path.exists(filepath):
        print(f"Error: {filepath} does not exist.")
        return False

    with open(filepath, 'r') as f:
        content = f.read()

    missing = []
    for s in required_strings:
        if s not in content:
            missing.append(s)

    if missing:
        print(f"Error: Missing required strings in {filepath}: {missing}")
        return False

    print(f"Success: {filepath} verified successfully.")
    return True

def main():
    checks = [
        ('AGENTS.md', [
            "Self-Contained Modules",
            "Verification",
            "Log",
            "SaveSystem"
        ]),
        ('README.md', [
            "Vanilla JavaScript",
            "main.js",
            "js/core/"
        ]),
        ('js/core/LLMService.js', [
            "Grok",
            "Coder",
            "System"
        ])
    ]

    all_passed = True
    for filepath, strings in checks:
        if not verify_file_contains(filepath, strings):
            all_passed = False

    if not all_passed:
        sys.exit(1)

    print("ALL PROMPT ALIGNMENT CHECKS PASSED")

if __name__ == "__main__":
    main()
