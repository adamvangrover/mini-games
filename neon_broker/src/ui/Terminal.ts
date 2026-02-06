import { MarketEngine, Stock } from '../core/MarketEngine';
import { Player } from '../core/Player';

export class Terminal {
    engine: MarketEngine;
    player: Player;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;

    selectedStockIndex: number = 0;

    // Message log
    messages: string[] = [];

    constructor(engine: MarketEngine, player: Player, ctx: CanvasRenderingContext2D, width: number, height: number) {
        this.engine = engine;
        this.player = player;
        this.ctx = ctx;
        this.width = width;
        this.height = height;

        // Handle input
        window.addEventListener('keydown', (e) => {
            if (this.engine.isGameOver) return; // Disable input on game over

            if (e.key === 'ArrowUp') {
                this.selectedStockIndex = (this.selectedStockIndex - 1 + this.engine.stocks.length) % this.engine.stocks.length;
            }
            if (e.key === 'ArrowDown') {
                this.selectedStockIndex = (this.selectedStockIndex + 1) % this.engine.stocks.length;
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

    handleBuy() {
        if (this.engine.isFrozen) {
            this.log("CANNOT TRADE WHILE FROZEN");
            return;
        }
        const stock = this.engine.stocks[this.selectedStockIndex];
        const quantity = 10;
        if (this.player.buy(stock.symbol, stock.price, quantity)) {
            this.log(`BOUGHT ${quantity} ${stock.symbol} @ $${stock.price.toFixed(2)}`);
        } else {
            this.log("INSUFFICIENT FUNDS");
        }
    }

    handleSell() {
        if (this.engine.isFrozen) {
            this.log("CANNOT TRADE WHILE FROZEN");
            return;
        }
        const stock = this.engine.stocks[this.selectedStockIndex];
        const quantity = 10;
        if (this.player.sell(stock.symbol, stock.price, quantity)) {
             this.log(`SOLD ${quantity} ${stock.symbol} @ $${stock.price.toFixed(2)}`);
        } else {
             this.log("INSUFFICIENT SHARES");
        }
    }

    handlePayDebt() {
        const amount = 1000;
        if (this.player.debt > 0) {
            if (this.player.payDebt(amount)) {
                this.log(`PAID $${amount} DEBT`);
                this.engine.checkWin(this.player.debt);
            } else {
                this.log("INSUFFICIENT FUNDS TO PAY DEBT");
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


        // Header
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillText("MARKET STATUS", 40, 70);
        this.ctx.fillRect(40, 95, this.width - 80, 2);

        // Draw Stocks List
        const listX = 40;
        const listY = 110;
        const lineHeight = 35;

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
            this.ctx.fillText(`${prefix}${stock.symbol.padEnd(6)} $${stock.price.toFixed(2).padStart(8)} [Own: ${qty}]`, listX, listY + index * lineHeight);

            const trendChar = stock.history.length > 1 && stock.history[stock.history.length-1] > stock.history[stock.history.length-2] ? '▲' : '▼';
            this.ctx.fillText(trendChar, listX + 500, listY + index * lineHeight);
        });

        // Draw Chart
        if (this.width > 600) {
            this.drawChart(this.engine.stocks[this.selectedStockIndex], 600, 110, this.width - 650, 300);
        }

        // Draw Controls Hint
        this.ctx.fillStyle = '#00aa00';
        this.ctx.fillText("[UP/DOWN] Select  [B] Buy 10  [S] Sell 10  [D] Pay Debt ($1k)  [SPACE] Panic", 40, this.height - 40);

        // Draw Messages
        this.ctx.fillStyle = '#ffff00';
        this.messages.forEach((msg, i) => {
             this.ctx.fillText(`> ${msg}`, 40, this.height - 80 - i * 30);
        });

        // News
        this.drawNews(40, 450);
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
        } else {
            this.ctx.fillStyle = 'red';
            this.ctx.fillText("TIME UP. THE SHARKS ARE HERE.", this.width/2, this.height/2);
            this.ctx.font = '30px "VT323", monospace';
            this.ctx.fillText(`DEBT REMAINING: $${this.player.debt.toFixed(2)}`, this.width/2, this.height/2 + 50);
        }
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
    }

    drawChart(stock: Stock, x: number, y: number, w: number, h: number) {
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, w, h);

        if (stock.history.length < 2) return;

        const maxPrice = Math.max(...stock.history, stock.price + 10);
        const minPrice = Math.min(...stock.history, Math.max(0, stock.price - 10));
        const range = maxPrice - minPrice || 1;

        this.ctx.beginPath();
        const stepX = w / (stock.history.length - 1);

        stock.history.forEach((price, i) => {
            const px = x + i * stepX;
            const py = y + h - ((price - minPrice) / range) * h;
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        });
        this.ctx.stroke();

         // Label
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillText(`${stock.name} (${stock.symbol})`, x, y - 30);
    }

    drawNews(x: number, y: number) {
        this.ctx.fillStyle = '#00aa00';
        this.ctx.fillText("NEWS FEED:", x, y);
        this.engine.news.forEach((news, i) => {
            this.ctx.fillStyle = `rgba(0, 255, 0, ${1 - i * 0.2})`;
            this.ctx.fillText(`> ${news}`, x, y + 30 + i * 25);
        });
    }

    drawScanlines() {
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        for (let i = 0; i < this.height; i += 4) {
            this.ctx.fillRect(0, i, this.width, 2);
        }
    }
}
