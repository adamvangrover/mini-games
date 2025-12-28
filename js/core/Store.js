
import SoundManager from './SoundManager.js';
import ParticleSystem from './ParticleSystem.js';

/**
 * Manages the in-game shop, including item rendering, purchasing, and equipping.
 */
export default class Store {
    /**
     * @param {SaveSystem} saveSystem - The central save system instance.
     * @param {string} containerId - DOM ID of the container to render store items into.
     * @param {string[]} currencyDisplayIds - Array of DOM IDs to update with current currency.
     */
    constructor(saveSystem, containerId, currencyDisplayIds) {
        this.saveSystem = saveSystem;
        this.container = document.getElementById(containerId);
        this.currencyDisplays = currencyDisplayIds.map(id => document.getElementById(id)).filter(el => el);

        // Define Items
        this.items = [
            // --- UI THEMES ---
            {
                id: 'theme_neon_blue',
                name: 'Neon Blue',
                description: 'Classic cool blue neon vibes.',
                cost: 0,
                icon: 'fas fa-palette',
                type: 'theme',
                value: 'blue'
            },
            {
                id: 'theme_neon_pink',
                name: 'Hot Pink',
                description: 'Intense pink for the bold.',
                cost: 50,
                icon: 'fas fa-palette',
                type: 'theme',
                value: 'pink'
            },
            {
                id: 'theme_cyber_gold',
                name: 'Cyber Gold',
                description: 'Luxurious gold aesthetics.',
                cost: 200,
                icon: 'fas fa-crown',
                type: 'theme',
                value: 'gold'
            },
            {
                id: 'theme_matrix',
                name: 'The Matrix',
                description: 'Digital rain green.',
                cost: 150,
                icon: 'fas fa-terminal',
                type: 'theme',
                value: 'green'
            },
            {
                id: 'theme_crimson',
                name: 'Crimson Tide',
                description: 'Aggressive red styling.',
                cost: 100,
                icon: 'fas fa-fire',
                type: 'theme',
                value: 'red'
            },

            // --- TROPHY ROOM STYLES ---
            {
                id: 'trophy_theme_default',
                name: 'Classic Vault',
                description: 'Standard trophy room.',
                cost: 0,
                icon: 'fas fa-door-closed',
                type: 'trophy_room',
                value: 'default'
            },
            {
                id: 'trophy_theme_cyber',
                name: 'Cyber Void',
                description: 'Floating in the digital ether.',
                cost: 250,
                icon: 'fas fa-network-wired',
                type: 'trophy_room',
                value: 'cyber'
            },
            {
                id: 'trophy_theme_gold',
                name: 'Golden Hall',
                description: 'A room fit for a king.',
                cost: 500,
                icon: 'fas fa-gem',
                type: 'trophy_room',
                value: 'gold'
            },
            {
                id: 'trophy_theme_nature',
                name: 'Zen Garden',
                description: 'Peaceful organic vibes.',
                cost: 350,
                icon: 'fas fa-leaf',
                type: 'trophy_room',
                value: 'nature'
            },

            // --- CABINET STYLES ---
            {
                id: 'cabinet_default',
                name: 'Standard Issue',
                description: 'Factory standard grey.',
                cost: 0,
                icon: 'fas fa-cube',
                type: 'cabinet',
                value: 'default'
            },
            {
                id: 'cabinet_retro',
                name: 'Retro Wood',
                description: '70s wood grain finish.',
                cost: 300,
                icon: 'fas fa-tree',
                type: 'cabinet',
                value: 'wood'
            },
            {
                id: 'cabinet_carbon',
                name: 'Carbon Fiber',
                description: 'High-tech stealth black.',
                cost: 500,
                icon: 'fas fa-shield-alt',
                type: 'cabinet',
                value: 'carbon'
            },
            {
                id: 'cabinet_gold',
                name: 'Gold Plated',
                description: 'Show off your wealth.',
                cost: 1000,
                icon: 'fas fa-coins',
                type: 'cabinet',
                value: 'gold'
            },

            // --- AVATARS ---
            {
                id: 'avatar_astronaut',
                name: 'Astronaut',
                description: 'Ready for launch.',
                cost: 0,
                icon: 'fas fa-user-astronaut',
                type: 'avatar',
                value: 'fas fa-user-astronaut'
            },
            {
                id: 'avatar_robot',
                name: 'Robot',
                description: 'Beep boop.',
                cost: 100,
                icon: 'fas fa-robot',
                type: 'avatar',
                value: 'fas fa-robot'
            },
            {
                id: 'avatar_alien',
                name: 'Alien',
                description: 'From another world.',
                cost: 150,
                icon: 'fas fa-spaghetti-monster-flying',
                type: 'avatar',
                value: 'fas fa-spaghetti-monster-flying'
            },
            {
                id: 'avatar_ghost',
                name: 'Ghost',
                description: 'Spooky!',
                cost: 200,
                icon: 'fas fa-ghost',
                type: 'avatar',
                value: 'fas fa-ghost'
            },
            {
                id: 'avatar_ninja',
                name: 'Ninja',
                description: 'Silent but deadly.',
                cost: 250,
                icon: 'fas fa-user-ninja',
                type: 'avatar',
                value: 'fas fa-user-ninja'
            },
            {
                id: 'avatar_wizard',
                name: 'Wizard',
                description: 'You are a wizard.',
                cost: 300,
                icon: 'fas fa-hat-wizard',
                type: 'avatar',
                value: 'fas fa-hat-wizard'
            },
            {
                id: 'avatar_dragon',
                name: 'Dragon',
                description: 'Fierce creature.',
                cost: 500,
                icon: 'fas fa-dragon',
                type: 'avatar',
                value: 'fas fa-dragon'
            }
        ];
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = '';
        const currentCurrency = this.saveSystem.getCurrency();

        this.items.forEach(item => {
            const isUnlocked = this.saveSystem.isItemUnlocked(item.id) || item.cost === 0;
            const canAfford = currentCurrency >= item.cost;

            // Check if currently equipped
            let isEquipped = false;
            const equippedVal = this.saveSystem.getEquippedItem(item.type);

            if (item.type === 'theme' || item.type === 'cabinet' || item.type === 'trophy_room') {
                isEquipped = equippedVal === item.value;
                // Default handling
                if (item.cost === 0 && !equippedVal) isEquipped = true;
                if (item.id === 'theme_neon_blue' && (equippedVal === 'blue')) isEquipped = true;
                if (item.id === 'cabinet_default' && (equippedVal === 'default')) isEquipped = true;
                if (item.id === 'trophy_theme_default' && (equippedVal === 'default')) isEquipped = true;

                // Strict equality if val exists
                if (equippedVal) isEquipped = equippedVal === item.value;
            } else if (item.type === 'avatar') {
                isEquipped = equippedVal === item.value;
            }

            const card = document.createElement('div');
            // Visual border
            let borderClass = 'border-slate-700';
            if (isEquipped) borderClass = 'border-fuchsia-500 shadow-lg shadow-fuchsia-500/20';
            else if (isUnlocked) borderClass = 'border-green-500/50';

            card.className = `glass-panel p-4 rounded-lg flex flex-col items-center text-center transition-all ${borderClass}`;

            let buttonHtml = '';

            if (isUnlocked) {
                 if (isEquipped) {
                    buttonHtml = `<button class="w-full py-2 bg-green-600 text-white font-bold rounded cursor-default"><i class="fas fa-check"></i> Active</button>`;
                 } else {
                    buttonHtml = `<button class="equip-btn w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded transition-colors" data-id="${item.id}">Equip</button>`;
                 }
            } else {
                 buttonHtml = `<button class="buy-btn w-full py-2 font-bold rounded transition-all ${canAfford ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}" data-id="${item.id}">
                             ${item.cost} <i class="fas fa-coins text-yellow-400"></i>
                           </button>`;
            }

            card.innerHTML = `
                <div class="text-4xl mb-2 ${isUnlocked ? (isEquipped ? 'text-fuchsia-400' : 'text-green-400') : 'text-slate-500'}">
                    <i class="${item.icon}"></i>
                </div>
                <h3 class="text-xl font-bold text-white mb-1">${item.name}</h3>
                <p class="text-xs text-slate-400 mb-3 h-8 overflow-hidden">${item.description}</p>
                <div class="mt-auto w-full">
                    ${buttonHtml}
                </div>
            `;

            if (!isUnlocked && canAfford) {
                const btn = card.querySelector('.buy-btn');
                btn.addEventListener('click', () => {
                    this.buy(item);
                });
            } else if (isUnlocked && !isEquipped) {
                const btn = card.querySelector('.equip-btn');
                if(btn) {
                    btn.addEventListener('click', () => {
                        this.equip(item);
                    });
                }
            }

            this.container.appendChild(card);
        });

        this.updateCurrencyDisplays();
    }

    equip(item) {
        try {
            if (['theme', 'cabinet', 'trophy_room', 'avatar'].includes(item.type)) {
                this.saveSystem.equipItem(item.type, item.value);
                if (item.type === 'avatar') {
                    const profile = this.saveSystem.getProfile();
                    if (profile) {
                        profile.avatar = item.value;
                        this.saveSystem.save();
                    }
                }
                if (item.type === 'theme') {
                    // Force refresh or callback to apply theme to Grid View/Body
                    document.body.className = `theme-${item.value}`; // Simple hook
                }
            }
            this.render();
        } catch (e) {
            console.error("Store: Failed to equip item", e);
        }
    }

    buy(item) {
        try {
            if (this.saveSystem.buyItem(item.id, item.cost)) {
                this.render();

                // Visual feedback
                const particleSystem = ParticleSystem.getInstance();
                if (particleSystem) {
                    particleSystem.emit(window.innerWidth / 2, window.innerHeight / 2, '#fbbf24', 30);
                }

                SoundManager.getInstance().playSound('score');

            } else {
                alert("Not enough coins!");
            }
        } catch (e) {
            console.error("Store: Transaction failed", e);
        }
    }

    updateCurrencyDisplays() {
        const val = this.saveSystem.getCurrency();
        this.currencyDisplays.forEach(el => {
            if (el) el.innerText = val;
        });
    }
}
