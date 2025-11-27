// Matterhorn Game Adapter
import Game from "./matterhorn/Game.js";

export default class MatterhornGame {
    async init(container) {
        const canvas = document.getElementById('matterhornCanvas');
        const uiRoot = document.getElementById('mh-ui-root');

        // Reset UI visibility
        const startScreen = document.getElementById('mh-start-screen');
        const hud = document.getElementById('mh-hud-container');

        if(startScreen) startScreen.classList.remove('hidden');
        if(hud) hud.classList.add('hidden');

        // Start button handler
        const startBtn = document.getElementById('mh-start-btn');
        if (startBtn) {
             startBtn.onclick = () => {
                if(startScreen) startScreen.classList.add('hidden');
                Game.start();
            };
        }

        Game.init({
            canvas: canvas,
            uiRoot: uiRoot
        });
    }

    update(dt) {
        Game.update(dt);
    }

    draw() {
        Game.draw();
    }

    shutdown() {
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

        // Remove listeners
        const startBtn = document.getElementById('mh-start-btn');
        if(startBtn) startBtn.onclick = null;
    }
}
