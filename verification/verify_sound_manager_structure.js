import SoundManager from './js/core/SoundManager.js';
import SaveSystem from './js/core/SaveSystem.js';

// Mock window and AudioContext for Node.js environment if needed,
// but since we run in browser context via verification usually,
// let's just make sure it loads.

try {
    const sm = new SoundManager();
    console.log("SoundManager initialized");

    // Check if new styles are in scales
    if (!sm.scales.synthwave) throw new Error("Missing synthwave scale");
    if (!sm.scales.industrial) throw new Error("Missing industrial scale");
    if (!sm.scales.lofi) throw new Error("Missing lofi scale");

    console.log("New scales verified.");
} catch (e) {
    console.error(e);
}
