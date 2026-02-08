import { MarketEngine, Stock } from '../core/MarketEngine';
import { Player } from '../core/Player';
import { SoundManager } from '../core/SoundManager';
import { GameManager } from '../core/GameManager';
import { ParticleSystem } from './ParticleSystem';
import { DarkWeb } from './DarkWeb';

export class Terminal {
    engine: MarketEngine;
    player: Player;
    soundManager: SoundManager;
    gameManager: GameManager;
    particleSystem: ParticleSystem;
    darkWeb: DarkWeb;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;

    selectedStockIndex: number = 0;
    showHelp: boolean = false;

    // News Ticker
    tickerOffset: number = 0;

    // Message log
    messages: string[] = [];

    constructor(engine: MarketEngine, player: Player, soundManager: SoundManager, gameManager: GameManager, ctx: CanvasRenderingContext2D, width: number, height: number) {
        this.engine = engine;
        this.player = player;
        this.soundManager = soundManager;
        this.gameManager = gameManager;
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.particleSystem = new ParticleSystem(ctx);
        this.darkWeb = new DarkWeb(engine, player, soundManager);

        // Handle input
        window.addEventListener('keydown', (e) => {
            if (this.engine.isGameOver) {
                if (e.key === 'Enter') {
                    if (this.engine.gameResult === 'WIN') {
                        this.gameManager.startNextLevel();
                    } else {
                        this.gameManager.restartGame();
                    }
                }
                return;
            }

            // Help Toggle
            if (e.key.toLowerCase() === 'h') {
                this.showHelp = !this.showHelp;
                return;
            }

            if (this.showHelp) return; // Block input when help is shown

            // Delegate to Dark Web if visible
            if (this.darkWeb.isVisible) {
                this.darkWeb.handleInput(e.key);
                if (e.key === 'Tab') {
                    e.preventDefault();
                    this.darkWeb.toggle();
                }
                return;
            }

            if (e.key === 'Tab') {
                e.preventDefault();
                this.darkWeb.toggle();
                return;
            }

            if (e.key === 'ArrowUp') {
                this.selectedStockIndex = (this.selectedStockIndex - 1 + this.engine.stocks.length) % this.engine.stocks.length;
                this.soundManager.playTone(800, 'sine', 0.05); // Menu blip
            }
            if (e.key === 'ArrowDown') {
                this.selectedStockIndex = (this.selectedStockIndex + 1) % this.engine.stocks.length;
                this.soundManager.playTone(800, 'sine', 0.05); // Menu blip
            }
            if (e.key.toLowerCase() === 'b') {
                this.handleBuy();
            }
            if (e.key.toLowerCase() === 's') {
                this.handleSell();
            }
            if (e.key.toLowerCase() === 'd') {
                this.handlePayDebt();
            }
        });
    }

    update(dt: number) {
        this.particleSystem.update(dt);
        this.tickerOffset -= 50 * dt; // Scroll speed
    }

    handleBuy() {
        if (this.engine.isFrozen) {
            this.log("CANNOT TRADE WHILE FROZEN");
            this.soundManager.playError();
            return;
        }
        const stock = this.engine.stocks[this.selectedStockIndex];
        const quantity = 10;
        if (this.player.buy(stock.symbol, stock.price, quantity)) {
            const cost = stock.price * quantity;
            this.log(`BOUGHT ${quantity} ${stock.symbol} @ $${stock.price.toFixed(2)}`);
            this.soundManager.playBuy();
            // Spawn particles at random location near center or consistent location
            this.particleSystem.spawn(this.width/2, this.height/2, `-${cost.toFixed(0)}`, '#ff0000');
        } else {
            this.log("INSUFFICIENT FUNDS");
            this.soundManager.playError();
        }
    }

    handleSell() {
        if (this.engine.isFrozen) {
            this.log("CANNOT TRADE WHILE FROZEN");
            this.soundManager.playError();
            return;
        }
        const stock = this.engine.stocks[this.selectedStockIndex];
        const quantity = 10;
        if (this.player.sell(stock.symbol, stock.price, quantity)) {
             const revenue = stock.price * quantity;
             this.log(`SOLD ${quantity} ${stock.symbol} @ $${stock.price.toFixed(2)}`);
             this.soundManager.playSell();
             this.particleSystem.spawn(this.width/2, this.height/2, `+${revenue.toFixed(0)}`, '#00ff00');
        } else {
             this.log("MAX SHORT POSITION REACHED");
             this.soundManager.playError();
        }
    }

    handlePayDebt() {
        const amount = 1000;
        if (this.player.debt > 0) {
            if (this.player.payDebt(amount)) {
                this.log(`PAID $${amount} DEBT`);
                this.engine.checkWin(this.player.debt);
                this.soundManager.playBuy();
                this.particleSystem.spawn(this.width/2, this.height/2, `DEBT -${amount}`, '#00ff00');
            } else {
                this.log("INSUFFICIENT FUNDS TO PAY DEBT");
                this.soundManager.playError();
            }
        } else {
             this.log("NO DEBT!");
        }
    }

    log(msg: string) {
        this.messages.unshift(msg);
        if (this.messages.length > 5) this.messages.pop();
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    draw() {
        // Sync dimensions just in case
        this.width = this.ctx.canvas.width;
        this.height = this.ctx.canvas.height;

        if (this.engine.isGameOver) {
             this.drawGameOver();
             return;
        }

        // Clear background
        this.ctx.fillStyle = '#001100';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.drawScanlines();

        // Draw Player Stats
        this.ctx.font = '24px "VT323", monospace';
        this.ctx.textBaseline = 'top';

        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillText(`CASH: $${this.player.cash.toFixed(2)}`, 40, 30);
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillText(`DEBT: $${this.player.debt.toFixed(2)}`, 300, 30);

        // Draw Time
        this.ctx.fillStyle = this.engine.timeRemaining < 60 ? 'red' : '#00ff00';
        this.ctx.fillText(`TIME: ${Math.ceil(this.engine.timeRemaining)}s`, 600, 30);

        // Draw Level
        this.ctx.fillStyle = '#00ffff';
        this.ctx.fillText(`LEVEL: ${this.engine.level}`, 800, 30);


        // Header
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillText("MARKET STATUS", 40, 70);
        this.ctx.fillRect(40, 95, this.width - 80, 2);

        // Draw Stocks List
        const listX = 40;
        const listY = 110;
        const lineHeight = 35;

        this.ctx.fillStyle = '#004400';
        this.ctx.fillText("SYM    SECTOR  PRICE       POS", listX + 20, listY - 25);

        this.engine.stocks.forEach((stock, index) => {
            let color = '#00ff00';
            let prefix = "  ";
            if (index === this.selectedStockIndex) {
                color = '#ffff00';
                prefix = "> ";
            }

            // Check portfolio
            const owned = this.player.portfolio.find(p => p.symbol === stock.symbol);
            const qty = owned ? owned.quantity : 0;

            this.ctx.fillStyle = color;
            // Pad columns
            const sym = stock.symbol.padEnd(6);
            const sec = stock.sector.padEnd(8);
            const prc = `$${stock.price.toFixed(2)}`.padStart(9);
            const pos = qty !== 0 ? `[${qty}]` : `[-]`;

            this.ctx.fillText(`${prefix}${sym} ${sec} ${prc}   ${pos}`, listX, listY + index * lineHeight);

            const trendChar = stock.history.length > 1 && stock.history[stock.history.length-1] > stock.history[stock.history.length-2] ? '▲' : '▼';
            this.ctx.fillText(trendChar, listX + 550, listY + index * lineHeight);
        });

        // Draw Chart
        if (this.width > 600) {
            this.drawChart(this.engine.stocks[this.selectedStockIndex], 600, 110, this.width - 650, 300);
        }

        // Draw Controls Hint
        this.ctx.fillStyle = '#00aa00';
        this.ctx.fillText("[UP/DOWN] Select  [B] Buy  [S] Sell  [D] Pay Debt  [TAB] Dark Web  [H] Help  [SPACE] Panic", 40, this.height - 80);

        // Draw Messages (Moved up slightly)
        this.ctx.fillStyle = '#ffff00';
        this.messages.forEach((msg, i) => {
             this.ctx.fillText(`> ${msg}`, 40, this.height - 120 - i * 30);
        });

        // News Ticker
        this.drawTicker(0, this.height - 30);

        // Particles
        this.particleSystem.draw();

        // Dark Web Overlay
        this.darkWeb.draw(this.ctx, this.width, this.height);

        // Help Overlay
        if (this.showHelp) {
            this.drawHelp();
        }
    }

    drawGameOver() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.font = '60px "VT323", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        if (this.engine.gameResult === 'WIN') {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillText("DEBT PAID! YOU ARE FREE.", this.width/2, this.height/2);
            this.ctx.font = '30px "VT323", monospace';
            this.ctx.fillText(`PRESS ENTER FOR LEVEL ${this.engine.level + 1}`, this.width/2, this.height/2 + 50);
        } else {
            this.ctx.fillStyle = 'red';
            this.ctx.fillText("TIME UP. THE SHARKS ARE HERE.", this.width/2, this.height/2);
            this.ctx.font = '30px "VT323", monospace';
            this.ctx.fillText(`DEBT REMAINING: $${this.player.debt.toFixed(2)}`, this.width/2, this.height/2 + 50);
            this.ctx.fillText("PRESS ENTER TO RESTART", this.width/2, this.height/2 + 100);
        }
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
    }

    drawChart(stock: Stock, x: number, y: number, w: number, h: number) {
        this.ctx.fillStyle = '#002200';
        this.ctx.fillRect(x, y, w, h);

        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, w, h);

        if (stock.history.length < 2) return;

        const maxPrice = Math.max(...stock.history, stock.price + 10);
        const minPrice = Math.min(...stock.history, Math.max(0, stock.price - 10));
        const range = maxPrice - minPrice || 1;

        // Fill path
        this.ctx.beginPath();
        const stepX = w / (stock.history.length - 1);

        this.ctx.moveTo(x, y + h); // Bottom left

        stock.history.forEach((price, i) => {
            const px = x + i * stepX;
            const py = y + h - ((price - minPrice) / range) * h;
            this.ctx.lineTo(px, py);
        });

        this.ctx.lineTo(x + w, y + h); // Bottom right
        this.ctx.closePath();

        // Gradient fill
        const grad = this.ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, "rgba(0, 255, 0, 0.2)");
        grad.addColorStop(1, "rgba(0, 255, 0, 0)");
        this.ctx.fillStyle = grad;
        this.ctx.fill();

        // Stroke line
        this.ctx.beginPath();
        stock.history.forEach((price, i) => {
            const px = x + i * stepX;
            const py = y + h - ((price - minPrice) / range) * h;
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        });
        this.ctx.stroke();

         // Label
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillText(`${stock.name} (${stock.symbol})`, x + 10, y + 20);
    }

    drawTicker(_x: number, y: number) {
        const fullText = this.engine.news.join("   +++   ") + "   +++   ";
        const textWidth = this.ctx.measureText(fullText).width;

        // Reset offset if scrolled past
        if (this.tickerOffset < -textWidth) {
            this.tickerOffset = this.width;
        }

        // Start from right side initially if offset is 0?
        // Actually tickerOffset decrements.
        if (this.tickerOffset === 0) this.tickerOffset = this.width;

        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, y, this.width, 30);
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillText(fullText, this.tickerOffset, y + 4);

        // Draw second copy for loop
        if (this.tickerOffset < 0) {
             this.ctx.fillText(fullText, this.tickerOffset + textWidth + 100, y + 4);
        }
    }

    drawHelp() {
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.95)";
        this.ctx.fillRect(50, 50, this.width - 100, this.height - 100);
        this.ctx.strokeStyle = "#00ff00";
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(50, 50, this.width - 100, this.height - 100);

        this.ctx.fillStyle = "#00ff00";
        this.ctx.textAlign = "center";
        this.ctx.font = '40px "VT323", monospace';
        this.ctx.fillText("NEON BROKER 99 - MANUAL", this.width / 2, 120);

        this.ctx.font = '24px "VT323", monospace';
        this.ctx.textAlign = "left";
        const startX = 100;
        let startY = 180;
        const line = 35;

        this.ctx.fillText("GOAL: Pay off your DEBT before TIME runs out.", startX, startY);
        startY += line * 2;

        this.ctx.fillText("CONTROLS:", startX, startY);
        startY += line;
        this.ctx.fillText("  [ARROW UP/DOWN] : Select Stock", startX, startY);
        startY += line;
        this.ctx.fillText("  [B]             : BUY 10 Shares (or Cover Short)", startX, startY);
        startY += line;
        this.ctx.fillText("  [S]             : SELL 10 Shares (or Go Short)", startX, startY);
        startY += line;
        this.ctx.fillText("  [D]             : Pay $1000 towards DEBT", startX, startY);
        startY += line;
        this.ctx.fillText("  [SPACE]         : PANIC BUTTON (Freeze Market for 5s)", startX, startY);
        startY += line;
        this.ctx.fillText("  [TAB]           : Access DARK WEB (Insider Info)", startX, startY);
        startY += line * 2;

        this.ctx.fillText("TIPS:", startX, startY);
        startY += line;
        this.ctx.fillText("- Buy Low, Sell High.", startX, startY);
        startY += line;
        this.ctx.fillText("- SHORT SELLING: Sell stock you don't own to profit from drops.", startX, startY);
        startY += line;
        this.ctx.fillText("- DARK WEB: Use cash to get insider tips on trends.", startX, startY);
        startY += line;
        this.ctx.fillText("- MARGIN: You can spend more than you have, up to a limit.", startX, startY);

        this.ctx.textAlign = "center";
        this.ctx.fillStyle = "#ffff00";
        this.ctx.fillText("[PRESS H TO CLOSE]", this.width / 2, this.height - 80);
        this.ctx.textAlign = "left";
    }

    drawScanlines() {
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        for (let i = 0; i < this.height; i += 4) {
            this.ctx.fillRect(0, i, this.width, 2);
        }
    }
}
