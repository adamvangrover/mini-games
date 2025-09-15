const clickerGame = {
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
        const handlers = [
            () => this.clickMoney(),
            () => this.buyUpgrade(),
            () => this.buyAutoClicker(),
            () => this.prestige()
        ];

        buttons.forEach((button, index) => {
            const handler = handlers[index];
            this.buttonHandlers.push({ button, handler });
            button.addEventListener('click', handler);
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
    },

    buyUpgrade: function() {
        if (this.money >= this.upgradeCost) {
            this.money -= this.upgradeCost;
            this.clickPower += 1;
            this.upgradeCost = Math.floor(this.upgradeCost * 1.5);
            this.updateUI();
        }
    },

    buyAutoClicker: function() {
        if (this.money >= this.autoClickerCost) {
            this.money -= this.autoClickerCost;
            this.autoClickers++;
            this.autoClickRate = this.autoClickers * this.prestigeMultiplier;
            this.autoClickerCost = Math.floor(this.autoClickerCost * 1.7);
            this.updateUI();
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
        }
    },

    updateUI: function() {
        document.getElementById("money").textContent = this.money;
        document.getElementById("click-power").textContent = this.clickPower;
        document.getElementById("auto-rate").textContent = this.autoClickRate;
        document.getElementById("upgrade-cost").textContent = this.upgradeCost;
        document.getElementById("autoclicker-cost").textContent = this.autoClickerCost;
        document.getElementById("prestige-multiplier").textContent = this.prestigeMultiplier + "x";
        document.getElementById("prestige-btn").classList.toggle("hidden", this.money < 1000);
    }
};
