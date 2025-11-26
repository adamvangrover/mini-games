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
    // Canvas Games
    'pong-game': PongGame,
    'breakout-game': BreakoutGame,
    'snake-game': SnakeGame,
    'maze-game': MazeGame,
    'runner-game': RunnerGame,
    'tetris-game': TetrisGame,
    'tower-defense-game': TowerDefenseGame,
    'physics-stacker-game': PhysicsStackerGame,

    // Logic/DOM Games
    'clicker-game': ClickerGame,
    'typing-game': TypingGame,
    'rpg-game': RPGGame,

    // 3D/Complex Games
    'space-game': SpaceShooterGame,
    'matterhorn-game': MatterhornGame,
    'aetheria-game': AetheriaGame,

    // Legacy (Eclipse games still need refactoring or adapter if not done yet)
    'eclipse-game': 'eclipseGame',
    'eclipse-puzzle-game': 'eclipsePuzzleGame',
    'eclipse-logic-puzzle-game': 'eclipseLogicPuzzleGame',
};

let currentGameInstance = null;
let animationFrameId = null;
let lastTime = 0;

const soundManager = SoundManager.getInstance();
const saveSystem = SaveSystem.getInstance();
const inputManager = InputManager.getInstance(); // Ensure it attaches listeners

// Init Background
new BackgroundShader();

function gameLoop(timestamp) {
    if (!currentGameInstance) return;

    const deltaTime = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (currentGameInstance.update) {
        currentGameInstance.update(deltaTime);
    }
    if (currentGameInstance.draw) {
        currentGameInstance.draw();
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

async function startGame(gameId) {
    // 1. Shutdown current
    if (currentGameInstance) {
        cancelAnimationFrame(animationFrameId);
        try {
            if (currentGameInstance.shutdown) currentGameInstance.shutdown();
        } catch (e) {
            console.error("Error shutting down previous game:", e);
        }
        currentGameInstance = null;
    }

    // 2. UI Transitions
    document.getElementById("menu").classList.add("hidden");
    document.querySelectorAll(".game-container").forEach(el => el.classList.add("hidden"));

    const gameContainerId = gameId; // The ID of the container in HTML
    const container = document.getElementById(gameContainerId);
    if (container) {
        container.classList.remove("hidden");
    }

    // Resume Audio
    if (soundManager.audioCtx.state === 'suspended') {
        soundManager.audioCtx.resume();
    }
    soundManager.playSound('click');

    // 3. Init New Game
    const gameEntry = gameRegistry[gameId];
    if (!gameEntry) {
        console.error("Game not found:", gameId);
        return;
    }

    // Muffle BGM
    soundManager.setBGMVolume(0.02);

    try {
        if (typeof gameEntry === 'string') {
            // Legacy Global Object
            const globalGame = window[gameEntry];
            if (globalGame) {
                currentGameInstance = new LegacyGameAdapter(globalGame);
            } else {
                console.error(`Legacy game object '${gameEntry}' not found on window.`);
                return;
            }
        } else {
            // New Class/Module
            currentGameInstance = new gameEntry();
        }

        if (currentGameInstance) {
            await currentGameInstance.init(container);

            // Start Loop
            lastTime = performance.now();
            gameLoop(lastTime);
        }
    } catch (err) {
        console.error("Failed to start game:", err);
        goBack();
    }
}

function goBack() {
    // Restore BGM Volume
    soundManager.setBGMVolume(0.1);

    if (currentGameInstance) {
        cancelAnimationFrame(animationFrameId);
        try {
            if (currentGameInstance.shutdown) currentGameInstance.shutdown();
        } catch (e) {
            console.error("Error shutting down game:", e);
        }
        currentGameInstance = null;
    }

    document.querySelectorAll(".game-container").forEach(el => el.classList.add("hidden"));
    document.getElementById("menu").classList.remove("hidden");

    // Resume audio context if suspended, and start BGM if not playing
    if (soundManager.audioCtx.state === 'suspended') soundManager.audioCtx.resume();
    soundManager.startBGM();
}

document.addEventListener('DOMContentLoaded', () => {
    // Bind Menu Buttons
    document.querySelectorAll('#menu button[data-game]').forEach(button => {
        button.addEventListener('click', () => {
            startGame(button.dataset.game);
        });
    });

    // Bind Back Buttons
    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent game inputs
            goBack();
        });
    });

    // Init global systems if needed
    // (Singletons are lazy init, but good to have them ready)
});

// Expose for debugging and legacy compatibility
window.miniGameHub = {
    startGame,
    goBack,
    soundManager,
    saveSystem
};

// Legacy Compatibility: Expose systems globally for non-module games
window.soundManager = soundManager;
window.saveSystem = saveSystem;
