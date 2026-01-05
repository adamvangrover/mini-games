// The Core Game Loop and Hub Logic

import SoundManager from './core/SoundManager.js';
import SaveSystem from './core/SaveSystem.js';
import InputManager from './core/InputManager.js';
import ArcadeHub from './core/ArcadeHub.js';
import Store from './core/Store.js';
import MobileControls from './core/MobileControls.js';
import TrophyRoom from './core/TrophyRoom.js';
import AdsManager from './core/AdsManager.js';
import ParticleSystem from './core/ParticleSystem.js';

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
import Lumina from './games/lumina.js';
import PrismRealms from './games/prismRealms.js';
import HallOfFame from './games/hallOfFame.js';
import AvatarStation from './games/avatarStation.js';
import TechTree from './games/techTree.js';
import DevConsole from './core/DevConsole.js';
import PlaceholderGame from './games/PlaceholderGame.js';
import NeonGalaga from './games/neonGalaga.js';
import NeonRacer from './games/neonRacer.js';
import CyberSolitaire from './games/solitaire.js';
import NeonZip from './games/neonZip.js';
import ExiledSpark from './games/exiledSpark.js';
import NeonRhythm from './games/neonRhythm.js';
import NeonTap from './games/neonTap.js';
import NeonSwipe from './games/neonSwipe.js';

// Game Registry using Dynamic Imports
const gameRegistry = {
    // 3D Immersive
    'alpine-game': { name: 'Alpine Adventure', description: 'Open World Exploration', icon: 'fa-solid fa-mountain-sun', category: '3D Immersive', importFn: () => import('./games/alpine.js'), wide: true },
    'neon-city-game': { name: 'Neon City', description: 'Open World RPG', icon: 'fa-solid fa-city', category: '3D Immersive', importFn: () => import('./games/neonCity.js'), wide: true },
    'aetheria-game': { name: 'Aetheria', description: 'Floating Isles Exploration', icon: 'fa-solid fa-cloud', category: '3D Immersive', importFn: () => import('./games/aetheria/aetheria.js'), wide: true },
    'aetheria-classic': { name: 'Aetheria (Classic)', description: 'Standalone Version', icon: 'fa-solid fa-wind', category: '3D Immersive', importFn: () => import('./games/aetheriaClassic.js'), wide: true },
    'matterhorn-game': { name: 'Matterhorn Ascent', description: '3D Alpine Adventure', icon: 'fa-solid fa-mountain', category: '3D Immersive', importFn: () => import('./games/matterhorn.js'), wide: true },
    'lumina-game': { name: 'Lumina', description: 'Purify the Glitch', icon: 'fa-solid fa-cube', category: '3D Immersive', importFn: () => import('./games/lumina.js'), wide: true },
    'prism-realms-game': { name: 'Prism Realms', description: 'Shadowfall FPS', icon: 'fa-solid fa-ghost', category: '3D Immersive', importFn: () => import('./games/prismRealms.js'), wide: true },

    // New Games
    'tower-defense-game': { name: 'Tower Defense', description: 'Defend the Base', icon: 'fa-solid fa-chess-rook', category: 'New Games', importFn: () => import('./games/towerDefense.js') },
    'stacker-game': { name: 'Physics Stacker', description: 'Balance Blocks', icon: 'fa-solid fa-cubes-stacked', category: 'New Games', importFn: () => import('./games/physicsStacker.js') },
    'neon-2048': { name: 'Neon 2048', description: 'Merge the Grid', icon: 'fa-solid fa-border-all', category: 'New Games', importFn: () => import('./games/neon2048.js') },
    'neon-flap': { name: 'Neon Flap', description: 'Flappy Clone', icon: 'fa-solid fa-dove', category: 'New Games', importFn: () => import('./games/neonFlap.js') },
    'neon-memory': { name: 'Neon Memory', description: 'Simon Says', icon: 'fa-solid fa-brain', category: 'New Games', importFn: () => import('./games/neonMemory.js') },
    'neon-flow-game': { name: 'Neon Flow', description: 'Relax & Create', icon: 'fa-solid fa-wind', category: 'New Games', importFn: () => import('./games/neonFlow.js'), wide: true },

    // Sports
    'neon-golf': { name: 'Neon Golf', description: 'Mini Golf Challenge', icon: 'fa-solid fa-golf-ball-tee', category: 'Sports', importFn: () => import('./games/neonGolf.js') },
    'neon-hoops': { name: 'Neon Hoops', description: 'Arcade Basketball', icon: 'fa-solid fa-basketball', category: 'Sports', importFn: () => import('./games/neonHoops.js') },

    // Action
    'neon-shooter': { name: 'Neon FPS', description: 'Cyber Defense', icon: 'fa-solid fa-gun', category: 'Action', importFn: () => import('./games/neonShooter.js') },
    'neon-jump': { name: 'Neon Jump', description: 'Jump to the Stars', icon: 'fa-solid fa-arrow-up', category: 'Action', importFn: () => import('./games/neonJump.js') },
    'neon-slice': { name: 'Neon Slice', description: 'Slice the Shapes', icon: 'fa-solid fa-scissors', category: 'Action', importFn: () => import('./games/neonSlice.js') },
    'neon-galaga-game': { name: 'Neon Galaga', description: 'Space Warfare', icon: 'fa-solid fa-jet-fighter', category: 'Action', importFn: () => import('./games/neonGalaga.js') },
    'neon-racer': { name: 'Neon Racer', description: 'Endless Drive', icon: 'fa-solid fa-road', category: 'Action', importFn: () => import('./games/neonRacer.js') },
    'neon-tap-game': { name: 'Neon Tap', description: 'Reflex Test', icon: 'fa-solid fa-bullseye', category: 'Action', importFn: () => import('./games/neonTap.js') },
    'neon-swipe-game': { name: 'Neon Swipe', description: 'Memory Swipe', icon: 'fa-solid fa-arrows-up-down-left-right', category: 'Action', importFn: () => import('./games/neonSwipe.js') },
    'neon-rhythm-game': { name: 'Neon Rhythm', description: 'Feel the Beat', icon: 'fa-solid fa-music', category: 'Action', importFn: () => import('./games/neonRhythm.js') },

    // Simulation
    'work-game': { name: 'The Grind 98', description: 'Life Simulator', icon: 'fa-solid fa-briefcase', category: 'Simulation', importFn: () => import('./games/work.js'), wide: true },
    'life-sim-game': { name: 'Neon Life', description: 'Live Your Best Life', icon: 'fa-solid fa-user-astronaut', category: 'Simulation', importFn: () => import('./games/lifeSim.js'), wide: true },
    'zen-garden-game': { name: 'Zen Garden', description: 'Relax & Create', icon: 'fa-solid fa-spa', category: 'Simulation', importFn: () => import('./games/zenGarden.js'), wide: true },

    // Arcade Classics
    'matterhorn-arcade': { name: 'Matterhorn Arcade', description: 'Retro Climbing Challenge', icon: 'fa-solid fa-person-hiking', category: 'Arcade Classics', importFn: () => import('./games/matterhornArcade.js'), wide: true },
    'snake-game': { name: 'Snake', description: 'Eat & Grow', icon: 'fa-solid fa-snake', category: 'Arcade Classics', importFn: () => import('./games/snake.js') },
    'pong-game': { name: 'Pong', description: 'Retro Tennis', icon: 'fa-solid fa-table-tennis-paddle-ball', category: 'Arcade Classics', importFn: () => import('./games/pong.js') },
    'space-game': { name: 'Space Shooter', description: 'Defend the Galaxy', icon: 'fa-solid fa-rocket', category: 'Arcade Classics', importFn: () => import('./games/space.js') },
    'breakout-game': { name: 'Breakout', description: 'Smash the Bricks', icon: 'fa-solid fa-kaaba', category: 'Arcade Classics', importFn: () => import('./games/breakout.js') },
    'tetris-game': { name: 'Tetris', description: 'Stack the Blocks', icon: 'fa-solid fa-shapes', category: 'Arcade Classics', importFn: () => import('./games/tetris.js') },

    // Quick Minigames
    'maze-game': { name: 'Maze', description: 'Find the Path', icon: 'fa-solid fa-dungeon', category: 'Quick Minigames', importFn: () => import('./games/maze.js') },
    'runner-game': { name: 'Endless Runner', description: 'Jump the Obstacles', icon: 'fa-solid fa-person-running', category: 'Quick Minigames', importFn: () => import('./games/runner.js') },
    'typing-game': { name: 'Speed Type', description: 'Test Your WPM', icon: 'fa-solid fa-keyboard', category: 'Quick Minigames', importFn: () => import('./games/typing.js') },
    'clicker-game': { name: 'Clicker', description: 'Exponential Growth', icon: 'fa-solid fa-hand-pointer', category: 'Quick Minigames', importFn: () => import('./games/clicker.js') },
    'neon-stack': { name: 'Neon Stack', description: 'Stack the Blocks', icon: 'fa-solid fa-layer-group', category: 'Quick Minigames', importFn: () => import('./games/neonStack.js') },

    // RPG & Logic
    'rpg-game': { name: 'RPG Battle', description: 'Turn-Based Combat', icon: 'fa-solid fa-khanda', category: 'RPG & Logic', importFn: () => import('./games/rpg.js') },
    'exiled-spark': { name: 'Exiled Spark', description: 'Text RPG Adventure', icon: 'fa-solid fa-terminal', category: 'RPG & Logic', importFn: () => import('./games/exiledSpark.js'), wide: true },
    'eclipse-game': { name: 'Eclipse', description: 'Strategy Board', icon: 'fa-solid fa-sun', category: 'RPG & Logic', importFn: () => import('./games/eclipse.js') },
    'eclipse-puzzle-game': { name: 'Eclipse Puzzle', description: 'Pattern Matching', icon: 'fa-solid fa-puzzle-piece', category: 'RPG & Logic', importFn: () => import('./games/eclipsePuzzle.js') },
    'eclipse-logic-puzzle-game': { name: 'Logic Puzzle', description: 'Deduction Grid', icon: 'fa-solid fa-lightbulb', category: 'RPG & Logic', importFn: () => import('./games/eclipseLogicPuzzle.js') },

    // Logic Puzzles
    'queens-game': { name: 'Queens', description: 'Place Queens', icon: 'fa-solid fa-chess-queen', category: 'Logic Puzzles', importFn: () => import('./games/queens.js') },
    'neon-mines-game': { name: 'Neon Mines', description: 'Avoid Mines', icon: 'fa-solid fa-bomb', category: 'Logic Puzzles', importFn: () => import('./games/neonMines.js') },
    'neon-picross-game': { name: 'Neon Picross', description: 'Picture Cross', icon: 'fa-solid fa-pencil-alt', category: 'Logic Puzzles', importFn: () => import('./games/neonPicross.js') },
    'sudoku-game': { name: 'Neon Sudoku', description: 'Classic Number Puzzle', icon: 'fa-solid fa-border-none', category: 'Logic Puzzles', importFn: () => import('./games/sudoku.js') },
    'cyber-solitaire': { name: 'Cyber Solitaire', description: 'Neon Card Game', icon: 'fa-solid fa-diamond', category: 'Logic Puzzles', importFn: () => import('./games/solitaire.js'), wide: true },
    'neon-zip-game': { name: 'Neon Zip', description: 'Flow Puzzle', icon: 'fa-solid fa-link', category: 'Logic Puzzles', importFn: () => import('./games/neonZip.js') },

    // System Modules
    'trophy-room': { name: 'Trophy Room', description: 'Achievement Gallery', icon: 'fa-solid fa-trophy', category: 'System', importFn: () => import('./core/TrophyRoom.js'), wide: true },
    'hall-of-fame': { name: 'Hall of Fame', description: 'Global Stats & Records', icon: 'fa-solid fa-list-ol', category: 'System', importFn: () => import('./games/hallOfFame.js'), wide: true },
    'avatar-station': { name: 'Avatar Station', description: 'Customize Identity', icon: 'fa-solid fa-user-gear', category: 'System', importFn: () => import('./games/avatarStation.js') },
    'tech-tree': { name: 'Tech Tree', description: 'System Upgrades', icon: 'fa-solid fa-network-wired', category: 'System', importFn: () => import('./games/techTree.js'), wide: true },
};

const AppState = { MENU: 'MENU', IN_GAME: 'IN_GAME', PAUSED: 'PAUSED', TRANSITIONING: 'TRANSITIONING', TROPHY_ROOM: 'TROPHY_ROOM' };

let currentState = AppState.MENU;
let currentGameInstance = null;
let lastTime = 0;
let mobileControls = null;
let arcadeHub = null;
let is3DView = true;
let store = null;
let gameOverCount = 0;
let dailyChallengeGameId = null;

const soundManager = SoundManager.getInstance();
const saveSystem = SaveSystem.getInstance();
const inputManager = InputManager.getInstance();
const adsManager = AdsManager.getInstance();
const particleSystem = ParticleSystem.getInstance();

// Centralized Game Loop
function mainLoop(timestamp) {
    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    switch (currentState) {
        case AppState.IN_GAME:
            if (currentGameInstance) {
                if (currentGameInstance.update) currentGameInstance.update(deltaTime);
                if (currentGameInstance.draw) currentGameInstance.draw();
            }
            break;
        case AppState.MENU:
            if (arcadeHub && is3DView) {
                if (arcadeHub.update) arcadeHub.update(deltaTime);
            }
            break;
    }

    // Global Particle System for Trails (if equipped)
    const particleType = saveSystem.getEquippedItem('particles');
    if (particleType) {
        // Logic to track mouse for trails
        // We need mouse pos. InputManager tracks keys, but maybe not global mouse pos perfectly for this.
        // Let's rely on simple tracking via event listener cache if possible or add it here.
        // But for now, let's just update the system.
        // Actually, we need to draw it too if we are in MENU (2D Grid) or specific 2D overlays.
        // 3D Hub handles its own rendering.
        // If Grid View:
        if (currentState === AppState.MENU && !is3DView) {
             // Draw particles on top? We need a canvas.
             // This might be complex to layer over DOM.
             // Simplification: Skip trails in menu for now to avoid complexity of overlay canvas.
        }
    }

    requestAnimationFrame(mainLoop);
}

async function transitionToState(newState, context = {}) {
    if (currentState === AppState.TRANSITIONING) return;

    if (currentState === AppState.IN_GAME || currentState === AppState.PAUSED) {
         if (currentGameInstance && currentGameInstance.shutdown) {
            try { await currentGameInstance.shutdown(); } catch (e) { console.error("Error shutting down:", e); }
        }
        if (mobileControls) { mobileControls.destroy(); mobileControls = null; }
        currentGameInstance = null;
        document.querySelectorAll(".game-container").forEach(el => el.classList.add("hidden"));
    }

    if (newState === AppState.MENU) {
        currentState = AppState.TRANSITIONING;
        hideOverlay();
        soundManager.setBGMVolume(soundManager.getVolume() || 0.1);
        document.getElementById("menu").classList.remove("hidden");
        populateMenuGrid();

        if (arcadeHub) {
            if (is3DView) {
                arcadeHub.resume();
                document.getElementById('menu-grid')?.classList.add('hidden');
                const toggleText = document.getElementById('view-toggle-text');
                if(toggleText) toggleText.textContent = 'Grid View';
                const hint = document.getElementById('controls-hint');
                if(hint) hint.classList.remove('opacity-0');
            } else {
                 arcadeHub.pause(); 
                 document.getElementById('menu-grid')?.classList.remove('hidden');
                 const toggleText = document.getElementById('view-toggle-text');
                 if(toggleText) toggleText.textContent = '3D View';
                 const hint = document.getElementById('controls-hint');
                 if(hint) hint.classList.add('opacity-0');
            }
        } else {
            document.getElementById('menu-grid')?.classList.remove('hidden');
        }
        currentState = AppState.MENU;
    }

    if (newState === AppState.TROPHY_ROOM) {
        // Redirect to IN_GAME state with trophy-room ID
        transitionToState(AppState.IN_GAME, { gameId: 'trophy-room' });
        return;
    }

    if (newState === AppState.IN_GAME) {
        const { gameId } = context;

        currentState = AppState.TRANSITIONING;
        if (arcadeHub) arcadeHub.pause();
        document.getElementById("menu").classList.add("hidden");

        const gameInfo = gameRegistry[gameId];
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
            let GameClass = null;
            if (gameInfo.importFn) {
                const module = await gameInfo.importFn();
                GameClass = module.default;
            }
            if (GameClass) {
                currentGameInstance = new GameClass();
                if (currentGameInstance.init) await currentGameInstance.init(container);

                const noDpadGames = ['neon-flow-game', 'clicker-game', 'neon-2048', 'neon-memory', 'neon-mines-game', 'neon-picross-game', 'neon-flap', 'neon-slice', 'neon-jump', 'neon-stack', 'lumina-game', 'prism-realms-game', 'trophy-room', 'hall-of-fame', 'avatar-station', 'tech-tree', 'sudoku-game', 'zen-garden-game', 'neon-zip-game', 'cyber-solitaire'];
                if (!noDpadGames.includes(gameId)) {
                    mobileControls = new MobileControls(container);
                }
            } else { throw new Error("Game class failed to load"); }
        } catch (err) {
            console.error(`Failed to init ${gameId}:`, err);
            currentGameInstance = new PlaceholderGame();
            currentGameInstance.text = "ERROR";
            currentGameInstance.subText = `Failed to load ${gameInfo.name}`;
            await currentGameInstance.init(container);

            const btn = document.createElement('button');
            btn.textContent = "Back";
            btn.className = "absolute top-4 right-4 px-4 py-2 bg-red-600 text-white rounded z-50 pointer-events-auto";
            btn.onclick = () => transitionToState(AppState.MENU);
            container.appendChild(btn);
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
        let multiplier = saveSystem.data.upgrades?.coinMultiplier || 1;
        const currentGameId = Object.keys(gameRegistry).find(key => gameRegistry[key].module && currentGameInstance instanceof gameRegistry[key].module);
        const isDaily = currentGameId === dailyChallengeGameId;
        if (isDaily) multiplier *= 2;

        const coinsEarned = Math.floor((score / 10) * multiplier);
        if(coinsEarned > 0) saveSystem.addCurrency(coinsEarned);

        // Quest Hook: Game Played
        updateQuestHook('play', 1);
        // Quest Hook: Score (Simplified, accumulative)
        updateQuestHook('score', score);

        const content = `
            <p class="mb-4 text-xl">Final Score: <span class="text-yellow-400 font-bold">${score}</span></p>
            ${coinsEarned > 0 ? `<p class="mb-4 text-sm text-yellow-300">Earned +${coinsEarned} Coins!</p>` : ''}
            ${isDaily ? `<p class="mb-4 text-xs text-fuchsia-400 font-bold animate-pulse">DAILY CHALLENGE BONUS APPLIED!</p>` : ''}
            <div class="flex justify-center gap-4">
                <button id="overlay-retry-btn" class="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded">Try Again</button>
                <button id="overlay-menu-btn" class="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded">Main Menu</button>
            </div>
        `;

        currentState = AppState.PAUSED;
        showOverlay('GAME OVER', content);
        updateHubStats();

        const retryBtn = document.getElementById('overlay-retry-btn');
        const menuBtn = document.getElementById('overlay-menu-btn');

        if (retryBtn) retryBtn.onclick = () => {
            hideOverlay();
            currentState = AppState.IN_GAME;
            if (onRetry) onRetry();
        };

        if (menuBtn) menuBtn.onclick = () => {
            if (Math.random() < 0.3) {
                adsManager.showAd(() => transitionToState(AppState.MENU));
            } else {
                transitionToState(AppState.MENU);
            }
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
     const adsEnabled = settings.adsEnabled !== false;

     const content = `
        <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
                <span class="text-white font-bold">Enable Ads</span>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="settings-ads-toggle" class="sr-only peer" ${adsEnabled ? 'checked' : ''}>
                    <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fuchsia-600"></div>
                </label>
            </div>
            <div class="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
                <span class="text-white font-bold">Master Volume</span>
                <input type="range" id="settings-volume-slider" min="0" max="1" step="0.1" value="${soundManager.getVolume()}" class="w-24">
            </div>
            <button id="copy-stats-btn" class="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded flex items-center justify-center gap-2"><i class="fas fa-share-alt"></i> Share High Scores</button>
            <hr class="border-slate-700 my-2">
            <h3 class="text-white font-bold">Save Data Backup</h3>
            <textarea id="export-area" class="w-full bg-slate-800 text-xs text-slate-300 p-2 rounded h-24 font-mono select-all" readonly>Generating...</textarea>
            <div class="flex gap-2">
                 <button id="refresh-export-btn" class="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded">Refresh</button>
                 <button id="copy-export-btn" class="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded">Copy</button>
            </div>
            <hr class="border-slate-700 my-2">
            <h3 class="text-white font-bold">Import Data</h3>
            <textarea id="import-area" class="w-full bg-slate-800 text-xs text-white p-2 rounded h-24 font-mono" placeholder="Paste save data here..."></textarea>
            <button id="import-btn" class="w-full px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded"><i class="fas fa-file-import"></i> Import & Overwrite</button>
            <p id="import-status" class="text-center text-xs text-slate-400 mt-1"></p>
        </div>
    `;

    showOverlay('DATA MANAGEMENT', content);

    const exportArea = document.getElementById('export-area');
    const updateExport = () => { exportArea.value = saveSystem.exportData(); };
    updateExport();

    document.getElementById('settings-ads-toggle').addEventListener('change', (e) => {
        saveSystem.setSetting('adsEnabled', e.target.checked);
        adsManager.toggleAds(e.target.checked);
    });

    document.getElementById('settings-volume-slider').addEventListener('input', (e) => {
        soundManager.setBGMVolume(parseFloat(e.target.value));
    });

    document.getElementById('refresh-export-btn').onclick = updateExport;
    document.getElementById('copy-export-btn').onclick = () => {
        exportArea.select();
        document.execCommand('copy');
    };

    document.getElementById('copy-stats-btn').onclick = () => {
        navigator.clipboard.writeText(saveSystem.getFormattedStats());
    };

    document.getElementById('import-btn').onclick = () => {
        const data = document.getElementById('import-area').value.trim();
        const statusEl = document.getElementById('import-status');
        if (!data) return;
        if (confirm("WARNING: Overwrite progress?")) {
            if (saveSystem.importData(data)) {
                statusEl.textContent = "Success! Reloading...";
                setTimeout(() => location.reload(), 1000);
            } else {
                statusEl.textContent = "Invalid Data.";
            }
        }
    };
}

function updateHubStats() {
    const currency = saveSystem.getCurrency();
    const ids = ['total-currency', 'total-currency-hud'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = currency;
    });
}

function toggleView() {
    is3DView = !is3DView;
    const btnText = document.getElementById('view-toggle-text');
    const menuGrid = document.getElementById('menu-grid');
    const hint = document.getElementById('controls-hint');

    if (is3DView) {
        if(btnText) btnText.textContent = 'Grid View';
        if(menuGrid) menuGrid.classList.add('hidden');
        if (arcadeHub) arcadeHub.resume();
        if(hint) hint.classList.remove('opacity-0');
    } else {
        if(btnText) btnText.textContent = '3D View';
        if(menuGrid) menuGrid.classList.remove('hidden');
        if (arcadeHub) arcadeHub.pause();
        if(hint) hint.classList.add('opacity-0');
    }
}

function populateMenuGrid() {
    const grid = document.getElementById('menu-grid');
    if(!grid) return;
    grid.innerHTML = '';

    // Daily Challenge Logic
    const today = new Date().toDateString();
    const savedDaily = saveSystem.getDailyChallenge();

    if (savedDaily && savedDaily.dateString === today && gameRegistry[savedDaily.gameId]) {
        dailyChallengeGameId = savedDaily.gameId;
    } else {
        const keys = Object.keys(gameRegistry).filter(k => !['trophy-room', 'hall-of-fame', 'avatar-station', 'tech-tree'].includes(k)); // Exclude system apps
        dailyChallengeGameId = keys[Math.floor(Math.random() * keys.length)];
        saveSystem.setDailyChallenge(dailyChallengeGameId, today);
    }

    const theme = saveSystem.getEquippedItem('theme') || 'blue';
    const themeColors = {
        blue: { border: 'hover:border-fuchsia-500', icon: 'text-fuchsia-400', shadow: 'shadow-fuchsia-500/20', gradient: 'from-fuchsia-500 to-cyan-500' },
        pink: { border: 'hover:border-pink-500', icon: 'text-pink-400', shadow: 'shadow-pink-500/20', gradient: 'from-pink-500 to-purple-500' },
        gold: { border: 'hover:border-yellow-500', icon: 'text-yellow-400', shadow: 'shadow-yellow-500/20', gradient: 'from-yellow-500 to-amber-500' },
        green: { border: 'hover:border-green-500', icon: 'text-green-400', shadow: 'shadow-green-500/20', gradient: 'from-green-500 to-emerald-500' },
        red: { border: 'hover:border-red-500', icon: 'text-red-400', shadow: 'shadow-red-500/20', gradient: 'from-red-500 to-orange-500' }
    };
    const t = themeColors[theme] || themeColors.blue;

    const categories = {};
    Object.entries(gameRegistry).forEach(([id, game]) => {
        const cat = game.category || 'Misc';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push({ id, ...game });
    });

    Object.keys(categories).sort().forEach(cat => {
        const header = document.createElement('div');
        header.className = "col-span-full text-white font-bold text-xl mt-6 mb-2 border-b border-slate-700 pb-2";
        header.innerHTML = `<i class="fas fa-layer-group mr-2 text-slate-400"></i> ${cat.toUpperCase()}`;
        grid.appendChild(header);

        categories[cat].forEach(game => {
            const isDaily = game.id === dailyChallengeGameId;
            const card = document.createElement('div');

            // Logic for Daily Challenge border override
            let borderClass = isDaily
                ? "border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]"
                : `border-slate-700 ${t.border}`;

            card.className = `bg-slate-800/80 backdrop-blur rounded-xl p-4 border ${borderClass} transition-all hover:scale-105 cursor-pointer group relative overflow-hidden`;

            card.innerHTML = `
                ${isDaily ? '<div class="absolute top-0 left-0 bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 z-10">DAILY CHALLENGE</div>' : ''}
                <div class="flex flex-col items-center text-center gap-3 pt-2">
                    <div class="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-3xl ${t.icon} group-hover:text-white transition-colors shadow-lg ${t.shadow}">
                        <i class="${game.icon || 'fas fa-gamepad'}"></i>
                    </div>
                    <h3 class="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">${game.name}</h3>
                    <p class="text-sm text-slate-400 line-clamp-2">${game.description}</p>
                </div>
                <div class="mt-4 w-full h-1 bg-slate-700 rounded overflow-hidden">
                    <div class="h-full bg-gradient-to-r ${t.gradient} w-0 group-hover:w-full transition-all duration-500"></div>
                </div>
            `;
            card.onmouseenter = () => soundManager.playSound('hover');
            card.onclick = () => transitionToState(AppState.IN_GAME, { gameId: game.id });
            grid.appendChild(card);
        });
    });
}

function showShopOverlay() {
    if (!store) store = new Store(saveSystem, 'store-items', ['store-currency']);
    document.getElementById('store-currency').textContent = saveSystem.getCurrency();
    store.render();
    document.getElementById('store-overlay').classList.remove('hidden');
}

function hideShopOverlay() {
    document.getElementById('store-overlay').classList.add('hidden');
    updateHubStats();
}

function showQuestsOverlay() {
    const quests = saveSystem.getDailyQuests();
    const content = `
        <div class="flex flex-col gap-4">
            <h3 class="text-xl font-bold text-fuchsia-400 mb-2">Daily Objectives</h3>
            ${quests.map((q, i) => `
                <div class="bg-slate-800 p-4 rounded-lg border ${q.claimed ? 'border-green-600 opacity-50' : 'border-slate-600'} relative overflow-hidden">
                    <div class="flex justify-between items-center relative z-10">
                        <div>
                            <div class="font-bold text-white">${q.description}</div>
                            <div class="text-xs text-slate-400">Reward: ${q.reward} Coins</div>
                        </div>
                        ${q.claimed ? '<span class="text-green-400 font-bold">CLAIMED</span>' :
                          (q.current >= q.target ? `<button class="claim-quest-btn px-3 py-1 bg-yellow-500 text-black font-bold rounded hover:bg-yellow-400" data-index="${i}">CLAIM</button>` :
                          `<span class="text-slate-500">${q.current}/${q.target}</span>`)}
                    </div>
                    <div class="absolute bottom-0 left-0 h-1 bg-slate-700 w-full">
                        <div class="h-full bg-fuchsia-500 transition-all" style="width: ${(q.current / q.target) * 100}%"></div>
                    </div>
                </div>
            `).join('')}
            ${quests.length === 0 ? '<p class="text-slate-500 italic">No active quests.</p>' : ''}
        </div>
    `;

    showOverlay('DAILY QUESTS', content);

    document.querySelectorAll('.claim-quest-btn').forEach(btn => {
        btn.onclick = (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            if (saveSystem.claimQuest(index)) {
                soundManager.playSound('powerup');
                showQuestsOverlay(); // Refresh
                updateHubStats();
                saveSystem.save(); // Ensure save
            }
        };
    });
}

function initDailyQuests() {
    const today = new Date().toDateString();
    let quests = saveSystem.getDailyQuests();

    if (quests.length === 0 || quests[0].dateString !== today) {
        // Generate new quests
        quests = [
            { type: 'play', description: 'Play 3 Games', target: 3, current: 0, reward: 50, claimed: false, dateString: today },
            { type: 'score', description: 'Score 100 Points', target: 100, current: 0, reward: 100, claimed: false, dateString: today }, // Generic score tracking logic needed
            { type: 'click', description: 'Click 50 Times', target: 50, current: 0, reward: 25, claimed: false, dateString: today } // Generic interaction
        ];
        saveSystem.setDailyQuests(quests);
    }
}

// Hook into actions to update quests
function updateQuestHook(type, amount=1) {
    saveSystem.updateQuestProgress(type, amount);
}

document.addEventListener('DOMContentLoaded', () => {
    initDailyQuests();
    updateHubStats();
    populateMenuGrid();

    store = new Store(saveSystem, 'store-items', ['store-currency', 'total-currency', 'total-currency-hud']);

    // WebGL Check
    const hubContainer = document.getElementById('arcade-hub-container');
    const hasWebGL = (() => { try { const canvas = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))); } catch (e) { return false; } })();

    // Mobile Check
    const isMobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);

    if (hubContainer && hasWebGL && !isMobile) {
        arcadeHub = new ArcadeHub(hubContainer, gameRegistry,
            (gameId) => transitionToState(gameId === 'TROPHY_ROOM' ? AppState.TROPHY_ROOM : AppState.IN_GAME, { gameId }),
            () => { // onFallback
                console.warn("WebGL Fallback Triggered.");
                is3DView = false;
                document.getElementById('view-toggle-btn').style.display = 'none';
                document.getElementById('menu-grid')?.classList.remove('hidden');
                document.getElementById('controls-hint')?.classList.add('opacity-0');
            }
        );
        document.getElementById("menu").classList.remove("hidden");
        document.getElementById('menu-grid')?.classList.add('hidden');
        setTimeout(() => arcadeHub.resume(), 100);
    } else {
        console.warn("Force 2D Mode");
        is3DView = false;
        document.getElementById('view-toggle-btn').style.display = 'none';
        document.getElementById("menu").classList.remove("hidden");
        document.getElementById('menu-grid')?.classList.remove('hidden');
        document.getElementById('controls-hint')?.classList.add('opacity-0');
    }

    // Bindings
    document.getElementById('view-toggle-btn')?.addEventListener('click', toggleView);
    document.getElementById('shop-btn-menu')?.addEventListener('click', showShopOverlay);
    document.getElementById('shop-btn-hud')?.addEventListener('click', showShopOverlay);
    document.getElementById('quests-btn-hud')?.addEventListener('click', showQuestsOverlay);
    document.getElementById('store-close-btn')?.addEventListener('click', hideShopOverlay);
    document.getElementById('overlay-close-btn')?.addEventListener('click', () => {
        if (currentState === AppState.PAUSED) togglePause(); else hideOverlay();
    });
    document.getElementById('overlay-main-menu-btn')?.addEventListener('click', () => transitionToState(AppState.MENU));

    const openSettings = () => showSettingsOverlay();
    document.getElementById('settings-btn')?.addEventListener('click', openSettings);
    document.getElementById('settings-btn-hud')?.addEventListener('click', openSettings);

    // Jukebox (Hidden Feature / Keybind)
    document.addEventListener('keydown', (e) => {
        // Toggle Jukebox (N)
        if (e.key === 'n' || e.key === 'N') {
            if (soundManager.nextTrack) {
                soundManager.nextTrack();
                const track = soundManager.currentTrack || "Track 1";
                // Simple toast if global helper available, else log
                console.log("Playing: " + track);
            }
        }

        // Boss Mode (Alt + B)
        if (e.altKey && (e.key === 'b' || e.key === 'B')) {
            const bossOverlay = document.getElementById('boss-mode-overlay');
            if (bossOverlay) {
                bossOverlay.classList.toggle('hidden');
                if (!bossOverlay.classList.contains('hidden')) {
                    if(soundManager) soundManager.toggleMute(); // Mute immediately
                    if(currentState === AppState.IN_GAME) togglePause();
                } else {
                    if(soundManager) soundManager.toggleMute(); // Unmute? Or user choice? Let's just mute on entry.
                }
            } else {
                createBossOverlay();
            }
        }
    });

function createBossOverlay() {
    const div = document.createElement('div');
    div.id = 'boss-mode-overlay';
    div.className = 'fixed inset-0 z-[99999] bg-white text-black font-sans p-0';
    div.innerHTML = `
        <div class="w-full h-full bg-white flex flex-col">
            <div class="bg-green-700 text-white p-2 text-xs flex gap-4">
                <span>File</span><span>Edit</span><span>View</span><span>Insert</span><span>Format</span><span>Data</span><span>Tools</span><span>Help</span>
            </div>
            <div class="bg-gray-100 border-b border-gray-300 p-2 flex gap-2">
                <div class="bg-white border border-gray-400 px-2">Arial</div>
                <div class="bg-white border border-gray-400 px-2">10</div>
                <div class="font-bold">B</div>
                <div class="italic">I</div>
            </div>
            <div class="flex-1 overflow-auto p-4">
                <table class="w-full border-collapse border border-gray-300 text-xs">
                    <thead>
                        <tr class="bg-gray-100">
                            <th class="border border-gray-300 w-10"></th>
                            <th class="border border-gray-300 px-2">A</th>
                            <th class="border border-gray-300 px-2">B</th>
                            <th class="border border-gray-300 px-2">C</th>
                            <th class="border border-gray-300 px-2">D</th>
                            <th class="border border-gray-300 px-2">E</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array(20).fill(0).map((_, i) => `
                        <tr>
                            <td class="bg-gray-100 border border-gray-300 text-center">${i+1}</td>
                            <td class="border border-gray-300 px-2">${i === 0 ? 'Q1 Financial Projections' : Math.floor(Math.random() * 10000)}</td>
                            <td class="border border-gray-300 px-2">${i === 0 ? 'Growth' : (Math.random() * 10).toFixed(2) + '%'}</td>
                            <td class="border border-gray-300 px-2">${i === 0 ? 'Revenue' : '$' + Math.floor(Math.random() * 50000)}</td>
                            <td class="border border-gray-300 px-2">${i === 0 ? 'Expenses' : '$' + Math.floor(Math.random() * 20000)}</td>
                            <td class="border border-gray-300 px-2"></td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="bg-gray-200 p-1 text-xs border-t border-gray-300">
                Sheet1 | Sheet2 | Sheet3
            </div>
        </div>
    `;
    document.body.appendChild(div);
    if(soundManager) soundManager.toggleMute();
    if(currentState === AppState.IN_GAME) togglePause();
}

    const updateMuteIcon = () => {
        const btn = document.getElementById('mute-btn-hud');
        if(btn) btn.innerHTML = soundManager.muted ? '<i class="fas fa-volume-mute text-red-400"></i>' : '<i class="fas fa-volume-up"></i>';
    };
    if (saveSystem.getSettings().muted) {
        soundManager.toggleMute(); // Will set to true
        updateMuteIcon();
    }
    document.getElementById('mute-btn-hud')?.addEventListener('click', () => {
        soundManager.toggleMute();
        updateMuteIcon();
    });

    document.getElementById('trophy-btn-menu')?.addEventListener('click', () => transitionToState(AppState.TROPHY_ROOM));

    // Swipe Support for Menu
    const menuGrid = document.getElementById('menu'); // Swiping the container
    let touchStartX = 0;
    if (menuGrid) {
        menuGrid.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
        menuGrid.addEventListener('touchend', e => {
            const touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 50) { /* Swiped Left (Next Page?) - Current is scroll */ }
        }, {passive: true});
    }

    setTimeout(() => {
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.classList.add('opacity-0');
            setTimeout(() => loader.remove(), 1000);
        }
    }, 1500);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const globalOverlay = document.getElementById('global-overlay');
            const storeOverlay = document.getElementById('store-overlay');

            if (globalOverlay && !globalOverlay.classList.contains('hidden')) {
                // If generic overlay is open (like Settings), close it.
                // Exception: If it's PAUSED state, togglePause handles logic (which re-shows it if needed, or resumes)
                // Actually togglePause expects us to be IN_GAME or PAUSED.
                // If we are in MENU and settings is open, we just want to hide overlay.
                if (currentState === AppState.PAUSED) {
                    togglePause(); // Will resume
                } else {
                    hideOverlay(); // Just close settings
                }
            } else if (storeOverlay && !storeOverlay.classList.contains('hidden')) {
                hideShopOverlay();
            } else if (currentState === AppState.IN_GAME) {
                togglePause();
            }
        }
    });

    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('back-btn')) transitionToState(AppState.MENU);
        updateQuestHook('click', 1);
    });

    // Particle Trail Event
    document.addEventListener('mousemove', (e) => {
        const pType = saveSystem.getEquippedItem('particles');
        if (pType && currentState === AppState.MENU && !is3DView) {
            // We need a canvas to draw this.
            // Since we don't have a global overlay canvas for trails yet, we will skip implementation to avoid breaking layout.
            // Future expansion: Add #trail-canvas to index.html
        }
    });

    lastTime = performance.now();
    requestAnimationFrame(mainLoop);
    soundManager.startBGM();
    new DevConsole();
    if (saveSystem.getSetting('crt')) {
        const crt = document.createElement('div');
        crt.id = 'crt-overlay';
        crt.className = 'crt-effect';
        document.body.appendChild(crt);
    }
});

window.miniGameHub = {
    transitionToState,
    soundManager,
    saveSystem,
    showGameOver,
    gameRegistry,
    goBack: () => transitionToState(AppState.MENU),
    getCurrentGame: () => currentGameInstance,
    gameRegistry
};
