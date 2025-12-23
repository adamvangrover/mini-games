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
        this.container.classList.add('flex', 'flex-col', 'items-center', 'justify-center', 'min-h-screen', 'bg-slate-900', 'text-white', 'p-4');

        // Header
        const header = document.createElement('div');
        header.className = 'w-full max-w-4xl text-center mb-8';

        const avatar = this.saveSystem.data.avatar || { color: '#00ffff', icon: 'fa-robot' };

        header.innerHTML = `
            <h1 class="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 mb-2 filter drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                TROPHY ROOM
            </h1>
            <div class="flex items-center justify-center gap-4 mb-4">
                 <div class="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-[0_0_20px_currentColor]" style="color: ${avatar.color}; background: rgba(255,255,255,0.1)">
                    <i class="fas ${avatar.icon}"></i>
                 </div>
                 <p class="text-slate-400 text-lg">Your Hall of Fame</p>
            </div>

            <div class="mt-4 flex justify-center gap-8">
                <div class="text-center">
                    <div class="text-3xl font-bold text-cyan-400">${this.saveSystem.data.level || 1}</div>
                    <div class="text-xs text-slate-500 uppercase tracking-widest">Global Level</div>
                </div>
                <div class="text-center">
                    <div class="text-3xl font-bold text-fuchsia-400">${this.saveSystem.data.xp || 0}</div>
                    <div class="text-xs text-slate-500 uppercase tracking-widest">Total XP</div>
                </div>
                <div class="text-center">
                    <div class="text-3xl font-bold text-emerald-400">${this.saveSystem.data.achievements.length}</div>
                    <div class="text-xs text-slate-500 uppercase tracking-widest">Unlocked</div>
                </div>
            </div>

            <button id="trophy-back-btn" class="mt-8 px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full transition-all flex items-center gap-2 mx-auto">
                <i class="fas fa-arrow-left"></i> Back to Hub
            </button>
        `;
        this.container.appendChild(header);

        // Grid
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl pb-20';

        const unlockedIds = this.saveSystem.data.achievements || [];

        Object.values(AchievementRegistry).forEach(ach => {
            const isUnlocked = unlockedIds.includes(ach.id);
            const card = document.createElement('div');

            // 3D Tilt Effect Classes
            card.className = `
                relative p-6 rounded-xl border transition-all duration-500 group perspective-1000
                ${isUnlocked
                    ? 'bg-slate-800/80 border-amber-500/30 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                    : 'bg-slate-900/50 border-slate-800 opacity-60 grayscale hover:opacity-80 hover:grayscale-0'}
            `;

            card.innerHTML = `
                <div class="flex items-start gap-4">
                    <div class="w-16 h-16 rounded-full flex items-center justify-center text-3xl shrink-0
                        ${isUnlocked ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg' : 'bg-slate-800 text-slate-600'}">
                        <i class="${isUnlocked ? (ach.icon || 'fas fa-trophy') : 'fas fa-lock'}"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-xl ${isUnlocked ? 'text-amber-100' : 'text-slate-500'}">${ach.title}</h3>
                        <p class="text-sm ${isUnlocked ? 'text-amber-200/70' : 'text-slate-600'}">${ach.description}</p>
                        <div class="mt-2 text-xs font-mono px-2 py-1 rounded inline-block ${isUnlocked ? 'bg-slate-900/50 text-cyan-400' : 'hidden'}">
                            +${ach.xp} XP
                        </div>
                    </div>
                </div>
                ${isUnlocked ? `
                <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] duration-1000"></div>
                ` : ''}
            `;

            grid.appendChild(card);
        });

        this.container.appendChild(grid);

        // Listeners
        document.getElementById('trophy-back-btn').onclick = () => {
            window.miniGameHub.goBack();
        };
    }

    update(dt) {
        // Optional: Animate floating cards?
    }

    async shutdown() {
        this.container.innerHTML = '';
    }
}
