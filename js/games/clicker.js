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
        this.autoClickTimer = 0;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
    }

    init(container) {
        // Load save state
        const config = this.saveSystem.getGameConfig('clicker-game') || {};
        this.money = config.money || 0;
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
                <div class="text-center">
                    <h2 class="text-3xl font-bold mb-4 text-fuchsia-500">💰 Clicker</h2>
                    <p class="text-xl mb-6">Money: <span id="money" class="text-green-400 font-mono">0</span> 💸</p>

                    <button id="click-btn" class="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-4 px-8 rounded-full shadow-lg transform active:scale-95 transition-all text-2xl mb-8">
                        💵 Click for Cash!
                    </button>

                    <h3 class="text-xl font-bold text-slate-300 mb-4">🛒 Store</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto mb-6">
                        <button id="upgrade-btn" class="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg border border-slate-600">
                            <div class="font-bold text-cyan-400">⚡ Upgrade Click</div>
                            <div class="text-sm text-slate-400">Cost: <span id="upgrade-cost">10</span></div>
                        </button>
                        <button id="auto-btn" class="bg-slate-700 hover:bg-slate-600 p-4 rounded-lg border border-slate-600">
                            <div class="font-bold text-purple-400">🤖 Auto-Clicker</div>
                            <div class="text-sm text-slate-400">Cost: <span id="autoclicker-cost">50</span></div>
                        </button>
                    </div>

                    <button id="prestige-btn" class="hidden bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-6 rounded shadow-lg border border-yellow-400 mb-6">
                        🔁 Prestige (Reset for Bonus!)
                    </button>

                    <div class="text-slate-400 text-sm grid grid-cols-3 gap-2 max-w-md mx-auto">
                        <p>Click Power: <span id="click-power" class="text-white">1</span></p>
                        <p>Auto/Sec: <span id="auto-rate" class="text-white">0</span></p>
                        <p>Multiplier: <span id="prestige-multiplier" class="text-white">1x</span></p>
                    </div>

                    <button class="back-btn mt-8 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded">Back</button>
                </div>
            `;

            container.querySelector('.back-btn').addEventListener('click', () => {
                 if (window.miniGameHub) window.miniGameHub.goBack();
            });
        }

        this.container = container;

        // Bind Listeners
        container.querySelector('#click-btn').onclick = (e) => this.clickMoney(e);
        container.querySelector('#upgrade-btn').onclick = () => this.buyUpgrade();
        container.querySelector('#auto-btn').onclick = () => this.buyAutoClicker();
        container.querySelector('#prestige-btn').onclick = () => this.prestige();

        this.updateUI();
    }

    shutdown() {
        this.saveSystem.saveGameConfig('clicker-game', {
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
            this.autoClickTimer += dt;
            if (this.autoClickTimer >= 1.0) {
                this.money += this.autoClickRate;
                this.autoClickTimer = 0;
                this.updateUI();
            }
        }
    }

    clickMoney(e) {
        const gain = this.clickPower * this.prestigeMultiplier;
        this.money += gain;
        this.soundManager.playSound('click');
        this.updateUI();

        // Visual effect
        if (e && e.clientX) {
             this.spawnFloatingText(e.clientX, e.clientY, `+$${gain}`);
        }
    }

    buyUpgrade() {
        if (this.money >= this.upgradeCost) {
            this.money -= this.upgradeCost;
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
            this.money -= this.autoClickerCost;
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
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.color = '#10b981';
        el.style.fontWeight = 'bold';
        el.style.pointerEvents = 'none';
        el.style.transition = 'all 1s ease-out';
        el.style.zIndex = '1000';
        document.body.appendChild(el);

        requestAnimationFrame(() => {
            el.style.transform = 'translateY(-50px)';
            el.style.opacity = 0;
        });

        setTimeout(() => el.remove(), 1000);
    }

    updateAutoRate() {
        this.autoClickRate = this.autoClickers * this.prestigeMultiplier;
    }

    updateUI() {
        if (!this.container) return;

        const setText = (id, val) => {
            const el = this.container.querySelector('#' + id);
            if(el) el.textContent = val;
        };

        setText("money", Math.floor(this.money));
        setText("click-power", this.clickPower);
        setText("auto-rate", this.autoClickRate);
        setText("upgrade-cost", this.upgradeCost);
        setText("autoclicker-cost", this.autoClickerCost);
        setText("prestige-multiplier", this.prestigeMultiplier + "x");

        const pBtn = this.container.querySelector("#prestige-btn");
        if (pBtn) {
            if (this.money >= 1000) pBtn.classList.remove("hidden");
            else pBtn.classList.add("hidden");
        }
    }
}
