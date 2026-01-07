
import BossMode from '../js/core/BossMode.js';
import Store from '../js/core/Store.js';
import SaveSystem from '../js/core/SaveSystem.js';

// Mock DOM
global.document = {
    createElement: (tag) => {
        return {
            id: '',
            className: '',
            style: {},
            classList: {
                add: () => {},
                remove: () => {},
                contains: () => false
            },
            appendChild: () => {},
            remove: () => {},
            querySelectorAll: () => [],
            querySelector: () => ({
                addEventListener: () => {},
                appendChild: () => {}
            }),
            addEventListener: () => {}, // For overlay
            innerHTML: ''
        };
    },
    getElementById: (id) => null,
    body: {
        appendChild: () => {},
        className: ''
    },
    head: {
        appendChild: () => {}
    },
    addEventListener: () => {},
    removeEventListener: () => {}
};
global.window = {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: () => {},
    BossMode: null,
    AudioContext: class {
        constructor() {
            this.destination = {};
        }
        createGain() { return { gain: { value: 0 }, connect: () => {} }; }
        createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {} }; }
        createAnalyser() { return { connect: () => {}, frequencyBinCount: 128, getByteFrequencyData: () => {} }; }
        createDelay() { return { connect: () => {}, delayTime: { value: 0 } }; }
        createConvolver() { return { connect: () => {}, buffer: null }; } // Needed for reverb
    }
};
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};

console.log("Verifying Boss Mode Integration...");

try {
    const bm = new BossMode();
    console.log("BossMode instantiated.");

    if (typeof bm.startGuestOS === 'function') {
        console.log("PASS: startGuestOS method exists.");
    } else {
        console.error("FAIL: startGuestOS method missing.");
        process.exit(1);
    }

    // Check Store Items
    const saveSystem = new SaveSystem();
    const store = new Store(saveSystem, 'store-container', []);

    const newItems = ['os_v0', 'os_v1', 'os_v2', 'os_v3'];
    const found = newItems.filter(id => store.items.find(i => i.id === id));

    if (found.length === 4) {
        console.log("PASS: All new OS items found in Store.");
    } else {
        console.error(`FAIL: Missing Store items. Found: ${found.join(', ')}`);
        process.exit(1);
    }

    console.log("Integration Verification Successful.");
} catch (e) {
    console.error("Verification Failed:", e);
    process.exit(1);
}
