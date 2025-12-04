import { CONFIG } from './config.js';

export default class UI {
    constructor(container, game) {
        this.container = container;
        this.game = game;
        this.overlay = null;
        this.setupHTML();
        this.bindEvents();
    }

    setupHTML() {
        const hud = document.createElement('div');
        hud.id = 'td-hud';
        hud.className = 'absolute top-0 left-0 w-full h-full pointer-events-none p-4 flex flex-col justify-between';

        hud.innerHTML = `
            <div class="flex justify-between items-start pointer-events-auto">
                <div class="bg-slate-900/80 p-3 rounded border border-cyan-500/50 backdrop-blur-sm">
                    <div class="text-green-400 font-bold text-lg"><i class="fa-solid fa-coins mr-2"></i><span id="td-money">0</span></div>
                    <div class="text-red-400 font-bold text-lg"><i class="fa-solid fa-heart mr-2"></i><span id="td-lives">0</span></div>
                    <div class="text-yellow-400 font-bold text-lg"><i class="fa-solid fa-flag mr-2"></i><span id="td-wave">0</span></div>
                </div>
                <div class="flex flex-col gap-2">
                    <button id="td-speed-btn" class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm shadow">1x Speed</button>
                    <button id="td-back-btn" class="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-sm shadow">Quit</button>
                </div>
            </div>

            <div class="flex justify-center items-end pointer-events-auto">
                <div id="td-build-menu" class="bg-slate-900/90 p-2 rounded-t-lg border-t border-l border-r border-cyan-500/50 flex gap-2 overflow-x-auto max-w-full">
                    <!-- Towers injected here -->
                </div>
            </div>

            <div id="td-upgrade-panel" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-800 p-4 rounded border border-white/20 hidden pointer-events-auto shadow-2xl z-20">
                <h3 class="text-white font-bold mb-2">Upgrade Tower</h3>
                <div class="text-gray-300 text-sm mb-4" id="td-upgrade-stats"></div>
                <div class="flex gap-2">
                    <button id="td-btn-upgrade" class="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded">Upgrade ($<span id="td-upgrade-cost"></span>)</button>
                    <button id="td-btn-sell" class="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded">Sell ($<span id="td-sell-cost"></span>)</button>
                    <button id="td-btn-close" class="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded">Close</button>
                </div>
            </div>
        `;

        this.container.appendChild(hud);
        this.populateBuildMenu();
    }

    populateBuildMenu() {
        const menu = this.container.querySelector('#td-build-menu');
        Object.values(CONFIG.TOWERS).forEach(t => {
            const btn = document.createElement('button');
            btn.className = `td-build-btn group relative flex flex-col items-center p-2 rounded hover:bg-white/10 border border-transparent hover:border-${t.color}-500 transition-all`;
            btn.dataset.type = t.type;
            btn.innerHTML = `
                <div class="w-8 h-8 rounded-full mb-1 border-2" style="background-color: ${t.color}; border-color: ${t.color}"></div>
                <span class="text-white text-xs font-bold">${t.name}</span>
                <span class="text-yellow-400 text-xs">$${t.cost}</span>

                <!-- Tooltip -->
                <div class="absolute bottom-full mb-2 hidden group-hover:block w-32 bg-black/90 text-white text-xs p-2 rounded z-10 pointer-events-none">
                    ${t.description}<br>
                    Dmg: ${t.damage} | Rng: ${t.range}
                </div>
            `;
            btn.onclick = () => this.game.selectTowerToBuild(t.type);
            menu.appendChild(btn);
        });
    }

    bindEvents() {
        this.container.querySelector('#td-speed-btn').onclick = () => this.game.toggleSpeed();
        this.container.querySelector('#td-back-btn').onclick = () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        };

        this.container.querySelector('#td-btn-close').onclick = () => this.hideUpgradePanel();
        this.container.querySelector('#td-btn-upgrade').onclick = () => {
            this.game.upgradeSelectedTower();
            this.updateUpgradePanel(); // Refresh costs
        };
        this.container.querySelector('#td-btn-sell').onclick = () => {
            this.game.sellSelectedTower();
            this.hideUpgradePanel();
        };
    }

    update(dt) {
        document.getElementById('td-money').textContent = Math.floor(this.game.money);
        document.getElementById('td-lives').textContent = this.game.lives;
        document.getElementById('td-wave').textContent = this.game.wave;

        const speedBtn = document.getElementById('td-speed-btn');
        if (speedBtn) speedBtn.textContent = `${this.game.speedMultiplier}x Speed`;

        // Highlight selected build button
        const selected = this.game.selectedBuildType;
        this.container.querySelectorAll('.td-build-btn').forEach(btn => {
            if (btn.dataset.type === selected) {
                btn.classList.add('bg-white/20', 'border-white');
            } else {
                btn.classList.remove('bg-white/20', 'border-white');
            }
        });
    }

    showUpgradePanel(tower) {
        const panel = document.getElementById('td-upgrade-panel');
        panel.classList.remove('hidden');
        this.updateUpgradePanel(tower);
    }

    hideUpgradePanel() {
        document.getElementById('td-upgrade-panel').classList.add('hidden');
        this.game.deselectTower();
    }

    updateUpgradePanel(tower = this.game.selectedTower) {
        if (!tower) return;

        document.getElementById('td-upgrade-stats').innerHTML = `
            Level: ${tower.level}<br>
            Damage: ${tower.damage.toFixed(1)}<br>
            Range: ${tower.range.toFixed(1)}<br>
            Rate: ${tower.fireRate.toFixed(2)}s
        `;
        document.getElementById('td-upgrade-cost').textContent = tower.getUpgradeCost();
        document.getElementById('td-sell-cost').textContent = tower.getSellValue();
    }

    cleanup() {
        const hud = document.getElementById('td-hud');
        if (hud) hud.remove();
    }
}
