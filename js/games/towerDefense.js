import Game from './towerDefense/Game.js';

export default class TowerDefenseAdapter {
    constructor() {
        this.game = null;
    }

    init(container) {
        this.game = new Game(container);
        this.game.init();
    }

    update(dt) {
        if (this.game) this.game.update(dt);
    }

    draw() {
        if (this.game) this.game.draw();
    }

    shutdown() {
        if (this.game) this.game.shutdown();
        this.game = null;
    }
}
