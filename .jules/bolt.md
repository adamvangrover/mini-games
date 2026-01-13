## 2026-01-12 - [Animation Frame Batching]
**Learning:** Browsers batch DOM updates within the same frame. Setting an element to 'visible' and then 'hidden' in the same frame (even inside a single requestAnimationFrame) results in the element never being seen.
**Action:** Use nested requestAnimationFrame (double RAF) to ensure the first state is painted before the second state is applied.
