import { MarketEngine } from './MarketEngine';
import { Player } from './Player';

export class GameManager {
    engine: MarketEngine;
    player: Player;
    currentLevel: number = 1;

    constructor(engine: MarketEngine, player: Player) {
        this.engine = engine;
        this.player = player;
    }

    startNextLevel() {
        this.currentLevel++;
        // Keep cash, reset debt with increase
        const baseDebt = 25000;
        this.player.debt = baseDebt * Math.pow(1.5, this.currentLevel - 1);
        this.engine.startLevel(this.currentLevel);
    }

    restartGame() {
        this.currentLevel = 1;
        this.player.cash = 1000;
        this.player.debt = 25000;
        this.player.portfolio = [];
        this.engine.startLevel(1);
    }
}
