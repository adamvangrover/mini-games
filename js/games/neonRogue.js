import InputManager from '../core/InputManager.js';
import ParticleSystem from '../core/ParticleSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonRogue {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
    }

    async init(container) {
        this.container = container;
        this.container.classList.add('bg-slate-900');
        this.container.style.position = 'relative';

        // Start on Map
        this.resetRun();
        this.renderMap();
    }

    resetRun() {
        this.player = {
            hp: 50, maxHp: 50, energy: 3, maxEnergy: 3, block: 0,
            deck: this.getStarterDeck(),
            hand: [], discard: [],
            status: { burn: 0, weak: 0, vulnerable: 0 }
        };
        this.map = this.generateMap();
        this.currentFloor = 0;
        this.state = 'MAP'; // MAP, BATTLE, REWARD
    }

    getStarterDeck() {
        const deck = [];
        for(let i=0; i<4; i++) deck.push({ id: 'strike', name: 'Strike', cost: 1, type: 'attack', val: 6, icon: 'fa-sword' });
        for(let i=0; i<4; i++) deck.push({ id: 'defend', name: 'Defend', cost: 1, type: 'skill', val: 5, icon: 'fa-shield' });
        deck.push({ id: 'bash', name: 'Bash', cost: 2, type: 'attack', val: 8, effect: 'vuln', duration: 2, icon: 'fa-gavel' });
        return deck;
    }

    generateMap() {
        // Simple linear map for now: 5 floors
        // 1: Battle, 2: Battle, 3: Rest, 4: Elite, 5: Boss
        return [
            { type: 'battle', name: 'Drone Skirmish', icon: 'fa-robot' },
            { type: 'battle', name: 'Security Bot', icon: 'fa-robot' },
            { type: 'rest', name: 'Neon Shrine', icon: 'fa-campfire' },
            { type: 'elite', name: 'Cyber Knight', icon: 'fa-skull' },
            { type: 'boss', name: 'System Core', icon: 'fa-dragon' }
        ];
    }

    renderMap() {
        this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full bg-slate-900 text-white gap-8">
                <h2 class="text-4xl font-bold text-fuchsia-400">SECTOR ${this.currentFloor + 1}</h2>
                <div class="flex gap-4 items-center">
                    ${this.map.map((node, i) => `
                        <div class="flex flex-col items-center gap-2 ${i === this.currentFloor ? 'scale-125 text-white' : i < this.currentFloor ? 'opacity-30' : 'opacity-60'} transition-all">
                             <div class="w-12 h-12 rounded-full border-2 ${i === this.currentFloor ? 'border-fuchsia-400 bg-fuchsia-900 shadow-[0_0_15px_#d946ef]' : 'border-slate-600 bg-slate-800'} flex items-center justify-center">
                                 <i class="fas ${node.icon}"></i>
                             </div>
                             <span class="text-xs font-mono">${i === this.currentFloor ? 'CURRENT' : node.type.toUpperCase()}</span>
                        </div>
                        ${i < this.map.length - 1 ? '<div class="w-8 h-1 bg-slate-700"></div>' : ''}
                    `).join('')}
                </div>

                <div class="mt-8 p-6 bg-slate-800 rounded border border-slate-600 max-w-md w-full text-center">
                    <h3 class="text-2xl font-bold mb-2">${this.map[this.currentFloor].name}</h3>
                    <p class="text-slate-400 mb-6">Encounter imminent.</p>
                    <button id="enter-node-btn" class="px-8 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded shadow-lg">ENTER</button>
                </div>
            </div>
        `;
        document.getElementById('enter-node-btn').onclick = () => this.enterNode();
    }

    enterNode() {
        const node = this.map[this.currentFloor];
        if (node.type === 'rest') {
            this.renderRest();
        } else {
            this.startBattle(node.type);
        }
    }

    renderRest() {
         this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full bg-slate-900 text-white gap-8">
                <i class="fas fa-campfire text-6xl text-yellow-500 animate-pulse"></i>
                <h2 class="text-3xl font-bold">Neon Shrine</h2>
                <div class="flex gap-8">
                    <button id="rest-heal" class="w-48 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded flex flex-col items-center gap-2">
                        <i class="fas fa-heart text-green-500 text-2xl"></i>
                        <span class="font-bold">Recharge</span>
                        <span class="text-xs text-slate-400">Heal 30% HP</span>
                    </button>
                    <button id="rest-smith" class="w-48 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded flex flex-col items-center gap-2">
                         <i class="fas fa-hammer text-blue-500 text-2xl"></i>
                         <span class="font-bold">Optimize</span>
                         <span class="text-xs text-slate-400">Heal 5 HP</span>
                    </button>
                </div>
            </div>
        `;

        document.getElementById('rest-heal').onclick = () => {
            this.player.hp = Math.min(this.player.maxHp, Math.floor(this.player.hp + this.player.maxHp * 0.3));
            this.completeNode();
        };
        document.getElementById('rest-smith').onclick = () => {
            // Placeholder: Heal small amount
            this.player.hp = Math.min(this.player.maxHp, Math.floor(this.player.hp + 5));
            this.completeNode();
        };
    }

    startBattle(type) {
        this.state = 'BATTLE';
        this.enemy = this.generateEnemy(type);

        // Prepare Deck
        this.player.deck = [...this.player.deck]; // Copy
        this.player.hand = [];
        this.player.discard = [];
        this.player.status = { burn: 0, weak: 0, vulnerable: 0 };
        this.shuffleDeck();

        this.renderBattleUI();
        this.startTurn();
    }

    generateEnemy(type) {
        let enemy = { status: { burn: 0, weak: 0, vulnerable: 0 } };
        if (type === 'boss') return { ...enemy, name: 'System Core', hp: 300, maxHp: 300, icon: 'fa-dragon', color: 'text-purple-500', moves: ['attack', 'heavy', 'buff'] };
        if (type === 'elite') return { ...enemy, name: 'Cyber Knight', hp: 150, maxHp: 150, icon: 'fa-skull', color: 'text-red-500', moves: ['attack', 'heavy'] };
        return { ...enemy, name: 'Drone', hp: 50 + this.currentFloor * 10, maxHp: 50 + this.currentFloor * 10, icon: 'fa-robot', color: 'text-red-400', moves: ['attack'] };
    }

    renderBattleUI() {
        this.container.innerHTML = `
            <div class="flex flex-col h-full p-4 relative">
                <!-- Top: Enemy -->
                <div class="flex-1 flex flex-col items-center justify-center border-b border-slate-700">
                    <div class="text-xl font-bold text-white mb-2">${this.enemy.name}</div>
                    <div class="flex gap-2 mb-2" id="enemy-status"></div>
                    <div id="enemy-sprite" class="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center text-4xl ${this.enemy.color} mb-4 shadow-[0_0_20px_rgba(255,0,0,0.5)] border-2 border-slate-600">
                        <i class="fas ${this.enemy.icon}"></i>
                    </div>
                    <div class="w-64 bg-slate-800 h-6 rounded-full overflow-hidden border border-slate-600 relative">
                        <div id="enemy-hp-bar" class="h-full bg-red-600 w-full transition-all duration-500"></div>
                        <span id="enemy-hp-text" class="absolute inset-0 flex items-center justify-center text-xs text-white font-bold"></span>
                    </div>
                    <div id="enemy-intent" class="mt-2 text-yellow-400 text-sm font-mono animate-pulse">Intent: ???</div>
                </div>

                <!-- Middle: Player Stats -->
                <div class="h-16 flex items-center justify-between px-8 text-white font-bold text-xl bg-slate-800/50">
                     <div class="flex items-center gap-2"><i class="fas fa-heart text-green-500"></i> <span id="player-hp"></span></div>
                     <div class="flex items-center gap-2"><i class="fas fa-bolt text-yellow-500"></i> <span id="player-energy"></span></div>
                     <div class="flex items-center gap-2"><i class="fas fa-shield-alt text-blue-500"></i> <span id="player-block"></span></div>
                     <div class="flex items-center gap-2" id="player-status"></div>
                </div>

                <!-- Bottom: Hand -->
                <div id="hand-container" class="h-48 flex items-center justify-center gap-4 px-4 pb-4 pt-4"></div>

                <button id="end-turn-btn" class="absolute right-4 bottom-64 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded shadow-lg">End Turn</button>
            </div>

             <div id="reward-overlay" class="absolute inset-0 bg-black/90 flex flex-col items-center justify-center hidden z-50">
                <h2 class="text-3xl font-bold text-yellow-400 mb-6">VICTORY!</h2>
                <div class="text-white mb-4">Choose a new card:</div>
                <div id="card-rewards" class="flex gap-4 mb-8"></div>
                <button id="skip-reward-btn" class="px-6 py-2 bg-slate-600 text-white rounded">Skip</button>
            </div>

             <div id="rogue-overlay" class="absolute inset-0 bg-black/95 flex flex-col items-center justify-center hidden z-50">
                <h2 class="text-4xl font-bold text-red-500 mb-4">DEFEAT</h2>
                <button id="rogue-retry-btn" class="px-8 py-3 bg-fuchsia-600 text-white font-bold rounded">Try Again</button>
            </div>
        `;

        document.getElementById('end-turn-btn').onclick = () => this.endTurn();
        document.getElementById('rogue-retry-btn').onclick = () => this.resetRun();
        document.getElementById('skip-reward-btn').onclick = () => this.completeNode();
    }

    startTurn() {
        this.player.energy = this.player.maxEnergy;
        this.player.block = 0;

        // Enemy Intent
        const move = this.enemy.moves[Math.floor(Math.random() * this.enemy.moves.length)];
        let intentVal = 0;
        if (move === 'attack') intentVal = 10 + this.currentFloor * 2;
        else if (move === 'heavy') intentVal = 15 + this.currentFloor * 5;

        // Apply Weak (Player dealt less dmg last turn? No, Weak reduces OUTPUT damage)
        // If enemy is Weak, they deal less damage.
        if (this.enemy.status.weak > 0) {
            intentVal = Math.floor(intentVal * 0.75);
        }

        this.enemy.intent = { type: move, value: intentVal };

        this.drawCards(5);
        this.updateBattleUI();
    }

    shuffleDeck() {
        this.player.deck.sort(() => Math.random() - 0.5);
    }

    drawCards(count) {
        for(let i=0; i<count; i++) {
            if (this.player.deck.length === 0) {
                if (this.player.discard.length === 0) break;
                this.player.deck = [...this.player.discard];
                this.player.discard = [];
                this.shuffleDeck();
            }
            this.player.hand.push(this.player.deck.pop());
        }
    }

    playCard(index) {
        const card = this.player.hand[index];
        if (this.player.energy < card.cost) {
            this.soundManager.playSound('error');
            return;
        }

        this.player.energy -= card.cost;
        this.soundManager.playSound('click');

        if (card.type === 'attack') {
            let dmg = card.val;

            // Check Player Weak
            if (this.player.status.weak > 0) dmg = Math.floor(dmg * 0.75);
            // Check Enemy Vulnerable
            if (this.enemy.status.vulnerable > 0) dmg = Math.floor(dmg * 1.5);

            this.enemy.hp -= dmg;
            this.particleSystem.emit(window.innerWidth/2, 200, '#f00', 10);

            // Apply Effects
            if (card.effect === 'vuln') this.enemy.status.vulnerable += card.duration;
            if (card.effect === 'weak') this.enemy.status.weak += card.duration;
            if (card.effect === 'burn') this.enemy.status.burn += card.duration;

            if (this.enemy.hp <= 0) {
                this.winBattle();
                return;
            }
        } else if (card.type === 'skill') {
            this.player.block += card.val;
        }

        this.player.hand.splice(index, 1);
        this.player.discard.push(card);
        this.updateBattleUI();
    }

    endTurn() {
        // Player Status Ticks
        if (this.player.status.burn > 0) {
            this.player.hp -= 3;
            this.player.status.burn--;
        }
        if (this.player.status.weak > 0) this.player.status.weak--;
        if (this.player.status.vulnerable > 0) this.player.status.vulnerable--;

        // Enemy Status Ticks
        if (this.enemy.status.burn > 0) {
            this.enemy.hp -= 3; // Burn damage
            this.enemy.status.burn--;
            this.particleSystem.emit(window.innerWidth/2, 200, '#fa0', 5);
        }
        if (this.enemy.status.weak > 0) this.enemy.status.weak--;
        if (this.enemy.status.vulnerable > 0) this.enemy.status.vulnerable--;

        if (this.enemy.hp <= 0) {
            this.winBattle();
            return;
        }

        // Enemy Action
        if (this.enemy.intent.type === 'attack' || this.enemy.intent.type === 'heavy') {
            let dmg = this.enemy.intent.value;
            // Vulnerable Player
            if (this.player.status.vulnerable > 0) dmg = Math.floor(dmg * 1.5);

            if (this.player.block > 0) {
                const blocked = Math.min(this.player.block, dmg);
                this.player.block -= blocked;
                dmg -= blocked;
            }
            this.player.hp -= dmg;
            this.soundManager.playSound('explosion');
        }

        if (this.player.hp <= 0) {
            document.getElementById('rogue-overlay').classList.remove('hidden');
            return;
        }

        this.player.discard.push(...this.player.hand);
        this.player.hand = [];
        this.startTurn();
    }

    updateBattleUI() {
        document.getElementById('player-hp').textContent = `${this.player.hp}/${this.player.maxHp}`;
        document.getElementById('player-energy').textContent = `${this.player.energy}/${this.player.maxEnergy}`;
        document.getElementById('player-block').textContent = this.player.block;

        // Status Icons
        const renderStatus = (status) => {
            let html = '';
            if(status.burn > 0) html += `<i class="fas fa-fire text-orange-500" title="Burn: 3 dmg/turn"></i><span class="text-xs">${status.burn}</span> `;
            if(status.weak > 0) html += `<i class="fas fa-heart-crack text-blue-400" title="Weak: -25% Dmg"></i><span class="text-xs">${status.weak}</span> `;
            if(status.vulnerable > 0) html += `<i class="fas fa-shield-virus text-purple-400" title="Vuln: +50% Dmg Taken"></i><span class="text-xs">${status.vulnerable}</span> `;
            return html;
        };

        document.getElementById('player-status').innerHTML = renderStatus(this.player.status);
        document.getElementById('enemy-status').innerHTML = renderStatus(this.enemy.status);

        const hpPct = Math.max(0, (this.enemy.hp / this.enemy.maxHp) * 100);
        document.getElementById('enemy-hp-bar').style.width = `${hpPct}%`;
        document.getElementById('enemy-hp-text').textContent = `${this.enemy.hp}/${this.enemy.maxHp}`;

        let intentText = `${this.enemy.intent.type.toUpperCase()}`;
        if(this.enemy.intent.value) intentText += ` (${this.enemy.intent.value})`;
        document.getElementById('enemy-intent').textContent = intentText;

        const container = document.getElementById('hand-container');
        container.innerHTML = '';
        this.player.hand.forEach((card, i) => {
            const el = document.createElement('div');
            el.className = `w-28 h-40 bg-slate-800 border-2 ${this.player.energy >= card.cost ? 'border-indigo-400 hover:-translate-y-4 cursor-pointer shadow-lg hover:shadow-indigo-500/50' : 'border-slate-600 opacity-50'} rounded-lg p-2 flex flex-col items-center justify-between transition-all duration-200 select-none`;
            el.innerHTML = `
                <div class="w-full flex justify-between text-[10px] font-bold text-indigo-300"><span>${card.type.toUpperCase()}</span><span>${card.cost} EN</span></div>
                <div class="text-3xl text-white mb-1"><i class="fas ${card.icon}"></i></div>
                <div class="text-center leading-tight">
                    <div class="font-bold text-white text-xs mb-1">${card.name}</div>
                    <div class="text-[10px] text-slate-400">${card.type === 'attack' ? `Deal ${card.val}` : `Block ${card.val}`}</div>
                    ${card.effect ? `<div class="text-[9px] text-yellow-300 uppercase">${card.effect} ${card.duration}</div>` : ''}
                </div>
            `;
            el.onclick = () => this.playCard(i);
            container.appendChild(el);
        });
    }

    winBattle() {
        document.getElementById('reward-overlay').classList.remove('hidden');
        const container = document.getElementById('card-rewards');
        container.innerHTML = '';

        const rewards = [
            { id: 'fire', name: 'Fireball', cost: 2, type: 'attack', val: 12, effect: 'burn', duration: 3, icon: 'fa-fire' },
            { id: 'uppercut', name: 'Uppercut', cost: 1, type: 'attack', val: 9, effect: 'weak', duration: 1, icon: 'fa-fist-raised' },
            { id: 'iron', name: 'Iron Wave', cost: 1, type: 'skill', val: 8, icon: 'fa-water' }
        ]; // Need random pool later

        rewards.forEach(card => {
             const el = document.createElement('div');
             el.className = 'w-32 h-44 bg-slate-700 hover:bg-slate-600 border border-slate-500 cursor-pointer p-4 rounded flex flex-col items-center justify-center gap-2';
             el.innerHTML = `<i class="fas ${card.icon} text-3xl"></i><div class="font-bold">${card.name}</div><div class="text-xs text-slate-300">${card.type}</div>`;
             el.onclick = () => {
                 this.player.deck.push(card);
                 this.completeNode();
             };
             container.appendChild(el);
        });
    }

    completeNode() {
        this.currentFloor++;
        if (this.currentFloor >= this.map.length) {
            // Victory
            this.container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-white"><h1 class="text-6xl font-bold text-green-400 mb-4">RUN COMPLETE</h1><p>You conquered the System Core.</p><button class="mt-8 px-6 py-2 bg-slate-700 rounded" onclick="window.miniGameHub.goBack()">Return</button></div>`;
        } else {
            this.renderMap();
        }
    }

    async shutdown() {
        this.container.innerHTML = '';
    }
}
