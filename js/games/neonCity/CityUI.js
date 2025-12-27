export default class CityUI {
    constructor(container) {
        this.container = container;
        this.hud = null;
        this.chatOverlay = null;
        this.shopOverlay = null;
        this.meditateOverlay = null;

        this.createHUD();
        this.createChatUI();
        this.createShopUI();
        this.createMeditateUI();
        this.createPromptUI();
    }

    createPromptUI() {
        this.promptOverlay = document.createElement('div');
        this.promptOverlay.className = 'absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-black/70 border border-white/20 px-6 py-2 rounded text-white font-mono text-sm hidden pointer-events-none z-30 animate-pulse';
        this.promptOverlay.textContent = 'Press E to Interact';
        this.container.appendChild(this.promptOverlay);
    }

    createHUD() {
        // Create prompt overlay first
        this.promptOverlay = document.createElement('div');
        this.promptOverlay.className = 'absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-6 py-2 rounded-full border border-cyan-500 hidden font-bold text-sm tracking-wider animate-pulse z-20 pointer-events-none';
        this.container.appendChild(this.promptOverlay);

        this.hud = document.createElement('div');
        this.hud.className = 'absolute top-4 left-4 pointer-events-none z-20 font-mono text-white';
        this.hud.innerHTML = `
            <div class="bg-slate-900/80 border border-cyan-500 rounded p-3 mb-2 backdrop-blur-md">
                <div class="text-xs text-cyan-400">LEVEL</div>
                <div class="text-2xl font-bold" id="hud-level">1</div>
            </div>
            <div class="bg-slate-900/80 border border-fuchsia-500 rounded p-3 backdrop-blur-md">
                <div class="text-xs text-fuchsia-400">XP</div>
                <div class="text-lg font-bold" id="hud-xp">0</div>
                <div class="w-24 h-1 bg-gray-700 mt-1 rounded-full overflow-hidden">
                    <div id="hud-xp-bar" class="h-full bg-fuchsia-500 w-0"></div>
                </div>
            </div>
            <div class="mt-2 bg-slate-900/80 border border-yellow-500 rounded p-3 backdrop-blur-md">
                <div class="text-xs text-yellow-400">VEHICLE</div>
                <div class="text-sm font-bold truncate w-24" id="hud-vehicle">Cyber-Legs</div>
            </div>
        `;
        this.container.appendChild(this.hud);
    }

    updateHUD(progression) {
        document.getElementById('hud-level').textContent = progression.data.level;
        document.getElementById('hud-xp').textContent = progression.data.xp;
        document.getElementById('hud-vehicle').textContent = progression.getCurrentStats().name;

        const xpNeeded = progression.data.level * 1000;
        const pct = (progression.data.xp / xpNeeded) * 100;
        document.getElementById('hud-xp-bar').style.width = `${pct}%`;
    }

    createChatUI() {
        // ... (Migrated from CityGame.js) ...
        this.chatOverlay = document.createElement('div');
        this.chatOverlay.id = 'neon-city-chat';
        this.chatOverlay.className = 'absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-2xl bg-slate-900/95 border border-fuchsia-500 rounded-xl p-4 hidden font-mono z-30 shadow-[0_0_20px_rgba(217,70,239,0.3)] backdrop-blur-md';
        this.chatOverlay.innerHTML = `
            <div class="flex items-center gap-3 mb-3 border-b border-gray-700 pb-2">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs" id="chat-avatar">AI</div>
                <div id="chat-speaker" class="text-fuchsia-400 font-bold text-lg tracking-wide">Unknown</div>
            </div>
            <div id="chat-text" class="text-gray-100 text-base mb-4 max-h-32 overflow-y-auto custom-scrollbar leading-relaxed"></div>
            <div id="chat-controls" class="flex gap-2">
                <input type="text" id="chat-input" class="flex-1 bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-cyan-400 outline-none transition-colors" placeholder="Type your message...">
                <button id="chat-send" class="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold px-6 py-2 rounded-lg transition-all shadow-lg">Send</button>
                <button id="chat-close" class="bg-slate-700 hover:bg-slate-600 text-gray-300 font-bold px-4 py-2 rounded-lg transition-all">End</button>
            </div>
        `;
        this.container.appendChild(this.chatOverlay);
    }

    createShopUI() {
        this.shopOverlay = document.createElement('div');
        this.shopOverlay.className = 'absolute inset-0 z-40 bg-black/90 hidden flex flex-col items-center justify-center font-mono';
        this.shopOverlay.innerHTML = `
            <h2 class="text-4xl text-yellow-400 font-bold mb-8 tracking-widest uppercase title-glow">Neon Motors</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl px-4" id="shop-grid">
                <!-- Items injected -->
            </div>
            <button id="shop-close" class="mt-8 text-gray-400 hover:text-white border border-gray-600 hover:border-white px-6 py-2 rounded uppercase tracking-wider">Leave Shop</button>
        `;
        this.container.appendChild(this.shopOverlay);

        this.shopOverlay.querySelector('#shop-close').onclick = () => this.hideShop();
    }

    showShop(progression, saveSystem, onPurchase) {
        const grid = this.shopOverlay.querySelector('#shop-grid');
        grid.innerHTML = '';

        const vehicles = [
            { id: 'hoverboard', name: 'Neon Board', cost: 500, desc: 'Float above the streets.', icon: 'fa-wind' },
            { id: 'bike', name: 'Light Cycle', cost: 1500, desc: 'High speed transport.', icon: 'fa-motorcycle' },
            { id: 'glider', name: 'Void Glider', cost: 5000, desc: 'Master the skies.', icon: 'fa-jet-fighter' }
        ];

        vehicles.forEach(v => {
            const owned = progression.data.vehicles.includes(v.id);
            const canAfford = saveSystem.getCurrency() >= v.cost;

            const card = document.createElement('div');
            card.className = `bg-slate-800 p-6 rounded-xl border ${owned ? 'border-green-500' : 'border-slate-600'} flex flex-col items-center text-center gap-4 transition hover:scale-105`;
            card.innerHTML = `
                <i class="fas ${v.icon} text-4xl ${owned ? 'text-green-400' : 'text-yellow-400'}"></i>
                <h3 class="text-xl font-bold text-white">${v.name}</h3>
                <p class="text-sm text-gray-400">${v.desc}</p>
                <div class="text-lg font-bold text-yellow-300">${owned ? 'OWNED' : v.cost + ' Coins'}</div>
                <button class="w-full py-2 rounded font-bold ${owned ? 'bg-green-600 text-white cursor-default' : (canAfford ? 'bg-yellow-600 hover:bg-yellow-500 text-black' : 'bg-gray-700 text-gray-500 cursor-not-allowed')}">
                    ${owned ? (progression.data.equippedVehicle === v.id ? 'EQUIPPED' : 'EQUIP') : 'BUY'}
                </button>
            `;

            const btn = card.querySelector('button');
            btn.onclick = () => {
                if (owned) {
                    onPurchase(v.id, true); // Equip
                    this.showShop(progression, saveSystem, onPurchase); // Refresh
                } else if (canAfford) {
                    if (saveSystem.spendCurrency(v.cost)) {
                        onPurchase(v.id, false); // Buy
                        this.showShop(progression, saveSystem, onPurchase); // Refresh
                    }
                }
            };

            grid.appendChild(card);
        });

        this.shopOverlay.classList.remove('hidden');
    }

    hideShop() {
        this.shopOverlay.classList.add('hidden');
        this.container.focus(); // Refocus game
    }

    createMeditateUI() {
        this.meditateOverlay = document.createElement('div');
        this.meditateOverlay.className = 'absolute inset-0 z-40 bg-black/60 backdrop-blur hidden flex flex-col items-center justify-center font-mono pointer-events-auto';
        this.meditateOverlay.innerHTML = `
            <div class="text-fuchsia-400 text-6xl mb-4 animate-pulse"><i class="fas fa-om"></i></div>
            <h2 class="text-3xl font-bold text-white mb-2">MEDITATING</h2>
            <p class="text-cyan-300 text-sm mb-8">Focusing energy... XP gaining...</p>
            <div class="text-gray-400 text-xs">Press Any Key to Wake Up</div>
        `;
        this.container.appendChild(this.meditateOverlay);
    }

    showMeditate() {
        this.meditateOverlay.classList.remove('hidden');
    }

    hideMeditate() {
        this.meditateOverlay.classList.add('hidden');
    }

    showMessage(text, color = 'text-white') {
        const msg = document.createElement('div');
        msg.className = `absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/50 px-4 py-2 rounded border border-white/20 ${color} font-bold animate-bounce z-50 pointer-events-none`;
        msg.textContent = text;
        this.container.appendChild(msg);
        setTimeout(() => msg.remove(), 2000);
    }
}
