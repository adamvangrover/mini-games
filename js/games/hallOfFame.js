import SaveSystem from '../core/SaveSystem.js';

export default class HallOfFame {
    constructor() {
        this.container = null;
        this.saveSystem = SaveSystem.getInstance();
        // Thresholds for ranking (shared with TrophyRoom logic conceptually, but defined here for display)
        this.thresholds = {
            'snake-game': { bronze: 10, silver: 20, gold: 50 },
            'pong-game': { bronze: 3, silver: 5, gold: 10 },
            'space-game': { bronze: 1000, silver: 5000, gold: 10000 },
            'breakout-game': { bronze: 500, silver: 1000, gold: 2000 },
            'tetris-game': { bronze: 1000, silver: 5000, gold: 10000 },
            'neon-jump': { bronze: 500, silver: 1500, gold: 3000 },
            'neon-slice': { bronze: 100, silver: 300, gold: 500 },
            'neon-stack': { bronze: 5, silver: 10, gold: 20 },
            'neon-flap': { bronze: 5, silver: 10, gold: 20 },
            'neon-2048': { bronze: 1000, silver: 2048, gold: 5000 },
            'sudoku-game': { bronze: 100, silver: 500, gold: 800 },
            'neon-zip-game': { bronze: 1000, silver: 5000, gold: 10000 },
            'neon-galaga-game': { bronze: 1000, silver: 5000, gold: 10000 },
            'neon-flow-game': { bronze: 5, silver: 10, gold: 20 },
            'neon-memory': { bronze: 5, silver: 10, gold: 15 },
        };
    }

    async init(container) {
        this.container = container;
        this.render();
    }

    render() {
        this.container.innerHTML = '';
        this.container.classList.remove('hidden');
        this.container.classList.add('game-container', 'w-full', 'h-full', 'bg-black', 'overflow-y-auto', 'p-8', 'custom-scrollbar', 'font-mono');

        // Styles
        const terminalText = "text-emerald-400";
        const terminalBorder = "border-emerald-500/30";
        const terminalBg = "bg-emerald-900/10";

        // Header
        const header = document.createElement('div');
        header.className = 'w-full max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-end border-b-2 border-emerald-500 pb-4';

        header.innerHTML = `
            <div>
                <h1 class="text-4xl md:text-6xl font-bold ${terminalText} tracking-tighter mb-2 glitched-text" data-text="HALL_OF_FAME">
                    HALL_OF_FAME
                </h1>
                <p class="text-emerald-600/80 text-sm uppercase tracking-[0.2em]">> ACCESSING GLOBAL ARCHIVES...</p>
            </div>
            <div class="flex gap-4 mt-4 md:mt-0">
                 <button id="hof-trophy-btn" class="px-4 py-2 ${terminalBg} border ${terminalBorder} ${terminalText} hover:bg-emerald-500 hover:text-black transition-all text-xs uppercase tracking-widest">
                    <i class="fas fa-trophy mr-2"></i>View Trophies
                </button>
                <button id="hof-back-btn" class="px-4 py-2 ${terminalBg} border ${terminalBorder} ${terminalText} hover:bg-emerald-500 hover:text-black transition-all text-xs uppercase tracking-widest">
                    <i class="fas fa-arrow-left mr-2"></i>Exit System
                </button>
            </div>
        `;
        this.container.appendChild(header);

        // Stats Bar
        const stats = document.createElement('div');
        stats.className = "w-full max-w-6xl mx-auto mb-12 grid grid-cols-2 md:grid-cols-4 gap-4";

        const statsData = [
            { label: 'OPERATOR_LEVEL', value: this.saveSystem.data.level || 1, icon: 'fa-user-astronaut' },
            { label: 'TOTAL_XP', value: this.saveSystem.data.xp || 0, icon: 'fa-star' },
            { label: 'CREDITS', value: this.saveSystem.data.currency || 0, icon: 'fa-coins' },
            { label: 'GAMES_LOGGED', value: Object.keys(this.saveSystem.data.highScores || {}).length, icon: 'fa-gamepad' }
        ];

        statsData.forEach(stat => {
            stats.innerHTML += `
                <div class="${terminalBg} border ${terminalBorder} p-4 flex items-center gap-4">
                    <div class="text-2xl ${terminalText} opacity-50"><i class="fas ${stat.icon}"></i></div>
                    <div>
                        <div class="text-xs text-emerald-600 uppercase tracking-widest">${stat.label}</div>
                        <div class="text-2xl font-bold ${terminalText}">${stat.value}</div>
                    </div>
                </div>
            `;
        });
        this.container.appendChild(stats);

        // Leaderboard Grid
        const gridContainer = document.createElement('div');
        gridContainer.className = "w-full max-w-6xl mx-auto";
        gridContainer.innerHTML = `<h2 class="text-xl ${terminalText} mb-4 uppercase tracking-widest border-b ${terminalBorder} pb-2"><i class="fas fa-list-ol mr-2"></i> HIGH_SCORE_DATABASE</h2>`;

        const table = document.createElement('div');
        table.className = "w-full overflow-hidden border ${terminalBorder} rounded bg-black/50 backdrop-blur";

        // Header Row
        const headerRow = document.createElement('div');
        headerRow.className = "grid grid-cols-12 gap-4 p-4 border-b ${terminalBorder} bg-emerald-900/20 text-emerald-300 text-xs font-bold uppercase tracking-wider";
        headerRow.innerHTML = `
            <div class="col-span-1">#</div>
            <div class="col-span-5">GAME_ID</div>
            <div class="col-span-3 text-right">HIGH_SCORE</div>
            <div class="col-span-3 text-center">RATING</div>
        `;
        table.appendChild(headerRow);

        // Rows
        const scores = this.saveSystem.data.highScores || {};
        const sortedGames = Object.keys(scores).sort((a, b) => scores[b] - scores[a]); // Sort by score? No, different scales. Sort by name?
        // Actually, let's sort by "tier" value, then name.

        const gameList = [...new Set([...Object.keys(this.thresholds), ...Object.keys(scores)])];

        gameList.sort();

        gameList.forEach((gameId, index) => {
            const score = scores[gameId] || 0;
            const threshold = this.thresholds[gameId] || { bronze: 100, silver: 500, gold: 1000 };

            let rating = "UNRANKED";
            let ratingColor = "text-slate-600";

            if (score >= threshold.gold) {
                rating = "S-CLASS (GOLD)";
                ratingColor = "text-yellow-400";
            } else if (score >= threshold.silver) {
                rating = "A-CLASS (SILVER)";
                ratingColor = "text-gray-300";
            } else if (score >= threshold.bronze) {
                rating = "B-CLASS (BRONZE)";
                ratingColor = "text-orange-400";
            }

            const name = gameId.replace(/-game|-/g, ' ').toUpperCase();

            const row = document.createElement('div');
            row.className = `grid grid-cols-12 gap-4 p-4 border-b border-emerald-900/30 hover:bg-emerald-900/10 transition-colors items-center text-sm ${terminalText}`;
            row.innerHTML = `
                <div class="col-span-1 opacity-50">${(index + 1).toString().padStart(2, '0')}</div>
                <div class="col-span-5 font-bold">${name}</div>
                <div class="col-span-3 text-right font-mono">${score.toLocaleString()}</div>
                <div class="col-span-3 text-center text-xs font-bold ${ratingColor}">${rating}</div>
            `;
            table.appendChild(row);
        });

        gridContainer.appendChild(table);
        this.container.appendChild(gridContainer);

        // Listeners
        const backBtn = document.getElementById('hof-back-btn');
        if (backBtn) backBtn.onclick = () => window.miniGameHub.goBack();

        const trophyBtn = document.getElementById('hof-trophy-btn');
        if (trophyBtn) trophyBtn.onclick = () => window.miniGameHub.transitionToState('IN_GAME', { gameId: 'trophy-room' });
    }

    async shutdown() {
        this.container.innerHTML = '';
    }
}
