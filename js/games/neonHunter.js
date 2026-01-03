import Game from './neonHunter/Game.js';

export default class NeonHunterAdapter {
    constructor() {
        this.container = null;
        this.game = null;
    }

    init(container) {
        this.container = container;
        // Make sure container has dimensions
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.overflow = 'hidden';

        if (typeof THREE === 'undefined') {
            console.error("Neon Hunter: THREE.js not found.");
            return;
        }

        this.game = new Game(this.container);
    }

    update(dt) {
        if (this.game) {
            this.game.update(dt);
        }
    }

    draw() {
        // Handled by Three.js in Game.js
    }

    shutdown() {
        if (this.game) {
            this.game.shutdown();
            this.game = null;
        }
    }
}
