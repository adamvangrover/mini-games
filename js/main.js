// The Core Game Loop and Hub Logic

import SoundManager from './core/SoundManager.js';
import SaveSystem from './core/SaveSystem.js';
import InputManager from './core/InputManager.js';
import ArcadeHub from './core/ArcadeHub.js';
import Store from './core/Store.js';

// Import New/Refactored Games
import TowerDefenseGame from './games/towerDefense.js';
import PhysicsStackerGame from './games/physicsStacker.js';
import AetheriaGame from './games/aetheria/aetheria.js';
import Neon2048 from './games/neon2048.js';
import NeonFlap from './games/neonFlap.js';
import NeonMemory from './games/neonMemory.js';
import TheGrind98 from './games/work.js';
import NeonGolf from './games/neonGolf.js';
import NeonHoops from './games/neonHoops.js';
import NeonShooter from './games/neonShooter.js';

// Legacy Refactored to Classes
import SnakeGame from './games/snake.js';
import PongGame from './games/pong.js';
import SpaceShooterGame from './games/space.js';
import BreakoutGame from './games/breakout.js';
import TetrisGame from './games/tetris.js';
import MazeGame from './games/maze.js';
import RunnerGame from './games/runner.js';
import TypingGame from './games/typing.js';
import ClickerGame from './games/clicker.js';
import RPGGame from './games/rpg.js';
import EclipseGame from './games/eclipse.js';
import EclipsePuzzleGame from './games/eclipsePuzzle.js';
import EclipseLogicPuzzleGame from './games/eclipseLogicPuzzle.js';
import MatterhornGame from './games/matterhorn.js'; // Adapter
import AlpineGame from './games/alpine.js';
import MatterhornArcade from './games/matterhornArcade.js';
import AetheriaClassic from './games/aetheriaClassic.js';
import LifeSimGame from './games/lifeSim.js';

// Game Registry
const gameRegistry = {
    'alpine-game': { name: 'Alpine Adventure', description: 'Open World Exploration', icon: 'fa-solid fa-mountain-sun', category: '3D Immersive', module: AlpineGame, wide: true },
    'matterhorn-arcade': { name: 'Matterhorn Arcade', description: 'Retro Climbing Challenge', icon: 'fa-solid fa-person-hiking', category: 'Arcade Classics', module: MatterhornArcade, wide: true },
    'tower-defense-game': { name: 'Tower Defense', description: 'Defend the Base', icon: 'fa-solid fa-chess-rook', category: 'New Games', module: TowerDefenseGame },
    'stacker-game': { name: 'Physics Stacker', description: 'Balance Blocks', icon: 'fa-solid fa-cubes-stacked', category: 'New Games', module: PhysicsStackerGame },
    'aetheria-game': { name: 'Aetheria', description: 'Floating Isles Exploration', icon: 'fa-solid fa-cloud', category: '3D Immersive', module: AetheriaGame, wide: true },
    'aetheria-classic': { name: 'Aetheria (Classic)', description: 'Standalone Version', icon: 'fa-solid fa-wind', category: '3D Immersive', module: AetheriaClassic, wide: true },
    'neon-2048': { name: 'Neon 2048', description: 'Merge the Grid', icon: 'fa-solid fa-border-all', category: 'New Games', module: Neon2048 },
    'neon-flap': { name: 'Neon Flap', description: 'Flappy Clone', icon: 'fa-solid fa-dove', category: 'New Games', module: NeonFlap },
    'neon-memory': { name: 'Neon Memory', description: 'Simon Says', icon: 'fa-solid fa-brain', category: 'New Games', module: NeonMemory },
    'neon-golf': { name: 'Neon Golf', description: 'Mini Golf Challenge', icon: 'fa-solid fa-golf-ball-tee', category: 'Sports', module: NeonGolf },
    'neon-hoops': { name: 'Neon Hoops', description: 'Arcade Basketball', icon: 'fa-solid fa-basketball', category: 'Sports', module: NeonHoops },
    'neon-shooter': { name: 'Neon FPS', description: 'Cyber Defense', icon: 'fa-solid fa-gun', category: 'Action', module: NeonShooter },
    'work-game': { name: 'The Grind 98', description: 'Life Simulator', icon: 'fa-solid fa-briefcase', category: 'Simulation', module: TheGrind98, wide: true },
    'life-sim-game': { name: 'Neon Life', description: 'Live Your Best Life', icon: 'fa-solid fa-user-astronaut', category: 'Simulation', module: LifeSimGame, wide: true },

    // Legacy Refactored
    'snake-game': { name: 'Snake', description: 'Eat & Grow', icon: 'fa-solid fa-snake', category: 'Arcade Classics', module: SnakeGame },
    'pong-game': { name: 'Pong', description: 'Retro Tennis', icon: 'fa-solid fa-table-tennis-paddle-ball', category: 'Arcade Classics', module: PongGame },
    'space-game': { name: 'Space Shooter', description: 'Defend the Galaxy', icon: 'fa-solid fa-rocket', category: 'Arcade Classics', module: SpaceShooterGame },
    'breakout-game': { name: 'Breakout', description: 'Smash the Bricks', icon: 'fa-solid fa-kaaba', category: 'Arcade Classics', module: BreakoutGame },
    'tetris-game': { name: 'Tetris', description: 'Stack the Blocks', icon: 'fa-solid fa-shapes', category: 'Arcade Classics', module: TetrisGame },
    'maze-game': { name: 'Maze', description: 'Find the Path', icon: 'fa-solid fa-dungeon', category: 'Quick Minigames', module: MazeGame },
    'runner-game': { name: 'Endless Runner', description: 'Jump the Obstacles', icon: 'fa-solid fa-person-running', category: 'Quick Minigames', module: RunnerGame },
    'typing-game': { name: 'Speed Type', description: 'Test Your WPM', icon: 'fa-solid fa-keyboard', category: 'Quick Minigames', module: TypingGame },
    'clicker-game': { name: 'Clicker', description: 'Exponential Growth', icon: 'fa-solid fa-hand-pointer', category: 'Quick Minigames', module: ClickerGame },
    'rpg-game': { name: 'RPG Battle', description: 'Turn-Based Combat', icon: 'fa-solid fa-khanda', category: 'RPG & Logic', module: RPGGame },
    'eclipse-game': { name: 'Eclipse', description: 'Strategy Board', icon: 'fa-solid fa-sun', category: 'RPG & Logic', module: EclipseGame },
    'eclipse-puzzle-game': { name: 'Eclipse Puzzle', description: 'Pattern Matching', icon: 'fa-solid fa-puzzle-piece', category: 'RPG & Logic', module: EclipsePuzzleGame },
    'eclipse-logic-puzzle-game': { name: 'Logic Puzzle', description: 'Deduction Grid', icon: 'fa-solid fa-lightbulb', category: 'RPG & Logic', module: EclipseLogicPuzzleGame },
    'matterhorn-game': { name: 'Matterhorn Ascent', description: '3D Alpine Adventure', icon: 'fa-solid fa-mountain', category: '3D Immersive', module: MatterhornGame, wide: true },
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

// Global Hub State
let arcadeHub = null;
let is3DView = true;
let store = null;

const soundManager = SoundManager.getInstance();
const saveSystem = SaveSystem.getInstance();
const inputManager = InputManager.getInstance();

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
            if (arcadeHub && is3DView) {
                // ArcadeHub is updated by its own loop or Three.js if needed,
                // but usually we might need to manually call update if it's not self-driven.
                // Assuming ArcadeHub uses its own rAF or is static,
                // but actually ArcadeHub class usually has an update(dt) method.
                // Looking at the old main.js, it called arcadeHub.update(dt).
                if (arcadeHub.update) arcadeHub.update(deltaTime);
            }
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
        document.querySelectorAll(".game-container").forEach(el => el.classList.add("hidden"));
    }

    if (newState === AppState.MENU) {
        currentState = AppState.TRANSITIONING;
        hideOverlay();
        soundManager.setBGMVolume(0.1);
        
        document.getElementById("menu").classList.remove("hidden");
        populateMenuGrid();

        if (arcadeHub) {
            if (is3DView) {
                arcadeHub.resume();
                document.getElementById('menu-grid')?.classList.add('hidden');
                document.getElementById('view-toggle-text').textContent = 'Grid View';
            } else {
                 arcadeHub.pause(); 
                 document.getElementById('menu-grid')?.classList.remove('hidden');
                 document.getElementById('view-toggle-text').textContent = '3D View';
            }
        } else {
            document.getElementById('menu-grid')?.classList.remove('hidden');
        }

        currentState = AppState.MENU;
    }

    // --- Enter new state ---
    if (newState === AppState.IN_GAME) {
        currentState = AppState.TRANSITIONING;
        const { gameId } = context;

        if (arcadeHub) arcadeHub.pause();
        document.getElementById("menu").classList.add("hidden");

        const gameInfo = gameRegistry[gameId];
        if (!gameInfo) {
            console.error("Game not found in registry:", gameId);
            transitionToState(AppState.MENU);
            return;
        }

        let container = document.getElementById(gameId);
        if (!container) {
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
                currentGameInstance = new gameInfo.module();
                if (currentGameInstance.init) {
                    await currentGameInstance.init(container);
                }
            } else if (gameInfo.legacyId) {
                const guessName = gameId.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace('Game', '') + 'Game';
                let globalObj = window[guessName];
                if (gameId === 'matterhorn-game') globalObj = window.matterhornGame;

                if (globalObj && globalObj.init) {
                    currentGameInstance = globalObj;
                    currentGameInstance.init();
                } else {
                     console.warn(`Legacy game object ${guessName} not found.`);
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

function showGameOver(score, onRetry) {
    const coinsEarned = Math.floor(score / 10);
    if(coinsEarned > 0) {
        saveSystem.addCurrency(coinsEarned);
    }

    const content = `
        <p class="mb-4 text-xl">Final Score: <span class="text-yellow-400 font-bold">${score}</span></p>
        ${coinsEarned > 0 ? `<p class="mb-4 text-sm text-yellow-300">Earned +${coinsEarned} Coins!</p>` : ''}
        <div class="flex justify-center gap-4">
            <button id="overlay-retry-btn" class="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded">Try Again</button>
            <button id="overlay-menu-btn" class="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded">Main Menu</button>
        </div>
    `;

    currentState = AppState.PAUSED;
    showOverlay('GAME OVER', content);
    updateHubStats(); // Update coin display

    const retryBtn = document.getElementById('overlay-retry-btn');
    const menuBtn = document.getElementById('overlay-menu-btn');

    if (retryBtn) retryBtn.onclick = () => {
        hideOverlay();
        currentState = AppState.IN_GAME;
        if (onRetry) onRetry();
    };

    if (menuBtn) menuBtn.onclick = () => {
        transitionToState(AppState.MENU);
    };
}

function togglePause() {
    if (currentState === AppState.IN_GAME) {
        currentState = AppState.PAUSED;
        showOverlay('PAUSED', 'Press ESC to resume.');
        soundManager.setBGMVolume(0.01);
    } else if (currentState === AppState.PAUSED) {
        currentState = AppState.IN_GAME;
        hideOverlay();
        soundManager.setBGMVolume(0.02);
    }
}

function showSettingsOverlay() {
    // ... Existing implementation of settings overlay ...
    // To save token space, I will re-implement minimal needed here or assume logic is similar.
    // For robustness, I'll copy the existing logic from the previous file content.
     const content = `
        <div class="flex flex-col gap-4">
            <button id="copy-stats-btn" class="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded flex items-center justify-center gap-2">
                <i class="fas fa-share-alt"></i> Share High Scores (Copy)
            </button>
            <hr class="border-slate-700 my-2">
            <h3 class="text-white font-bold">Save Data Backup</h3>
            <textarea id="export-area" class="w-full bg-slate-800 text-xs text-slate-300 p-2 rounded h-24 font-mono select-all" readonly>Generating...</textarea>
            <div class="flex gap-2">
                 <button id="refresh-export-btn" class="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded">Refresh Export</button>
                 <button id="copy-export-btn" class="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded">Copy Data</button>
            </div>

            <hr class="border-slate-700 my-2">
            <h3 class="text-white font-bold">Import Data</h3>
            <textarea id="import-area" class="w-full bg-slate-800 text-xs text-white p-2 rounded h-24 font-mono" placeholder="Paste save data here..."></textarea>
            <button id="import-btn" class="w-full px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded">
                <i class="fas fa-file-import"></i> Import & Overwrite
            </button>
            <p id="import-status" class="text-center text-xs text-slate-400 mt-1"></p>
        </div>
    `;

    showOverlay('DATA MANAGEMENT', content);

    const exportArea = document.getElementById('export-area');
    const updateExport = () => {
        exportArea.value = saveSystem.exportData();
    };
    updateExport();

    document.getElementById('refresh-export-btn').onclick = updateExport;

    document.getElementById('copy-export-btn').onclick = () => {
        exportArea.select();
        document.execCommand('copy');
        document.getElementById('copy-export-btn').textContent = "Copied!";
        setTimeout(() => document.getElementById('copy-export-btn').textContent = "Copy Data", 2000);
    };

    document.getElementById('copy-stats-btn').onclick = () => {
        const stats = saveSystem.getFormattedStats();
        navigator.clipboard.writeText(stats).then(() => {
            const btn = document.getElementById('copy-stats-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = `<i class="fas fa-check"></i> Copied to Clipboard!`;
            setTimeout(() => btn.innerHTML = originalText, 2000);
        });
    };

    document.getElementById('import-btn').onclick = () => {
        const data = document.getElementById('import-area').value.trim();
        const statusEl = document.getElementById('import-status');

        if (!data) {
            statusEl.textContent = "Please paste data first.";
            statusEl.className = "text-center text-xs text-red-400 mt-1";
            return;
        }

        if (confirm("WARNING: This will overwrite your current progress. Are you sure?")) {
            const success = saveSystem.importData(data);
            if (success) {
                statusEl.textContent = "Import Successful! reloading...";
                statusEl.className = "text-center text-xs text-green-400 mt-1";
                setTimeout(() => location.reload(), 1000);
            } else {
                statusEl.textContent = "Invalid Data. Import failed.";
                statusEl.className = "text-center text-xs text-red-400 mt-1";
            }
        }
    };
}

function updateHubStats() {
    const currency = saveSystem.getCurrency();
    const ids = ['total-currency', 'total-currency-hud']; // Update both
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = currency;
    });
}

function toggleView() {
    is3DView = !is3DView;
    const btnText = document.getElementById('view-toggle-text');
    const menuGrid = document.getElementById('menu-grid');

    if (is3DView) {
        if(btnText) btnText.textContent = 'Grid View';
        if(menuGrid) menuGrid.classList.add('hidden');
        if (arcadeHub) arcadeHub.resume();
    } else {
        if(btnText) btnText.textContent = '3D View';
        if(menuGrid) menuGrid.classList.remove('hidden');
        if (arcadeHub) arcadeHub.pause();
    }
}

function populateMenuGrid() {
    const grid = document.getElementById('menu-grid');
    if(!grid) return;
    grid.innerHTML = '';

    Object.entries(gameRegistry).forEach(([id, game]) => {
        const card = document.createElement('div');
        card.className = "bg-slate-800/80 backdrop-blur rounded-xl p-4 border border-slate-700 hover:border-fuchsia-500 transition-all hover:scale-105 cursor-pointer group relative overflow-hidden";
        
        card.innerHTML = `
            <div class="absolute top-0 right-0 p-2 opacity-50 text-xs uppercase font-bold tracking-wider">${game.category || 'Game'}</div>
            <div class="flex flex-col items-center text-center gap-3 pt-4">
                <div class="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-3xl text-fuchsia-400 group-hover:text-cyan-400 transition-colors shadow-lg shadow-fuchsia-500/20 group-hover:shadow-cyan-500/20">
                    <i class="${game.icon || 'fas fa-gamepad'}"></i>
                </div>
                <h3 class="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">${game.name}</h3>
                <p class="text-sm text-slate-400 line-clamp-2">${game.description}</p>
            </div>
            <div class="mt-4 w-full h-1 bg-slate-700 rounded overflow-hidden">
                <div class="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 w-0 group-hover:w-full transition-all duration-500"></div>
            </div>
        `;
        
        card.onclick = () => transitionToState(AppState.IN_GAME, { gameId: id });
        grid.appendChild(card);
    });
}

// Store & Shop Logic
function showShopOverlay() {
    if (!store) {
        store = new Store(saveSystem, 'store-items', ['store-currency']);
    }

    // Update currency before showing
    document.getElementById('store-currency').textContent = saveSystem.getCurrency();

    store.render();
    document.getElementById('store-overlay').classList.remove('hidden');
}

function hideShopOverlay() {
    document.getElementById('store-overlay').classList.add('hidden');
    // Also update hub stats in case coins were spent
    updateHubStats();
}

document.addEventListener('DOMContentLoaded', () => {
    updateHubStats();
    populateMenuGrid();

    // Initialize Store (lazy load on click usually, but init class)
    store = new Store(saveSystem, 'store-items', ['store-currency', 'total-currency', 'total-currency-hud']);

    // Initialize Arcade Hub
    const hubContainer = document.getElementById('arcade-hub-container');
    if (hubContainer) {
        arcadeHub = new ArcadeHub(hubContainer, gameRegistry, (gameId) => {
            transitionToState(AppState.IN_GAME, { gameId });
        });

        document.getElementById("menu").classList.remove("hidden");

        if (is3DView) {
             const menuGrid = document.getElementById('menu-grid');
             if(menuGrid) menuGrid.classList.add('hidden');
             arcadeHub.resume();
        } else {
             arcadeHub.pause();
        }
    } else {
        console.warn("Arcade Hub Container missing! Falling back to 2D Grid.");
        is3DView = false;
        const menuGrid = document.getElementById('menu-grid');
        if(menuGrid) menuGrid.classList.remove('hidden');
    }

    // Bind Buttons
    document.getElementById('view-toggle-btn')?.addEventListener('click', toggleView);

    // Shop Buttons
    document.getElementById('shop-btn-menu')?.addEventListener('click', showShopOverlay);
    document.getElementById('shop-btn-hud')?.addEventListener('click', showShopOverlay);
    document.getElementById('store-close-btn')?.addEventListener('click', hideShopOverlay);

    // Overlay Buttons
    document.getElementById('overlay-close-btn')?.addEventListener('click', () => {
        if (currentState === AppState.PAUSED) {
            togglePause();
        } else {
            hideOverlay();
        }
    });

    document.getElementById('overlay-main-menu-btn')?.addEventListener('click', () => {
        transitionToState(AppState.MENU);
    });

    // Settings Buttons (HUD and Menu)
    const openSettings = () => showSettingsOverlay();
    document.getElementById('settings-btn')?.addEventListener('click', openSettings);
    document.getElementById('settings-btn-hud')?.addEventListener('click', openSettings);


    // Global Key Listeners
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (currentState === AppState.IN_GAME || currentState === AppState.PAUSED) {
                togglePause();
            } else if (!document.getElementById('store-overlay').classList.contains('hidden')) {
                hideShopOverlay();
            }
        }
    });

    // Bind Back Buttons
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('back-btn')) {
            transitionToState(AppState.MENU);
        }
    });

    // Start Loop
    lastTime = performance.now();
    requestAnimationFrame(mainLoop);

    soundManager.startBGM();
});

// Expose for debugging
window.miniGameHub = {
    transitionToState,
    soundManager,
    saveSystem,
    showGameOver,
    goBack: () => transitionToState(AppState.MENU)
};
