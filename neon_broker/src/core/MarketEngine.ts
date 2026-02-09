import { SoundManager } from './SoundManager';

export type Sector = 'TECH' | 'ENERGY' | 'HEAVY' | 'FINANCE';

export interface Stock {
    symbol: string;
    name: string;
    sector: Sector;
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
    level: number = 1;

    // News events
    news: string[] = [];
    newsTimer: number = 0;

    // Freeze Mechanic
    isFrozen: boolean = false;
    freezeTimer: number = 0;
    freezeCooldown: number = 0;
    readonly FREEZE_DURATION = 5;
    readonly FREEZE_COOLDOWN_DURATION = 15;

    soundManager: SoundManager;

    constructor(soundManager: SoundManager) {
        this.soundManager = soundManager;
        this.initStocks();
    }

    startLevel(level: number) {
        this.level = level;
        this.timeRemaining = 180 - (level - 1) * 10; // Less time each level
        if (this.timeRemaining < 60) this.timeRemaining = 60;

        this.isGameOver = false;
        this.gameResult = null;
        this.news = [`LEVEL ${level} START`];
        this.isFrozen = false;
        this.freezeCooldown = 0;

        // Difficulty scaling
        this.tickRate = Math.max(0.1, 0.5 - (level * 0.05)); // Faster ticks

        this.initStocks();
    }

    initStocks() {
        // More volatility at higher levels
        const vMod = 1 + (this.level * 0.2);

        this.stocks = [
            { symbol: 'NEON', name: 'Neon Corp', sector: 'TECH', price: 100, volatility: 2 * vMod, history: [], trend: 0.5 },
            { symbol: 'CYBR', name: 'Cyber Sys', sector: 'TECH', price: 50, volatility: 5 * vMod, history: [], trend: -0.2 },
            { symbol: 'DATA', name: 'Data Link', sector: 'TECH', price: 200, volatility: 1 * vMod, history: [], trend: 0.1 },
            { symbol: 'GRID', name: 'Grid Energy', sector: 'ENERGY', price: 75, volatility: 3 * vMod, history: [], trend: 0 },
            { symbol: 'VOID', name: 'Void Ind', sector: 'HEAVY', price: 10, volatility: 8 * vMod, history: [], trend: -0.5 }
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
            this.soundManager.playError();
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
            this.soundManager.playLevelUp();
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
        interface NewsEvent {
            text: string;
            impact: number;
            symbol?: string;
            sector?: Sector;
        }

        const events: NewsEvent[] = [
            { text: "Market Crash Imminent!", impact: -5 },
            { text: "Neon Corp announces record profits!", impact: 5, symbol: 'NEON' },
            { text: "Cyber Sys hacked!", impact: -10, symbol: 'CYBR' },
            { text: "New energy source discovered.", impact: 3, symbol: 'GRID' },
            { text: "Void Ind CEO arrested.", impact: -5, symbol: 'VOID' },
            { text: "Tech Bubble bursts!", impact: -8, sector: 'TECH' },
            { text: "Energy crisis looming.", impact: 4, sector: 'ENERGY' }, // Prices go up in crisis? or down? Usually energy prices go up.
            { text: "Heavy Industry subsidies approved.", impact: 6, sector: 'HEAVY' }
        ];

        const event = events[Math.floor(Math.random() * events.length)];
        this.news.unshift(event.text);
        if (this.news.length > 5) this.news.pop();

        this.soundManager.playNewsAlert();

        if (event.symbol) {
            const s = this.stocks.find(st => st.symbol === event.symbol);
            if (s) {
                s.price += event.impact;
                s.price = Math.max(0.1, s.price);
            }
        } else if (event.sector) {
            this.stocks.filter(st => st.sector === event.sector).forEach(s => {
                s.price += event.impact;
                s.price = Math.max(0.1, s.price);
            });
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
            this.soundManager.playPanic();
        } else {
            // Play error if cooldown
            if(this.freezeCooldown > 0) this.soundManager.playError();
        }
    }
}
