## 2024-05-24 - [CRITICAL] Stored XSS in Boss Mode Apps
**Vulnerability:** Found a Critical Stored XSS vulnerability in `BossModeApps.js`. The `GrokApp` chat interface was rendering user input directly into `innerHTML` without sanitization. An attacker (or a user tricking themselves) could inject malicious scripts.
**Learning:** Even simulated "fake" OS environments can have real security vulnerabilities if they render user input directly. Just because it's a "game" doesn't mean DOM-based XSS isn't possible.
**Prevention:** Always escape user input before inserting it into the DOM, even in "toy" applications. Used a simple `escapeHTML` helper since no heavy sanitization library was available. Checked other apps like `MarketplaceApp` and applied the fix there too.

## 2026-01-23 - [CRITICAL] Stored XSS in Boss Mode Tracker and Terminal
**Vulnerability:** Found multiple Stored XSS vulnerabilities in `BossMode.js`. The Activity Tracker (via Excel formulas), Terminal output, Teams Chat, and Email body were rendering user input directly into `innerHTML` using template literals.
**Learning:** Reusing code patterns (like `innerHTML` rendering) without security review spreads vulnerabilities. The `escapeHTML` helper existed in `BossModeApps.js` but was not shared or used in `BossMode.js`.
**Prevention:** Consolidate security helpers in a shared utility or base class. Ensure all `innerHTML` injections of user-controlled data are wrapped in `escapeHTML`.

## 2026-02-14 - [CRITICAL] Stored XSS in Boss Mode Legacy OS
**Vulnerability:** Found Stored XSS vulnerabilities in `BossModeLegacy.js` (Win95/Win98 simulation). The Terminal output, Chat application, and Email viewer were rendering user input directly into `innerHTML` using template literals, similar to previous issues in `BossMode.js`.
**Learning:** Legacy/Deprecated modules or "Easter Egg" features often bypass standard security reviews and updates. The `escapeHTML` helper was present in `BossMode.js` but not in the legacy module.
**Prevention:** Ensure all modules, including legacy/optional ones, enforce input sanitization. Consider refactoring to use a shared `utils.js` for security helpers to avoid copy-pasting and missing files.

## 2026-02-17 - [HIGH] Stored XSS in Boss Mode V0
**Vulnerability:** Found Stored XSS vulnerability in `BossModeV0.js`. The Word application was rendering `docContent` directly into `innerHTML` without sanitization. This module appeared to be a copy of `BossModeLegacy.js` before it was patched.
**Learning:** Forked or copied code often misses subsequent security patches applied to the original source.
**Prevention:** When refactoring or versioning modules, ensure security fixes are propagated to all variants. Ideally, use inheritance or shared renderers to avoid duplication of vulnerable patterns.

## 2025-05-24 - [HIGH] Stored XSS in CityGame Chat
**Vulnerability:** Found Stored XSS vulnerability in `CityGame.js`. The chat interface was rendering user input and LLM responses directly into `innerHTML` without sanitization.
**Learning:** New game modules often reimplement chat or text display features from scratch, missing the security practices established in core or other modules.
**Prevention:** Always use `Security.escapeHTML` when inserting text into the DOM. Promote the use of shared UI components for chat to avoid reimplementing vulnerable rendering logic.

## 2024-05-30 - [Stored XSS in Life Simulator Minigame]
**Vulnerability:** The social media feature in `js/games/lifeSim.js` allowed Stored Cross-Site Scripting (XSS). User input passed to `addPost(user, text)` was added directly to `this.state.socialFeed` without sanitization, and later rendered raw into the DOM via `el.innerHTML = ...` in the `renderSocial()` loop.
**Learning:** Even isolated minigames within a larger framework can introduce severe vulnerabilities if they implement their own state management and raw DOM rendering without utilizing the central security utilities.
**Prevention:** All user-controlled text inputs intended for HTML rendering must be sanitized through `Security.escapeHTML` prior to interpolation, regardless of the module's apparent isolation.

## 2026-03-28 - [CRITICAL] Stored XSS in BossMode V1, V2, and V3 Login Screens
**Vulnerability:** Found Stored XSS vulnerabilities in `BossModeV1.js`, `BossModeV2.js`, and `BossModeV3.js`. The user's name (`this.user.name`) and initials (`this.user.initials` in V3) were being rendered directly into `innerHTML` during the `renderLogin()` sequence without sanitization.
**Learning:** Even simulated OS "login" screens can be vulnerable if they directly render user profile data. The pattern of missing sanitization was consistently propagated across multiple iterations of the BossMode UI components.
**Prevention:** Always wrap user-controlled properties (like names, avatars, initials) with `Security.escapeHTML()` when interpolating them into HTML templates. Ensure security imports (`import Security from './Security.js';`) are included when copying or creating new UI modules.
