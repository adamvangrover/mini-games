// Matterhorn Game Adapter
import Game from "./matterhorn/Game.js";

export default class MatterhornGame {
    constructor() {
        this.canvas = null;
        this.uiRoot = null;
    }

    async init(container) {
        this.canvas = container.querySelector('#matterhornCanvas');
        this.uiRoot = container.querySelector('#mh-ui-root');

        if (!this.canvas || !this.uiRoot) {
            // Fallback injection if not present (though index.html has it)
            // But if we want to be fully robust:
            // container.innerHTML = ... (Matterhorn HTML)
            // For now, assume index.html structure is used as per legacy plan
            console.error("Matterhorn elements not found in container");
            return;
        }

        // Reset UI visibility
        const startScreen = container.querySelector('#mh-start-screen');
        const hud = container.querySelector('#mh-hud-container');

        if(startScreen) startScreen.classList.remove('hidden');
        if(hud) hud.classList.add('hidden');

        // Start button handler
        const startBtn = container.querySelector('#mh-start-btn');
        if (startBtn) {
             // Remove old listener if any (managed by init instance)
             startBtn.onclick = () => {
                if(startScreen) startScreen.classList.add('hidden');
                if(hud) hud.classList.remove('hidden');
                Game.start();
            };
        }

        // Initialize Game Controller
        Game.init({
            canvas: this.canvas,
            uiRoot: this.uiRoot
        });
    }

    update(dt) {
        if (Game) {
             Game.update(dt);
        }
    }

    draw() {
        if (Game) {
             Game.draw();
        }
    }

    shutdown() {
        if (Game) Game.shutdown();

        const startBtn = document.getElementById('mh-start-btn');
        if(startBtn) startBtn.onclick = null;
    }
}
