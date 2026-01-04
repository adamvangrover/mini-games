import Game from './neonHunterEx/Game.js';

export default class NeonHunterExAdapter {
    constructor() {
        this.game = null;
    }

    init(container) {
        if (typeof THREE === 'undefined') {
            console.error("Neon Hunter EX: THREE.js not found.");
            return;
        }
        this.game = new Game(container);
    }

    update(dt) {
        if (this.game) {
            this.game.update(dt);
        }
    }

    draw() {
        // Handled by Three.js
    }

    shutdown() {
        if (this.game) {
            this.game.shutdown();
            this.game = null;
        }
    }
}
