## 2026-01-12 - [Animation Frame Batching]
**Learning:** Browsers batch DOM updates within the same frame. Setting an element to 'visible' and then 'hidden' in the same frame (even inside a single requestAnimationFrame) results in the element never being seen.
**Action:** Use nested requestAnimationFrame (double RAF) to ensure the first state is painted before the second state is applied.

## 2026-01-12 - [High-Frequency Input Throttling]
**Learning:** High-polling rate mice (1000Hz+) can flood the main thread with `mousemove` events, causing significant overhead if heavy DOM manipulation or RAF scheduling happens on every event.
**Action:** Always throttle `mousemove` handlers for visual effects (like cursor trails) to a reasonable frame rate (e.g., 20ms or ~50fps) using `performance.now()`.

## 2026-02-01 - [Audio Buffer Pooling]
**Learning:** Creating new `AudioBuffer` objects (especially filling them with random data) on every beat for synthesized sounds causes massive garbage collection overhead and CPU spikes.
**Action:** Pre-generate shared noise buffers (e.g., 2 seconds of white noise) and play slices of them with randomized offsets.

## 2026-05-21 - [Raycast Throttling]
**Learning:** Performing raycasting against a complex scene every frame (60fps) for simple UI hover states is wasteful and consumes significant CPU, especially when the interaction feedback (tooltip) doesn't require sub-16ms precision.
**Action:** Throttle the expensive raycasting operation (e.g., to 50ms) while keeping the visual feedback (tooltip positioning) running at full frame rate to maintain perceived smoothness.

## 2026-02-03 - [Synchronous Storage Blocking]
**Learning:** Serializing large objects with JSON.stringify and encrypting synchronously in localStorage.setItem blocks the main thread for >5ms on complex objects.
**Action:** Debounce save operations to coalesce updates and defer execution.

## 2024-03-12 - [Raycast Throttling for Click Events]
**Learning:** Calling `raycaster.intersectObjects(this.scene.children, true)` on every click in a scene with hundreds of geometries (like the Arcade Hub) causes significant main thread blocking and input lag.
**Action:** Maintain a separate array of `interactionTargets` (e.g., interactable items AND the floor for movement) and raycast against only that subset to drastically reduce intersection calculations.

## 2026-06-12 - [DOM Layout Thrashing in Game Loops]
**Learning:** Updating DOM elements (e.g., `textContent` for score UI) blindly on every frame inside a 60fps canvas `update()` loop causes severe layout thrashing and high CPU usage, even if the value hasn't changed.
**Action:** Always cache the DOM element reference and memoize the previous value. Only update the DOM when the new value strictly differs from the memoized value.
