
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
            {
                id: 'theme_neon_blue',
                name: 'Neon Blue Theme',
                description: 'Classic cool blue neon vibes.',
                cost: 0, // Default
                icon: 'fas fa-palette',
                type: 'theme',
                value: 'blue'
            },
            {
                id: 'theme_neon_pink',
                name: 'Hot Pink Theme',
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
                id: 'cabinet_retro',
                name: 'Retro Wood Cabinets',
                description: 'Old school wood grain style.',
                cost: 300,
                icon: 'fas fa-gamepad',
                type: 'cabinet',
                value: 'wood'
            },
            {
                id: 'extra_life',
                name: '1-UP Mushroom',
                description: 'A decorative pixel mushroom for your inventory.',
                cost: 100,
                icon: 'fas fa-heart',
                type: 'treat',
                value: 'mushroom'
            },
            {
                id: 'trophy_silver',
                name: 'Silver Trophy',
                description: 'Shiny silver trophy for your room.',
                cost: 500,
                icon: 'fas fa-trophy',
                type: 'trophy',
                value: 'trophy_silver'
            },
            // Avatars
            {
                id: 'avatar_robot',
                name: 'Robot Avatar',
                description: 'Beep boop.',
                cost: 100,
                icon: 'fas fa-robot',
                type: 'avatar',
                value: 'fas fa-robot'
            },
            {
                id: 'avatar_alien',
                name: 'Alien Avatar',
                description: 'From another world.',
                cost: 150,
                icon: 'fas fa-spaghetti-monster-flying',
                type: 'avatar',
                value: 'fas fa-spaghetti-monster-flying'
            },
            {
                id: 'avatar_ghost',
                name: 'Ghost Avatar',
                description: 'Spooky!',
                cost: 200,
                icon: 'fas fa-ghost',
                type: 'avatar',
                value: 'fas fa-ghost'
            },
            {
                id: 'avatar_ninja',
                name: 'Ninja Avatar',
                description: 'Silent but deadly.',
                cost: 250,
                icon: 'fas fa-user-ninja',
                type: 'avatar',
                value: 'fas fa-user-ninja'
            }
        ];
    }

    render() {
        this.container.innerHTML = '';
        const currentCurrency = this.saveSystem.getCurrency();

        this.items.forEach(item => {
            const isUnlocked = this.saveSystem.isItemUnlocked(item.id) || item.cost === 0;
            const canAfford = currentCurrency >= item.cost;

            // Check if currently equipped
            let isEquipped = false;
            // Handle both value vs id storage. For themes it's id, for avatars it was value?
            // In SaveSystem.getDefaultData it says: equipped: { theme: 'theme_neon_blue', avatar: 'fas fa-user-astronaut' }
            // So for theme we compare item.id, for avatar we compare item.value (icon class)
            // But wait, equipItem sets value.

            const equippedVal = this.saveSystem.getEquippedItem(item.type);
            if (item.type === 'theme') {
                isEquipped = equippedVal === item.id;
            } else if (item.type === 'avatar') {
                // If we store the value (icon class), compare that
                isEquipped = equippedVal === item.value;
            }

            const card = document.createElement('div');
            // Add visual border for equipped items
            card.className = `glass-panel p-4 rounded-lg flex flex-col items-center text-center transition-all ${isEquipped ? 'border-fuchsia-500 shadow-lg shadow-fuchsia-500/20' : (isUnlocked ? 'border-green-500/50' : 'border-slate-700')}`;

            let buttonHtml = '';

            if (isUnlocked) {
                if (item.type === 'theme' || item.type === 'avatar') {
                     if (isEquipped) {
                        buttonHtml = `<button class="w-full py-2 bg-green-600 text-white font-bold rounded cursor-default"><i class="fas fa-check"></i> Active</button>`;
                     } else {
                        buttonHtml = `<button class="equip-btn w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded transition-colors" data-id="${item.id}">Equip</button>`;
                     }
                } else if (item.type === 'treat') {
                     // Treats can be "used" or just sit there.
                     buttonHtml = `<button class="w-full py-2 bg-slate-700 text-slate-300 rounded cursor-default">In Inventory</button>`;
                } else if (item.type === 'trophy') {
                    buttonHtml = `<button class="w-full py-2 bg-slate-700 text-slate-300 rounded cursor-default">In Trophy Room</button>`;
                } else {
                    buttonHtml = `<button class="w-full py-2 bg-slate-700 text-slate-300 rounded cursor-default">Owned</button>`;
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
            } else if (isUnlocked && !isEquipped && (item.type === 'theme' || item.type === 'avatar')) {
                const btn = card.querySelector('.equip-btn');
                if(btn) {
                    btn.addEventListener('click', () => {
                        this.equip(item);
                    });
                }
            }

            this.container.appendChild(card);
        });

        // Update currency displays
        this.updateCurrencyDisplays();
    }

    equip(item) {
        try {
            if (item.type === 'theme') {
                this.saveSystem.equipItem('theme', item.id);
                // Apply theme logic could go here
                // For now, reload/re-render to show state
                this.render();
            } else if (item.type === 'avatar') {
                this.saveSystem.equipItem('avatar', item.value);

                // Sync with profile data for consistency
                const profile = this.saveSystem.getProfile();
                if (profile) {
                    profile.avatar = item.value;
                    this.saveSystem.save();
                }

                this.render();
            }
        } catch (e) {
            console.error("Store: Failed to equip item", e);
            alert("Failed to equip item. Please try again.");
        }
    }

    buy(item) {
        try {
            if (this.saveSystem.buyItem(item.id, item.cost)) {
                // Success
                this.render(); // Re-render to show owned state
            } else {
                // Failed (shouldn't happen if logic is correct, but good fallback)
                alert("Not enough coins!");
            }
        } catch (e) {
            console.error("Store: Transaction failed", e);
            alert("Transaction error. No coins were spent.");
        }
    }

    updateCurrencyDisplays() {
        const val = this.saveSystem.getCurrency();
        this.currencyDisplays.forEach(el => {
            if (el) el.innerText = val;
        });
    }
}
