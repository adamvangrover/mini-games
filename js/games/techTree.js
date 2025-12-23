import SaveSystem from '../core/SaveSystem.js';

export default class TechTree {
    constructor() {
        this.container = null;
        this.saveSystem = SaveSystem.getInstance();
        this.nodes = {
            'coin_1': { id: 'coin_1', title: 'Coin Miner I', desc: '+10% Coin Gain', cost: 100, effect: { type: 'coinMultiplier', value: 0.1 }, parent: null },
            'coin_2': { id: 'coin_2', title: 'Coin Miner II', desc: '+20% Coin Gain', cost: 500, effect: { type: 'coinMultiplier', value: 0.2 }, parent: 'coin_1' },
            'xp_1': { id: 'xp_1', title: 'Neural Link I', desc: '+10% XP Gain', cost: 150, effect: { type: 'xpBoost', value: 0.1 }, parent: null },
            'xp_2': { id: 'xp_2', title: 'Neural Link II', desc: '+20% XP Gain', cost: 600, effect: { type: 'xpBoost', value: 0.2 }, parent: 'xp_1' },
            'health_1': { id: 'health_1', title: 'Shield Battery', desc: 'Extra Hit Point (Supported Games)', cost: 1000, effect: { type: 'startHealth', value: 1 }, parent: 'coin_2' },
        };
    }

    async init(container) {
        this.container = container;
        this.render();
    }

    render() {
        this.container.innerHTML = '';
        this.container.classList.add('flex', 'flex-col', 'items-center', 'justify-center', 'min-h-screen', 'bg-slate-900', 'text-white', 'relative', 'overflow-hidden');

        // Background Grid
        const bg = document.createElement('div');
        bg.className = 'absolute inset-0 opacity-10 pointer-events-none';
        bg.style.backgroundImage = 'radial-gradient(#4f46e5 1px, transparent 1px)';
        bg.style.backgroundSize = '20px 20px';
        this.container.appendChild(bg);

        const content = document.createElement('div');
        content.className = 'relative z-10 w-full max-w-5xl p-4 flex flex-col items-center';

        content.innerHTML = `
            <div class="flex justify-between w-full items-end mb-8 border-b border-slate-700 pb-4">
                <div>
                    <h1 class="text-4xl font-black title-glow">TECH TREE</h1>
                    <p class="text-slate-400">Upgrade System Mainframe</p>
                </div>
                <div class="text-right">
                    <div class="text-2xl font-bold text-yellow-400"><i class="fas fa-coins"></i> <span id="tech-currency">${this.saveSystem.getCurrency()}</span></div>
                </div>
            </div>

            <div class="relative w-full h-[600px] bg-slate-800/50 rounded-xl border border-slate-700 overflow-auto p-10 flex justify-center items-center" id="tree-canvas">
                <!-- Nodes injected here -->
            </div>

            <button class="back-btn mt-8 px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded font-bold uppercase tracking-wider">
                Return to Hub
            </button>
        `;

        this.container.appendChild(content);

        this.renderNodes(content.querySelector('#tree-canvas'));

        content.querySelector('.back-btn').addEventListener('click', () => {
             window.miniGameHub.goBack();
        });
    }

    renderNodes(canvas) {
        // Positions (Simple hardcoded layout for now)
        const positions = {
            'coin_1': { x: 300, y: 100 },
            'coin_2': { x: 300, y: 250 },
            'health_1': { x: 300, y: 400 },
            'xp_1': { x: 600, y: 100 },
            'xp_2': { x: 600, y: 250 }
        };

        const ownedUpgrades = this.saveSystem.data.purchasedNodes || [];

        // Draw Connections
        Object.values(this.nodes).forEach(node => {
            if (node.parent) {
                const p1 = positions[node.parent];
                const p2 = positions[node.id];
                if (!p1 || !p2) return;

                const line = document.createElement('div');
                const isUnlocked = ownedUpgrades.includes(node.parent);
                line.className = `tech-connection ${isUnlocked ? 'active' : ''}`;

                // Math for line
                const length = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

                line.style.width = `${length}px`;
                line.style.left = `${p1.x + 40}px`; // center offset
                line.style.top = `${p1.y + 40}px`;
                line.style.transform = `rotate(${angle}deg)`;

                canvas.appendChild(line);
            }
        });

        // Draw Nodes
        Object.values(this.nodes).forEach(node => {
            const pos = positions[node.id];
            const isOwned = ownedUpgrades.includes(node.id);
            const parentOwned = !node.parent || ownedUpgrades.includes(node.parent);

            const el = document.createElement('div');
            let stateClass = 'locked';
            if (isOwned) stateClass = 'purchased';
            else if (parentOwned) stateClass = 'unlocked'; // Available to buy

            el.className = `tech-node absolute ${stateClass}`;
            el.style.left = `${pos.x}px`;
            el.style.top = `${pos.y}px`;
            el.innerHTML = `<i class="fas fa-microchip text-2xl"></i>`;

            // Tooltip / Info
            el.title = `${node.title} - ${node.desc}\nCost: ${node.cost}`;

            el.onclick = () => this.handleNodeClick(node);

            canvas.appendChild(el);

            // Label
            const label = document.createElement('div');
            label.className = "absolute text-center text-xs font-bold text-slate-300 w-32 -ml-8 mt-24 pointer-events-none";
            label.style.left = `${pos.x}px`;
            label.style.top = `${pos.y}px`;
            label.textContent = node.title;
            canvas.appendChild(label);
        });
    }

    handleNodeClick(node) {
        const ownedUpgrades = this.saveSystem.data.purchasedNodes || [];
        if (ownedUpgrades.includes(node.id)) return; // Already owned

        const parentOwned = !node.parent || ownedUpgrades.includes(node.parent);
        if (!parentOwned) {
            alert("Unlock previous node first!");
            return;
        }

        if (this.saveSystem.getCurrency() >= node.cost) {
            if (confirm(`Purchase ${node.title} for ${node.cost} coins?`)) {
                this.saveSystem.spendCurrency(node.cost);

                // Apply Effect
                if (!this.saveSystem.data.upgrades) this.saveSystem.data.upgrades = { coinMultiplier: 1, xpBoost: 1, startHealth: 0 };

                const type = node.effect.type;
                const value = node.effect.value;
                this.saveSystem.data.upgrades[type] = (this.saveSystem.data.upgrades[type] || (type === 'startHealth' ? 0 : 1)) + value;

                // Save Purchase State
                if (!this.saveSystem.data.purchasedNodes) this.saveSystem.data.purchasedNodes = [];
                this.saveSystem.data.purchasedNodes.push(node.id);

                this.saveSystem.save();

                // Refresh UI
                this.render();
            }
        } else {
            alert("Not enough coins!");
        }
    }

    async shutdown() {
        this.container.innerHTML = '';
    }
}
