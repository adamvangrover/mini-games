import SaveSystem from '../core/SaveSystem.js';
import { AchievementRegistry } from '../core/AchievementRegistry.js';

function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export default class HallOfFame {
    constructor() {
        this.container = null;
        this.saveSystem = SaveSystem.getInstance();
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
            { label: 'CREDITS', value: this.saveSystem.data.totalCurrency || 0, icon: 'fa-coins' },
            { label: 'ACHIEVEMENTS', value: `${(this.saveSystem.data.achievements || []).length} / ${Object.keys(AchievementRegistry).length}`, icon: 'fa-trophy' }
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
        table.className = `w-full overflow-hidden border ${terminalBorder} rounded bg-black/50 backdrop-blur`;

        // Header Row
        const headerRow = document.createElement('div');
        headerRow.className = `grid grid-cols-12 gap-4 p-4 border-b ${terminalBorder} bg-emerald-900/20 text-emerald-300 text-xs font-bold uppercase tracking-wider`;
        headerRow.innerHTML = `
            <div class="col-span-1">#</div>
            <div class="col-span-5">GAME_ID</div>
            <div class="col-span-3 text-right">HIGH_SCORE</div>
            <div class="col-span-3 text-center">RANK</div>
        `;
        table.appendChild(headerRow);

        // Rows
        const scores = this.saveSystem.data.highScores || {};

        // Convert to array and sort
        // We want to show all games, even if 0 score? Or just played?
        // Let's show all registered games that have a score > 0
        const gameEntries = Object.entries(scores)
            .filter(([_, score]) => score > 0)
            .sort((a, b) => b[1] - a[1]); // This sort is naive (different games have different scales), but acceptable for "Hall of Fame" view

        if (gameEntries.length === 0) {
             table.innerHTML += `<div class="p-8 text-center text-emerald-600 italic">NO DATA_LOGS FOUND. INITIATE GAMEPLAY.</div>`;
        } else {
            gameEntries.forEach(([gameId, score], index) => {
                const name = escapeHTML(gameId.replace(/-game|-/g, ' ').toUpperCase());

                // Simple Rank Logic based on Achievement status
                let rank = "C";
                let rankColor = "text-emerald-700";

                // Check if Gold/Silver/Bronze achievements exist for this game?
                // Or just use generic scale for now.
                // Better: Check if "Master" achievement unlocked for this game
                const achievements = this.saveSystem.data.achievements || [];
                const gameAchievements = Object.values(AchievementRegistry).filter(a => a.gameId === gameId);
                const unlockedCount = gameAchievements.filter(a => achievements.includes(a.id)).length;

                if (unlockedCount >= 2) { rank = "S"; rankColor = "text-yellow-400"; }
                else if (unlockedCount >= 1) { rank = "A"; rankColor = "text-emerald-400"; }
                else if (score > 1000) { rank = "B"; rankColor = "text-emerald-600"; }

                const row = document.createElement('div');
                row.className = `grid grid-cols-12 gap-4 p-4 border-b border-emerald-900/30 hover:bg-emerald-900/10 transition-colors items-center text-sm ${terminalText}`;
                row.innerHTML = `
                    <div class="col-span-1 opacity-50">${(index + 1).toString().padStart(2, '0')}</div>
                    <div class="col-span-5 font-bold flex items-center gap-2">
                        <i class="fas fa-gamepad opacity-50"></i> ${name}
                    </div>
                    <div class="col-span-3 text-right font-mono">${score.toLocaleString()}</div>
                    <div class="col-span-3 text-center text-xs font-bold ${rankColor}">${rank}-CLASS</div>
                `;
                table.appendChild(row);
            });
        }

        gridContainer.appendChild(table);
        this.container.appendChild(gridContainer);

        // Listeners
        const backBtn = document.getElementById('hof-back-btn');
        if (backBtn) backBtn.onclick = () => window.miniGameHub.goBack();

        const trophyBtn = document.getElementById('hof-trophy-btn');
        if (trophyBtn) trophyBtn.onclick = () => window.miniGameHub.transitionToState('TROPHY_ROOM');
    }

    async shutdown() {
        this.container.innerHTML = '';
    }
}
