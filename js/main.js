import SoundManager from './core/SoundManager.js';
import SaveSystem from './core/SaveSystem.js';
import InputManager from './core/InputManager.js';
import AssetManager from './core/AssetManager.js';
import LegacyAdapter from './games/legacy/LegacyAdapter.js';

// Initialize Core Systems
const soundManager = new SoundManager();
const saveSystem = new SaveSystem();
const inputManager = new InputManager();
const assetManager = new AssetManager();

window.soundManager = soundManager;
window.saveSystem = saveSystem;
window.inputManager = inputManager;
window.assetManager = assetManager;

let currentGame = null;
let gameLoopId = null;
let lastTime = 0;

// Map of Game IDs to their Module Paths
const gameRegistry = {
    'clicker-game': './games/clicker.js',
    'maze-game': './games/maze.js',
    'runner-game': './games/runner.js',
    'typing-game': './games/typing.js',
    'snake-game': './games/snake.js',
    'pong-game': './games/pong.js',
    'space-game': './games/space.js',
    'tetris-game': './games/tetris.js',
    'breakout-game': './games/breakout.js',
    'rpg-game': './games/rpg.js',
    'eclipse-game': './games/eclipse.js',
    'eclipse-puzzle-game': './games/eclipsePuzzle.js',
    'eclipse-logic-puzzle-game': './games/eclipseLogicPuzzle.js',
    'matterhorn-game': './games/matterhorn.js',
    'aetheria-game': './games/aetheria/aetheria.js',
    'tower-defense-game': './games/towerDefense.js',
    'stacker-game': './games/stacker.js'
};

async function loadGame(gameId) {
    const modulePath = gameRegistry[gameId];
    if (!modulePath) {
        console.error(`Game module not found for ID: ${gameId}`);
        return null;
    }

    try {
        const module = await import(modulePath);
        return module.default || module;
    } catch (e) {
        console.warn(`Failed to load game module: ${modulePath} as ES6 module. Attempting legacy load.`, e);

        // Fallback for legacy scripts
        // We guess the global variable name based on the ID
        // e.g. 'clicker-game' -> 'clickerGame'
        const baseName = gameId.replace('-game', '');
        const globalName = baseName + 'Game';

        return new LegacyAdapter(modulePath, globalName);
    }
}

async function startGame(gameId) {
    // Shutdown previous game
    if (currentGame) {
        shutdownCurrentGame();
    }

    // UI Handling
    document.getElementById("menu").classList.add("hidden");
    const container = document.getElementById(gameId);
    if (container) {
        container.classList.remove("hidden");
    } else {
        console.error(`Container not found for ${gameId}`);
        return;
    }

    // Audio
    if (soundManager.audioCtx.state === 'suspended') {
        soundManager.audioCtx.resume();
    }
    soundManager.playSound('click');

    // Load Game Module
    const gameModule = await loadGame(gameId);
    if (!gameModule) {
        console.error("Could not load game module");
        goBack(); // Return to menu if load fails
        return;
    }

    // Instantiate if it's a class
    if (typeof gameModule === 'function' && /^class\s/.test(gameModule.toString())) {
        currentGame = new gameModule();
    } else {
        currentGame = gameModule;
    }

    // Initialize Game
    // We pass the container element to the game
    if (currentGame && typeof currentGame.init === 'function') {
        currentGame.init(container);
    }

    // Start Game Loop
    lastTime = performance.now();
    gameLoopId = requestAnimationFrame(gameLoop);
}

function shutdownCurrentGame() {
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }

    if (currentGame && typeof currentGame.shutdown === 'function') {
        currentGame.shutdown();
    }

    currentGame = null;
}

function gameLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000; // Seconds
    lastTime = timestamp;

    if (currentGame) {
        if (typeof currentGame.update === 'function') {
            currentGame.update(deltaTime);
        }
        if (typeof currentGame.draw === 'function') {
            currentGame.draw();
        }
    }

    gameLoopId = requestAnimationFrame(gameLoop);
}

function goBack() {
    shutdownCurrentGame();

    document.querySelectorAll(".game-container").forEach(el => el.classList.add("hidden"));
    document.getElementById("menu").classList.remove("hidden");
}

document.addEventListener('DOMContentLoaded', async () => {
    // Preload Assets
    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'loading-screen';
    loadingScreen.style.position = 'fixed';
    loadingScreen.style.top = '0';
    loadingScreen.style.left = '0';
    loadingScreen.style.width = '100%';
    loadingScreen.style.height = '100%';
    loadingScreen.style.background = '#000';
    loadingScreen.style.color = '#00ffff';
    loadingScreen.style.display = 'flex';
    loadingScreen.style.flexDirection = 'column';
    loadingScreen.style.justifyContent = 'center';
    loadingScreen.style.alignItems = 'center';
    loadingScreen.style.zIndex = '9999';
    loadingScreen.innerHTML = '<h1>LOADING...</h1><div id="loading-bar" style="width: 200px; height: 10px; background: #333; margin-top: 20px;"><div id="loading-fill" style="width: 0%; height: 100%; background: #00ffff;"></div></div>';
    document.body.appendChild(loadingScreen);

    // Fake asset list for now, or real ones if we had them
    const assets = [
        { id: 'bg', type: 'image', src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop' }
    ];

    // Hook into progress
    const progressInterval = setInterval(() => {
        const fill = document.getElementById('loading-fill');
        if(fill) fill.style.width = `${assetManager.progress * 100}%`;
    }, 100);

    await assetManager.loadAssets(assets);

    clearInterval(progressInterval);
    loadingScreen.style.opacity = '0';
    loadingScreen.style.transition = 'opacity 0.5s';
    setTimeout(() => loadingScreen.remove(), 500);


    // Bind Menu Buttons
    document.querySelectorAll('#menu .game-card[data-game]').forEach(card => {
        card.addEventListener('click', () => {
            startGame(card.dataset.game);
        });
    });

    // Bind Back Buttons
    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', goBack);
    });
});
