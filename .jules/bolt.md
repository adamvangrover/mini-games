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

## 2026-06-15 - [Sub-pixel Anti-aliasing Overhead]
**Learning:** In high-frequency 60fps canvas rendering loops, drawing tiny shapes (like stars or particles) using `ctx.arc()` causes immense CPU overhead due to pathing calculations, and failing to clamp coordinates/dimensions to integers triggers expensive sub-pixel anti-aliasing. Furthermore, modifying `ctx.globalAlpha` inside tight loops causes context switches which can be mitigated by using interpolated `rgba()` strings on `fillStyle`.
**Action:** Replace `ctx.arc()` with `ctx.fillRect()`, use bitwise OR (e.g., `(x) | 0`) to force integer values, bound random size truncations (e.g., `Math.max(1, size)`), and combine alpha into `fillStyle` to drastically improve performance.

## 2026-04-26 - [Nested Collision Loop Optimization]
**Learning:** In nested broad-phase collision detection loops (e.g., bullet vs. enemy), using array methods like `forEach` and calculating exact distances via `distanceTo()` introduces significant overhead due to callback execution and `Math.sqrt()` operations. Furthermore, continuing to check collisions after a hit is registered on a bullet is wasteful.
**Action:** Replace `forEach` with standard backwards or forwards `for` loops, swap `distanceTo()` with `distanceToSquared()` using pre-calculated squared thresholds, and insert an early `break;` statement upon hit resolution to prevent redundant O(N*M) checks.
