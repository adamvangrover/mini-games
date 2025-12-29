import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';
import ParticleSystem from '../core/ParticleSystem.js';
import { AchievementRegistry } from '../core/AchievementRegistry.js';

export default class ClickerGame {
    constructor() {
        this.money = 0;
        this.clickPower = 1;
        this.autoClickers = 0;
        this.factories = 0;
        this.banks = 0;
        this.autoClickRate = 0;
        this.prestigeMultiplier = 1;

        // Costs
        this.upgradeCost = 10;
        this.autoClickerCost = 50;
        this.factoryCost = 500;
        this.bankCost = 2000;

        // Internal accumulator for smooth fractional money
        this.moneyAccumulator = 0.0;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.particleSystem = ParticleSystem.getInstance();

        this.bgCanvas = null;
        this.bgCtx = null;
        this.animationId = null;
    }

    init(container) {
        // Load save state
        const config = this.saveSystem.getGameConfig('clicker-game') || {};
        this.money = config.money || 0;
        this.moneyAccumulator = this.money;
        this.clickPower = config.clickPower || 1;
        this.autoClickers = config.autoClickers || 0;
        this.factories = config.factories || 0;
        this.banks = config.banks || 0;
        this.prestigeMultiplier = config.prestigeMultiplier || 1;
        this.upgradeCost = config.upgradeCost || 10;
        this.autoClickerCost = config.autoClickerCost || 50;
        this.factoryCost = config.factoryCost || 500;
        this.bankCost = config.bankCost || 2000;

        this.updateAutoRate();

        // Inject UI
        container.innerHTML = `
            <div class="relative w-full h-full min-h-screen bg-slate-900 overflow-hidden text-center select-none font-[Poppins]">
                <canvas id="idle-bg-canvas" class="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>

                <div class="relative z-10 container mx-auto p-4 flex flex-col items-center h-full overflow-y-auto custom-scrollbar pb-20">
                    <h2 class="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-500 title-glow mt-8">NEON IDLE TYCOON</h2>
                    <p class="text-slate-400 text-sm mb-8">Build your Cyberpunk Empire</p>

                    <div class="glass-panel p-6 rounded-2xl mb-8 w-full max-w-2xl transform transition-transform hover:scale-105 duration-300">
                        <p class="text-sm uppercase tracking-widest text-slate-400 mb-2">Corporate Funds</p>
                        <div class="text-6xl font-mono font-bold text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                            $<span id="money">0</span>
                        </div>
                        <div class="text-sm text-cyan-400 mt-2 font-mono">
                            <i class="fas fa-bolt"></i> <span id="auto-rate">0</span> / sec
                        </div>
                    </div>

                    <button id="click-btn" class="group relative w-64 h-64 rounded-full bg-slate-800 border-4 border-fuchsia-500 shadow-[0_0_50px_rgba(217,70,239,0.3)] mb-12 flex items-center justify-center transition-all active:scale-95 active:shadow-[0_0_20px_rgba(217,70,239,0.6)]">
                         <div class="absolute inset-0 rounded-full bg-gradient-to-br from-fuchsia-600/20 to-purple-600/20 animate-pulse"></div>
                         <i class="fas fa-hand-holding-dollar text-8xl text-white drop-shadow-lg group-hover:text-fuchsia-300 transition-colors"></i>
                         <div class="absolute -bottom-8 text-fuchsia-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">CLICK ME</div>
                    </button>

                    <div class="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <!-- Upgrades -->
                        ${this.renderUpgradeCard('upgrade-btn', 'fa-mouse-pointer', 'Cyber Click', 'click-power', 'upgrade-cost', 'cyan', 'Enhance click power')}
                        ${this.renderUpgradeCard('auto-btn', 'fa-robot', 'Auto-Bot', 'auto-count', 'autoclicker-cost', 'purple', 'Basic automation unit')}
                        ${this.renderUpgradeCard('factory-btn', 'fa-industry', 'Nano Factory', 'factory-count', 'factory-cost', 'orange', 'Mass production facility')}
                        ${this.renderUpgradeCard('bank-btn', 'fa-building-columns', 'Crypto Bank', 'bank-count', 'bank-cost', 'green', 'High-yield investments')}
                    </div>

                    <div id="prestige-section" class="hidden w-full max-w-2xl border-t border-slate-700 pt-8 mt-4">
                         <button id="prestige-btn" class="w-full bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg border border-yellow-400/50 mb-4 animate-pulse transform hover:scale-105 transition-all">
                            <i class="fas fa-redo mr-2"></i> PRESTIGE RESET (x2 Multiplier)
                        </button>
                        <p class="text-slate-400 text-sm">Current Multiplier: <span id="prestige-multiplier" class="text-yellow-400 font-bold">1x</span></p>
                    </div>

                    <button class="back-btn mt-12 mb-8 px-6 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg transition-colors border border-red-400/30">
                        <i class="fas fa-arrow-left mr-2"></i> Return to Hub
                    </button>
                </div>
            </div>
        `;

        this.container = container;

        // Canvas Setup
        this.bgCanvas = document.getElementById('idle-bg-canvas');
        this.bgCtx = this.bgCanvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', this.resizeCanvas.bind(this));

        // Bind Listeners
        const clickBtn = container.querySelector('#click-btn');
        clickBtn.onclick = (e) => this.clickMoney(e);
        // Mobile touch fix
        clickBtn.addEventListener('touchstart', (e) => {
             e.preventDefault();
             const touch = e.touches[0];
             this.clickMoney({ clientX: touch.clientX, clientY: touch.clientY });
        }, { passive: false });

        // Back Button
        container.querySelector('.back-btn').addEventListener('click', () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        });

        // Upgrade Buttons
        this.bindUpgrade('upgrade-btn', () => this.buyClickUpgrade());
        this.bindUpgrade('auto-btn', () => this.buyAutoClicker());
        this.bindUpgrade('factory-btn', () => this.buyFactory());
        this.bindUpgrade('bank-btn', () => this.buyBank());

        container.querySelector('#prestige-btn').onclick = () => this.prestige();

        this.updateUI();
        this.startAnimationLoop();
    }

    renderUpgradeCard(id, icon, title, countId, costId, color, desc) {
        const colors = {
            cyan: 'border-cyan-500/30 hover:border-cyan-400 bg-cyan-900/20',
            purple: 'border-purple-500/30 hover:border-purple-400 bg-purple-900/20',
            orange: 'border-orange-500/30 hover:border-orange-400 bg-orange-900/20',
            green: 'border-green-500/30 hover:border-green-400 bg-green-900/20'
        };
        const c = colors[color] || colors.cyan;

        return `
            <button id="${id}" class="group relative flex items-center p-4 rounded-xl border transition-all overflow-hidden ${c}">
                <div class="w-12 h-12 rounded-lg bg-black/50 flex items-center justify-center mr-4 shadow-inner">
                    <i class="fas ${icon} text-2xl text-${color}-400"></i>
                </div>
                <div class="text-left flex-1">
                    <div class="font-bold text-white text-lg">${title}</div>
                    <div class="text-xs text-slate-400">${desc}</div>
                    <div class="text-xs text-${color}-300 mt-1">Owned: <span id="${countId}" class="font-bold">0</span></div>
                </div>
                <div class="text-right">
                    <div class="text-yellow-400 font-bold font-mono">$<span id="${costId}">0</span></div>
                    <div class="text-[10px] text-slate-500 uppercase font-bold mt-1 group-hover:text-white transition-colors">Buy</div>
                </div>
            </button>
        `;
    }

    bindUpgrade(id, callback) {
        const btn = this.container.querySelector(`#${id}`);
        if(btn) btn.onclick = callback;
    }

    resizeCanvas() {
        if (this.bgCanvas) {
            this.bgCanvas.width = this.container.clientWidth;
            this.bgCanvas.height = this.container.clientHeight;
        }
    }

    shutdown() {
        // Save
        this.saveSystem.setGameConfig('clicker-game', {
            money: this.money,
            clickPower: this.clickPower,
            autoClickers: this.autoClickers,
            factories: this.factories,
            banks: this.banks,
            prestigeMultiplier: this.prestigeMultiplier,
            upgradeCost: this.upgradeCost,
            autoClickerCost: this.autoClickerCost,
            factoryCost: this.factoryCost,
            bankCost: this.bankCost
        });

        // Achievements Check
        if (this.money >= 1000) this.saveSystem.unlockAchievement('rich-1000');
        if (this.money >= 1000000) this.saveSystem.unlockAchievement('clicker-millionaire'); // Need to add this

        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.resizeCanvas.bind(this));
    }

    update(dt) {
        if (this.autoClickRate > 0) {
            const income = this.autoClickRate * dt;
            this.moneyAccumulator += income;
            this.money = Math.floor(this.moneyAccumulator);
            this.updateUI();
        }

        this.particleSystem.update(dt);
    }

    draw() {
        if (!this.bgCtx) return;
        this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        this.particleSystem.draw(this.bgCtx);
    }

    startAnimationLoop() {
        const loop = () => {
            this.draw(); // We handle draw here since main loop might not call it if we use standard update
            this.animationId = requestAnimationFrame(loop);
        };
        this.animationId = requestAnimationFrame(loop);
    }

    clickMoney(e) {
        const gain = this.clickPower * this.prestigeMultiplier;
        this.moneyAccumulator += gain;
        this.money = Math.floor(this.moneyAccumulator);

        this.soundManager.playSound('click');
        this.updateUI();

        // Coordinates
        let x = e.clientX;
        let y = e.clientY;
        if (!x || !y) {
             const rect = document.getElementById('click-btn').getBoundingClientRect();
             x = rect.left + rect.width / 2;
             y = rect.top + rect.height / 2;
        }

        // Particle Burst
        this.particleSystem.emit(x, y, '#4ade80', 5);
        this.spawnFloatingText(x, y, `+$${gain}`);

        // Button Bounce
        const btn = document.getElementById('click-btn');
        if(btn) {
            btn.style.transform = "scale(0.90)";
            setTimeout(() => btn.style.transform = "scale(1)", 50);
        }
    }

    buyClickUpgrade() {
        if (this.money >= this.upgradeCost) {
            this.moneyAccumulator -= this.upgradeCost;
            this.money = Math.floor(this.moneyAccumulator);
            this.clickPower += 1;
            this.upgradeCost = Math.floor(this.upgradeCost * 1.5);
            this.soundManager.playSound('score');
            this.updateUI();
        } else this.soundManager.playTone(150, 'sawtooth', 0.1);
    }

    buyAutoClicker() {
        if (this.money >= this.autoClickerCost) {
            this.moneyAccumulator -= this.autoClickerCost;
            this.money = Math.floor(this.moneyAccumulator);
            this.autoClickers++;
            this.updateAutoRate();
            this.autoClickerCost = Math.floor(this.autoClickerCost * 1.4);
            this.soundManager.playSound('score');
            this.updateUI();
        } else this.soundManager.playTone(150, 'sawtooth', 0.1);
    }

    buyFactory() {
        if (this.money >= this.factoryCost) {
            this.moneyAccumulator -= this.factoryCost;
            this.money = Math.floor(this.moneyAccumulator);
            this.factories++;
            this.updateAutoRate();
            this.factoryCost = Math.floor(this.factoryCost * 1.6);
            this.soundManager.playSound('score');
            this.updateUI();
        } else this.soundManager.playTone(150, 'sawtooth', 0.1);
    }

    buyBank() {
         if (this.money >= this.bankCost) {
            this.moneyAccumulator -= this.bankCost;
            this.money = Math.floor(this.moneyAccumulator);
            this.banks++;
            this.updateAutoRate();
            this.bankCost = Math.floor(this.bankCost * 1.8);
            this.soundManager.playSound('score');
            this.updateUI();
        } else this.soundManager.playTone(150, 'sawtooth', 0.1);
    }

    prestige() {
        if (this.money >= 1000) {
            this.moneyAccumulator = 0;
            this.money = 0;
            this.clickPower = 1;
            this.autoClickers = 0;
            this.factories = 0;
            this.banks = 0;

            this.updateAutoRate();

            this.upgradeCost = 10;
            this.autoClickerCost = 50;
            this.factoryCost = 500;
            this.bankCost = 2000;

            this.prestigeMultiplier *= 2;

            this.soundManager.playSound('explosion');
            this.particleSystem.emit(window.innerWidth/2, window.innerHeight/2, '#fbbf24', 50);
            this.updateUI();
        }
    }

    spawnFloatingText(x, y, text) {
        const el = document.createElement('div');
        el.innerText = text;
        el.style.position = 'fixed';
        el.style.left = (x + (Math.random() * 40 - 20)) + 'px';
        el.style.top = (y + (Math.random() * 40 - 20)) + 'px';
        el.style.color = '#4ade80'; // Green-400
        el.style.fontFamily = 'monospace';
        el.style.fontWeight = 'bold';
        el.style.fontSize = '24px';
        el.style.pointerEvents = 'none';
        el.style.transition = 'all 0.8s ease-out';
        el.style.zIndex = '1000';
        el.style.textShadow = '0 0 10px rgba(74, 222, 128, 0.5)';
        document.body.appendChild(el);

        requestAnimationFrame(() => {
            el.style.transform = 'translateY(-100px) scale(1.5)';
            el.style.opacity = 0;
        });

        setTimeout(() => el.remove(), 800);
    }

    updateAutoRate() {
        // Base rates
        // Auto-Bot: 1/sec
        // Factory: 10/sec
        // Bank: 50/sec
        let rate = (this.autoClickers * 1) + (this.factories * 10) + (this.banks * 50);
        this.autoClickRate = rate * this.prestigeMultiplier;
    }

    updateUI() {
        if (!this.container) return;
        const fmt = (n) => Math.floor(n).toLocaleString();

        const setText = (id, val) => {
            const el = this.container.querySelector('#' + id);
            if(el) el.textContent = val;
        };

        setText("money", fmt(this.money));
        setText("auto-rate", fmt(this.autoClickRate));

        setText("click-power", fmt(this.clickPower));
        setText("upgrade-cost", fmt(this.upgradeCost));

        setText("auto-count", fmt(this.autoClickers));
        setText("autoclicker-cost", fmt(this.autoClickerCost));

        setText("factory-count", fmt(this.factories));
        setText("factory-cost", fmt(this.factoryCost));

        setText("bank-count", fmt(this.banks));
        setText("bank-cost", fmt(this.bankCost));

        setText("prestige-multiplier", this.prestigeMultiplier + "x");

        const pSection = this.container.querySelector("#prestige-section");
        if (pSection) {
            if (this.money >= 1000 || this.prestigeMultiplier > 1) {
                pSection.classList.remove("hidden");
            } else {
                pSection.classList.add("hidden");
            }
        }

        // Button States
        const checkAfford = (val, id) => {
             const btn = this.container.querySelector(`#${id}`);
             if(btn) {
                 if(this.money >= val) {
                     btn.classList.remove('opacity-50', 'grayscale');
                     btn.classList.add('hover:scale-[1.02]');
                 } else {
                     btn.classList.add('opacity-50', 'grayscale');
                     btn.classList.remove('hover:scale-[1.02]');
                 }
             }
        };

        checkAfford(this.upgradeCost, 'upgrade-btn');
        checkAfford(this.autoClickerCost, 'auto-btn');
        checkAfford(this.factoryCost, 'factory-btn');
        checkAfford(this.bankCost, 'bank-btn');
    }
}
