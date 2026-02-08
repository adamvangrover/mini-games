import { MarketEngine } from '../core/MarketEngine';
import { Player } from '../core/Player';
import { SoundManager } from '../core/SoundManager';

export class DarkWeb {
    engine: MarketEngine;
    player: Player;
    soundManager: SoundManager;

    isVisible: boolean = false;
    selectedOption: number = 0;

    options = [
        { name: "BUY INSIDER TIP ($500)", cost: 500, action: 'TIP' },
        { name: "SABOTAGE RIVAL ($2000)", cost: 2000, action: 'SABOTAGE' },
        { name: "PUMP STOCK ($3000)", cost: 3000, action: 'PUMP' }
    ];

    lastResult: string = "";

    constructor(engine: MarketEngine, player: Player, soundManager: SoundManager) {
        this.engine = engine;
        this.player = player;
        this.soundManager = soundManager;
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.soundManager.playTone(200, 'sawtooth', 0.2);
    }

    handleInput(key: string) {
        if (!this.isVisible) return;

        if (key === 'ArrowUp') {
            this.selectedOption = (this.selectedOption - 1 + this.options.length) % this.options.length;
            this.soundManager.playTone(300, 'square', 0.05);
        }
        if (key === 'ArrowDown') {
            this.selectedOption = (this.selectedOption + 1) % this.options.length;
            this.soundManager.playTone(300, 'square', 0.05);
        }
        if (key === 'Enter') {
            this.execute();
        }
        if (key === 'Escape') {
            this.isVisible = false;
        }
    }

    execute() {
        const opt = this.options[this.selectedOption];
        if (this.player.cash >= opt.cost) {
            this.player.cash -= opt.cost;
            this.soundManager.playBuy();

            if (opt.action === 'TIP') {
                // Reveal a trend
                const stock = this.engine.stocks[Math.floor(Math.random() * this.engine.stocks.length)];
                const direction = stock.trend > 0 ? "RISING" : "FALLING";
                this.lastResult = `TIP: ${stock.symbol} is ${direction} (Vol: ${stock.volatility})`;
            } else if (opt.action === 'SABOTAGE') {
                // Crash a random stock
                const stock = this.engine.stocks[Math.floor(Math.random() * this.engine.stocks.length)];
                stock.price *= 0.8;
                stock.trend = -0.5;
                this.lastResult = `HACK: ${stock.symbol} CRASHED BY 20%`;
            } else if (opt.action === 'PUMP') {
                // Pump a random stock
                const stock = this.engine.stocks[Math.floor(Math.random() * this.engine.stocks.length)];
                stock.price *= 1.2;
                stock.trend = 0.5;
                this.lastResult = `PUMP: ${stock.symbol} BOOSTED BY 20%`;
            }
        } else {
            this.lastResult = "INSUFFICIENT FUNDS FOR HACK";
            this.soundManager.playError();
        }
    }

    draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
        if (!this.isVisible) return;

        // Overlay
        ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
        ctx.fillRect(0, 0, width, height);

        // Border
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 4;
        ctx.strokeRect(50, 50, width - 100, height - 100);

        // Header
        ctx.fillStyle = "#ff0000";
        ctx.font = '30px "VT323", monospace';
        ctx.textAlign = 'center';
        ctx.fillText("/// DARK WEB ACCESS ///", width/2, 100);

        // Options
        ctx.textAlign = 'left';
        this.options.forEach((opt, i) => {
            if (i === this.selectedOption) {
                ctx.fillStyle = "#ffffff";
                ctx.fillText(`> ${opt.name}`, 100, 200 + i * 40);
            } else {
                ctx.fillStyle = "#aa0000";
                ctx.fillText(`  ${opt.name}`, 100, 200 + i * 40);
            }
        });

        // Result
        if (this.lastResult) {
            ctx.fillStyle = "#ffff00";
            ctx.textAlign = 'center';
            ctx.fillText(this.lastResult, width/2, height - 150);
        }

        ctx.fillStyle = "#ff0000";
        ctx.font = '20px "VT323", monospace';
        ctx.fillText("[UP/DOWN] Select   [ENTER] Execute   [ESC] Exit", width/2, height - 80);
        ctx.textAlign = 'left';
    }
}
