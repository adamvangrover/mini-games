import re

with open('README.md', 'r') as f:
    content = f.read()

# Add the new game to the game collection list if not present
if "Cyber Deck Builder" not in content:
    content = re.sub(
        r'(\*   \*\*Strategy\*\*.*?)\n',
        r'\1\n*   **Strategy**: Cyber Deck Builder.',
        content
    )
    if "*   **Strategy**: Cyber Deck Builder." not in content:
        content = re.sub(
            r'(\*   \*\*Puzzle\*\*:.*?)\n',
            r'\1\n*   **Strategy**: Cyber Deck Builder.',
            content
        )
    with open('README.md', 'w') as f:
        f.write(content)
