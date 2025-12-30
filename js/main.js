// The Core Game Loop and Hub Logic

import SoundManager from './core/SoundManager.js';
import SaveSystem from './core/SaveSystem.js';
import InputManager from './core/InputManager.js';
import ArcadeHub from './core/ArcadeHub.js';
import Store from './core/Store.js';
import MobileControls from './core/MobileControls.js';
import AdsManager from './core/AdsManager.js';
import DevConsole from './core/DevConsole.js';
import PlaceholderGame from './games/PlaceholderGame.js';

// --- Game Registry ---
// Uses Dynamic Imports for performance
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
    'neon-whack-game': { name: 'Neon Whack', description: 'Whack the Moles', icon: 'fa-solid fa-hammer', category: 'Quick Minigames', importFn: () => import('./games/neonWhack.js') },

    // Arcade Classics
    'solitaire-game': { name: 'Cyber Solitaire', description: 'Classic Card Game', icon: 'fa-solid fa-diamond', category: 'Arcade Classics', importFn: () => import('./games/solitaire.js'), wide: true },

    // RPG & Logic
    'rpg-game': { name: 'RPG Battle', description: 'Turn-Based Combat', icon: 'fa-solid fa-khanda', category: 'RPG & Logic', importFn: () => import('./games/rpg.js') },
    'eclipse-game': { name: 'Eclipse', description: 'Strategy Board', icon: 'fa-solid fa-sun', category: 'RPG & Logic', importFn: () => import('./games/eclipse.js') },
    'eclipse-puzzle-game': { name: 'Eclipse Puzzle', description: 'Pattern Matching', icon: 'fa-solid fa-puzzle-piece', category: 'RPG & Logic', importFn: () => import('./games/eclipsePuzzle.js') },
    'eclipse-logic-puzzle-game': { name: 'Logic Puzzle', description: 'Deduction Grid', icon: 'fa-solid fa-lightbulb', category: 'RPG & Logic', importFn: () => import('./games/eclipseLogicPuzzle.js') },

    // Logic Puzzles
    'queens-game': { name: 'Queens', description: 'Place Queens', icon: 'fa-solid fa-chess-queen', category: 'Logic Puzzles', importFn: () => import('./games/queens.js') },
    'neon-mines-game': { name: 'Neon Mines', description: 'Avoid Mines', icon: 'fa-solid fa-bomb', category: 'Logic Puzzles', importFn: () => import('./games/neonMines.js') },
    'neon-picross-game': { name: 'Neon Picross', description: 'Picture Cross', icon: 'fa-solid fa-pencil-alt', category: 'Logic Puzzles', importFn: () => import('./games/neonPicross.js') },
    'sudoku-game': { name: 'Neon Sudoku', description: 'Classic Number Puzzle', icon: 'fa-solid fa-border-none', category: 'Logic Puzzles', importFn: () => import('./games/sudoku.js') },
    'neon-zip-game': { name: 'Neon Zip', description: 'Connect the Dots', icon: 'fa-solid fa-bolt', category: 'Logic Puzzles', importFn: () => import('./games/neonZip.js') },
    'neon-word-game': { name: 'Neon Word', description: 'Word Guessing', icon: 'fa-solid fa-font', category: 'Logic Puzzles', importFn: () => import('./games/neonWord.js') },

    // System Modules
    'trophy-room': { name: 'Trophy Room', description: 'Achievement Gallery', icon: 'fa-solid fa-trophy', category: 'System', importFn: () => import('./core/TrophyRoom.js'), wide: true },
    'hall-of-fame': { name: 'Hall of Fame', description: 'Global Stats & Records', icon: 'fa-solid fa-list-ol', category: 'System', importFn: () => import('./games/hallOfFame.js'), wide: true },
    'avatar-station': { name: 'Avatar Station', description: 'Customize Identity', icon: 'fa-solid fa-user-gear', category: 'System', importFn: () => import('./games/avatarStation.js') },
    'tech-tree': { name: 'Tech Tree', description: 'System Upgrades', icon: 'fa-solid fa-network-wired', category: 'System', importFn: () => import('./games/techTree.js'), wide: true },
};



// --- Global State ---
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

// --- Game Loop ---
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
        case AppState.PAUSED:
            // Keep drawing the game so it doesn't disappear, but do NOT update state
            if (currentGameInstance && currentGameInstance.draw) {
                currentGameInstance.draw();
            }
            break;
        case AppState.MENU:
            if (arcadeHub && is3DView) {
                if (arcadeHub.update) arcadeHub.update(deltaTime);
            }
            break;
    }
    requestAnimationFrame(mainLoop);
}

// --- State Management ---


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
                if (toggleText) toggleText.textContent = 'Grid View';
                const hint = document.getElementById('controls-hint');
                if (hint) hint.classList.remove('opacity-0');
            } else {
                arcadeHub.pause();
                document.getElementById('menu-grid')?.classList.remove('hidden');
                const toggleText = document.getElementById('view-toggle-text');
                if (toggleText) toggleText.textContent = '3D View';
                const hint = document.getElementById('controls-hint');
                if (hint) hint.classList.add('opacity-0');
            }
        } else {
            document.getElementById('menu-grid')?.classList.remove('hidden');
        }
        currentState = AppState.MENU;
    }

    if (newState === AppState.TROPHY_ROOM) {
        currentState = AppState.TRANSITIONING;
        if (arcadeHub) arcadeHub.pause();
        document.getElementById("menu").classList.add("hidden");
        document.querySelectorAll(".game-container").forEach(el => el.classList.add("hidden"));

        let trContainer = document.getElementById('trophy-room-container');
        if (!trContainer) {
            trContainer = document.createElement('div');
            trContainer.id = 'trophy-room-container';
            trContainer.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; z-index:15;";
            document.body.appendChild(trContainer);
        }
        trContainer.innerHTML = '';
        trContainer.style.display = 'block';
        trContainer.classList.add('game-container');
        trContainer.classList.remove('hidden');

        try {
            const module = await import('./core/TrophyRoom.js');
            requestAnimationFrame(() => {
                new module.default(trContainer, () => {
                    trContainer.style.display = 'none';
                    transitionToState(AppState.MENU);
                });
            });
        } catch (err) {
            new PlaceholderGame().init(trContainer);
        }
        currentState = AppState.TROPHY_ROOM;
        return;
    }

    if (newState === AppState.IN_GAME) {
        const { gameId } = context;
        if (gameId === 'trophy-room') { transitionToState(AppState.TROPHY_ROOM); return; }

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

                const noDpadGames = ['neon-flow-game', 'clicker-game', 'neon-2048', 'neon-memory', 'neon-mines-game', 'neon-picross-game', 'neon-flap', 'neon-slice', 'neon-jump', 'neon-stack', 'lumina-game', 'prism-realms-game', 'trophy-room', 'hall-of-fame', 'avatar-station', 'tech-tree', 'sudoku-game', 'zen-garden-game', 'neon-zip-game', 'solitaire-game', 'neon-word-game', 'neon-whack-game'];
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

// --- Menu Grid Logic (Merged) ---
function populateMenuGrid() {
    const grid = document.getElementById('menu-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Initialize Daily Challenge if needed
    if (!dailyChallengeGameId) {
        const keys = Object.keys(gameRegistry);
        dailyChallengeGameId = keys[Math.floor(Math.random() * keys.length)];
    }

    // Determine Theme Colors
    const theme = saveSystem.getEquippedItem('theme') || 'blue';
    const themeColors = {
        blue: { border: 'hover:border-fuchsia-500', icon: 'text-fuchsia-400', shadow: 'shadow-fuchsia-500/20', gradient: 'from-fuchsia-500 to-cyan-500' },
        pink: { border: 'hover:border-pink-500', icon: 'text-pink-400', shadow: 'shadow-pink-500/20', gradient: 'from-pink-500 to-purple-500' },
        gold: { border: 'hover:border-yellow-500', icon: 'text-yellow-400', shadow: 'shadow-yellow-500/20', gradient: 'from-yellow-500 to-amber-500' },
        green: { border: 'hover:border-green-500', icon: 'text-green-400', shadow: 'shadow-green-500/20', gradient: 'from-green-500 to-emerald-500' },
        red: { border: 'hover:border-red-500', icon: 'text-red-400', shadow: 'shadow-red-500/20', gradient: 'from-red-500 to-orange-500' }
    };
    const t = themeColors[theme] || themeColors.blue;

    // Group Games
    const categories = {};
    Object.entries(gameRegistry).forEach(([id, game]) => {
        const cat = game.category || 'Misc';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push({ id, ...game });
    });

    // Render Sorted Categories
    Object.keys(categories).sort().forEach(cat => {
        const header = document.createElement('div');
        header.className = "col-span-full text-white font-bold text-xl mt-6 mb-2 border-b border-slate-700 pb-2";
        header.innerHTML = `<i class="fas fa-layer-group mr-2 text-slate-400"></i> ${cat.toUpperCase()}`;
        grid.appendChild(header);

        categories[cat].forEach(game => {
            const isDaily = game.id === dailyChallengeGameId;
            const card = document.createElement('div');

            // Daily Challenge Highlighting
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

// --- Overlays & HUD ---

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
        if (coinsEarned > 0) saveSystem.addCurrency(coinsEarned);

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

window.updateHubStats = function updateHubStats() {
    const currency = saveSystem.getCurrency();
    const ids = ['total-currency', 'total-currency-hud'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = currency;
    });
}

function updateHubStats() {
    window.updateHubStats();
}

function toggleView() {
    is3DView = !is3DView;
    const btnText = document.getElementById('view-toggle-text');
    const menuGrid = document.getElementById('menu-grid');
    const hint = document.getElementById('controls-hint');

    if (is3DView) {
        if (btnText) btnText.textContent = 'Grid View';
        if (menuGrid) menuGrid.classList.add('hidden');
        if (arcadeHub) arcadeHub.resume();
        if (hint) hint.classList.remove('opacity-0');
    } else {
        if (btnText) btnText.textContent = '3D View';
        if (menuGrid) menuGrid.classList.remove('hidden');
        if (arcadeHub) arcadeHub.pause();
        if (hint) hint.classList.add('opacity-0');
    }
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

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // Apply Saved Theme
    const savedTheme = saveSystem.getEquippedItem('theme');
    if (savedTheme) {
        document.body.className = `theme-${savedTheme}`;
    }

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
    document.getElementById('store-close-btn')?.addEventListener('click', hideShopOverlay);
    document.getElementById('overlay-close-btn')?.addEventListener('click', () => {
        if (currentState === AppState.PAUSED) togglePause(); else hideOverlay();
    });
    document.getElementById('overlay-main-menu-btn')?.addEventListener('click', () => transitionToState(AppState.MENU));

    const openSettings = () => showSettingsOverlay();
    document.getElementById('settings-btn')?.addEventListener('click', openSettings);
    document.getElementById('settings-btn-hud')?.addEventListener('click', openSettings);

    const showGuide = () => {
        const content = `
            <div class="guide-section">
                <h3>🎮 How to Play</h3>
                <p class="text-slate-300 text-sm mb-2">Explore the Neon Arcade by dragging to look around and clicking on game cabinets. In Grid View, simply click a card to play.</p>
                <p class="text-slate-300 text-sm">Earn <strong>Coins</strong> and <strong>XP</strong> by playing games. Higher scores mean bigger rewards!</p>
            </div>
            <div class="guide-section">
                <h3>🏆 Trophies & Achievements</h3>
                <p class="text-slate-300 text-sm mb-2">Visit the <strong>Trophy Room</strong> to see your collection. Trophies are awarded for specific milestones in each game.</p>
                <p class="text-slate-300 text-sm">Click on a trophy in the room to view detailed stats and lore.</p>
            </div>
            <div class="guide-section">
                <h3>🛍️ The Store</h3>
                <p class="text-slate-300 text-sm mb-2">Spend your coins on cosmetic upgrades like new <strong>Avatars</strong>, <strong>Themes</strong>, and <strong>Cabinet Styles</strong>.</p>
                <p class="text-slate-300 text-sm">Unlock the <strong>Tech Tree</strong> to purchase permanent boosts like Coin Multipliers.</p>
            </div>
            <div class="text-center mt-6">
                 <button id="close-guide-btn" class="px-6 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded">Got it!</button>
            </div>
        `;
        showOverlay('GAME GUIDE', content);
        document.getElementById('close-guide-btn').onclick = () => hideOverlay();
    };

    // Add Guide Button to HUD
    const hud = document.getElementById('hub-hud');
    if (hud) {
        const guideBtn = document.createElement('button');
        guideBtn.id = 'guide-btn-hud';
        guideBtn.className = 'glass-panel px-4 py-2 rounded-full text-white hover:bg-white/10 transition';
        guideBtn.title = 'Game Guide';
        guideBtn.innerHTML = '<i class="fas fa-question-circle"></i>';
        guideBtn.onclick = showGuide;
        hud.insertBefore(guideBtn, hud.firstChild);
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
    const menuGrid = document.getElementById('menu-grid');
    let touchStartX = 0;
    if (menuGrid) {
        menuGrid.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
        menuGrid.addEventListener('touchend', e => {
            const touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                 // Simple scroll support if needed, or trigger category switch
                 // For now, let's just allow native scrolling but prevent default if it's horizontal
                 // Actually, native scrolling is better for grid.
                 // But let's add logic to switch "3D View" to "Grid View" on swipe up if on mobile landing
            }
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
                if (currentState === AppState.PAUSED) {
                    togglePause();
                } else {
                    hideOverlay();
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

// Expose Global API for Debugging
window.miniGameHub = {
    transitionToState,
    soundManager,
    saveSystem,
    showGameOver,
    gameRegistry,
    goBack: () => transitionToState(AppState.MENU),
    getCurrentGame: () => currentGameInstance
};
