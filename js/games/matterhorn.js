// Matterhorn Game Adapter
import Game from "./matterhorn/Game.js";

export default class MatterhornAdapter {
    constructor() {
        this.canvas = null;
        this.uiRoot = null;
    }

    init(container) {
        this.canvas = container.querySelector('#matterhornCanvas');
        this.uiRoot = container.querySelector('#mh-ui-root');

        if (!this.canvas || !this.uiRoot) {
            console.error("Matterhorn elements not found in container");
            return;
        }

        // Reset UI visibility
        const startScreen = container.querySelector('#mh-start-screen');
        if (startScreen) startScreen.classList.remove('hidden');

        const hud = container.querySelector('#mh-hud-container');
        if (hud) hud.classList.add('hidden');

        // Start button handler
        const startBtn = container.querySelector('#mh-start-btn');
        if (startBtn) {
            // Remove old listeners to avoid duplicates (though init creates new instance)
            startBtn.onclick = () => {
                if (startScreen) startScreen.classList.add('hidden');
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
            canvas: this.canvas,
            uiRoot: this.uiRoot
        });
    }

    update(deltaTime) {
        if (Game && Game.running) {
             Game.update(deltaTime);
        }
    }

    update(dt) {
        Game.update(dt);
    }

    draw() {
        Game.draw();
    }

    shutdown() {
        Game.shutdown();

    draw() {
        if (Game && Game.running) {
             Game.render();
        }
    }

    shutdown() {
        Game.shutdown();

        // UI Reset is handled by re-init, but we can clean up if needed
        // Clear any minigame DOM elements if they persist
        const leftOverIds = ['chocolate-game', 'fondue-game', 'photo-game'];
        leftOverIds.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.remove();
        });

export default matterhornGame;
        // Remove listeners
        const startBtn = document.getElementById('mh-start-btn');
        if(startBtn) startBtn.onclick = null;
    }
}
