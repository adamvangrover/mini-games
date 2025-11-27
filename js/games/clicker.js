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
        this.money = 0;
        this.clickPower = 1;
        this.autoClickers = 0;
        this.autoClickRate = 0;
        this.prestigeMultiplier = 1;
        this.upgradeCost = 10;
        this.autoClickerCost = 50;
        this.updateUI();

        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => {
            if (this.autoClickRate > 0) {
                this.money += this.autoClickRate;
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

    clickMoney: function() {
        this.money += this.clickPower * this.prestigeMultiplier;
        this.updateUI();
        if(window.soundManager) window.soundManager.playSound('click');

        // Visual effect
        this.spawnFloatingText(event.clientX, event.clientY, `+$${this.clickPower * this.prestigeMultiplier}`);
    },

    buyUpgrade: function() {
        if (this.money >= this.upgradeCost) {
            this.money -= this.upgradeCost;
            this.clickPower += 1;
            this.upgradeCost = Math.floor(this.upgradeCost * 1.5);
            this.updateUI();
            if(window.soundManager) window.soundManager.playTone(600, 'sine', 0.1, true);
        } else {
             if(window.soundManager) window.soundManager.playTone(150, 'sawtooth', 0.1);
        }
    },

    buyAutoClicker: function() {
        if (this.money >= this.autoClickerCost) {
            this.money -= this.autoClickerCost;
            this.autoClickers++;
            this.autoClickRate = this.autoClickers * this.prestigeMultiplier;
            this.autoClickerCost = Math.floor(this.autoClickerCost * 1.7);
            this.updateUI();
            if(window.soundManager) window.soundManager.playTone(600, 'sine', 0.1, true);
        } else {
             if(window.soundManager) window.soundManager.playTone(150, 'sawtooth', 0.1);
        }
    },

    prestige: function() {
        if (this.money >= 1000) {
            this.money = 0;
            this.clickPower = 1;
            this.autoClickers = 0;
            this.autoClickRate = 0;
            this.upgradeCost = 10;
            this.autoClickerCost = 50;
            this.prestigeMultiplier *= 2;
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
};
