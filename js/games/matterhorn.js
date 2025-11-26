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
        // Matterhorn Game currently has its own internal loop or doesn't expose update(dt).
        // If Game.update exists, call it.
        // Looking at previous matterhorn.js, it seems it didn't expose update/draw.
        // It likely uses requestAnimationFrame internally or Three.js loop.

        // If we want to centralize the loop, we would need to refactor matterhorn/Game.js heavily.
        // For Phase 1, we can just ensure shutdown works.
        // Ideally, we would hook into Game.update if it exists.
    }

    draw() {
        // Same as update
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
