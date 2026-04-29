# LLM Optimization Tutorial

This tutorial covers the best practices for structuring prompts and context windows when using Large Language Models to generate code or content for the Neon Arcade Hub.

## 1. Grounding

Always ground your LLM agents by providing the specific architectural context they are working in. The Neon Arcade is a vanilla ES6 module system. Do not allow the LLM to hallucinate React or Vue dependencies.

## 2. Context Management

When injecting files into the LLM context, prioritize:
1. `js/main.js` (The core registry and state machine)
2. `js/core/SaveSystem.js` (For persistent data)
3. The specific module you are modifying.

## 3. Playwright Verification

Agents must generate Playwright scripts to verify their UI changes visually. Always instruct the LLM to write standalone Python or Node scripts using Playwright to interact with the DOM elements it has created.