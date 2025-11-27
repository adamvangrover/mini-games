export default {
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
        { name: 'Goblin', hp: 30, maxHp: 30, attack: 5, xp: 10, emoji: '👺' },
        { name: 'Orc', hp: 50, maxHp: 50, attack: 8, xp: 25, emoji: '👹' },
        { name: 'Troll', hp: 80, maxHp: 80, attack: 12, xp: 50, emoji: '👿' }
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

    // Visual Stage
    stageEl: null,
    playerSprite: null,
    enemySprite: null,

    // Handlers
    attackHandler: null,
    healHandler: null,

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

        // Setup Visual Stage if not present
        this.setupStage();

        // Handlers
        this.attackHandler = () => this.handleAttack();
        this.healHandler = () => this.handleHeal();

        // Add event listeners
        if (this.attackBtn) {
            this.attackBtn.addEventListener('click', this.attackHandler);
            this.attackBtn.disabled = false;
        }
        if (this.healBtn) {
            this.healBtn.addEventListener('click', this.healHandler);
            this.healBtn.disabled = false;
        }

        this.spawnEnemy();
        this.updateUI();
    },

    shutdown: function() {
        // Remove event listeners
        if (this.attackBtn) this.attackBtn.removeEventListener('click', this.attackHandler);
        if (this.healBtn) this.healBtn.removeEventListener('click', this.healHandler);

        // Cleanup stage
        if (this.stageEl) this.stageEl.remove();
    },

    setupStage: function() {
        // Insert stage before actions
        const actionsDiv = document.getElementById('rpg-actions');
        if (document.getElementById('rpg-stage')) {
            this.stageEl = document.getElementById('rpg-stage');
            this.playerSprite = document.getElementById('rpg-player-sprite');
            this.enemySprite = document.getElementById('rpg-enemy-sprite');
            return;
        }

        this.stageEl = document.createElement('div');
        this.stageEl.id = 'rpg-stage';
        this.stageEl.style.display = 'flex';
        this.stageEl.style.justifyContent = 'space-between';
        this.stageEl.style.alignItems = 'center';
        this.stageEl.style.height = '200px';
        this.stageEl.style.background = 'linear-gradient(to bottom, #1e293b, #0f172a)';
        this.stageEl.style.marginBottom = '20px';
        this.stageEl.style.borderRadius = '8px';
        this.stageEl.style.padding = '0 50px';
        this.stageEl.style.border = '2px solid #475569';

        // Player Sprite
        this.playerSprite = document.createElement('div');
        this.playerSprite.id = 'rpg-player-sprite';
        this.playerSprite.style.fontSize = '64px';
        this.playerSprite.textContent = '🧙‍♂️';
        this.playerSprite.style.transition = 'transform 0.2s';

        // Enemy Sprite
        this.enemySprite = document.createElement('div');
        this.enemySprite.id = 'rpg-enemy-sprite';
        this.enemySprite.style.fontSize = '64px';
        this.enemySprite.textContent = '👺';
        this.enemySprite.style.transition = 'transform 0.2s';

        this.stageEl.appendChild(this.playerSprite);
        this.stageEl.appendChild(this.enemySprite);

        if (actionsDiv) {
            actionsDiv.parentElement.insertBefore(this.stageEl, actionsDiv);
        }
    },

    spawnEnemy: function() {
        const enemyIndex = Math.floor(Math.random() * this.enemies.length);
        this.enemy = { ...this.enemies[enemyIndex] };
        this.log = [`A wild ${this.enemy.name} appears!`];
        if(this.enemySprite) {
            this.enemySprite.textContent = this.enemy.emoji;
            this.enemySprite.style.opacity = '1';
            this.enemySprite.style.transform = 'scale(1)';
        }
        this.updateUI();
    },

    updateUI: function() {
        if (!this.playerHpEl) return;

        // Update player stats
        this.playerHpEl.textContent = `${this.player.hp} / ${this.player.maxHp}`;
        this.playerLevelEl.textContent = this.player.level;
        this.playerXpEl.textContent = `${this.player.xp} / ${this.player.xpToNextLevel}`;

        // Update enemy stats
        if (this.enemy) {
            this.enemyNameEl.textContent = this.enemy.name;
            this.enemyHpEl.textContent = `${this.enemy.hp} / ${this.enemy.maxHp}`;
        }

        // Update combat log
        this.logEl.innerHTML = this.log.join('<br>');
        this.logEl.scrollTop = this.logEl.scrollHeight;
    },

    animateAction: function(element, animation) {
        if (!element) return;
        element.style.transform = animation === 'attack' ? 'translateX(30px) scale(1.2)' : 'translateX(-30px) scale(1.2)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
    },

    animateDamage: function(element) {
        if (!element) return;
        element.style.filter = 'brightness(3) sepia(1) hue-rotate(-50deg) saturate(5)'; // Flash Red
        element.style.transform = 'translateX(5px)';
        setTimeout(() => element.style.transform = 'translateX(-5px)', 50);
        setTimeout(() => element.style.transform = 'translateX(5px)', 100);
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.filter = 'none';
        }, 200);
    },

    handleAttack: function() {
        if (!this.enemy) return;

        // Player attacks enemy
        const playerDamage = Math.floor(Math.random() * this.player.attack) + 1;
        this.enemy.hp -= playerDamage;
        this.log.push(`You attack the ${this.enemy.name} for ${playerDamage} damage.`);

        if(window.soundManager) window.soundManager.playTone(300, 'square', 0.1);
        this.animateAction(this.playerSprite, 'attack');
        this.animateDamage(this.enemySprite);

        if (this.enemy.hp <= 0) {
            this.enemy.hp = 0;
            this.log.push(`You defeated the ${this.enemy.name}!`);
            if(window.soundManager) window.soundManager.playSound('score');
            this.player.xp += this.enemy.xp;
            this.log.push(`You gain ${this.enemy.xp} XP.`);

            // Death animation
            this.enemySprite.style.transform = 'scale(0) rotate(360deg)';
            this.enemySprite.style.opacity = '0';

            if (this.player.xp >= this.player.xpToNextLevel) {
                this.levelUp();
            }
            // Delay spawn slightly
            setTimeout(() => this.spawnEnemy(), 1500);
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
        if(window.soundManager) window.soundManager.playTone(400, 'sine', 0.5);

        // Heal animation
        this.playerSprite.style.filter = 'brightness(1.5) sepia(1) hue-rotate(90deg) saturate(5)'; // Flash Green
        setTimeout(() => this.playerSprite.style.filter = 'none', 300);

        this.enemyTurn();
    },

    enemyTurn: function() {
        // Enemy attacks player
        setTimeout(() => {
             const enemyDamage = Math.floor(Math.random() * this.enemy.attack) + 1;
            this.player.hp -= enemyDamage;
            this.log.push(`The ${this.enemy.name} attacks you for ${enemyDamage} damage.`);
            if(window.soundManager) window.soundManager.playTone(150, 'sawtooth', 0.1);

            this.animateAction(this.enemySprite, 'enemy-attack'); // Need to handle direction
            this.animateDamage(this.playerSprite);

            if (this.player.hp <= 0) {
                this.log.push("You have been defeated! Game Over.");
                this.player.hp = 0;
                this.attackBtn.disabled = true;
                this.healBtn.disabled = true;
                this.playerSprite.textContent = '💀';
                if(window.soundManager) window.soundManager.playSound('gameover');
                // Reset game after delay
                setTimeout(() => {
                    this.player.hp = this.player.maxHp;
                    this.playerSprite.textContent = '🧙‍♂️';
                    this.init();
                }, 3000);
            }

            this.updateUI();
        }, 800);
    },

    levelUp: function() {
        this.player.level++;
        this.player.xp -= this.player.xpToNextLevel;
        this.player.xpToNextLevel = Math.floor(this.player.xpToNextLevel * 1.5);
        this.player.maxHp += 10;
        this.player.hp = this.player.maxHp;
        this.player.attack += 2;
        this.log.push(`Congratulations! You've reached level ${this.player.level}!`);
        if(window.soundManager) window.soundManager.playTone(600, 'sine', 0.5, true);
    }
};
