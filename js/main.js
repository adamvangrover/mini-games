// The Core Game Loop and Hub Logic

import SoundManager from './core/SoundManager.js';
import SaveSystem from './core/SaveSystem.js';
import InputManager from './core/InputManager.js';
import ArcadeHub from './core/ArcadeHub.js';
import Store from './core/Store.js';
import MobileControls from './core/MobileControls.js';
import AdManager from './core/AdManager.js';
import AdsManager from './core/AdsManager.js';

// Import New/Refactored Games
import NeonCityGame from './games/neonCity.js';
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
import QueensGame from './games/queens.js';
import NeonMinesGame from './games/neonMines.js';
import NeonPicrossGame from './games/neonPicross.js';
import NeonFlow from './games/neonFlow.js';
import NeonJump from './games/neonJump.js';
import NeonSlice from './games/neonSlice.js';
import NeonStack from './games/neonStack.js';
import PrismRealms from './games/prismRealms.js';
import TrophyRoom from './games/trophyRoom.js';
import AvatarStation from './games/avatarStation.js';
import TechTree from './games/techTree.js';
import DevConsole from './core/DevConsole.js';
import SudokuGame from './games/sudoku.js';
import ZenGardenGame from './games/zenGarden.js';
import NeonGalagaGame from './games/neonGalaga.js';
import TrophyRoom from './games/trophyRoom.js';

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
    'neon-city-game': { name: 'Neon City', description: 'Open World RPG', icon: 'fa-solid fa-city', category: '3D Immersive', module: NeonCityGame, wide: true },
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
    'queens-game': { name: 'Queens', description: 'Place Queens', icon: 'fa-solid fa-chess-queen', category: 'Logic Puzzles', module: QueensGame },
    'neon-mines-game': { name: 'Neon Mines', description: 'Avoid Mines', icon: 'fa-solid fa-bomb', category: 'Logic Puzzles', module: NeonMinesGame },
    'neon-picross-game': { name: 'Neon Picross', description: 'Picture Cross', icon: 'fa-solid fa-pencil-alt', category: 'Logic Puzzles', module: NeonPicrossGame },
    'neon-flow-game': { name: 'Neon Flow', description: 'Relax & Create', icon: 'fa-solid fa-wind', category: 'New Games', module: NeonFlow, wide: true },
    'neon-jump': { name: 'Neon Jump', description: 'Jump to the Stars', icon: 'fa-solid fa-arrow-up', category: 'Action', module: NeonJump },
    'neon-slice': { name: 'Neon Slice', description: 'Slice the Shapes', icon: 'fa-solid fa-scissors', category: 'Action', module: NeonSlice },
    'neon-stack': { name: 'Neon Stack', description: 'Stack the Blocks', icon: 'fa-solid fa-layer-group', category: 'Quick Minigames', module: NeonStack },
    'prism-realms-game': { name: 'Prism Realms', description: 'Shadowfall FPS', icon: 'fa-solid fa-ghost', category: '3D Immersive', module: PrismRealms, wide: true },
    'trophy-room': { name: 'Trophy Room', description: 'Achievements & Stats', icon: 'fa-solid fa-trophy', category: 'System', module: TrophyRoom },
    'avatar-station': { name: 'Avatar Station', description: 'Customize Identity', icon: 'fa-solid fa-user-gear', category: 'System', module: AvatarStation },
    'tech-tree': { name: 'Tech Tree', description: 'System Upgrades', icon: 'fa-solid fa-network-wired', category: 'System', module: TechTree, wide: true },
    'sudoku-game': { name: 'Neon Sudoku', description: 'Classic Number Puzzle', icon: 'fa-solid fa-border-none', category: 'Logic Puzzles', module: SudokuGame },
    'zen-garden-game': { name: 'Zen Garden', description: 'Relax & Create', icon: 'fa-solid fa-spa', category: 'Simulation', module: ZenGardenGame, wide: true },
    'neon-galaga-game': { name: 'Neon Galaga', description: 'Space Warfare', icon: 'fa-solid fa-jet-fighter', category: 'Action', module: NeonGalagaGame },
    'trophy-room': { name: 'Hall of Fame', description: 'View Achievements', icon: 'fa-solid fa-trophy', category: 'Meta', module: TrophyRoom, wide: true },
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
let mobileControls = null;

// Global Hub State
let arcadeHub = null;
let is3DView = true;
let store = null;
const adManager = new AdManager();

const soundManager = SoundManager.getInstance();
const saveSystem = SaveSystem.getInstance();
const inputManager = InputManager.getInstance();
const adsManager = AdsManager.getInstance();
let gameOverCount = 0;

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
        if (mobileControls) {
            mobileControls.destroy();
            mobileControls = null;
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

                // Init Mobile Controls if not Neon Flow (which handles own input) or other touch games
                // For simplicity, we add D-pad to all games except explicit opt-outs or touch natives.
                // Neon Flow is 'neon-flow-game'.
                // Clicker is 'clicker-game'.
                const noDpadGames = ['neon-flow-game', 'clicker-game', 'neon-2048', 'neon-memory', 'neon-mines-game', 'neon-picross-game', 'neon-flap', 'neon-slice', 'neon-jump', 'neon-stack', 'prism-realms-game', 'trophy-room', 'avatar-station', 'tech-tree'];
                if (!noDpadGames.includes(gameId)) {
                    mobileControls = new MobileControls(container);
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
    gameOverCount++;

    const runGameOverLogic = () => {
        // Apply Tech Tree Multiplier
        const multiplier = saveSystem.data.upgrades?.coinMultiplier || 1;
        const coinsEarned = Math.floor((score / 10) * multiplier);

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

    if (menuBtn) menuBtn.onclick = () => {
        // 30% Chance to show ad on exit
        if (Math.random() < 0.3) {
            adManager.showInterstitial(() => {
                transitionToState(AppState.MENU);
            });
        } else {
            transitionToState(AppState.MENU);
        }
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
    };

    if (gameOverCount % 2 === 0) {
        currentState = AppState.PAUSED;
        adsManager.showAd(runGameOverLogic);
    } else {
        runGameOverLogic();
    }
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
     const settings = saveSystem.getSettings();
     const adsEnabled = settings.adsEnabled !== false; // Default true

     const content = `
        <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
                <span class="text-white font-bold">Enable Ads</span>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="settings-ads-toggle" class="sr-only peer" ${adsEnabled ? 'checked' : ''}>
                    <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fuchsia-600"></div>
                </label>
            </div>

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

            <div class="flex items-center justify-between bg-slate-800 p-3 rounded">
                <span class="text-white font-bold"><i class="fas fa-ad mr-2"></i> Show Ads</span>
                <button id="toggle-ads-btn" class="px-4 py-1 rounded font-bold text-sm transition-colors ${adsManager.areAdsEnabled() ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}">
                    ${adsManager.areAdsEnabled() ? 'ON' : 'OFF'}
                </button>
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

    // Bind Ad Toggle
    document.getElementById('settings-ads-toggle').addEventListener('change', (e) => {
        saveSystem.setSetting('adsEnabled', e.target.checked);
    });

    document.getElementById('refresh-export-btn').onclick = updateExport;

    document.getElementById('copy-export-btn').onclick = () => {
        exportArea.select();
        document.execCommand('copy');
        document.getElementById('copy-export-btn').textContent = "Copied!";
        setTimeout(() => document.getElementById('copy-export-btn').textContent = "Copy Data", 2000);
    };

    const toggleAdsBtn = document.getElementById('toggle-ads-btn');
    toggleAdsBtn.onclick = () => {
        const currentlyEnabled = adsManager.areAdsEnabled();
        const newState = !currentlyEnabled;
        adsManager.toggleAds(newState);

        // Update UI
        toggleAdsBtn.textContent = newState ? 'ON' : 'OFF';
        toggleAdsBtn.className = `px-4 py-1 rounded font-bold text-sm transition-colors ${newState ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`;

        // Visual feedback
        if(newState) {
            alert('Ads enabled! Thank you for supporting us (virtually).');
        } else {
             alert('Ads disabled. Enjoy the uninterrupted experience!');
        }
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
        // Auto-switch to Grid View on Mobile
        if (window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent)) {
            is3DView = false;
        }

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
             const menuGrid = document.getElementById('menu-grid');
             if(menuGrid) menuGrid.classList.remove('hidden');
             const btnText = document.getElementById('view-toggle-text');
             if(btnText) btnText.textContent = '3D View';
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

    // Init Dev Console
    new DevConsole();

    // Init Global Effects
    if (saveSystem.getSetting('crt')) {
        const crt = document.createElement('div');
        crt.id = 'crt-overlay';
        crt.className = 'crt-effect';
        document.body.appendChild(crt);
    }
});

// Expose for debugging
window.miniGameHub = {
    transitionToState,
    soundManager,
    saveSystem,
    showGameOver,
    goBack: () => transitionToState(AppState.MENU),
    getCurrentGame: () => currentGameInstance
};
