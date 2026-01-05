# Async Agent Guidelines for Neon Arcade

This document provides instructions for autonomous agents working on the Neon Arcade repository. The goal is to ensure high-quality, non-regressive contributions through modular design and rigorous verification.

## 1. Modular Development

*   **Self-Contained Modules**: When adding new features or games, strive to keep them self-contained.
    *   **Games**: New games should be placed in `js/games/`. If a game is complex, create a subdirectory (e.g., `js/games/myGame/`) and use an adapter pattern to interface with the main hub.
    *   **Core Systems**: Modifications to core systems (`js/core/`) should be backward compatible. Avoid breaking changes that affect multiple existing games.
*   **Avoid Overlaps**: Before modifying shared files (like `js/main.js` or `css/style.css`), check if your change can be achieved via a game-specific module or a new CSS class.
*   **State Management**: Use `js/core/SaveSystem.js` for persistence. Do not use raw `localStorage` unless absolutely necessary and scoped to your specific module.

## 2. Verification & Quality Assurance

*   **Always Verify**: Never submit code without verifying it works.
*   **Verification Scripts**:
    *   Create verification scripts in the `verification/` directory.
    *   Use Playwright for end-to-end testing of UI and game flows.
    *   Use `verification/verify_all_modules.py` to check that all registered games load without errors.
*   **Verification Log**:
    *   Update `VERIFICATION_LOG.md` after performing significant verification tasks.
    *   Log the date, agent name, action taken, artifacts produced (scripts, screenshots), outcome, and notes.
    *   This log helps track what has been tested and by whom.

## 3. Workflow for New Features

1.  **Explore**: Understand the existing codebase and architecture.
2.  **Plan**: Create a detailed plan using `set_plan`.
3.  **Implement**: Write code in a modular fashion.
4.  **Verify**: Run tests and create new verification scripts if needed.
5.  **Log**: specific verification steps in `VERIFICATION_LOG.md`.
6.  **Submit**: Ensure all pre-commit checks pass.

## 4. Preventing Regressions

*   **Run Existing Tests**: Before submitting, run relevant existing verification scripts (e.g., `verification/verify_full.py`) to ensure no regressions were introduced.
*   **Dependency Management**: Be careful when adding new global dependencies. Prefer using existing libraries (Three.js, localized physics, etc.) available in the repo.
