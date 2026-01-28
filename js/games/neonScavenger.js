
import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonScavenger {
    constructor() {
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.container = null;
        this.grid = [];
        this.cols = 10;
        this.rows = 10;
        this.items = [];
        this.score = 0;
        this.timeLeft = 60;
        this.gameInterval = null;
        this.isActive = false;

        // Item Definitions
        this.itemTypes = [
            { id: 'data_shard', name: 'Data Shard', icon: 'fa-database', color: 'text-blue-400' },
            { id: 'glitch', name: 'Glitch', icon: 'fa-bug', color: 'text-red-500' },
            { id: 'protocol', name: 'Protocol', icon: 'fa-file-code', color: 'text-green-400' },
            { id: 'coin', name: 'Credits', icon: 'fa-coins', color: 'text-yellow-400' }
        ];
    }

    async init(container) {
        this.container = container;
        this.isActive = true;
        this.score = 0;
        this.timeLeft = 60;
        this.items = [];

        this.render();
        this.startGame();
    }

    render() {
        this.container.innerHTML = `
            <div class="flex flex-col h-full bg-slate-900 text-white font-mono p-4 items-center justify-center relative overflow-hidden">
                <!-- HUD -->
                <div class="w-full max-w-md flex justify-between items-center mb-4 bg-slate-800 p-2 rounded border border-slate-700 z-10">
                    <div class="flex flex-col">
                        <span class="text-xs text-slate-400">SCANNER</span>
                        <span class="text-xl font-bold text-cyan-400" id="ns-score">0</span>
                    </div>
                    <div class="flex flex-col text-right">
                        <span class="text-xs text-slate-400">TIME</span>
                        <span class="text-xl font-bold text-red-400" id="ns-time">60</span>
                    </div>
                </div>

                <!-- Grid -->
                <div class="grid grid-cols-10 gap-1 bg-slate-800 p-2 rounded border border-cyan-900/50 shadow-[0_0_20px_rgba(0,255,255,0.1)] z-10" id="ns-grid">
                    ${Array(100).fill(0).map((_, i) => `
                        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-slate-900 border border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-700 hover:border-cyan-500 transition-colors" data-idx="${i}">
                            <i class="fas fa-question text-slate-800 opacity-0 group-hover:opacity-20"></i>
                        </div>
                    `).join('')}
                </div>

                <!-- Message Overlay -->
                <div id="ns-msg" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-cyan-400 opacity-0 pointer-events-none transition-opacity z-20"></div>

                <!-- Background FX -->
                <div class="absolute inset-0 pointer-events-none opacity-20">
                    <div class="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent"></div>
                </div>
            </div>
        `;

        // Bind Events
        this.container.querySelectorAll('#ns-grid > div').forEach(cell => {
            cell.onclick = (e) => this.handleClick(e.currentTarget);
        });
    }

    startGame() {
        // Place Items
        this.grid = Array(100).fill(null);
        let itemsToPlace = 20;
        while (itemsToPlace > 0) {
            const idx = Math.floor(Math.random() * 100);
            if (!this.grid[idx]) {
                const type = this.itemTypes[Math.floor(Math.random() * this.itemTypes.length)];
                this.grid[idx] = type;
                itemsToPlace--;
            }
        }

        // Timer
        if (this.gameInterval) clearInterval(this.gameInterval);
        this.gameInterval = setInterval(() => {
            if (!this.isActive) return;
            this.timeLeft--;
            const timeEl = document.getElementById('ns-time');
            if(timeEl) timeEl.textContent = this.timeLeft;

            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    handleClick(cell) {
        if (!this.isActive || cell.classList.contains('revealed')) return;

        const idx = parseInt(cell.dataset.idx);
        cell.classList.add('revealed');
        cell.classList.remove('cursor-pointer', 'hover:bg-slate-700');

        const item = this.grid[idx];
        if (item) {
            // Found Item
            cell.innerHTML = `<i class="fas ${item.icon} ${item.color} text-lg animate-bounce"></i>`;
            cell.classList.add('bg-slate-800');
            this.soundManager.playSound('coin'); // Or a generic blip
            this.score += 10;
            this.updateScore();
            this.showMsg(`+10 ${item.name}`);

            // Check Quests
            this.checkQuests(item);
        } else {
            // Empty
            cell.classList.add('bg-slate-900/50');
            this.score = Math.max(0, this.score - 1); // Penalty
            this.updateScore();
        }
    }

    checkQuests(item) {
        const quests = this.saveSystem.getDailyQuests();
        quests.forEach(q => {
            if (q.claimed || q.progress >= q.target) return;

            const desc = q.desc.toLowerCase();
            const itemName = item.name.toLowerCase();
            const itemId = item.id.toLowerCase();

            let match = false;
            if (desc.includes(itemName)) match = true;
            if (itemId === 'data_shard' && desc.includes('data')) match = true;
            if (itemId === 'glitch' && (desc.includes('glitch') || desc.includes('bug'))) match = true;
            if (itemId === 'protocol' && desc.includes('protocol')) match = true;

            if (match) {
                this.saveSystem.updateQuestProgress(q.id, 1);
                this.showMsg("Quest Updated!", "text-purple-400");
                this.soundManager.playSound('score');
            }
        });
    }

    updateScore() {
        const el = document.getElementById('ns-score');
        if(el) el.textContent = this.score;
    }

    showMsg(text, colorClass = "text-cyan-400") {
        const el = document.getElementById('ns-msg');
        if (!el) return;
        el.textContent = text;
        el.className = `absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold opacity-100 pointer-events-none transition-opacity z-20 ${colorClass}`;

        setTimeout(() => {
            if(el) el.classList.add('opacity-0');
        }, 800);
    }

    endGame() {
        this.isActive = false;
        clearInterval(this.gameInterval);
        if (window.miniGameHub) {
            window.miniGameHub.showGameOver(this.score, () => this.init(this.container));
        }
    }

    shutdown() {
        this.isActive = false;
        clearInterval(this.gameInterval);
        this.container.innerHTML = '';
    }
}
