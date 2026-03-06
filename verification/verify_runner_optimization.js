const fs = require('fs');
const path = require('path');

// Mocks
const THREE = {};
const InputManager = {
    getInstance: () => ({
        mouse: { x: 0, y: 0 },
        isKeyDown: () => false
    })
};

const SaveSystem = {
    getInstance: () => ({
        getEquippedItem: () => 'blue',
        getSettings: () => ({}),
        setSetting: () => {},
        setEquippedItem: () => {},
        setHighScore: () => {},
        addCurrency: () => {}
    })
};

const SoundManager = {
    getInstance: () => ({
        getAudioData: () => [],
        playSound: () => {},
        nextMusicStyle: () => 'acid'
    })
};

const ParticleSystem = {
    getInstance: () => ({
        emit: () => {},
        update: () => {},
        draw: () => {}
    })
};

// Global Setup
global.THREE = THREE;
global.InputManager = InputManager;
global.SaveSystem = { getInstance: SaveSystem.getInstance };
global.SoundManager = { getInstance: SoundManager.getInstance };
global.ParticleSystem = { getInstance: ParticleSystem.getInstance };
global.window = {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: () => {},
    removeEventListener: () => {},
    devicePixelRatio: 1,
    document: {
        body: { style: {}, appendChild: ()=>{} },
        createElement: (tag) => ({
            style: {},
            classList: { add:()=>{}, remove:()=>{} },
            appendChild: ()=>{},
            getContext: () => ({
                clearRect: () => {},
                createLinearGradient: () => {
                    return { addColorStop: () => {} };
                },
                fillRect: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                stroke: () => {},
                save: () => {},
                translate: () => {},
                rotate: () => {},
                restore: () => {},
                fill: () => {},
                arc: () => {}
            }),
            addEventListener: () => {}
        }),
        getElementById: () => ({ textContent: '', style: {} }),
    },
    navigator: { maxTouchPoints: 0 }
};
global.document = global.window.document;
global.performance = { now: () => Date.now() };

// Read File
const code = fs.readFileSync(path.join(__dirname, '../js/games/runner.js'), 'utf8');

// Regex to remove imports
let cleanCode = code.replace(/import .* from .*/g, '');

// Regex to expose class globally
cleanCode = cleanCode.replace('export default class RunnerGame', 'global.RunnerGame = class RunnerGame');

// Helper to eval
function runTest() {
    // Eval the class
    eval(cleanCode);

    // Instantiate
    const container = {
        innerHTML: '',
        appendChild: () => {},
        style: {},
        querySelector: () => ({ addEventListener: () => {} })
    };
    const game = new global.RunnerGame();
    game.init(container);

    let callCount = 0;
    game.ctx.createLinearGradient = () => {
        callCount++;
        return { addColorStop: () => {} };
    };

    // Simulate Loop
    console.log("Simulating 60 frames...");

    for(let i=0; i<60; i++) {
        game.draw();
    }

    console.log(`createLinearGradient called ${callCount} times in 60 frames.`);

    if (callCount > 10) {
        console.log("Verdict: NOT Optimized");
    } else {
        console.log("Verdict: Optimized (CanvasGradient cached)");
    }
}

runTest();
