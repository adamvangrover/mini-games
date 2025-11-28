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
// Refactored js/main.js
import SoundManager from './core/SoundManager.js';
import SaveSystem from './core/SaveSystem.js';
import InputManager from './core/InputManager.js';
import BackgroundShader from './core/BackgroundShader.js';

// Import Games (Dynamically or Statically)
// For simplicity and compatibility with the current setup, we might need a registry.
// Since we are moving to modules, we should import them.
// However, there are many games. Let's start by refactoring Pong and Matterhorn,
// and wrap the others or import them if they are modules.

// We will assume that for now we only support the refactored ones fully in the new system,
// but we need to keep the old ones working.
// The old games are global objects (e.g., `pongGame`).
// We can make a LegacyWrapper.

import PongGame from './games/pong.js';
import BreakoutGame from './games/breakout.js';
import SnakeGame from './games/snake.js';
import SpaceShooterGame from './games/space.js';
import RPGGame from './games/rpg.js';
import MatterhornGame from './games/matterhorn.js';
import AetheriaGame from './games/aetheria/aetheria.js';
import TowerDefenseGame from './games/towerDefense.js';
import PhysicsStackerGame from './games/physicsStacker.js';

import MazeGame from './games/maze.js';
import RunnerGame from './games/runner.js';
import TetrisGame from './games/tetris.js';
import ClickerGame from './games/clicker.js';
import TypingGame from './games/typing.js';

// Legacy adapter for games that haven't been refactored yet but exist in the global scope
class LegacyGameAdapter {
    constructor(globalGameObj) {
        this.game = globalGameObj;
    }
    async init(container) {
        if (this.game.init) {
            // Legacy games might expect to find their elements already in the DOM
            // or attached to window. We might need to ensure they are visible.
            // The container argument might be ignored by them.
            this.game.init();
        }
    }
    update(dt) {
        // Legacy games usually have their own loop, so we do nothing here.
    }
    draw() {
        // Legacy games usually have their own loop.
    }
    shutdown() {
        if (this.game.shutdown) this.game.shutdown();
    }
}

const gameRegistry = {
    'pong-game': { name: 'Pong', description: 'Classic Paddle Battle', icon: 'fa-solid fa-table-tennis-paddle-ball', category: 'Arcade Classics', module: PongGame },
    'breakout-game': { name: 'Breakout', description: 'Smash the Bricks', icon: 'fa-solid fa-kaaba', category: 'Arcade Classics', module: BreakoutGame },
    'snake-game': { name: 'Snake', description: 'Eat & Grow', icon: 'fa-solid fa-snake', category: 'Arcade Classics', module: SnakeGame },
    'tetris-game': { name: 'Tetris', description: 'Stack the Blocks', icon: 'fa-solid fa-shapes', category: 'Arcade Classics', module: TetrisGame },
    'space-game': { name: 'Space Shooter', description: 'Defend the Galaxy', icon: 'fa-solid fa-rocket', category: 'Arcade Classics', module: SpaceShooterGame },
    'clicker-game': { name: 'Clicker', description: 'Exponential Growth', icon: 'fa-solid fa-hand-pointer', category: 'Quick Minigames', module: ClickerGame },
    'typing-game': { name: 'Speed Type', description: 'Test Your WPM', icon: 'fa-solid fa-keyboard', category: 'Quick Minigames', module: TypingGame },
    'runner-game': { name: 'Endless Runner', description: 'Jump the Obstacles', icon: 'fa-solid fa-person-running', category: 'Quick Minigames', module: RunnerGame },
    'maze-game': { name: 'Maze', description: 'Find the Path', icon: 'fa-solid fa-dungeon', category: 'Quick Minigames', module: MazeGame },
    'rpg-game': { name: 'RPG Battle', description: 'Turn-Based Combat', icon: 'fa-solid fa-khanda', category: 'RPG & Logic', module: RPGGame },
    'eclipse-game': { name: 'Eclipse', description: 'Strategy Board', icon: 'fa-solid fa-sun', category: 'RPG & Logic', module: 'eclipseGame' },
    'eclipse-puzzle-game': { name: 'Eclipse Puzzle', description: 'Pattern Matching', icon: 'fa-solid fa-puzzle-piece', category: 'RPG & Logic', module: 'eclipsePuzzleGame' },
    'eclipse-logic-puzzle-game': { name: 'Logic Puzzle', description: 'Deduction Grid', icon: 'fa-solid fa-lightbulb', category: 'RPG & Logic', module: 'eclipseLogicPuzzleGame' },
    'tower-defense-game': { name: 'Tower Defense', description: 'Defend the Base', icon: 'fa-solid fa-chess-rook', category: 'New Games', module: TowerDefenseGame },
    'physics-stacker-game': { name: 'Physics Stacker', description: 'Balance Blocks', icon: 'fa-solid fa-cubes-stacked', category: 'New Games', module: PhysicsStackerGame },
    'matterhorn-game': { name: 'Matterhorn Ascent', description: '3D Alpine Adventure', icon: 'fa-solid fa-mountain', category: '3D Immersive', module: MatterhornGame, wide: true },
    'aetheria-game': { name: 'Aetheria', description: 'Floating Isles Exploration', icon: 'fa-solid fa-cloud', category: '3D Immersive', module: AetheriaGame, wide: true },
};

// State Machine
const AppState = {
    MENU: 'MENU',
    IN_GAME: 'IN_GAME',
    PAUSED: 'PAUSED',
    TRANSITIONING: 'TRANSITIONING',
};

let currentState = AppState.MENU;
let currentGameInstance = null;
let lastTime = 0;

const soundManager = SoundManager.getInstance();
const saveSystem = SaveSystem.getInstance();
const inputManager = InputManager.getInstance(); // Ensure it attaches listeners

// Init Background
new BackgroundShader();

// Centralized Game Loop
function mainLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    switch (currentState) {
        case AppState.IN_GAME:
            if (currentGameInstance) {
                if (currentGameInstance.update) {
                    currentGameInstance.update(deltaTime);
                }
                if (currentGameInstance.draw) {
                    currentGameInstance.draw();
                }
            }
            break;
        case AppState.MENU:
            // Future menu animations can go here
            break;
    }

    requestAnimationFrame(mainLoop);
}

async function transitionToState(newState, context = {}) {
    if (currentState === AppState.TRANSITIONING) return;
    currentState = AppState.TRANSITIONING;

    // --- Exit current state ---
    if (newState === AppState.MENU) {
        hideOverlay(); // Ensure overlay is hidden when returning to menu
        soundManager.setBGMVolume(0.1);
        if (currentGameInstance && currentGameInstance.shutdown) {
            try {
                await currentGameInstance.shutdown();
            } catch (e) {
                console.error("Error shutting down game:", e);
            }
        }
        currentGameInstance = null;
        document.querySelectorAll(".game-container").forEach(el => el.classList.add("hidden"));
        document.getElementById("menu").classList.remove("hidden");
    }

    // --- Enter new state ---
    if (newState === AppState.IN_GAME) {
        const { gameId } = context;
        if (!gameId) {
            console.error("No gameId provided for IN_GAME state.");
            currentState = AppState.MENU;
            return;
        }

        document.getElementById("menu").classList.add("hidden");
        const container = document.getElementById(gameId);
        if (container) {
            container.classList.remove("hidden");
        } else {
            console.error(`Container for game ${gameId} not found!`);
            document.getElementById("menu").classList.remove("hidden");
            currentState = AppState.MENU;
            return;
        }

        soundManager.playSound('click');
        soundManager.setBGMVolume(0.02);

        const gameInfo = gameRegistry[gameId];
        if (!gameInfo) {
            console.error("Game not found in registry:", gameId);
            currentState = AppState.MENU;
            return;
        }

        const gameModule = gameInfo.module;

        try {
            if (typeof gameModule === 'string') {
                const globalGame = window[gameModule];
                if (globalGame) {
                    currentGameInstance = new LegacyGameAdapter(globalGame);
                } else {
                    throw new Error(`Legacy game object '${gameModule}' not found.`);
                }
            } else {
                currentGameInstance = new gameModule();
            }

            if (currentGameInstance.init) {
                await currentGameInstance.init(container);
            }
        } catch (err) {
            console.error("Failed to initialize game:", err);
            document.getElementById("menu").classList.remove("hidden");
            if(container) container.classList.add("hidden");
            currentState = AppState.MENU;
            return;
        }
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
    currentState = newState;
}

function showOverlay(title, content) {
    document.getElementById('overlay-title').textContent = title;
    document.getElementById('overlay-content').innerHTML = content;
    document.getElementById('global-overlay').classList.remove('hidden');
}

function hideOverlay() {
    document.getElementById('global-overlay').classList.add('hidden');
}

function togglePause() {
    if (currentState === AppState.IN_GAME) {
        currentState = AppState.PAUSED;
        showOverlay('PAUSED', 'Press ESC to resume.');
        soundManager.setBGMVolume(0.01); // Muffle BGM further
    } else if (currentState === AppState.PAUSED) {
        currentState = AppState.IN_GAME;
        hideOverlay();
        soundManager.setBGMVolume(0.02); // Restore game BGM volume
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
function populateGameMenu() {
    const menuGrid = document.getElementById('menu-grid');
    if (!menuGrid) return;
    menuGrid.innerHTML = ''; // Clear existing cards

    for (const [gameId, gameInfo] of Object.entries(gameRegistry)) {
        const button = document.createElement('button');
        let classList = 'game-card group';
        if (gameInfo.wide) {
            classList += ' col-span-1 md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800';
        }
        button.className = classList;
        button.dataset.game = gameId;

        const highScore = saveSystem.getHighScore(gameId);
        button.innerHTML = `
            <div class="text-4xl mb-2"><i class="${gameInfo.icon} text-cyan-400 group-hover:text-white transition-colors"></i></div>
            <h3 class="text-xl font-bold text-cyan-400 group-hover:text-white transition-colors">${gameInfo.name}</h3>
            <p class="text-xs text-slate-400 mt-1">${gameInfo.description}</p>
            ${highScore > 0 ? `<div class="absolute top-2 right-2 text-yellow-400 text-xs font-bold">🏆 ${highScore}</div>` : ''}
        `;

        button.addEventListener('click', () => {
            transitionToState(AppState.IN_GAME, { gameId });
        });

        menuGrid.appendChild(button);
    }
}

function updateHubStats() {
    const currencyEl = document.getElementById('total-currency');
    if (currencyEl) {
        currencyEl.textContent = saveSystem.getCurrency();
    }
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

document.addEventListener('DOMContentLoaded', () => {
    populateGameMenu();
    updateHubStats();

    // Bind Overlay Close Button
    document.getElementById('overlay-close-btn').addEventListener('click', () => {
        if (currentState === AppState.PAUSED) {
            togglePause();
        } else {
            hideOverlay();
        }
    });

    // Bind Overlay Main Menu Button
    document.getElementById('overlay-main-menu-btn').addEventListener('click', () => {
        transitionToState(AppState.MENU);
    });

    // Global Key Listeners
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            togglePause();
        }
    });

    // Start the main loop
    lastTime = performance.now();
    requestAnimationFrame(mainLoop);

    // Initial sound setup
    soundManager.startBGM();
});

// Expose for debugging and legacy compatibility
window.miniGameHub = {
    transitionToState,
    soundManager,
    saveSystem
};

// Legacy Compatibility: Expose systems globally for non-module games
window.soundManager = soundManager;
window.saveSystem = saveSystem;
