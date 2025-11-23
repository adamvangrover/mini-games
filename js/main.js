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
    'matterhorn-game': matterhornGame
};

function startGame(gameName) {
    if (currentGame && typeof currentGame.shutdown === 'function') {
        currentGame.shutdown();
    }

    document.getElementById("menu").classList.add("hidden");
    document.getElementById(gameName).classList.remove("hidden");

    // Resume audio context on user interaction
    if (window.soundManager && window.soundManager.audioCtx.state === 'suspended') {
        window.soundManager.audioCtx.resume();
    }

    window.soundManager.playSound('click');

    currentGame = games[gameName];
    if (currentGame) {
        currentGame.init();
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
});
