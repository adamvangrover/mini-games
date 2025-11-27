import clickerGame from './games/clicker.js';
import mazeGame from './games/maze.js';
import runnerGame from './games/runner.js';
import typingGame from './games/typing.js';
import snakeGame from './games/snake.js';
import pongGame from './games/pong.js';
import spaceGame from './games/space.js';
import tetrisGame from './games/tetris.js';
import breakoutGame from './games/breakout.js';
import rpgGame from './games/rpg.js';
import eclipseGame from './games/eclipse.js';
import eclipsePuzzleGame from './games/eclipsePuzzle.js';
import eclipseLogicPuzzleGame from './games/eclipseLogicPuzzle.js';
import matterhornGame from './games/matterhorn.js';
import aetheriaGame from './games/aetheria/aetheria.js';
// Import new games (will be created soon)
// import towerDefenseGame from './games/towerDefense.js';
// import stackerGame from './games/stacker.js';

import SoundManager from './core/soundManager.js';
import SaveSystem from './core/saveSystem.js';
import InputManager from './core/InputManager.js';

// Initialize systems
window.soundManager = new SoundManager();
window.saveSystem = new SaveSystem();
window.inputManager = new InputManager();

let currentGame = null;

const games = {
    'clicker-game': clickerGame,
    'maze-game': mazeGame,
    'runner-game': runnerGame,
    'typing-game': typingGame,
    'snake-game': snakeGame,
    'pong-game': pongGame,
    'space-game': spaceGame,
    'tetris-game': tetrisGame,
    'breakout-game': breakoutGame,
    'rpg-game': rpgGame,
    'eclipse-game': eclipseGame,
    'eclipse-puzzle-game': eclipsePuzzleGame,
    'eclipse-logic-puzzle-game': eclipseLogicPuzzleGame,
    'matterhorn-game': matterhornGame,
    'aetheria-game': aetheriaGame,
    // 'tower-defense-game': towerDefenseGame,
    // 'stacker-game': stackerGame
};

function startGame(gameName) {
    if (currentGame && typeof currentGame.shutdown === 'function') {
        currentGame.shutdown();
    }

    document.getElementById("menu").classList.add("hidden");
    document.querySelectorAll(".game-container").forEach(el => el.classList.add("hidden"));

    const gameContainer = document.getElementById(gameName);
    if (gameContainer) {
        gameContainer.classList.remove("hidden");
    } else {
        console.error(`Game container #${gameName} not found!`);
        return;
    }

    // Resume audio context on user interaction
    if (window.soundManager && window.soundManager.audioCtx.state === 'suspended') {
        window.soundManager.audioCtx.resume();
    }

    // Start BGM if not already playing
    if (window.soundManager) {
        window.soundManager.playSound('click');
        window.soundManager.startBGM();
    }

    currentGame = games[gameName];
    if (currentGame) {
        // Pass the container or ID to init if needed, though legacy games rely on hardcoded IDs
        currentGame.init();
    } else {
        console.error(`Game module for ${gameName} not found!`);
    }
}

function goBack() {
    if (currentGame && typeof currentGame.shutdown === 'function') {
        currentGame.shutdown();
    }
    currentGame = null;

    document.querySelectorAll(".game-container").forEach(el => el.classList.add("hidden"));
    document.getElementById("menu").classList.remove("hidden");
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#menu button[data-game]').forEach(button => {
        button.addEventListener('click', () => {
            startGame(button.dataset.game);
        });
    });

    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', goBack);
    });

    // Global Loop? Legacy games have their own loops.
    // We can implement a master loop here if we refactor all games to use it,
    // but for now we rely on them managing their own loops via init/shutdown.
});
