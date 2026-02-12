import os
import sys

def verify_craft_s_prompt():
    filepath = 'docs/prompts/CRAFT_S.md'

    if not os.path.exists(filepath):
        print(f"Error: {filepath} does not exist.")
        sys.exit(1)

    with open(filepath, 'r') as f:
        content = f.read()

    required_strings = [
        "Component-Based Prompt (CRAFT+S)",
        "AGENTS.md",
        "BLOCK 1: IDENTITY",
        "{{Project_Phase}}"
    ]

    missing = []
    for s in required_strings:
        if s not in content:
            missing.append(s)

    if missing:
        print(f"Error: Missing required strings in {filepath}: {missing}")
        sys.exit(1)

    print(f"Success: {filepath} verified successfully.")

if __name__ == "__main__":
    verify_craft_s_prompt()
