import SoundManager from '../core/SoundManager.js';

export default class NeonRPS {
    constructor() {
        this.container = null;
        this.score = { player: 0, cpu: 0, draws: 0 };
        this.history = []; // Last 5 results
        this.choices = [
            { id: 'rock', icon: 'fa-hand-rock', beats: ['scissors', 'lizard'], color: 'text-gray-400' },
            { id: 'paper', icon: 'fa-hand-paper', beats: ['rock', 'spock'], color: 'text-white' },
            { id: 'scissors', icon: 'fa-hand-scissors', beats: ['paper', 'lizard'], color: 'text-red-400' },
            { id: 'lizard', icon: 'fa-hand-lizard', beats: ['spock', 'paper'], color: 'text-green-400' },
            { id: 'spock', icon: 'fa-hand-spock', beats: ['scissors', 'rock'], color: 'text-blue-400' }
        ];
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = 'game-container flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-sans';

        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="relative w-full max-w-4xl p-6 flex flex-col items-center">
                <button class="absolute top-0 left-4 text-slate-500 hover:text-white" onclick="window.miniGameHub.goBack()">
                    <i class="fas fa-arrow-left text-2xl"></i>
                </button>

                <h1 class="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">RPS + LIZARD SPOCK</h1>
                <p class="text-sm text-slate-400 mb-8 italic">"Scissors cuts Paper, Paper covers Rock, Rock crushes Lizard, Lizard poisons Spock, Spock smashes Scissors, Scissors decapitates Lizard, Lizard eats Paper, Paper disproves Spock, Spock vaporizes Rock, (and as it always has) Rock crushes Scissors."</p>

                <div class="flex justify-between w-full mb-8 px-10">
                    <div class="text-center">
                        <p class="text-slate-400 text-sm">PLAYER</p>
                        <p class="text-4xl font-mono text-cyan-400" id="score-player">${this.score.player}</p>
                    </div>
                     <div class="text-center">
                        <p class="text-slate-400 text-sm">DRAWS</p>
                        <p class="text-2xl font-mono text-slate-500" id="score-draws">${this.score.draws}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-slate-400 text-sm">CPU</p>
                        <p class="text-4xl font-mono text-red-400" id="score-cpu">${this.score.cpu}</p>
                    </div>
                </div>

                <!-- Battle Area -->
                <div id="battle-area" class="h-64 w-full flex items-center justify-center gap-12 mb-8">
                    <div id="player-choice-display" class="w-40 h-40 rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center text-6xl text-slate-700">
                        <i class="fas fa-question"></i>
                    </div>
                    <div class="text-2xl font-bold text-slate-600">VS</div>
                    <div id="cpu-choice-display" class="w-40 h-40 rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center text-6xl text-slate-700">
                        <i class="fas fa-question"></i>
                    </div>
                </div>

                <div id="result-message" class="h-8 text-2xl font-bold text-white mb-8"></div>

                <!-- Controls -->
                <div class="flex flex-wrap justify-center gap-4">
                    ${this.choices.map(c => `
                        <button class="choice-btn group relative w-24 h-24 rounded-xl bg-slate-800 border border-slate-600 hover:border-cyan-400 hover:bg-slate-700 transition-all transform hover:scale-110 flex flex-col items-center justify-center gap-2" data-choice="${c.id}">
                            <i class="fas ${c.icon} text-3xl ${c.color} group-hover:animate-bounce"></i>
                            <span class="text-xs font-bold uppercase">${c.id}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        // Bind events
        this.container.querySelectorAll('.choice-btn').forEach(btn => {
            btn.onclick = () => this.playRound(btn.dataset.choice);
        });
    }

    playRound(playerChoiceId) {
        if (this.animating) return;
        this.animating = true;

        const cpuChoiceId = this.choices[Math.floor(Math.random() * this.choices.length)].id;
        const playerChoice = this.choices.find(c => c.id === playerChoiceId);
        const cpuChoice = this.choices.find(c => c.id === cpuChoiceId);

        // Reset UI
        const pDisplay = document.getElementById('player-choice-display');
        const cDisplay = document.getElementById('cpu-choice-display');
        const msg = document.getElementById('result-message');

        // Shake Animation
        pDisplay.innerHTML = '<i class="fas fa-hand-rock text-slate-500 animate-pulse"></i>';
        cDisplay.innerHTML = '<i class="fas fa-hand-rock text-slate-500 animate-pulse"></i>';
        msg.textContent = "FIGHT!";
        msg.className = "h-8 text-2xl font-bold text-yellow-400 mb-8 animate-pulse";
        SoundManager.getInstance().playSound('hover');

        let shakes = 0;
        const interval = setInterval(() => {
            shakes++;
            pDisplay.style.transform = `translateY(${shakes % 2 === 0 ? -10 : 10}px)`;
            cDisplay.style.transform = `translateY(${shakes % 2 === 0 ? -10 : 10}px)`;

            if (shakes >= 6) {
                clearInterval(interval);
                pDisplay.style.transform = 'none';
                cDisplay.style.transform = 'none';
                this.resolveRound(playerChoice, cpuChoice);
                this.animating = false;
            }
        }, 100);
    }

    resolveRound(p, c) {
        const pDisplay = document.getElementById('player-choice-display');
        const cDisplay = document.getElementById('cpu-choice-display');

        pDisplay.innerHTML = `<i class="fas ${p.icon} ${p.color}"></i>`;
        pDisplay.className = `w-40 h-40 rounded-full border-4 border-cyan-500 bg-slate-800 flex items-center justify-center text-6xl shadow-[0_0_20px_cyan]`;

        cDisplay.innerHTML = `<i class="fas ${c.icon} ${c.color}"></i>`;
        cDisplay.className = `w-40 h-40 rounded-full border-4 border-red-500 bg-slate-800 flex items-center justify-center text-6xl shadow-[0_0_20px_red]`;

        const msg = document.getElementById('result-message');

        if (p.id === c.id) {
            msg.textContent = "DRAW!";
            msg.className = "h-8 text-3xl font-bold text-slate-300 mb-8";
            this.score.draws++;
            SoundManager.getInstance().playSound('click');
        } else if (p.beats.includes(c.id)) {
            const verb = this.getVerb(p.id, c.id);
            msg.textContent = `${p.id.toUpperCase()} ${verb} ${c.id.toUpperCase()}! YOU WIN!`;
            msg.className = "h-8 text-3xl font-bold text-green-400 mb-8 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]";
            this.score.player++;
            SoundManager.getInstance().playSound('score');
            window.miniGameHub.showToast("Victory!");
        } else {
            const verb = this.getVerb(c.id, p.id);
            msg.textContent = `${c.id.toUpperCase()} ${verb} ${p.id.toUpperCase()}! YOU LOSE!`;
            msg.className = "h-8 text-3xl font-bold text-red-500 mb-8 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]";
            this.score.cpu++;
            SoundManager.getInstance().playSound('explosion'); // Lose sound
        }

        this.updateScoreboard();
    }

    getVerb(winner, loser) {
        const map = {
            'rock': { 'scissors': 'CRUSHES', 'lizard': 'CRUSHES' },
            'paper': { 'rock': 'COVERS', 'spock': 'DISPROVES' },
            'scissors': { 'paper': 'CUTS', 'lizard': 'DECAPITATES' },
            'lizard': { 'spock': 'POISONS', 'paper': 'EATS' },
            'spock': { 'scissors': 'SMASHES', 'rock': 'VAPORIZES' }
        };
        return map[winner][loser] || 'BEATS';
    }

    updateScoreboard() {
        document.getElementById('score-player').textContent = this.score.player;
        document.getElementById('score-cpu').textContent = this.score.cpu;
        document.getElementById('score-draws').textContent = this.score.draws;
    }

    update(dt) {
        // No loop needed
    }

    draw() {
        // DOM based
    }

    shutdown() {
        // Cleanup
    }
}
