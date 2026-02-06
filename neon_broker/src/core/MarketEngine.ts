export interface Stock {
    symbol: string;
    name: string;
    price: number;
    volatility: number;
    history: number[];
    trend: number;
}

export class MarketEngine {
    stocks: Stock[] = [];
    tickTimer: number = 0;
    tickRate: number = 0.5; // Update every 0.5 seconds

    // Game State
    timeRemaining: number = 180; // 3 minutes
    isGameOver: boolean = false;
    gameResult: 'WIN' | 'LOSE' | null = null;

    // News events
    news: string[] = [];
    newsTimer: number = 0;

    // Freeze Mechanic
    isFrozen: boolean = false;
    freezeTimer: number = 0;
    freezeCooldown: number = 0;
    readonly FREEZE_DURATION = 5;
    readonly FREEZE_COOLDOWN_DURATION = 15;

    constructor() {
        this.initStocks();
    }

    initStocks() {
        this.stocks = [
            { symbol: 'NEON', name: 'Neon Corp', price: 100, volatility: 2, history: [], trend: 0.5 },
            { symbol: 'CYBR', name: 'Cyber Sys', price: 50, volatility: 5, history: [], trend: -0.2 },
            { symbol: 'DATA', name: 'Data Link', price: 200, volatility: 1, history: [], trend: 0.1 },
            { symbol: 'GRID', name: 'Grid Energy', price: 75, volatility: 3, history: [], trend: 0 },
            { symbol: 'VOID', name: 'Void Ind', price: 10, volatility: 8, history: [], trend: -0.5 }
        ];

        // Fill initial history
        this.stocks.forEach(s => {
            for(let i=0; i<40; i++) s.history.push(s.price);
        });
    }

    update(dt: number) {
        if (this.isGameOver) return;

        // Game Timer
        this.timeRemaining -= dt;
        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.isGameOver = true;
            this.gameResult = 'LOSE';
        }

        // Handle Freeze Logic
        if (this.isFrozen) {
            this.freezeTimer -= dt;
            if (this.freezeTimer <= 0) {
                this.isFrozen = false;
                this.freezeCooldown = this.FREEZE_COOLDOWN_DURATION;
            }
            return; // Market doesn't move when frozen
        }

        if (this.freezeCooldown > 0) {
            this.freezeCooldown -= dt;
        }

        // Market Logic
        this.tickTimer += dt;
        this.newsTimer += dt;

        if (this.tickTimer >= this.tickRate) {
            this.tickTimer = 0;
            this.updateStocks();
        }

        if (this.newsTimer >= 5) { // News check every 5 seconds
            this.newsTimer = 0;
            if (Math.random() < 0.3) this.generateNews();
        }
    }

    checkWin(debt: number) {
        if (debt <= 0) {
            this.isGameOver = true;
            this.gameResult = 'WIN';
        }
    }

    updateStocks() {
        this.stocks.forEach(stock => {
            // Random walk
            const noise = (Math.random() - 0.5) * 2; // -1 to 1
            const change = noise * stock.volatility + stock.trend;
            stock.price = Math.max(0.1, stock.price + change);
            stock.price = parseFloat(stock.price.toFixed(2));

            stock.history.push(stock.price);
            if (stock.history.length > 50) stock.history.shift();
        });
    }

    generateNews() {
        const events = [
            { text: "Market Crash Imminent!", impact: -5 },
            { text: "Neon Corp announces record profits!", impact: 5, symbol: 'NEON' },
            { text: "Cyber Sys hacked!", impact: -10, symbol: 'CYBR' },
            { text: "New energy source discovered.", impact: 3, symbol: 'GRID' },
            { text: "Void Ind CEO arrested.", impact: -5, symbol: 'VOID' }
        ];
        const event = events[Math.floor(Math.random() * events.length)];
        this.news.unshift(event.text);
        if (this.news.length > 5) this.news.pop();

        if (event.symbol) {
            const s = this.stocks.find(st => st.symbol === event.symbol);
            if (s) {
                s.price += event.impact;
                s.price = Math.max(0.1, s.price); // Prevent negative price
            }
        } else {
            // Global impact
             this.stocks.forEach(s => {
                 s.price += event.impact;
                 s.price = Math.max(0.1, s.price);
             });
        }
    }

    activatePanic() {
        if (!this.isFrozen && this.freezeCooldown <= 0) {
            this.isFrozen = true;
            this.freezeTimer = this.FREEZE_DURATION;
        }
    }
}
