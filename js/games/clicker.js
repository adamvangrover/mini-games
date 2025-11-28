export default {
    money: 0,
    clickPower: 1,
    autoClickers: 0,
    autoClickRate: 0,
    prestigeMultiplier: 1,
    upgradeCost: 10,
    autoClickerCost: 50,
    interval: null,
    buttonHandlers: [],

    init: function() {
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

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.autoClickTimer = 0;
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

        // Bind Buttons (Assume HTML structure exists in index.html for now, OR inject it)
        // Since index.html has legacy structure, we should query selectors specifically within container.
        // Wait, the container passed is the div with id="clicker-game".

        // Let's re-bind handlers.
        // Note: The previous legacy code added listeners. We should assume we are starting fresh.
        // But if we navigate away and back, we need to handle listener cleanup.
        // We will replace the innerHTML to clear old listeners and ensure clean slate,
        // OR use `addEventListener` with `shutdown` cleanup.
        // Given we want to persist the HTML structure defined in index.html, we attach listeners.
        // However, standardizing means we should probably control the UI.

        // Let's assume index.html structure is fine but we need to find buttons.
        const buttons = container.querySelectorAll('button:not(.back-btn)');
        // 0: Click, 1: Upgrade, 2: Auto, 3: Prestige (hidden)

        // Better: select by text content or order?
        // The legacy code used index. Let's try to be robust.
        // We can look for text content or add IDs.
        // The index.html has IDs for spans, but buttons don't have IDs except prestige-btn.

        // Let's just grab them by order, matching legacy.
        if (buttons[0]) buttons[0].onclick = () => this.clickMoney();
        if (buttons[1]) buttons[1].onclick = () => this.buyUpgrade();
        if (buttons[2]) buttons[2].onclick = () => this.buyAutoClicker();
        const prestigeBtn = container.querySelector('#prestige-btn');
        if (prestigeBtn) prestigeBtn.onclick = () => this.prestige();

        this.container = container;
        this.updateUI();
    }

    shutdown() {
        // Save state
        this.saveSystem.saveGameConfig('clicker-game', {
            money: this.money,
            clickPower: this.clickPower,
            autoClickers: this.autoClickers,
            prestigeMultiplier: this.prestigeMultiplier,
            upgradeCost: this.upgradeCost,
            autoClickerCost: this.autoClickerCost
        });

        // Clear listeners
        if (this.container) {
            const buttons = this.container.querySelectorAll('button');
            buttons.forEach(b => b.onclick = null);
        }
    }

    update(dt) {
        // Auto Clicker Logic
        if (this.autoClickRate > 0) {
            this.autoClickTimer += dt;
            if (this.autoClickTimer >= 1.0) {
                this.money += this.autoClickRate;
                this.autoClickTimer = 0;
                this.updateUI();
            }
        }, 1000);

        const buttons = document.querySelectorAll('#clicker-game button:not(.back-btn)');
        // Ensure buttons exist before attaching. The querySelectorAll relies on order which is fragile.
        // Let's assume order: Click, Upgrade, Auto, Prestige.
        // Better: select by text content if possible or structure, but for now order is 0,1,2,3

        const handlers = [
            () => this.clickMoney(),
            () => this.buyUpgrade(),
            () => this.buyAutoClicker(),
            () => this.prestige()
        ];

        buttons.forEach((button, index) => {
            if (handlers[index]) {
                const handler = handlers[index];
                this.buttonHandlers.push({ button, handler });
                button.addEventListener('click', handler);
            }
        });
    },

    shutdown: function() {
        if (this.interval) clearInterval(this.interval);
        this.buttonHandlers.forEach(({ button, handler }) => {
            button.removeEventListener('click', handler);
        });
        this.buttonHandlers = [];
    },
        }
    }

    clickMoney() {
        this.money += this.clickPower * this.prestigeMultiplier;
        this.soundManager.playSound('click');
        this.updateUI();
        if(window.soundManager) window.soundManager.playSound('click');

        // Visual effect
        this.spawnFloatingText(event.clientX, event.clientY, `+$${this.clickPower * this.prestigeMultiplier}`);
    },
    }

    buyUpgrade() {
        if (this.money >= this.upgradeCost) {
            this.money -= this.upgradeCost;
            this.clickPower += 1;
            this.upgradeCost = Math.floor(this.upgradeCost * 1.5);
            this.soundManager.playSound('score');
            this.updateUI();
            if(window.soundManager) window.soundManager.playTone(600, 'sine', 0.1, true);
        } else {
             if(window.soundManager) window.soundManager.playTone(150, 'sawtooth', 0.1);
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
            if(window.soundManager) window.soundManager.playTone(600, 'sine', 0.1, true);
        } else {
             if(window.soundManager) window.soundManager.playTone(150, 'sawtooth', 0.1);
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
            this.soundManager.playSound('explosion'); // Big sound
            this.updateUI();
            if(window.soundManager) window.soundManager.playSound('score');
        }
    },

    spawnFloatingText: function(x, y, text) {
        const el = document.createElement('div');
        el.innerText = text;
        el.style.position = 'fixed';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.color = '#10b981';
        el.style.fontWeight = 'bold';
        el.style.pointerEvents = 'none';
        el.style.transition = 'all 1s ease-out';
        document.body.appendChild(el);

        requestAnimationFrame(() => {
            el.style.top = (y - 50) + 'px';
            el.style.opacity = 0;
        });

        setTimeout(() => el.remove(), 1000);
    },

    updateUI: function() {
        document.getElementById("money").textContent = Math.floor(this.money);
        document.getElementById("click-power").textContent = this.clickPower;
        document.getElementById("auto-rate").textContent = this.autoClickRate;
        document.getElementById("upgrade-cost").textContent = this.upgradeCost;
        document.getElementById("autoclicker-cost").textContent = this.autoClickerCost;
        document.getElementById("prestige-multiplier").textContent = this.prestigeMultiplier + "x";

        const prestigeBtn = document.getElementById("prestige-btn");
        if (this.money >= 1000) {
             prestigeBtn.classList.remove("hidden");
        } else {
             prestigeBtn.classList.add("hidden");
        }
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

        setText("money", this.money);
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
