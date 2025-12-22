import SaveSystem from '../core/SaveSystem.js';

export default class TrophyRoom {
    constructor() {
        this.container = null;
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
        };
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = "game-container w-full h-full bg-slate-900 overflow-y-auto p-8";

        const saveSystem = SaveSystem.getInstance();
        const scores = saveSystem.data.highScores || {};

        // Header
        const header = document.createElement('div');
        header.className = "flex justify-between items-center mb-8 max-w-5xl mx-auto";
        header.innerHTML = `
            <div class="flex flex-col">
                <h1 class="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                    <i class="fas fa-trophy mr-2"></i> HALL OF FAME
                </h1>
                <div class="text-slate-400 text-sm mt-1">
                    <span class="mr-4"><i class="fas fa-coins text-yellow-400"></i> Coins: ${saveSystem.getCurrency()}</span>
                    <span><i class="fas fa-gamepad text-cyan-400"></i> Games Played: ${saveSystem.getStat('total_games_played')}</span>
                </div>
            </div>
            <button id="trophy-exit" class="px-4 py-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 text-slate-300 transition">
                <i class="fas fa-times mr-2"></i> Close
            </button>
        `;
        this.container.appendChild(header);

        // Achievements Section
        const achievementsList = [
            { id: 'first_play', name: 'First Steps', desc: 'Play your first game', condition: (s, sys) => sys.getStat('total_games_played') >= 1, icon: 'fa-play' },
            { id: 'coin_collector', name: 'Coin Collector', desc: 'Earn 100 Coins', condition: (s, sys) => sys.getCurrency() >= 100, icon: 'fa-coins' },
            { id: 'galaga_vet', name: 'Space Ace', desc: 'Destroy 50 Enemies in Galaga', condition: (s, sys) => sys.getStat('galaga_enemies') >= 50, icon: 'fa-jet-fighter' },
            { id: 'sudoku_solver', name: 'Logic Mind', desc: 'Solve 1 Sudoku', condition: (s, sys) => sys.getStat('sudoku_wins') >= 1, icon: 'fa-brain' },
            { id: 'zen_gardener', name: 'Inner Peace', desc: 'Visit Zen Garden 5 times', condition: (s, sys) => sys.getStat('zen_visits') >= 5, icon: 'fa-spa' },
        ];

        const achSection = document.createElement('div');
        achSection.className = "max-w-5xl mx-auto mb-8";
        achSection.innerHTML = `<h2 class="text-2xl font-bold text-white mb-4 border-b border-slate-700 pb-2">Achievements</h2>`;
        
        const achGrid = document.createElement('div');
        achGrid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4";
        
        achievementsList.forEach(ach => {
            const unlocked = ach.condition(saveSystem.data.stats, saveSystem);
            achGrid.innerHTML += `
                <div class="trophy-card p-4 rounded border ${unlocked ? 'bg-slate-800 border-cyan-500/50' : 'bg-slate-900 border-slate-800 opacity-50'} flex items-center gap-4 transition-transform duration-100 will-change-transform">
                    <div class="text-2xl ${unlocked ? 'text-cyan-400' : 'text-slate-600'}">
                        <i class="fas ${ach.icon}"></i>
                    </div>
                    <div>
                        <h4 class="font-bold ${unlocked ? 'text-white' : 'text-slate-500'}">${ach.name}</h4>
                        <p class="text-xs text-slate-400">${ach.desc}</p>
                    </div>
                    ${unlocked ? '<i class="fas fa-check text-green-500 ml-auto"></i>' : '<i class="fas fa-lock text-slate-700 ml-auto"></i>'}
                </div>
            `;
        });
        achSection.appendChild(achGrid);
        achSection.appendChild(document.createElement('br')); // Spacer
        
        this.container.appendChild(achSection);

        // High Scores Grid Title
        const hsTitle = document.createElement('h2');
        hsTitle.className = "max-w-5xl mx-auto text-2xl font-bold text-white mb-4 border-b border-slate-700 pb-2";
        hsTitle.textContent = "High Scores & Trophies";
        this.container.appendChild(hsTitle);

        // Grid
        const grid = document.createElement('div');
        grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto pb-20";

        // Generate Cards for known games
        // Merge known thresholds keys with actual scores keys to ensure coverage
        const gameIds = new Set([...Object.keys(this.thresholds), ...Object.keys(scores)]);

        gameIds.forEach(gameId => {
            const score = scores[gameId] || 0;
            const threshold = this.thresholds[gameId] || { bronze: 100, silver: 500, gold: 1000 };
            
            // Determine Tier
            let tier = 'NONE';
            let color = 'text-slate-700';
            let icon = 'fa-lock';
            let label = 'Unranked';
            let shadow = '';

            if (score >= threshold.gold) {
                tier = 'GOLD';
                color = 'text-yellow-400';
                icon = 'fa-trophy';
                label = 'Gold Master';
                shadow = 'shadow-yellow-500/20';
            } else if (score >= threshold.silver) {
                tier = 'SILVER';
                color = 'text-slate-300';
                icon = 'fa-trophy';
                label = 'Silver Elite';
                shadow = 'shadow-slate-400/20';
            } else if (score >= threshold.bronze) {
                tier = 'BRONZE';
                color = 'text-amber-700';
                icon = 'fa-medal';
                label = 'Bronze Challenger';
                shadow = 'shadow-amber-700/20';
            }

            // Name Formatting
            const name = gameId.replace(/-game|-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim();

            const card = document.createElement('div');
            card.className = `trophy-card bg-slate-800 rounded-xl p-6 border border-slate-700 flex flex-col items-center gap-4 relative overflow-hidden transition-transform duration-100 hover:scale-105 will-change-transform ${shadow ? 'shadow-lg ' + shadow : ''}`;
            
            // Background glow based on tier
            if (tier !== 'NONE') {
                const bgGlow = document.createElement('div');
                bgGlow.className = `absolute inset-0 opacity-10 ${tier === 'GOLD' ? 'bg-yellow-400' : tier === 'SILVER' ? 'bg-white' : 'bg-amber-600'}`;
                card.appendChild(bgGlow);
            }

            card.innerHTML += `
                <div class="z-10 text-5xl ${color} drop-shadow-md">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="z-10 text-center">
                    <h3 class="text-xl font-bold text-white mb-1">${name}</h3>
                    <div class="text-xs uppercase tracking-widest font-bold ${color}">${label}</div>
                </div>
                <div class="z-10 mt-2 w-full bg-slate-900 rounded-full h-2 overflow-hidden relative">
                    <div class="absolute left-0 top-0 h-full ${tier === 'GOLD' ? 'bg-yellow-400' : 'bg-cyan-500'}" style="width: ${Math.min(100, (score / threshold.gold) * 100)}%"></div>
                </div>
                <div class="z-10 flex justify-between w-full text-xs text-slate-400 mt-1">
                    <span>High Score: <span class="text-white">${score}</span></span>
                    <span>Goal: ${threshold.gold}</span>
                </div>
            `;
            
            grid.appendChild(card);
        });

        this.container.appendChild(grid);

        document.getElementById('trophy-exit').onclick = () => window.miniGameHub.goBack();
        
        // 3D Tilt Effect
        this.handleMouseMove = (e) => {
            const cards = this.container.querySelectorAll('.trophy-card');
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            const mx = (e.clientX - cx) / cx; // -1 to 1
            const my = (e.clientY - cy) / cy; 

            cards.forEach(card => {
                const rotX = -my * 10;
                const rotY = mx * 10;
                card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
            });
        };
        this.container.addEventListener('mousemove', this.handleMouseMove);
        this.container.addEventListener('mouseleave', () => {
             const cards = this.container.querySelectorAll('.trophy-card');
             cards.forEach(c => c.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)');
        });
    }
    
    shutdown() {
        if (this.handleMouseMove) this.container.removeEventListener('mousemove', this.handleMouseMove);
        this.container.innerHTML = '';
    }
}
