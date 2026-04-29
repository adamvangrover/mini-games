# Technical Specifications for LLM Integrations

## Indexing Strategy

To maintain a fast and relevant context window, the repository uses the following indexing strategy:
- `docs/prompts/`: Contains meta-prompts (like `CRAFT_S.md`) and persona definitions.
- `js/core/`: The core system architecture. These files should be indexed heavily but modified rarely by autonomous agents without review.
- `js/games/`: The game modules. These are designed to be self-contained and are the primary playground for LLM code generation.

## Token Limits

- Keep system prompts under 2,000 tokens.
- File context injected into the prompt should not exceed 8,000 tokens to ensure the LLM does not lose track of the core objective (the "needle in the haystack" problem).

## Tools and MCP

The system utilizes Model Context Protocol (MCP) tools to allow agents to:
- Run bash scripts
- Execute Playwright verification
- Read and modify specific files safely.