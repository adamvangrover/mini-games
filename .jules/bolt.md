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
## 2026-04-27 - [Nested Collision Loop Early Break]
**Learning:** In nested broad-phase collision detection loops (e.g., bullet vs. enemy in Neon Galaga), using `forEach` callbacks introduces overhead. More importantly, continuing to check collisions for a bullet *after* it has already hit an enemy is an $O(N \times M)$ waste of CPU cycles and allows a single bullet to potentially register multiple hits in the exact same frame.
**Action:** Always replace nested `forEach` callbacks with standard `for` loops in hot code paths, and insert an early `break;` statement in the inner loop as soon as the first object registers a collision and is deactivated, avoiding unnecessary iterations.

## 2024-05-18 - [Neon Survivor Distance Calculation Optimization]
**Learning:** In entity-dense games like Neon Survivor with O(N^2) spatial checks (e.g., enemy separation, bullet collisions), using `Math.sqrt` for distance calculations creates a significant CPU overhead during high-frequency loops. Squared distance checks (`dx*dx + dy*dy < minD * minD`) achieve the same result without the expensive square root operation.
**Action:** Always prefer squared distance comparisons (`distSq < radiusSq`) over actual distance calculations (`Math.sqrt() < radius`) in game loops, specifically prioritizing loops nested within each other or those iterating over arrays containing many elements like enemies or projectiles.

## 2026-06-21 - [Event Listener Bind Memory Leak]
**Learning:** Using `.bind(this)` directly inside `window.addEventListener()` or high-frequency loops like `requestAnimationFrame()` creates unique function references on every execution. When used in `removeEventListener()`, the function reference won't match, causing a severe memory leak as listeners accumulate indefinitely.
**Action:** Always store bound method references in class properties during initialization (e.g., `this.boundAnimate = this.animate.bind(this)`) and pass the property reference to DOM and timing APIs instead.
