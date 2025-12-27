import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class ClickerGame {
    constructor() {
        this.money = 0;
        this.clickPower = 1;
        this.autoClickers = 0;
        this.autoClickRate = 0;
        this.prestigeMultiplier = 1;
        this.upgradeCost = 10;
        this.autoClickerCost = 50;

        // Internal accumulator for smooth fractional money
        this.moneyAccumulator = 0.0;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
    }

    init(container) {
        // Load save state
        const config = this.saveSystem.getGameConfig('clicker-game') || {};
        this.money = config.money || 0;
        this.moneyAccumulator = this.money; // Sync
        this.clickPower = config.clickPower || 1;
        this.autoClickers = config.autoClickers || 0;
        this.prestigeMultiplier = config.prestigeMultiplier || 1;
        this.upgradeCost = config.upgradeCost || 10;
        this.autoClickerCost = config.autoClickerCost || 50;
        this.updateAutoRate();

        // Inject UI if missing
        let moneyEl = container.querySelector('#money');
        if (!moneyEl) {
            container.innerHTML = `
                <div class="text-center relative w-full max-w-4xl mx-auto p-4">
                    <h2 class="text-3xl font-bold mb-4 text-fuchsia-500 font-[Poppins]">💰 Clicker Tycoon</h2>

                    <div class="bg-slate-800/80 p-6 rounded-xl border border-slate-600 mb-8 shadow-lg">
                        <p class="text-xl mb-2 text-slate-300">Total Balance</p>
                        <p class="text-5xl font-mono text-green-400 font-bold tracking-wider">$<span id="money">0</span></p>
                    </div>

                    <button id="click-btn" class="w-full md:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-6 px-12 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.4)] transform active:scale-95 transition-all text-3xl mb-12 select-none border-4 border-emerald-400/30">
                        💵 GET MONEY
                    </button>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
                        <button id="upgrade-btn" class="group bg-slate-700 hover:bg-slate-600 p-6 rounded-lg border border-slate-600 transition-all hover:border-cyan-400 relative overflow-hidden">
                            <div class="absolute inset-0 bg-cyan-400/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                            <div class="relative z-10">
                                <div class="font-bold text-cyan-400 text-xl mb-1">⚡ Upgrade Click</div>
                                <div class="text-sm text-slate-400">Current Power: <span id="click-power" class="text-white font-mono">1</span></div>
                                <div class="mt-2 text-yellow-400 font-bold">Cost: $<span id="upgrade-cost">10</span></div>
                            </div>
                        </button>

                        <button id="auto-btn" class="group bg-slate-700 hover:bg-slate-600 p-6 rounded-lg border border-slate-600 transition-all hover:border-purple-400 relative overflow-hidden">
                            <div class="absolute inset-0 bg-purple-400/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                            <div class="relative z-10">
                                <div class="font-bold text-purple-400 text-xl mb-1">🤖 Hire Auto-Bot</div>
                                <div class="text-sm text-slate-400">Rate: <span id="auto-rate" class="text-white font-mono">0</span>/sec</div>
                                <div class="mt-2 text-yellow-400 font-bold">Cost: $<span id="autoclicker-cost">50</span></div>
                            </div>
                        </button>
                    </div>

                    <div id="prestige-section" class="hidden border-t border-slate-700 pt-6">
                         <button id="prestige-btn" class="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-bold py-3 px-8 rounded shadow-lg border border-yellow-400/50 mb-4 animate-pulse">
                            🔁 PRESTIGE (Reset for x2 Multiplier)
                        </button>
                        <p class="text-slate-400 text-sm">Current Multiplier: <span id="prestige-multiplier" class="text-yellow-400 font-bold">1x</span></p>
                    </div>

                    <button class="back-btn mt-12 px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors">Back to Menu</button>
                </div>
            `;

            container.querySelector('.back-btn').addEventListener('click', () => {
                 if (window.miniGameHub) window.miniGameHub.goBack();
            });
        }

        this.container = container;

        // Bind Listeners
        const clickBtn = container.querySelector('#click-btn');
        clickBtn.onclick = (e) => this.clickMoney(e);
        // Prevent double-tap zoom on mobile
        clickBtn.addEventListener('touchstart', (e) => {
             e.preventDefault(); // Stop mouse emulation
             // Manually trigger logic
             const touch = e.touches[0];
             // Create fake event object for compatibility
             this.clickMoney({ clientX: touch.clientX, clientY: touch.clientY });
        }, { passive: false });

        container.querySelector('#upgrade-btn').onclick = () => this.buyUpgrade();
        container.querySelector('#auto-btn').onclick = () => this.buyAutoClicker();
        container.querySelector('#prestige-btn').onclick = () => this.prestige();

        this.updateUI();
    }

    shutdown() {
        this.saveSystem.setGameConfig('clicker-game', {
            money: this.money,
            clickPower: this.clickPower,
            autoClickers: this.autoClickers,
            prestigeMultiplier: this.prestigeMultiplier,
            upgradeCost: this.upgradeCost,
            autoClickerCost: this.autoClickerCost
        });

        if (this.container) {
            const buttons = this.container.querySelectorAll('button');
            buttons.forEach(b => b.onclick = null);
        }
    }

    update(dt) {
        if (this.autoClickRate > 0) {
            const income = this.autoClickRate * dt;
            this.moneyAccumulator += income;
            this.money = Math.floor(this.moneyAccumulator);
            this.updateUI();
        }
    }

    clickMoney(e) {
        const gain = this.clickPower * this.prestigeMultiplier;
        this.moneyAccumulator += gain;
        this.money = Math.floor(this.moneyAccumulator);

        this.soundManager.playSound('click');
        this.updateUI();

        // Visual effect
        let x = e.clientX;
        let y = e.clientY;

        // Fallback for non-mouse events (e.g. keypress if we add it) or weird touches
        if (!x || !y) {
             const rect = document.getElementById('click-btn').getBoundingClientRect();
             x = rect.left + rect.width / 2;
             y = rect.top + rect.height / 2;
        }

        this.spawnFloatingText(x, y, `+$${gain}`);

        // Juice: Button scale
        const btn = document.getElementById('click-btn');
        btn.style.transform = "scale(0.95)";
        setTimeout(() => btn.style.transform = "scale(1)", 50);
    }

    buyUpgrade() {
        if (this.money >= this.upgradeCost) {
            this.moneyAccumulator -= this.upgradeCost;
            this.money = Math.floor(this.moneyAccumulator);

            this.clickPower += 1;
            this.upgradeCost = Math.floor(this.upgradeCost * 1.5);
            this.soundManager.playSound('score');
            this.updateUI();
        } else {
             this.soundManager.playTone(150, 'sawtooth', 0.1);
        }
    }

    buyAutoClicker() {
        if (this.money >= this.autoClickerCost) {
            this.moneyAccumulator -= this.autoClickerCost;
            this.money = Math.floor(this.moneyAccumulator);

            this.autoClickers++;
            this.updateAutoRate();
            this.autoClickerCost = Math.floor(this.autoClickerCost * 1.7);
            this.soundManager.playSound('score');
            this.updateUI();
        } else {
             this.soundManager.playTone(150, 'sawtooth', 0.1);
        }
    }

    prestige() {
        if (this.money >= 1000) {
            this.moneyAccumulator = 0;
            this.money = 0;
            this.clickPower = 1;
            this.autoClickers = 0;
            this.updateAutoRate();
            this.upgradeCost = 10;
            this.autoClickerCost = 50;
            this.prestigeMultiplier *= 2;
            this.soundManager.playSound('explosion');
            this.updateUI();
        }
    }

    spawnFloatingText(x, y, text) {
        const el = document.createElement('div');
        el.innerText = text;
        el.style.position = 'fixed';
        // Add random jitter
        el.style.left = (x + (Math.random() * 40 - 20)) + 'px';
        el.style.top = (y + (Math.random() * 40 - 20)) + 'px';
        el.style.color = '#10b981';
        el.style.fontFamily = 'monospace';
        el.style.fontWeight = 'bold';
        el.style.fontSize = '24px';
        el.style.pointerEvents = 'none';
        el.style.transition = 'all 0.8s ease-out';
        el.style.zIndex = '1000';
        el.style.textShadow = '0 0 5px rgba(0,0,0,0.5)';
        document.body.appendChild(el);

        requestAnimationFrame(() => {
            el.style.transform = 'translateY(-100px) scale(1.2)';
            el.style.opacity = 0;
        });

        setTimeout(() => el.remove(), 800);
    }

    updateAutoRate() {
        this.autoClickRate = this.autoClickers * this.prestigeMultiplier;
    }

    updateUI() {
        if (!this.container) return;

        // Helper to format large numbers (e.g. 1.2k) if needed, but for now simple localestring
        const fmt = (n) => n.toLocaleString();

        const setText = (id, val) => {
            const el = this.container.querySelector('#' + id);
            if(el) el.textContent = val;
        };

        setText("money", fmt(Math.floor(this.money)));
        setText("click-power", fmt(this.clickPower));
        setText("auto-rate", fmt(this.autoClickRate));
        setText("upgrade-cost", fmt(this.upgradeCost));
        setText("autoclicker-cost", fmt(this.autoClickerCost));
        setText("prestige-multiplier", this.prestigeMultiplier + "x");

        const pSection = this.container.querySelector("#prestige-section");
        if (pSection) {
            if (this.money >= 1000 || this.prestigeMultiplier > 1) {
                pSection.classList.remove("hidden");
            } else {
                pSection.classList.add("hidden");
            }
        }

        // Disable buttons visually if can't afford
        const btnOpacity = (canAfford, id) => {
            const btn = this.container.querySelector(id);
            if(btn) {
                if(canAfford) {
                    btn.classList.remove('opacity-50', 'cursor-not-allowed');
                } else {
                    btn.classList.add('opacity-50', 'cursor-not-allowed');
                }
            }
        }

        btnOpacity(this.money >= this.upgradeCost, '#upgrade-btn');
        btnOpacity(this.money >= this.autoClickerCost, '#auto-btn');
    }
}
