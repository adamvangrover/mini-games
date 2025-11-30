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
            <div class="rpg-arena relative w-full h-[80vh] bg-slate-900 rounded-lg overflow-hidden flex flex-col items-center justify-center font-mono text-white p-4">
                <!-- Background Decoration -->
                <div class="absolute inset-0 z-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>

                <!-- Enemy Area -->
                <div class="z-10 w-full max-w-2xl flex justify-end mb-8 p-4">
                    <div class="mr-8 text-left bg-slate-200 text-slate-900 p-3 border-4 border-slate-700 rounded-lg shadow-lg">
                        <h3 id="rpg-enemy-name" class="font-bold text-lg uppercase">Enemy</h3>
                        <div class="w-32 h-3 bg-slate-400 border border-black mt-2 rounded-full overflow-hidden">
                            <div id="rpg-enemy-bar" class="h-full bg-red-500 transition-all duration-500" style="width: 100%;"></div>
                        </div>
                    </div>
                    <div id="rpg-enemy-sprite" class="text-8xl animate-bounce filter drop-shadow-xl transition-transform duration-200">👺</div>
                </div>

                <!-- Player Area -->
                <div class="z-10 w-full max-w-2xl flex justify-start mb-8 p-4">
                    <div id="rpg-player-sprite" class="text-8xl scale-x-[-1] mr-8 filter drop-shadow-xl transition-transform duration-200">🧙‍♂️</div>
                    <div class="text-left bg-slate-200 text-slate-900 p-3 border-4 border-slate-700 rounded-lg shadow-lg">
                        <h3 class="font-bold text-lg uppercase">Hero LVL <span id="rpg-player-level">1</span></h3>
                        <div class="w-32 h-3 bg-slate-400 border border-black mt-2 rounded-full overflow-hidden">
                            <div id="rpg-player-bar" class="h-full bg-green-500 transition-all duration-500" style="width: 100%;"></div>
                        </div>
                        <p class="text-xs font-bold mt-1">HP: <span id="rpg-player-hp">100</span>/<span id="rpg-player-max">100</span></p>
                    </div>
                </div>

                <!-- Controls & Log -->
                <div class="z-10 w-full max-w-2xl bg-slate-800 border-4 border-white rounded-lg p-4 flex flex-col md:flex-row gap-4 h-48 shadow-2xl">
                    <div id="rpg-log" class="flex-1 text-sm overflow-y-auto text-left font-mono space-y-1 pr-2 scrollbar-thin scrollbar-thumb-slate-600">
                        <div class="text-yellow-400">> Welcome to the arena!</div>
                    </div>
                    <div class="flex flex-row md:flex-col gap-2 justify-center min-w-[120px]">
                        <button id="rpg-attack-btn" class="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 border-2 border-white rounded uppercase shadow active:translate-y-1 transition-all">FIGHT</button>
                        <button id="rpg-heal-btn" class="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 border-2 border-white rounded uppercase shadow active:translate-y-1 transition-all">HEAL</button>
                    </div>
                </div>

                <button class="back-btn absolute top-4 right-4 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-sm z-50">Run Away</button>
            </div>

            <style>
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
                .shake { animation: shake 0.5s; }
            </style>
        `;

        // Bind Events
        this.container.querySelector('#rpg-attack-btn').onclick = () => this.handleAttack();
        this.container.querySelector('#rpg-heal-btn').onclick = () => this.handleHeal();
        this.container.querySelector('.back-btn').onclick = () => window.miniGameHub.goBack();

        this.spawnEnemy();
        this.updateUI();
    }

    shutdown() {
        if (this.container) {
             // Removing listeners not strictly needed as elements are destroyed,
             // but good practice if we had persistent refs.
             const btns = this.container.querySelectorAll('button');
             btns.forEach(b => b.onclick = null);
        }
    }

    spawnEnemy() {
        const enemyIndex = Math.floor(Math.random() * this.enemies.length);
        const template = this.enemies[enemyIndex];
        this.enemy = {
            ...template,
            hp: template.hp // Reset HP
        };
        this.logMessage(`A wild ${this.enemy.name} appears!`);
        this.updateUI();
    }

    updateUI() {
        if (!this.container) return;
        const p = this.player;
        const e = this.enemy;

        // Player
        this.container.querySelector('#rpg-player-level').textContent = p.level;
        this.container.querySelector('#rpg-player-hp').textContent = p.hp;
        this.container.querySelector('#rpg-player-max').textContent = p.maxHp;
        this.container.querySelector('#rpg-player-bar').style.width = `${Math.max(0, (p.hp / p.maxHp) * 100)}%`;

        // Enemy
        if (e) {
            this.container.querySelector('#rpg-enemy-name').textContent = e.name;
            this.container.querySelector('#rpg-enemy-sprite').textContent = e.emoji;
            this.container.querySelector('#rpg-enemy-bar').style.width = `${Math.max(0, (e.hp / e.maxHp) * 100)}%`;
        }
    }

    logMessage(msg) {
        if (!this.container) return;
        const logEl = this.container.querySelector('#rpg-log');
        const p = document.createElement('div');
        p.textContent = `> ${msg}`;
        p.className = "border-b border-slate-700 pb-1 mb-1 last:border-0";
        logEl.appendChild(p);
        logEl.scrollTop = logEl.scrollHeight;
    }

    handleAttack() {
        if (!this.enemy || this.player.hp <= 0) return;

        // Player attacks
        const playerDamage = Math.floor(Math.random() * this.player.attack) + 5;
        this.enemy.hp -= playerDamage;
        this.logMessage(`You hit ${this.enemy.name} for ${playerDamage}!`);
        this.soundManager.playSound('click'); // Hit sound

        // Visual Shake
        const sprite = this.container.querySelector('#rpg-enemy-sprite');
        sprite.classList.remove('shake');
        void sprite.offsetWidth; // Trigger reflow
        sprite.classList.add('shake');

        if (this.enemy.hp <= 0) {
            this.enemy.hp = 0;
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
        // Disable buttons briefly?
        setTimeout(() => this.enemyTurn(), 800);
    }

    handleHeal() {
        if (!this.enemy || this.player.hp <= 0) return;

        const healAmount = Math.floor(Math.random() * 20) + 10;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
        this.logMessage(`You healed for ${healAmount} HP.`);
        this.soundManager.playSound('score'); // Heal sound
        this.updateUI();

        // Player animation
        const sprite = this.container.querySelector('#rpg-player-sprite');
        sprite.classList.add('filter', 'brightness-150', 'sepia');
        setTimeout(() => sprite.classList.remove('filter', 'brightness-150', 'sepia'), 300);

        setTimeout(() => this.enemyTurn(), 800);
    }

    enemyTurn() {
        if (!this.enemy || this.enemy.hp <= 0) return;

        const enemyDamage = Math.floor(Math.random() * this.enemy.attack) + 1;
        this.player.hp -= enemyDamage;
        this.logMessage(`${this.enemy.name} hits you for ${enemyDamage}!`);
        this.soundManager.playSound('explosion'); // Hit player sound

        // Shake Player
        const sprite = this.container.querySelector('#rpg-player-sprite');
        sprite.classList.remove('shake');
        void sprite.offsetWidth;
        sprite.classList.add('shake');

        if (this.player.hp <= 0) {
            this.player.hp = 0;
            this.logMessage("Defeated! Game Over.");
            // Reset player?
            setTimeout(() => {
                // alert("Game Over");
                this.player.hp = this.player.maxHp;
                window.miniGameHub.goBack();
            }, 2000);
        }
        this.updateUI();
    }

    levelUp() {
        this.player.level++;
        this.player.xp = 0;
        this.player.xpToNextLevel = Math.floor(this.player.xpToNextLevel * 1.5);
        this.player.maxHp += 20;
        this.player.hp = this.player.maxHp;
        this.player.attack += 5;
        this.logMessage(`LEVEL UP! You are now level ${this.player.level}.`);
        this.soundManager.playSound('score');
    }
}
