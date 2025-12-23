import SaveSystem from '../core/SaveSystem.js';
import { AchievementRegistry } from '../core/AchievementRegistry.js';

export default class TrophyRoom {
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
        this.container.classList.add('game-container', 'w-full', 'h-full', 'bg-slate-900', 'overflow-y-auto', 'p-8', 'custom-scrollbar');

        const avatar = this.saveSystem.data.avatar || { color: '#00ffff', icon: 'fa-robot' };
        const achievements = Object.values(AchievementRegistry);
        const unlockedIds = this.saveSystem.data.achievements || [];
        const unlockedCount = unlockedIds.length;
        const totalCount = achievements.length;
        const percent = Math.round((unlockedCount / totalCount) * 100) || 0;

        // Header Section with Progress
        const header = document.createElement('div');
        header.className = 'w-full max-w-6xl mx-auto text-center mb-12 relative';

        header.innerHTML = `
            <div class="absolute top-0 right-0">
                <button id="tr-hof-btn" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-cyan-400 text-sm font-bold flex items-center gap-2 transition-all hover:scale-105">
                    <i class="fas fa-list-ol"></i> Hall of Fame
                </button>
            </div>

            <div class="inline-block relative group cursor-pointer mb-6">
                <div class="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-[0_0_30px_currentColor] transition-transform group-hover:scale-110"
                     style="color: ${avatar.color}; background: rgba(255,255,255,0.05); border: 2px solid ${avatar.color}">
                    <i class="fas ${avatar.icon}"></i>
                </div>
                <div class="absolute -bottom-2 -right-2 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-full border border-slate-600">
                    Lvl ${this.saveSystem.data.level || 1}
                </div>
            </div>

            <h1 class="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 via-fuchsia-500 to-amber-500 mb-2 filter drop-shadow-[0_0_15px_rgba(192,38,211,0.4)] tracking-tight">
                TROPHY ROOM
            </h1>
            <p class="text-slate-400 text-lg mb-8">Collection & Achievements</p>

            <div class="max-w-xl mx-auto bg-slate-800/50 rounded-full h-4 p-1 border border-slate-700 relative overflow-hidden">
                <div class="h-full rounded-full bg-gradient-to-r from-fuchsia-600 to-amber-400 relative overflow-hidden" style="width: ${percent}%">
                    <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
                <div class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
                    ${unlockedCount} / ${totalCount} UNLOCKED (${percent}%)
                </div>
            </div>
        `;
        this.container.appendChild(header);

        // Group Achievements by Game
        const grouped = {};
        achievements.forEach(ach => {
            const gameId = ach.gameId || 'global';
            if (!grouped[gameId]) grouped[gameId] = [];
            grouped[gameId].push(ach);
        });

        const gridContainer = document.createElement('div');
        gridContainer.className = "w-full max-w-6xl mx-auto pb-20 space-y-12";

        // Global First, then others
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
            if (a === 'global') return -1;
            if (b === 'global') return 1;
            return a.localeCompare(b);
        });

        sortedKeys.forEach(gameId => {
            const group = grouped[gameId];
            const groupName = gameId === 'global' ? 'Global Milestones' : gameId.replace(/-game|-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            const groupSection = document.createElement('div');
            groupSection.innerHTML = `
                <div class="flex items-center gap-4 mb-6">
                    <div class="h-px bg-slate-700 flex-1"></div>
                    <h2 class="text-2xl font-bold text-slate-200 uppercase tracking-widest bg-slate-900 px-4 border border-slate-700 rounded-full py-1">
                        ${groupName}
                    </h2>
                    <div class="h-px bg-slate-700 flex-1"></div>
                </div>
            `;

            const cardsGrid = document.createElement('div');
            cardsGrid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6";

            group.forEach(ach => {
                const isUnlocked = unlockedIds.includes(ach.id);

                // Style variations
                const bgClass = isUnlocked
                    ? "bg-slate-800 border-fuchsia-500/50 shadow-[0_0_15px_rgba(192,38,211,0.1)]"
                    : "bg-slate-900/50 border-slate-800 opacity-60 grayscale";

                const iconColor = isUnlocked ? "text-amber-400" : "text-slate-600";
                const titleColor = isUnlocked ? "text-white" : "text-slate-500";

                cardsGrid.innerHTML += `
                    <div class="trophy-card p-6 rounded-xl border ${bgClass} relative group overflow-hidden transition-all duration-300 hover:scale-105 hover:border-fuchsia-400">
                        ${isUnlocked ? '<div class="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-amber-500/5 pointer-events-none"></div>' : ''}

                        <div class="flex flex-col items-center text-center gap-4 relative z-10">
                            <div class="text-5xl ${iconColor} filter drop-shadow-md transition-transform group-hover:rotate-12">
                                <i class="fas ${ach.icon}"></i>
                            </div>
                            <div>
                                <h3 class="font-bold ${titleColor} text-lg leading-tight mb-1">${ach.title}</h3>
                                <p class="text-xs text-slate-400">${ach.description}</p>
                            </div>
                            ${isUnlocked ? `
                                <div class="mt-2 text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-900/30 px-2 py-1 rounded">
                                    <i class="fas fa-check"></i> UNLOCKED
                                </div>
                            ` : `
                                <div class="mt-2 text-xs font-bold text-slate-600 flex items-center gap-1 bg-slate-800 px-2 py-1 rounded">
                                    <i class="fas fa-lock"></i> LOCKED
                                </div>
                            `}
                        </div>
                    </div>
                `;
            });
            
            groupSection.appendChild(cardsGrid);
            gridContainer.appendChild(groupSection);
        });

        this.container.appendChild(gridContainer);

        // Footer Back Button
        const footer = document.createElement('div');
        footer.className = "fixed bottom-8 left-0 w-full flex justify-center pointer-events-none";
        footer.innerHTML = `
            <button id="tr-back-btn" class="pointer-events-auto px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-full border border-slate-600 shadow-xl flex items-center gap-3 transition-transform hover:-translate-y-1">
                <i class="fas fa-arrow-left"></i> Back to Hub
            </button>
        `;
        this.container.appendChild(footer);

        // Listeners
        document.getElementById('tr-back-btn').onclick = () => window.miniGameHub.goBack();
        document.getElementById('tr-hof-btn').onclick = () => window.miniGameHub.transitionToState('IN_GAME', { gameId: 'hall-of-fame' });
    }

    async shutdown() {
        this.container.innerHTML = '';
    }
}
