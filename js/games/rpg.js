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
import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class RPGGame {
    constructor() {
        this.player = {
            hp: 100,
            maxHp: 100,
            attack: 10,
            level: 1,
            xp: 0,
            xpToNextLevel: 100
        };
        this.enemy = null;
        this.enemies = [
            { name: 'Goblin', hp: 30, maxHp: 30, attack: 5, xp: 10, emoji: '👺' },
            { name: 'Orc', hp: 50, maxHp: 50, attack: 8, xp: 25, emoji: '👹' },
            { name: 'Dragon', hp: 120, maxHp: 120, attack: 15, xp: 100, emoji: '🐉' }
        ];
        this.log = [];
        this.container = null;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
    }

    init(container) {
        this.container = container;

        // Inject Visual UI (Pokemon Style)
        this.container.innerHTML = `
            <div class="rpg-arena" style="
                width: 100%; height: 100vh; background: #222;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                font-family: 'Press Start 2P', cursive; color: white;
            ">
                <!-- Enemy Area -->
                <div style="display: flex; justify-content: flex-end; width: 100%; max-width: 600px; margin-bottom: 2rem; padding: 1rem;">
                    <div style="text-align: left; background: #eee; color: black; padding: 10px; border: 4px solid #444; border-radius: 10px; margin-right: 20px;">
                        <h3 id="rpg-enemy-name">Enemy</h3>
                        <div style="width: 150px; height: 10px; background: #ccc; border: 1px solid #000; margin-top: 5px;">
                            <div id="rpg-enemy-bar" style="width: 100%; height: 100%; background: #e74c3c;"></div>
                        </div>
                    </div>
                    <div id="rpg-enemy-sprite" style="font-size: 6rem; animation: bounce 2s infinite;">👺</div>
                </div>

                <!-- Player Area -->
                <div style="display: flex; justify-content: flex-start; width: 100%; max-width: 600px; margin-bottom: 2rem; padding: 1rem;">
                    <div style="font-size: 6rem; transform: scaleX(-1); margin-right: 20px;">🧙‍♂️</div>
                    <div style="text-align: left; background: #eee; color: black; padding: 10px; border: 4px solid #444; border-radius: 10px;">
                        <h3>Hero LVL <span id="rpg-player-level">1</span></h3>
                        <div style="width: 150px; height: 10px; background: #ccc; border: 1px solid #000; margin-top: 5px;">
                            <div id="rpg-player-bar" style="width: 100%; height: 100%; background: #2ecc71;"></div>
                        </div>
                        <p style="font-size: 0.6rem; margin-top: 5px;">HP: <span id="rpg-player-hp">100</span>/<span id="rpg-player-max">100</span></p>
                    </div>
                </div>

                <!-- Controls & Log -->
                <div style="width: 100%; max-width: 600px; background: #333; border: 4px solid #fff; padding: 10px; height: 150px; display: flex;">
                    <div id="rpg-log" style="flex: 2; font-size: 0.7rem; overflow-y: auto; text-align: left; padding-right: 10px; line-height: 1.5;">
                        Welcome to the arena!
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 5px;">
                        <button id="rpg-attack-btn" style="padding: 10px; cursor: pointer; background: #e74c3c; color: white; border: 2px solid white;">FIGHT</button>
                        <button id="rpg-heal-btn" style="padding: 10px; cursor: pointer; background: #3498db; color: white; border: 2px solid white;">HEAL</button>
                    </div>
                </div>

                <button class="back-btn" style="position: absolute; top: 20px; right: 20px;">Run Away</button>
            </div>

            <style>
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes shake {
                    0% { transform: translate(1px, 1px) rotate(0deg); }
                    10% { transform: translate(-1px, -2px) rotate(-1deg); }
                    20% { transform: translate(-3px, 0px) rotate(1deg); }
                    30% { transform: translate(3px, 2px) rotate(0deg); }
                    40% { transform: translate(1px, -1px) rotate(1deg); }
                    50% { transform: translate(-1px, 2px) rotate(-1deg); }
                    60% { transform: translate(-3px, 1px) rotate(0deg); }
                    70% { transform: translate(3px, 1px) rotate(-1deg); }
                    80% { transform: translate(-1px, -1px) rotate(1deg); }
                    90% { transform: translate(1px, 2px) rotate(0deg); }
                    100% { transform: translate(1px, -2px) rotate(-1deg); }
                }
                .shake {
                    animation: shake 0.5s;
                }
                .damage-text {
                    position: absolute;
                    color: red;
                    font-weight: bold;
                    font-size: 2rem;
                    animation: floatUp 1s forwards;
                }
                @keyframes floatUp {
                    to { transform: translateY(-50px); opacity: 0; }
                }
            </style>
        `;

        // Bind Events
        this.container.querySelector('#rpg-attack-btn').onclick = () => this.handleAttack();
        this.container.querySelector('#rpg-heal-btn').onclick = () => this.handleHeal();
        this.container.querySelector('.back-btn').onclick = () => window.miniGameHub.goBack();

        this.spawnEnemy();
        this.updateUI();
    }

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
    shutdown() {
        // Events cleaned up by innerHTML replacement next time
    }

    update(dt) {}
    draw() {}

    spawnEnemy() {
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
        const template = this.enemies[enemyIndex];
        this.enemy = {
            ...template,
            hp: template.hp // Reset HP
        };
        this.logMessage(`A wild ${this.enemy.name} appears!`);
        this.updateUI();
    }

    updateUI() {
        const p = this.player;
        const e = this.enemy;

        // Player
        document.getElementById('rpg-player-level').textContent = p.level;
        document.getElementById('rpg-player-hp').textContent = p.hp;
        document.getElementById('rpg-player-max').textContent = p.maxHp;
        document.getElementById('rpg-player-bar').style.width = `${(p.hp / p.maxHp) * 100}%`;

        // Enemy
        if (e) {
            document.getElementById('rpg-enemy-name').textContent = e.name;
            document.getElementById('rpg-enemy-sprite').textContent = e.emoji;
            document.getElementById('rpg-enemy-bar').style.width = `${(e.hp / e.maxHp) * 100}%`;
        }
    }

    logMessage(msg) {
        const logEl = document.getElementById('rpg-log');
        const p = document.createElement('div');
        p.textContent = `> ${msg}`;
        logEl.appendChild(p);
        logEl.scrollTop = logEl.scrollHeight;
    }

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
    handleAttack() {
        if (!this.enemy || this.player.hp <= 0) return;

        // Player attacks
        const playerDamage = Math.floor(Math.random() * this.player.attack) + 5;
        this.enemy.hp -= playerDamage;
        this.logMessage(`You hit ${this.enemy.name} for ${playerDamage}!`);
        this.soundManager.playSound('click'); // Hit sound

        // Visual Shake
        const sprite = document.getElementById('rpg-enemy-sprite');
        sprite.classList.remove('shake');
        void sprite.offsetWidth; // Trigger reflow
        sprite.classList.add('shake');

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
            this.updateUI();
            this.logMessage(`Victory! Gained ${this.enemy.xp} XP.`);
            this.soundManager.playSound('score');

            this.player.xp += this.enemy.xp;
            if (this.player.xp >= this.player.xpToNextLevel) {
                this.levelUp();
            }

            setTimeout(() => this.spawnEnemy(), 1500);
            return;
        }

        this.updateUI();
        setTimeout(() => this.enemyTurn(), 800);
    }

    handleHeal() {
        if (!this.enemy || this.player.hp <= 0) return;

        const healAmount = Math.floor(Math.random() * 20) + 10;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
        this.log.push(`You heal for ${healAmount} HP.`);
        if(window.soundManager) window.soundManager.playTone(400, 'sine', 0.5);

        // Heal animation
        this.playerSprite.style.filter = 'brightness(1.5) sepia(1) hue-rotate(90deg) saturate(5)'; // Flash Green
        setTimeout(() => this.playerSprite.style.filter = 'none', 300);
        this.logMessage(`You healed for ${healAmount} HP.`);
        this.soundManager.playSound('score'); // Heal sound
        this.updateUI();

        setTimeout(() => this.enemyTurn(), 800);
    }

    enemyTurn() {
        if (!this.enemy || this.enemy.hp <= 0) return;

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
        const enemyDamage = Math.floor(Math.random() * this.enemy.attack) + 1;
        this.player.hp -= enemyDamage;
        this.logMessage(`${this.enemy.name} hits you for ${enemyDamage}!`);
        this.soundManager.playSound('explosion'); // Hit player sound

        if (this.player.hp <= 0) {
            this.player.hp = 0;
            this.logMessage("Defeated! Game Over.");
            // Reset player?
            setTimeout(() => {
                alert("Game Over");
                this.player.hp = this.player.maxHp;
                window.miniGameHub.goBack();
            }, 1000);
        }
        this.updateUI();
    }

    levelUp() {
        this.player.level++;
        this.player.xp = 0;
        this.player.xpToNextLevel = Math.floor(this.player.xpToNextLevel * 1.5);
        this.player.maxHp += 20;
        this.player.hp = this.player.maxHp;
        this.player.attack += 2;
        this.log.push(`Congratulations! You've reached level ${this.player.level}!`);
        if(window.soundManager) window.soundManager.playTone(600, 'sine', 0.5, true);
        this.player.attack += 5;
        this.logMessage(`LEVEL UP! You are now level ${this.player.level}.`);
        this.soundManager.playSound('score');
    }
}
