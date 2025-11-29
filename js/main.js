// The Core Game Loop and Hub Logic

import SoundManager from './core/SoundManager.js';
import SaveSystem from './core/SaveSystem.js';
import InputManager from './core/InputManager.js';
import BackgroundShader from './core/BackgroundShader.js';

// Import New/Refactored Games
import TowerDefenseGame from './games/towerDefense.js';
import PhysicsStackerGame from './games/physicsStacker.js';
import AetheriaGame from './games/aetheria/aetheria.js';

// Legacy Wrappers (We will try to dynamic import these or just reference globals if we must)
// Ideally we refactor them all, but for time we can wrap.
// For this plan, I'm assuming we rely on the existing files being loaded as scripts for now
// OR we dynamically import them if they are modules.
// Currently most are simple objects.

// We will create a Registry.
const gameRegistry = {
    'tower-defense-game': { name: 'Tower Defense', description: 'Defend the Base', icon: 'fa-solid fa-chess-rook', category: 'New Games', module: TowerDefenseGame },
    'stacker-game': { name: 'Physics Stacker', description: 'Balance Blocks', icon: 'fa-solid fa-cubes-stacked', category: 'New Games', module: PhysicsStackerGame },
    'aetheria-game': { name: 'Aetheria', description: 'Floating Isles Exploration', icon: 'fa-solid fa-cloud', category: '3D Immersive', module: AetheriaGame, wide: true },

    // Legacy placeholders - these will be handled via the LegacyAdapter if they are not proper classes
    'clicker-game': { name: 'Clicker', description: 'Exponential Growth', icon: 'fa-solid fa-hand-pointer', category: 'Quick Minigames', legacyId: 'clicker-game' },
    'maze-game': { name: 'Maze', description: 'Find the Path', icon: 'fa-solid fa-dungeon', category: 'Quick Minigames', legacyId: 'maze-game' },
    'runner-game': { name: 'Endless Runner', description: 'Jump the Obstacles', icon: 'fa-solid fa-person-running', category: 'Quick Minigames', legacyId: 'runner-game' },
    'typing-game': { name: 'Speed Type', description: 'Test Your WPM', icon: 'fa-solid fa-keyboard', category: 'Quick Minigames', legacyId: 'typing-game' },
    'snake-game': { name: 'Snake', description: 'Eat & Grow', icon: 'fa-solid fa-snake', category: 'Arcade Classics', legacyId: 'snake-game' },
    'pong-game': { name: 'Pong', description: 'Retro Tennis', icon: 'fa-solid fa-table-tennis-paddle-ball', category: 'Arcade Classics', legacyId: 'pong-game' },
    'space-game': { name: 'Space Shooter', description: 'Defend the Galaxy', icon: 'fa-solid fa-rocket', category: 'Arcade Classics', legacyId: 'space-game' },
    'tetris-game': { name: 'Tetris', description: 'Stack the Blocks', icon: 'fa-solid fa-shapes', category: 'Arcade Classics', legacyId: 'tetris-game' },
    'breakout-game': { name: 'Breakout', description: 'Smash the Bricks', icon: 'fa-solid fa-kaaba', category: 'Arcade Classics', legacyId: 'breakout-game' },
    'rpg-game': { name: 'RPG Battle', description: 'Turn-Based Combat', icon: 'fa-solid fa-khanda', category: 'RPG & Logic', legacyId: 'rpg-game' },
    'eclipse-game': { name: 'Eclipse', description: 'Strategy Board', icon: 'fa-solid fa-sun', category: 'RPG & Logic', legacyId: 'eclipse-game' },
    'eclipse-puzzle-game': { name: 'Eclipse Puzzle', description: 'Pattern Matching', icon: 'fa-solid fa-puzzle-piece', category: 'RPG & Logic', legacyId: 'eclipse-puzzle-game' },
    'eclipse-logic-puzzle-game': { name: 'Logic Puzzle', description: 'Deduction Grid', icon: 'fa-solid fa-lightbulb', category: 'RPG & Logic', legacyId: 'eclipse-logic-puzzle-game' },
    'matterhorn-game': { name: 'Matterhorn Ascent', description: '3D Alpine Adventure', icon: 'fa-solid fa-mountain', category: '3D Immersive', legacyId: 'matterhorn-game', wide: true },
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

    // --- Exit current state ---
    if (currentState === AppState.IN_GAME || currentState === AppState.PAUSED) {
         if (currentGameInstance && currentGameInstance.shutdown) {
            try {
                await currentGameInstance.shutdown();
            } catch (e) {
                console.error("Error shutting down game:", e);
            }
        }
        currentGameInstance = null;

        // Hide all game containers
        document.querySelectorAll(".game-container").forEach(el => el.classList.add("hidden"));
    }

    if (newState === AppState.MENU) {
        currentState = AppState.TRANSITIONING;
        hideOverlay(); // Ensure overlay is hidden when returning to menu
        soundManager.setBGMVolume(0.1);

        document.getElementById("menu").classList.remove("hidden");
        currentState = AppState.MENU;
    }

    // --- Enter new state ---
    if (newState === AppState.IN_GAME) {
        currentState = AppState.TRANSITIONING;
        const { gameId } = context;

        document.getElementById("menu").classList.add("hidden");

        const gameInfo = gameRegistry[gameId];
        if (!gameInfo) {
            console.error("Game not found in registry:", gameId);
            transitionToState(AppState.MENU);
            return;
        }

        let container = document.getElementById(gameId);
        if (!container) {
            console.error(`Container for game ${gameId} not found!`);
            // Attempt to create one if it's missing (mostly for new modules)
            container = document.createElement('div');
            container.id = gameId;
            container.className = 'game-container hidden';
            document.body.appendChild(container);
        }
        container.classList.remove("hidden");

        soundManager.playSound('click');
        soundManager.setBGMVolume(0.02);

        try {
            if (gameInfo.module) {
                // Instantiable Class
                currentGameInstance = new gameInfo.module();
                if (currentGameInstance.init) {
                    await currentGameInstance.init(container);
                }
            } else if (gameInfo.legacyId) {
                // Legacy Global Object Adapter
                // We assume legacy games attach themselves to window or are just script functions.
                // Most of the legacy games in this repo seem to be global objects or functions triggered by data attributes.
                // We will try to simulate the old behavior.

                // For this project, many legacy games (pong, snake) use a global object like `snakeGame` or `pongGame`
                // but they are not consistently named or exported.
                // They often just run when their container is visible or need a specific init call.

                // Let's try to find the global object.
                const guessName = gameId.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace('Game', '') + 'Game';
                // e.g. 'pong-game' -> 'pongGame'

                // Special cases
                let globalObj = window[guessName];

                // For matterhorn, it's 'matterhornGame' but might be a module now? No, we kept it as legacy for now in registry.
                if (gameId === 'matterhorn-game') globalObj = window.matterhornGame;

                if (globalObj && globalObj.init) {
                    currentGameInstance = globalObj;
                    currentGameInstance.init();
                } else {
                     // If no object found, it might be one of the simple ones that just runs on load (bad practice but exists).
                     // Or it relies on the old main.js logic which we are replacing.
                     // We might need to manually re-implement the init logic for them or fix them to be objects.
                     console.warn(`Legacy game object ${guessName} not found. Checking specific adapters.`);

                     // Fallback for games that might not have a global object exposed yet
                }
            }
        } catch (err) {
            console.error("Failed to initialize game:", err);
            transitionToState(AppState.MENU);
            return;
        }

        currentState = AppState.IN_GAME;
    }
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
}

function populateGameMenu() {
    const menuGrid = document.getElementById('menu-grid');
    if (!menuGrid) return;
    menuGrid.innerHTML = ''; // Clear existing cards

    for (const [gameId, gameInfo] of Object.entries(gameRegistry)) {
        const button = document.createElement('div');
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
            if (currentState === AppState.IN_GAME || currentState === AppState.PAUSED) {
                togglePause();
            }
        }
    });

    // Bind Back Buttons (Global handler for any .back-btn)
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('back-btn')) {
            transitionToState(AppState.MENU);
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
    saveSystem,
    goBack: () => transitionToState(AppState.MENU)
};

// Legacy Compatibility: Expose systems globally for non-module games
window.soundManager = soundManager;
window.saveSystem = saveSystem;
window.inputManager = inputManager;
