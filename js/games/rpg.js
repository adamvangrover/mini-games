const rpgGame = {
    player: {
        hp: 100,
        maxHp: 100,
        attack: 10,
        level: 1,
        xp: 0,
        xpToNextLevel: 100
    },
    enemy: null,
    enemies: [
        { name: 'Goblin', hp: 30, attack: 5, xp: 10 },
        { name: 'Orc', hp: 50, attack: 8, xp: 25 },
        { name: 'Troll', hp: 80, attack: 12, xp: 50 }
    ],
    log: [],

    // DOM Elements
    playerHpEl: null,
    playerLevelEl: null,
    playerXpEl: null,
    enemyNameEl: null,
    enemyHpEl: null,
    logEl: null,
    attackBtn: null,
    healBtn: null,

    init: function() {
        // Get DOM elements
        this.playerHpEl = document.getElementById('rpg-player-hp');
        this.playerLevelEl = document.getElementById('rpg-player-level');
        this.playerXpEl = document.getElementById('rpg-player-xp');
        this.enemyNameEl = document.getElementById('rpg-enemy-name');
        this.enemyHpEl = document.getElementById('rpg-enemy-hp');
        this.logEl = document.getElementById('rpg-log');
        this.attackBtn = document.getElementById('rpg-attack-btn');
        this.healBtn = document.getElementById('rpg-heal-btn');

        // Add event listeners
        this.attackBtn.addEventListener('click', () => this.handleAttack());
        this.healBtn.addEventListener('click', () => this.handleHeal());

        this.spawnEnemy();
        this.updateUI();
    },

    shutdown: function() {
        // Remove event listeners
        this.attackBtn.removeEventListener('click', () => this.handleAttack());
        this.healBtn.removeEventListener('click', () => this.handleHeal());
    },

    spawnEnemy: function() {
        const enemyIndex = Math.floor(Math.random() * this.enemies.length);
        this.enemy = { ...this.enemies[enemyIndex] };
        this.log = [`A wild ${this.enemy.name} appears!`];
        this.updateUI();
    },

    updateUI: function() {
        // Update player stats
        this.playerHpEl.textContent = `${this.player.hp} / ${this.player.maxHp}`;
        this.playerLevelEl.textContent = this.player.level;
        this.playerXpEl.textContent = `${this.player.xp} / ${this.player.xpToNextLevel}`;

        // Update enemy stats
        if (this.enemy) {
            this.enemyNameEl.textContent = this.enemy.name;
            this.enemyHpEl.textContent = this.enemy.hp;
        }

        // Update combat log
        this.logEl.innerHTML = this.log.join('<br>');
        this.logEl.scrollTop = this.logEl.scrollHeight;
    },

    handleAttack: function() {
        if (!this.enemy) return;

        // Player attacks enemy
        const playerDamage = Math.floor(Math.random() * this.player.attack) + 1;
        this.enemy.hp -= playerDamage;
        this.log.push(`You attack the ${this.enemy.name} for ${playerDamage} damage.`);

        if (this.enemy.hp <= 0) {
            this.log.push(`You defeated the ${this.enemy.name}!`);
            this.player.xp += this.enemy.xp;
            this.log.push(`You gain ${this.enemy.xp} XP.`);
            if (this.player.xp >= this.player.xpToNextLevel) {
                this.levelUp();
            }
            this.spawnEnemy();
            this.updateUI();
            return;
        }

        this.enemyTurn();
    },

    handleHeal: function() {
        if (!this.enemy) return;

        const healAmount = Math.floor(Math.random() * 20) + 10;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
        this.log.push(`You heal for ${healAmount} HP.`);

        this.enemyTurn();
    },

    enemyTurn: function() {
        // Enemy attacks player
        const enemyDamage = Math.floor(Math.random() * this.enemy.attack) + 1;
        this.player.hp -= enemyDamage;
        this.log.push(`The ${this.enemy.name} attacks you for ${enemyDamage} damage.`);

        if (this.player.hp <= 0) {
            this.log.push("You have been defeated! Game Over.");
            this.player.hp = 0;
            this.attackBtn.disabled = true;
            this.healBtn.disabled = true;
        }

        this.updateUI();
    },

    levelUp: function() {
        this.player.level++;
        this.player.xp -= this.player.xpToNextLevel;
        this.player.xpToNextLevel = Math.floor(this.player.xpToNextLevel * 1.5);
        this.player.maxHp += 10;
        this.player.hp = this.player.maxHp;
        this.player.attack += 2;
        this.log.push(`Congratulations! You've reached level ${this.player.level}!`);
    }
};
