## 2026-01-24 - Accessible Game Cards
**Learning:** Using `div`s for interactive game cards in `js/main.js` (via template strings) required manually adding `tabindex="0"`, `role="button"`, and `keydown` listeners.
**Action:** In future updates, consider refactoring these into actual `<button>` elements or a reusable `GameCard` component to encapsulate these accessibility features automatically. Attaching event listeners in a loop after creating elements is cleaner than trying to inline them in `innerHTML`.
