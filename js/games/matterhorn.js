import Game from "./matterhorn/Game.js";

const matterhornGame = {
    init: () => {
        const canvas = document.getElementById('matterhornCanvas');
        const uiRoot = document.getElementById('mh-ui-root');

        // Reset UI visibility
        document.getElementById('mh-start-screen').classList.remove('hidden');
        document.getElementById('mh-hud-container').classList.add('hidden');

        // Start button handler
        const startBtn = document.getElementById('mh-start-btn');
        startBtn.onclick = () => {
            document.getElementById('mh-start-screen').classList.add('hidden');
            Game.start();
        };

        Game.init({
            canvas: canvas,
            uiRoot: uiRoot
        });
    },

    shutdown: () => {
        Game.shutdown();

        // Reset UI elements visibility for next time
        const startScreen = document.getElementById('mh-start-screen');
        if (startScreen) startScreen.classList.remove('hidden');
        const hud = document.getElementById('mh-hud-container');
        if (hud) hud.classList.add('hidden');

        // Clear any minigame DOM elements if they persist
        const leftOverIds = ['chocolate-game', 'fondue-game', 'photo-game'];
        leftOverIds.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.remove();
        });
    }
};

export default matterhornGame;
