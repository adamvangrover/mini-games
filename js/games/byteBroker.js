import SoundManager from '../core/SoundManager.js';

export default class ByteBroker {
    constructor() {
        this.soundManager = SoundManager.getInstance();
        this.container = null;
        this.isActive = false;

        // Game State
        this.cash = 10000;
        this.portfolio = {}; // { ticker: { shares: 0, avgCost: 0 } }
        this.stocks = [];
        this.selectedStockId = null;
        this.marketTrend = 0;
        this.tickTimer = 0;
        this.tickRate = 1.0; // Seconds per tick

        // Visuals
        this.chartCanvas = null;
        this.chartCtx = null;

        this.resizeChart = this.resizeChart.bind(this);
    }

    async init(container) {
        this.container = container;
        this.isActive = true;
        this.cash = 10000;
        this.stocks = [];
        this.portfolio = {};

        // Load some dummy stocks if empty? No, wait for user input.
        // Or maybe add a "Tutorial.txt" stock by default.
        this.addStock({
            name: "Tutorial.txt",
            size: 1024,
            type: "text/plain",
            content: "Welcome to Byte Broker",
            seed: 12345
        });

        this.render();
        this.bindEvents();
        this.gameLoop = requestAnimationFrame((t) => this.update(t));
    }

    render() {
        this.container.innerHTML = `
            <div class="flex flex-col h-full bg-slate-900 text-white font-mono overflow-hidden relative">
                <!-- Header -->
                <div class="flex justify-between items-center p-4 bg-slate-800 border-b border-fuchsia-900 z-10">
                    <div class="flex items-center gap-4">
                        <i class="fas fa-chart-line text-fuchsia-400 text-2xl"></i>
                        <div>
                            <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">BYTE BROKER</h1>
                            <span class="text-xs text-slate-400">MARKET STATUS: OPEN</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs text-slate-400">AVAILABLE CASH</div>
                        <div class="text-2xl font-bold text-green-400">$<span id="bb-cash">10,000.00</span></div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="flex flex-1 overflow-hidden relative">

                    <!-- Left: Stock List -->
                    <div class="w-1/3 bg-slate-900/90 border-r border-slate-700 flex flex-col z-10">
                        <div class="p-2 bg-slate-800 text-xs font-bold text-slate-400 flex justify-between">
                            <span>TICKER</span>
                            <span>PRICE</span>
                        </div>
                        <div id="bb-stock-list" class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            <!-- Stock Items Injected Here -->
                            <div class="text-center text-slate-500 mt-10 text-sm p-4">
                                Drag & Drop files anywhere to IPO new stocks.
                            </div>
                        </div>
                    </div>

                    <!-- Right: Detail View -->
                    <div class="flex-1 flex flex-col bg-slate-900 relative z-10">
                        <!-- Chart Area -->
                        <div class="flex-1 bg-black relative border-b border-slate-700">
                             <canvas id="bb-chart" class="w-full h-full"></canvas>
                             <div id="bb-chart-overlay" class="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div class="text-slate-600 font-bold text-4xl opacity-20 select-none">SELECT A STOCK</div>
                             </div>
                        </div>

                        <!-- Trading Desk -->
                        <div class="h-48 bg-slate-800 p-4 flex gap-4">
                            <!-- Info -->
                            <div class="w-1/3 border-r border-slate-700 pr-4">
                                <h2 id="bb-stock-name" class="text-xl font-bold text-white mb-1">--</h2>
                                <div class="text-xs text-slate-400 mb-2" id="bb-stock-sector">SECTOR: --</div>
                                <div class="grid grid-cols-2 gap-2 text-sm">
                                    <div class="text-slate-400">Volatility</div>
                                    <div class="text-right text-white" id="bb-stock-vol">--</div>
                                    <div class="text-slate-400">Owned</div>
                                    <div class="text-right text-white" id="bb-stock-owned">0</div>
                                </div>
                            </div>

                            <!-- Controls -->
                            <div class="flex-1 flex flex-col justify-center gap-4">
                                <div class="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-700">
                                    <span class="text-slate-400 text-xs">CURRENT PRICE</span>
                                    <span class="text-2xl font-bold text-white" id="bb-current-price">--</span>
                                </div>
                                <div class="flex gap-2">
                                    <button id="bb-btn-buy" class="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded transition-colors">
                                        BUY
                                    </button>
                                    <button id="bb-btn-sell" class="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded transition-colors">
                                        SELL
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Drag & Drop Overlay -->
                    <div id="bb-drop-zone" class="absolute inset-0 bg-fuchsia-900/80 backdrop-blur-sm z-50 hidden flex flex-col items-center justify-center border-4 border-dashed border-white m-4 rounded-xl">
                        <i class="fas fa-file-import text-6xl text-white mb-4 animate-bounce"></i>
                        <h2 class="text-3xl font-bold text-white">DROP FILE TO IPO</h2>
                        <p class="text-fuchsia-200 mt-2">Analyze data & generate stock</p>
                    </div>
                </div>

                <!-- Hidden Input for click/test support -->
                <input type="file" id="bb-file-input" class="hidden">
            </div>
        `;

        this.chartCanvas = this.container.querySelector('#bb-chart');
        this.resizeChart();
        window.addEventListener('resize', this.resizeChart);
    }

    resizeChart() {
        if (!this.chartCanvas) return;
        const parent = this.chartCanvas.parentElement;
        this.chartCanvas.width = parent.clientWidth;
        this.chartCanvas.height = parent.clientHeight;
        this.chartCtx = this.chartCanvas.getContext('2d');
    }

    bindEvents() {
        // Drag & Drop
        const dropZone = this.container;
        const overlay = this.container.querySelector('#bb-drop-zone');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        dropZone.addEventListener('dragenter', () => overlay.classList.remove('hidden'));
        dropZone.addEventListener('dragleave', (e) => {
            if (e.target === overlay) overlay.classList.add('hidden');
        });
        dropZone.addEventListener('drop', (e) => {
            overlay.classList.add('hidden');
            const files = e.dataTransfer.files;
            this.handleFiles(files);
        });

        // Click to Upload fallback (Double click on list empty area or specialized button?)
        // Let's add a specialized button in the list if empty, or just global key
        // For now, let's just allow clicking the "Drag & Drop" text
        const helpText = this.container.querySelector('#bb-stock-list .text-center');
        if (helpText) {
            helpText.style.cursor = 'pointer';
            helpText.onclick = () => document.getElementById('bb-file-input').click();
        }

        document.getElementById('bb-file-input').addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Buttons
        document.getElementById('bb-btn-buy').onclick = () => this.trade('buy');
        document.getElementById('bb-btn-sell').onclick = () => this.trade('sell');
    }

    handleFiles(files) {
        Array.from(files).forEach(file => {
            this.processFile(file);
        });
    }

    async processFile(file) {
        // Basic Analysis
        const name = file.name;
        const size = file.size;
        const type = file.type || 'unknown';

        // Read sample for entropy/hash
        // We only read first 4KB + Last 4KB to save memory
        const reader = new FileReader();
        const blob = file.slice(0, 4096);

        reader.onload = (e) => {
            const buffer = e.target.result;
            const content = new Uint8Array(buffer);

            // Calculate pseudo-hash & entropy
            let hash = 0;
            const freq = new Array(256).fill(0);

            for (let i = 0; i < content.length; i++) {
                const byte = content[i];
                hash = ((hash << 5) - hash) + byte;
                hash |= 0;
                freq[byte]++;
            }

            // Simple entropy calc
            let entropy = 0;
            const len = content.length;
            for (let i = 0; i < 256; i++) {
                if (freq[i] > 0) {
                    const p = freq[i] / len;
                    entropy -= p * Math.log2(p);
                }
            }
            // Normalize entropy (0-8) -> Volatility (0.01 - 0.20)
            // High entropy (compressed/random) = High Volatility
            const volatility = 0.01 + (entropy / 8) * 0.15;

            // Generate Ticker
            // First 3 chars of name + random char from hash
            const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            const ticker = (cleanName.substring(0, 3) + String.fromCharCode(65 + (Math.abs(hash) % 26))).substring(0, 4);

            // Sector
            let sector = 'INDUSTRIAL';
            if (type.includes('text') || name.endsWith('.txt') || name.endsWith('.md')) sector = 'TECH';
            else if (type.includes('image')) sector = 'COMMODITIES';
            else if (type.includes('audio') || type.includes('video')) sector = 'MEDIA';
            else if (name.endsWith('.js') || name.endsWith('.py') || name.endsWith('.json')) sector = 'DEFI';
            else if (type.includes('pdf')) sector = 'CORPORATE';

            // Initial Price
            // Based on size (larger is not necessarily more expensive, maybe more stable?)
            // Let's make price purely pseudo-random based on hash, scaled by size log
            let basePrice = (Math.abs(hash) % 100) + 10;
            if (size > 1000000) basePrice *= 2; // > 1MB

            this.addStock({
                id: Date.now() + Math.random(),
                seed: Math.abs(hash),
                ticker,
                name,
                sector,
                volatility,
                price: basePrice,
                // History will be generated in addStock
            });

            this.soundManager.playSound('ui_unlock');
        };

        reader.readAsArrayBuffer(blob);
    }

    addStock(stockData) {
        // Fallback for tutorial stock which skips file reader
        if (!stockData.ticker) stockData.ticker = "TUT";
        if (!stockData.volatility) stockData.volatility = 0.05;
        if (!stockData.price) stockData.price = 50.00;
        if (!stockData.seed) stockData.seed = 12345;

        // Generate History if missing
        if (!stockData.history) {
            stockData.history = [];
            let tempPrice = stockData.price;
            // Generate 50 points of history backwards
            for(let i=0; i<50; i++) {
                stockData.history.unshift(tempPrice);
                // Reverse random walk
                const rnd = this.seededRandom(stockData);
                const change = (rnd - 0.5) * stockData.volatility * tempPrice;
                tempPrice -= change;
                if (tempPrice < 0.1) tempPrice = 0.1;
            }
        }

        // Dedupe check
        if (this.stocks.find(s => s.name === stockData.name)) {
            // Shake effect or toast?
            return;
        }

        const stock = {
            ...stockData,
            change: 0
        };

        this.stocks.push(stock);

        // Auto-select if first
        if (this.stocks.length === 1) {
            this.selectStock(stock.id);
        }

        this.renderList();
    }

    selectStock(id) {
        this.selectedStockId = id;
        this.renderList(); // Update active state
        this.renderDetail();
    }

    trade(type) {
        if (!this.selectedStockId) return;
        const stock = this.stocks.find(s => s.id === this.selectedStockId);
        if (!stock) return;

        const currentPrice = stock.price;

        if (type === 'buy') {
            // Buy 1 share (or max affordable up to 10? simple: 1 share per click for spam fun)
            // Let's do 10 shares per click for better feeling
            const amount = 10;
            const cost = currentPrice * amount;
            if (this.cash >= cost) {
                this.cash -= cost;
                if (!this.portfolio[stock.ticker]) {
                    this.portfolio[stock.ticker] = { shares: 0, avgCost: 0 };
                }
                const p = this.portfolio[stock.ticker];
                // Avg Cost calc
                const totalVal = (p.shares * p.avgCost) + cost;
                p.shares += amount;
                p.avgCost = totalVal / p.shares;

                this.soundManager.playSound('coin');
            } else {
                this.soundManager.playSound('error');
            }
        } else if (type === 'sell') {
            const p = this.portfolio[stock.ticker];
            if (p && p.shares > 0) {
                const amount = Math.min(10, p.shares);
                const revenue = currentPrice * amount;
                this.cash += revenue;
                p.shares -= amount;
                this.soundManager.playSound('click'); // Cash register sound would be better
            } else {
                this.soundManager.playSound('error');
            }
        }

        this.updateHeader();
        this.renderDetail(); // Update owned count
    }

    update(timestamp) {
        if (!this.isActive) return;

        // Ticker Logic
        if (timestamp - this.tickTimer > (this.tickRate * 1000)) {
            this.tickTimer = timestamp;
            this.tickMarket();
        }

        this.drawChart();
        this.gameLoop = requestAnimationFrame((t) => this.update(t));
    }

    tickMarket() {
        this.marketTrend = (Math.random() * 0.2) - 0.1; // Slight shift (Global trend still random to keep game alive)

        this.stocks.forEach(stock => {
            const vol = stock.volatility;
            const rnd = this.seededRandom(stock);
            // Random walk: -1 to 1 * volatility * price
            const change = (rnd - 0.5 + (this.marketTrend * 0.5)) * vol * stock.price;
            stock.price += change;

            // Ensure positive price
            if (stock.price < 0.1) stock.price = 0.1;

            // Update History
            stock.history.push(stock.price);
            if (stock.history.length > 50) stock.history.shift();

            // Store % change for UI
            stock.change = (change / (stock.price - change)) * 100;
        });

        this.renderList();
        this.renderDetail();
        this.updateHeader();
    }

    seededRandom(stock) {
        // Simple Linear Congruential Generator
        stock.seed = (stock.seed * 9301 + 49297) % 233280;
        return stock.seed / 233280;
    }

    escapeHTML(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    updateHeader() {
        const cashEl = document.getElementById('bb-cash');
        if (cashEl) cashEl.textContent = this.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    renderList() {
        const list = document.getElementById('bb-stock-list');
        if (!list) return;

        // Helper to find existing item or create new
        // Full re-render is easier for now, list won't be huge
        list.innerHTML = '';

        if (this.stocks.length === 0) {
             list.innerHTML = `
                <div class="text-center text-slate-500 mt-10 text-sm p-4 cursor-pointer" onclick="document.getElementById('bb-file-input').click()">
                    Drag & Drop files or Click Here to IPO.
                </div>
             `;
             return;
        }

        this.stocks.forEach(stock => {
            const el = document.createElement('div');
            const isSelected = stock.id === this.selectedStockId;
            const isUp = stock.change >= 0;
            const colorClass = isUp ? 'text-green-400' : 'text-red-400';
            const bgClass = isSelected ? 'bg-slate-700 border-l-4 border-fuchsia-500' : 'bg-slate-800 hover:bg-slate-700 border-l-4 border-transparent';

            el.className = `p-3 rounded cursor-pointer transition-all ${bgClass} flex justify-between items-center`;
            el.onclick = () => this.selectStock(stock.id);
            el.innerHTML = `
                <div>
                    <div class="font-bold text-white">${stock.ticker}</div>
                    <div class="text-[10px] text-slate-400 truncate w-20">${this.escapeHTML(stock.name)}</div>
                </div>
                <div class="text-right">
                    <div class="font-mono text-white">$${stock.price.toFixed(2)}</div>
                    <div class="text-[10px] ${colorClass}">${isUp ? '▲' : '▼'} ${Math.abs(stock.change).toFixed(2)}%</div>
                </div>
            `;
            list.appendChild(el);
        });
    }

    renderDetail() {
        if (!this.selectedStockId) {
             document.getElementById('bb-chart-overlay')?.classList.remove('hidden');
             return;
        }
        document.getElementById('bb-chart-overlay')?.classList.add('hidden');

        const stock = this.stocks.find(s => s.id === this.selectedStockId);
        if (!stock) return;

        document.getElementById('bb-stock-name').textContent = stock.name;
        document.getElementById('bb-stock-sector').textContent = `SECTOR: ${stock.sector}`;
        document.getElementById('bb-stock-vol').textContent = (stock.volatility * 100).toFixed(1) + '%';

        const owned = this.portfolio[stock.ticker]?.shares || 0;
        document.getElementById('bb-stock-owned').textContent = owned;

        const priceEl = document.getElementById('bb-current-price');
        priceEl.textContent = `$${stock.price.toFixed(2)}`;
        priceEl.className = `text-2xl font-bold ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`;

        // Buttons state
        document.getElementById('bb-btn-buy').disabled = this.cash < stock.price * 10;
        document.getElementById('bb-btn-sell').disabled = owned <= 0;
    }

    drawChart() {
        if (!this.chartCtx || !this.selectedStockId) {
            // Clear
            if (this.chartCtx) this.chartCtx.clearRect(0, 0, this.chartCanvas.width, this.chartCanvas.height);
            return;
        }

        const stock = this.stocks.find(s => s.id === this.selectedStockId);
        if (!stock) return;

        const ctx = this.chartCtx;
        const w = this.chartCanvas.width;
        const h = this.chartCanvas.height;
        const history = stock.history;

        ctx.clearRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=1; i<4; i++) {
            ctx.moveTo(0, h * (i/4));
            ctx.lineTo(w, h * (i/4));
        }
        ctx.stroke();

        // Line
        const min = Math.min(...history) * 0.9;
        const max = Math.max(...history) * 1.1;
        const range = max - min;

        ctx.strokeStyle = stock.change >= 0 ? '#4ade80' : '#f87171'; // Green or Red
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();

        const step = w / (history.length - 1);
        history.forEach((val, i) => {
            const x = i * step;
            const y = h - ((val - min) / range) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Fill Gradient
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, stock.change >= 0 ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fillStyle = grad;
        ctx.fill();
    }

    shutdown() {
        this.isActive = false;
        if (this.gameLoop) cancelAnimationFrame(this.gameLoop);
        this.container.innerHTML = '';
        window.removeEventListener('resize', this.resizeChart);
    }
}
