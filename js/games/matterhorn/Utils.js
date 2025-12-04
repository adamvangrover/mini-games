export const Utils = {
    lerp: (a, b, t) => a + (b - a) * t,
    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),
    rand: (min, max) => Math.random() * (max - min) + min
};

// Simple Simplex Noise implementation or fallback
export class SimplexNoise {
    constructor() {
        // Very basic pseudo-random noise if not needing high quality
        this.noise2D = (x, y) => {
            return Math.sin(x) * Math.cos(y) * Math.sin(x + y);
        };
    }
}
