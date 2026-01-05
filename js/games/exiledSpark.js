
import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';

export default class ExiledSpark {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.isActive = false;

        this.state = 'START';
        this.log = [];
        this.player = { hp: 100, credits: 0, items: [] };
    }

    async init(container) {
        this.container = container;
        container.innerHTML = ''; // Clear
        container.innerHTML = `
            <div class="flex flex-col h-full bg-black text-green-500 font-mono p-4 overflow-hidden relative">
                <div id="rpg-log" class="flex-1 overflow-y-auto mb-4 border border-green-800 p-2 shadow-[inset_0_0_20px_rgba(0,50,0,0.5)]"></div>
                <div id="rpg-controls" class="grid grid-cols-2 gap-2 h-32"></div>
                <div class="absolute top-4 right-4 text-xs border border-green-500 p-2">
                    HP: <span id="rpg-hp">100</span> | CR: <span id="rpg-cr">0</span>
                </div>
                <button class="back-btn absolute top-4 left-4 bg-red-900/50 hover:bg-red-800 text-white px-2 py-1 text-xs border border-red-500">EXIT</button>
            </div>
        `;

        this.logEl = container.querySelector('#rpg-log');
        this.controlsEl = container.querySelector('#rpg-controls');
        this.hpEl = container.querySelector('#rpg-hp');
        this.crEl = container.querySelector('#rpg-cr');

        container.querySelector('.back-btn').addEventListener('click', () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        });

        this.isActive = true;
        this.print("SYSTEM BOOT... CONNECTING TO NEURAL LINK...");
        setTimeout(() => this.transitionTo('START'), 1000);
    }

    print(text, color='text-green-500') {
        const line = document.createElement('div');
        line.className = `mb-1 ${color} animate-pulse`;
        line.textContent = `> ${text}`;
        this.logEl.appendChild(line);
        this.logEl.scrollTop = this.logEl.scrollHeight;
        this.soundManager.playSound('click'); // Typewriter sound approximation
    }

    updateStats() {
        if(this.hpEl) this.hpEl.textContent = this.player.hp;
        if(this.crEl) this.crEl.textContent = this.player.credits;
    }

    transitionTo(state) {
        if (!this.isActive) return;
        this.state = state;
        this.controlsEl.innerHTML = '';

        const scenes = {
            'START': {
                text: "You wake up in a scrapyard. Rain falls acid-green.",
                options: [
                    { text: "Search Scraps", action: () => this.handleSearch() },
                    { text: "Walk to City", action: () => this.transitionTo('CITY_GATE') }
                ]
            },
            'CITY_GATE': {
                text: "The Neon City gate towers above. Guards are scanning IDs.",
                options: [
                    { text: "Bribe Guard (10 CR)", action: () => this.handleBribe() },
                    { text: "Sneak In", action: () => this.handleSneak() },
                    { text: "Return to Scrapyard", action: () => this.transitionTo('START') }
                ]
            },
            'ALLEY': {
                text: "You are in a dark alley. Cyber-rats skitter.",
                options: [
                    { text: "Fight Rat", action: () => this.handleCombat('Rat', 10, 5) },
                    { text: "Go to Bar", action: () => this.transitionTo('BAR') }
                ]
            },
            'BAR': {
                text: "The 'Short Circuit' bar. Music thumps.",
                options: [
                    { text: "Buy Drink (5 CR)", action: () => this.handleDrink() },
                    { text: "Hack Terminal", action: () => this.handleHack() },
                    { text: "Leave", action: () => this.transitionTo('ALLEY') }
                ]
            },
            'GAME_OVER': {
                text: "CRITICAL FAILURE. SIGNAL LOST.",
                options: [
                    { text: "Reboot System", action: () => this.init(this.container) } // Restart
                ]
            }
        };

        const scene = scenes[state];
        if (scene) {
            this.print(scene.text, 'text-white');
            scene.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = "bg-green-900/30 border border-green-600 hover:bg-green-700/50 text-green-300 p-2 text-sm text-left transition-colors";
                btn.textContent = `[ ${opt.text} ]`;
                btn.onclick = () => {
                    this.print(`Selected: ${opt.text}`, 'text-gray-500');
                    opt.action();
                };
                this.controlsEl.appendChild(btn);
            });
        }
    }

    handleSearch() {
        const found = Math.floor(Math.random() * 5) + 1;
        this.player.credits += found;
        this.print(`Found ${found} credits in a broken droid.`);
        this.updateStats();
        this.transitionTo('START');
    }

    handleBribe() {
        if (this.player.credits >= 10) {
            this.player.credits -= 10;
            this.print("Guard nods. You are in.");
            this.updateStats();
            this.transitionTo('ALLEY');
        } else {
            this.print("Not enough credits. Guard shoves you.");
            this.player.hp -= 5;
            this.updateStats();
            if (this.player.hp <= 0) this.transitionTo('GAME_OVER');
        }
    }

    handleSneak() {
        if (Math.random() > 0.5) {
            this.print("Success! You slipped past the sensors.");
            this.transitionTo('ALLEY');
        } else {
            this.print("Detected! Defense turret fires.");
            this.player.hp -= 20;
            this.updateStats();
            if (this.player.hp <= 0) this.transitionTo('GAME_OVER');
            else this.transitionTo('START');
        }
    }

    handleCombat(enemy, hp, dmg) {
        // Simple turn logic
        this.print(`Combat initiated with ${enemy}!`, 'text-red-500');

        const win = Math.random() > 0.3; // 70% chance
        if (win) {
            this.print(`You defeated the ${enemy}!`);
            this.player.credits += 10;
            this.updateStats();
            this.transitionTo('ALLEY');
        } else {
            this.print(`The ${enemy} hit you!`, 'text-red-500');
            this.player.hp -= dmg;
            this.updateStats();
            if (this.player.hp <= 0) this.transitionTo('GAME_OVER');
            else this.transitionTo('ALLEY'); // Fled
        }
    }

    handleDrink() {
        if (this.player.credits >= 5) {
            this.player.credits -= 5;
            this.player.hp = Math.min(100, this.player.hp + 10);
            this.print("Refreshing... Systems repaired.");
            this.updateStats();
        } else {
            this.print("Bartender ignores you.");
        }
    }

    handleHack() {
        this.print("Hacking...");
        setTimeout(() => {
            if (Math.random() > 0.6) {
                this.print("Access Granted. Data sold.");
                this.player.credits += 20;
                this.updateStats();
            } else {
                this.print("Firewall detected. Shock received.");
                this.player.hp -= 10;
                this.updateStats();
                if (this.player.hp <= 0) this.transitionTo('GAME_OVER');
            }
        }, 1000);
    }

    shutdown() {
        this.isActive = false;
        // DOM is cleared by Main Loop usually, but good practice
    }
}
