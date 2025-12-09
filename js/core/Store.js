
export default class Store {
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
                type: 'item',
                value: 'mushroom'
            },
            {
                id: 'trophy_silver',
                name: 'Silver Trophy',
                description: 'Shiny silver trophy.',
                cost: 500,
                icon: 'fas fa-trophy',
                type: 'item',
                value: 'trophy_silver'
            }
        ];
    }

    render() {
        this.container.innerHTML = '';
        const currentCurrency = this.saveSystem.getCurrency();

        this.items.forEach(item => {
            const isUnlocked = this.saveSystem.isItemUnlocked(item.id) || item.cost === 0;
            const canAfford = currentCurrency >= item.cost;

            const card = document.createElement('div');
            card.className = `glass-panel p-4 rounded-lg flex flex-col items-center text-center transition-all ${isUnlocked ? 'border-green-500/50' : 'border-slate-700'}`;

            card.innerHTML = `
                <div class="text-4xl mb-2 ${isUnlocked ? 'text-green-400' : 'text-fuchsia-400'}">
                    <i class="${item.icon}"></i>
                </div>
                <h3 class="text-xl font-bold text-white mb-1">${item.name}</h3>
                <p class="text-xs text-slate-400 mb-3 h-8 overflow-hidden">${item.description}</p>

                <div class="mt-auto w-full">
                    ${isUnlocked
                        ? `<button class="w-full py-2 bg-slate-700 text-slate-300 rounded cursor-default">Owned</button>`
                        : `<button class="buy-btn w-full py-2 font-bold rounded transition-all ${canAfford ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}" data-id="${item.id}">
                             ${item.cost} <i class="fas fa-coins text-yellow-400"></i>
                           </button>`
                    }
                </div>
            `;

            if (!isUnlocked && canAfford) {
                const btn = card.querySelector('.buy-btn');
                btn.addEventListener('click', () => {
                    this.buy(item);
                });
            }

            this.container.appendChild(card);
        });

        // Update currency displays
        this.updateCurrencyDisplays();
    }

    buy(item) {
        if (this.saveSystem.buyItem(item.id, item.cost)) {
            // Success
            // Play sound? (Needs sound manager ref, for now just UI update)
            this.render(); // Re-render to show owned state
        } else {
            // Failed (shouldn't happen if button disabled)
            alert("Not enough coins!");
        }
    }

    updateCurrencyDisplays() {
        const val = this.saveSystem.getCurrency();
        this.currencyDisplays.forEach(el => {
            if (el) el.innerText = val;
        });
    }
}
