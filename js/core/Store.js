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
        this.currentTab = 'all';

        // Define Items
        this.items = [
            // --- HUB SKINS ---
            { id: 'skin_default', name: 'Default Hub', description: 'The classic arcade look. Smells like stale pizza and ozone.', cost: 0, icon: 'fas fa-cube', type: 'hub_skin', value: 'default', category: 'customization' },
            { id: 'skin_retro_future', name: 'Retro Future', description: 'Synthwave sunsets and chrome. Wearing sunglasses indoors is mandatory.', cost: 500, icon: 'fas fa-sun', type: 'hub_skin', value: 'retro_future', category: 'customization' },
            { id: 'skin_gibson', name: 'The Net', description: 'High-speed data traversal. Don\'t get lost in the grid.', cost: 1000, icon: 'fas fa-globe', type: 'hub_skin', value: 'gibson', category: 'customization' },
            { id: 'skin_stephenson', name: 'The Metaverse', description: 'White noise and pizza delivery. Not owned by any lizard people.', cost: 1000, icon: 'fas fa-vr-cardboard', type: 'hub_skin', value: 'stephenson', category: 'customization' },

            // --- UI THEMES ---
            { id: 'theme_neon_blue', name: 'Neon Blue', description: 'Classic cool blue neon vibes. Easy on the eyes, heavy on the soul.', cost: 0, icon: 'fas fa-palette', type: 'theme', value: 'blue', category: 'customization' },
            { id: 'theme_neon_pink', name: 'Hot Pink', description: 'Intense pink for the bold. Warning: May cause retinal burn.', cost: 50, icon: 'fas fa-palette', type: 'theme', value: 'pink', category: 'customization' },
            { id: 'theme_cyber_gold', name: 'Cyber Gold', description: 'Luxurious gold aesthetics. For when you have too much money.', cost: 200, icon: 'fas fa-crown', type: 'theme', value: 'gold', category: 'customization' },
            { id: 'theme_matrix', name: 'The Matrix', description: 'Digital rain green. There is no spoon.', cost: 150, icon: 'fas fa-terminal', type: 'theme', value: 'green', category: 'customization' },
            { id: 'theme_crimson', name: 'Crimson Tide', description: 'Aggressive red styling. Faster, but more dangerous.', cost: 100, icon: 'fas fa-fire', type: 'theme', value: 'red', category: 'customization' },

            // --- CLUBHOUSE FURNITURE ---
            { id: 'furniture_couch', name: 'Neon Couch', description: 'Comfy seating with glow. Surprisingly ergonomic for a glowing box.', cost: 200, icon: 'fas fa-couch', type: 'furniture', value: 'couch', category: 'property' },
            { id: 'furniture_table', name: 'Holo Table', description: 'A table from the future. Don\'t put your drink on the projector.', cost: 150, icon: 'fas fa-table', type: 'furniture', value: 'table', category: 'property' },
            { id: 'furniture_lamp', name: 'Lava Lamp', description: 'Groovy lighting. Mesmerizing blobs of digital goo.', cost: 100, icon: 'fas fa-lightbulb', type: 'furniture', value: 'lamp', category: 'property' },
            { id: 'furniture_plant', name: 'Cyber Plant', description: 'Synthetic flora. No watering required, just voltage.', cost: 120, icon: 'fas fa-seedling', type: 'furniture', value: 'plant', category: 'property' },
            { id: 'furniture_arcade', name: 'Mini Arcade', description: 'Play while you play. Recursion depth: 1.', cost: 500, icon: 'fas fa-gamepad', type: 'furniture', value: 'arcade', category: 'property' },
            { id: 'furniture_rug', name: 'Pattern Rug', description: 'Tie the room together. Don\'t let anyone pee on it.', cost: 80, icon: 'fas fa-dharmachakra', type: 'furniture', value: 'rug', vibe: 5, category: 'property' },
            { id: 'furniture_bed_neon', name: 'Neon Bed', description: 'Sleep in the glow. Dreams are now in 4K.', cost: 400, icon: 'fas fa-bed', type: 'furniture', value: 'bed_neon', vibe: 20, category: 'property' },
            { id: 'furniture_server', name: 'Data Server', description: 'High-tech computing. Makes cool whirring noises.', cost: 600, icon: 'fas fa-server', type: 'furniture', value: 'server', vibe: 25, category: 'property' },
            { id: 'furniture_art_glitch', name: 'Glitch Art', description: 'Modern digital masterpiece. It\'s not a bug, it\'s a feature.', cost: 300, icon: 'fas fa-image', type: 'furniture', value: 'art_glitch', vibe: 15, category: 'property' },
            { id: 'furniture_jukebox', name: 'Holo Jukebox', description: 'Plays the best synthwave. Still accepts quarters.', cost: 500, icon: 'fas fa-music', type: 'furniture', value: 'jukebox', vibe: 30, category: 'property' },

            // --- PROPERTIES ---
            { id: 'property_studio', name: 'Cyber Studio', description: 'A cozy starter apartment. Compact living for the digital age.', cost: 0, icon: 'fas fa-home', type: 'property', value: 'studio', category: 'property' },
            { id: 'property_penthouse', name: 'Neon Penthouse', description: 'Luxury living with a view. The air up here is cleaner.', cost: 5000, icon: 'fas fa-building', type: 'property', value: 'penthouse', category: 'property' },
            { id: 'property_moon', name: 'Moon Base', description: 'Quiet, low gravity, expensive. Commute is terrible.', cost: 10000, icon: 'fas fa-moon', type: 'property', value: 'moon', category: 'property' },

            // --- WALLPAPERS ---
            { id: 'wall_concrete', name: 'Raw Concrete', description: 'Industrial chic. Cold, hard, and fashionable.', cost: 0, icon: 'fas fa-square', type: 'wallpaper', value: 'concrete', category: 'property' },
            { id: 'wall_hex', name: 'Hexagon Grid', description: 'Futuristic patterns. Bees were onto something.', cost: 200, icon: 'fas fa-border-all', type: 'wallpaper', value: 'hex', category: 'property' },
            { id: 'wall_brick_neon', name: 'Neon Brick', description: 'Classic alleyway vibes. Watch out for stray cats.', cost: 300, icon: 'fas fa-th', type: 'wallpaper', value: 'brick', category: 'property' },

            // --- FLOORING ---
            { id: 'floor_wood', name: 'Synthetic Wood', description: 'Warm and inviting. 100% plastic trees.', cost: 0, icon: 'fas fa-grip-lines', type: 'flooring', value: 'wood', category: 'property' },
            { id: 'floor_glass', name: 'Glass Floor', description: 'Don\'t look down. Seriously, it\'s scary.', cost: 500, icon: 'fas fa-window-maximize', type: 'flooring', value: 'glass', category: 'property' },
            { id: 'floor_grid', name: 'Laser Grid', description: 'Tron-like aesthetics. Don\'t cross the beams.', cost: 400, icon: 'fas fa-border-none', type: 'flooring', value: 'grid', category: 'property' },

            // --- MUSIC DISKS ---
            { id: 'disk_acid', name: 'Acid Disk', description: '303 basslines and squelches.', cost: 200, icon: 'fas fa-compact-disc', type: 'music_disk', value: 'acid', category: 'music' },
            { id: 'disk_glitch', name: 'Glitch Disk', description: 'Broken beats and artifacts.', cost: 300, icon: 'fas fa-compact-disc', type: 'music_disk', value: 'glitch', category: 'music' },
            { id: 'disk_ambient', name: 'Ambient Disk', description: 'Chill drones for relaxing.', cost: 100, icon: 'fas fa-compact-disc', type: 'music_disk', value: 'ambient', category: 'music' },
            { id: 'disk_chiptune', name: 'Chiptune Disk', description: '8-bit nostalgia overload.', cost: 250, icon: 'fas fa-gamepad', type: 'music_disk', value: 'chiptune', category: 'music' },
            { id: 'disk_synthwave', name: 'Synthwave Disk', description: 'Retro 80s driving music.', cost: 350, icon: 'fas fa-car-side', type: 'music_disk', value: 'synthwave', category: 'music' },
            { id: 'disk_industrial', name: 'Industrial Disk', description: 'Heavy metallic beats.', cost: 400, icon: 'fas fa-industry', type: 'music_disk', value: 'industrial', category: 'music' },
            { id: 'disk_lofi', name: 'Lo-Fi Disk', description: 'Chill beats to study to.', cost: 150, icon: 'fas fa-coffee', type: 'music_disk', value: 'lofi', category: 'music' },
            { id: 'disk_dnb', name: 'Drum & Bass Disk', description: 'High tempo breakbeats.', cost: 350, icon: 'fas fa-drum', type: 'music_disk', value: 'dnb', category: 'music' },
            { id: 'disk_jazz', name: 'Jazz Collection', description: 'Smooth jazz for rough days.', cost: 400, icon: 'fas fa-saxophone', type: 'music_disk', value: 'jazz', category: 'music' },
            { id: 'disk_rock', name: 'Rock Anthology', description: 'Dad rock classics.', cost: 400, icon: 'fas fa-guitar', type: 'music_disk', value: 'rock', category: 'music' },
            { id: 'disk_reggae', name: 'Reggae Vibes', description: 'Chill island sounds.', cost: 350, icon: 'fas fa-cannabis', type: 'music_disk', value: 'reggae', category: 'music' },
            { id: 'disk_country', name: 'Country Hits', description: 'Trucks, trains, and rain.', cost: 300, icon: 'fas fa-hat-cowboy', type: 'music_disk', value: 'country', category: 'music' },
            { id: 'disk_classical', name: 'Classical Masterpieces', description: 'For the sophisticated ear.', cost: 500, icon: 'fas fa-violin', type: 'music_disk', value: 'classical', category: 'music' },

            { id: 'sub_podcast', name: 'PodCaster Premium', description: 'Unlock exclusive corporate satire podcasts.', cost: 1000, icon: 'fas fa-microphone-alt', type: 'subscription', value: 'podcast', category: 'music' },
            { id: 'sub_audiobook', name: 'BookWorm Gold', description: 'Unlimited audiobook streaming.', cost: 1500, icon: 'fas fa-book-open', type: 'subscription', value: 'audiobook', category: 'music' },

            // --- TROPHY ROOM STYLES ---
            { id: 'trophy_room_default', name: 'Classic Museum', description: 'The standard exhibition hall. Please do not touch the exhibits.', cost: 0, icon: 'fas fa-columns', type: 'trophy_room', value: 'default', category: 'arcade' },
            { id: 'trophy_room_neon', name: 'Neon Grid', description: 'Cyberpunk aesthetic for your wins. Shiny.', cost: 250, icon: 'fas fa-border-all', type: 'trophy_room', value: 'neon', category: 'arcade' },
            { id: 'trophy_room_gold', name: 'Vault of Gold', description: 'Luxurious gold plating everywhere. Heavy.', cost: 1000, icon: 'fas fa-coins', type: 'trophy_room', value: 'gold', category: 'arcade' },
            { id: 'trophy_theme_nature', name: 'Zen Garden', description: 'Peaceful organic vibes. Digital nature is healing.', cost: 350, icon: 'fas fa-leaf', type: 'trophy_room', value: 'nature', category: 'arcade' },

            // --- CABINET STYLES ---
            { id: 'cabinet_default', name: 'Standard Issue', description: 'Factory standard grey. Boring, but reliable.', cost: 0, icon: 'fas fa-cube', type: 'cabinet', value: 'default', category: 'arcade' },
            { id: 'cabinet_retro', name: 'Retro Wood', description: '70s wood grain finish. Nostalgia included.', cost: 300, icon: 'fas fa-tree', type: 'cabinet', value: 'wood', category: 'arcade' },
            { id: 'cabinet_carbon', name: 'Carbon Fiber', description: 'High-tech stealth black. It goes faster.', cost: 500, icon: 'fas fa-shield-alt', type: 'cabinet', value: 'carbon', category: 'arcade' },
            { id: 'cabinet_gold', name: 'Gold Plated', description: 'Show off your wealth. Excessive? Maybe.', cost: 1000, icon: 'fas fa-coins', type: 'cabinet', value: 'gold', category: 'arcade' },

            // --- AVATARS ---
            { id: 'avatar_astronaut', name: 'Astronaut', description: 'Ready for launch. Ground control to Major Tom.', cost: 0, icon: 'fas fa-user-astronaut', type: 'avatar', value: 'fas fa-user-astronaut', category: 'customization' },
            { id: 'avatar_robot', name: 'Robot', description: 'Beep boop. I am not a robot. Wait...', cost: 100, icon: 'fas fa-robot', type: 'avatar', value: 'fas fa-robot', category: 'customization' },
            { id: 'avatar_alien', name: 'Alien', description: 'From another world. We come in peace.', cost: 150, icon: 'fas fa-spaghetti-monster-flying', type: 'avatar', value: 'fas fa-spaghetti-monster-flying', category: 'customization' },
            { id: 'avatar_ghost', name: 'Ghost', description: 'Spooky! Boo.', cost: 200, icon: 'fas fa-ghost', type: 'avatar', value: 'fas fa-ghost', category: 'customization' },
            { id: 'avatar_ninja', name: 'Ninja', description: 'Silent but deadly. And very cool.', cost: 250, icon: 'fas fa-user-ninja', type: 'avatar', value: 'fas fa-user-ninja', category: 'customization' },
            { id: 'avatar_wizard', name: 'Wizard', description: 'You are a wizard. Magic missiles not included.', cost: 300, icon: 'fas fa-hat-wizard', type: 'avatar', value: 'fas fa-hat-wizard', category: 'customization' },
            { id: 'avatar_dragon', name: 'Dragon', description: 'Fierce creature. Fire hazard.', cost: 500, icon: 'fas fa-dragon', type: 'avatar', value: 'fas fa-dragon', category: 'customization' },

            // --- DECORATIONS (Trophy Room) ---
            { id: 'deco_stool', name: 'Arcade Stool', description: 'A classic stool. Uncomfortable after 30 minutes.', cost: 100, icon: 'fas fa-chair', type: 'decoration', value: 'stool', category: 'arcade' },
            { id: 'deco_plant', name: 'Neon Plant', description: 'Synthetic flora. Keeps the air virtual.', cost: 200, icon: 'fas fa-seedling', type: 'decoration', value: 'plant', category: 'arcade' },
            { id: 'deco_vending', name: 'Vending Machine', description: 'Refreshing snacks. Out of order.', cost: 500, icon: 'fas fa-cookie-bite', type: 'decoration', value: 'vending', category: 'arcade' },
            { id: 'deco_lamp', name: 'Lava Lamp', description: 'Groovy lighting. Mesmerizing blobs of digital goo.', cost: 150, icon: 'fas fa-lightbulb', type: 'decoration', value: 'lamp', category: 'arcade' },
            { id: 'deco_rug', name: 'Neon Rug', description: 'Tie the room together. Don\'t let anyone pee on it.', cost: 150, icon: 'fas fa-dharmachakra', type: 'decoration', value: 'rug', category: 'arcade' },
            { id: 'deco_hologram', name: 'Holo Projector', description: 'Futuristic display. Help me Obi-Wan.', cost: 400, icon: 'fas fa-video', type: 'decoration', value: 'hologram', category: 'arcade' },
            { id: 'deco_poster', name: 'Retro Poster', description: 'Vintage arcade art. Remember the 90s?', cost: 50, icon: 'fas fa-image', type: 'decoration', value: 'poster', category: 'arcade' },
            { id: 'deco_mini_cab', name: 'Mini Cabinet', description: 'A tiny arcade machine. Awww.', cost: 300, icon: 'fas fa-gamepad', type: 'decoration', value: 'minicab', category: 'arcade' }
        ];
    }

    render() {
        if (!this.container) return;

        // Render Tabs
        const tabs = [
            { id: 'all', label: 'All', icon: 'fas fa-th' },
            { id: 'arcade', label: 'Arcade', icon: 'fas fa-gamepad' },
            { id: 'customization', label: 'Themes & Skins', icon: 'fas fa-palette' },
            { id: 'music', label: 'Music', icon: 'fas fa-music' },
            { id: 'property', label: 'Properties', icon: 'fas fa-home' }
        ];

        this.container.innerHTML = `
            <div class="col-span-full mb-4 flex flex-wrap justify-center gap-2 sticky top-0 bg-slate-900/90 z-10 py-2 border-b border-slate-700">
                ${tabs.map(t => `
                    <button class="store-tab px-4 py-2 rounded-full font-bold transition-all ${this.currentTab === t.id ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/50' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}" data-tab="${t.id}">
                        <i class="${t.icon} mr-2"></i>${t.label}
                    </button>
                `).join('')}
            </div>
        `;

        // Bind Tab Events
        this.container.querySelectorAll('.store-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentTab = btn.dataset.tab;
                this.render();
            });
        });

        // Filter Items
        const currentCurrency = this.saveSystem.getCurrency();
        const filteredItems = this.items.filter(item => {
            if (this.currentTab === 'all') return true;
            return item.category === this.currentTab;
        });

        if (filteredItems.length === 0) {
            this.container.innerHTML += `<div class="col-span-full text-center text-slate-500 py-12"><i class="fas fa-search text-4xl mb-2"></i><br>No items found in this category.</div>`;
        }

        filteredItems.forEach(item => {
            const isUnlocked = this.saveSystem.isItemUnlocked(item.id) || item.cost === 0;
            const canAfford = currentCurrency >= item.cost;

            // Check if currently equipped
            let isEquipped = false;
            const equippedVal = this.saveSystem.getEquippedItem(item.type);

            if (['hub_skin', 'theme', 'cabinet', 'trophy_room', 'property', 'wallpaper', 'flooring', 'music_disk'].includes(item.type)) {
                // Strict equality if val exists
                isEquipped = equippedVal === item.value;
                
                // Fallback: if undefined, check if this is the default item
                if (equippedVal === undefined && item.cost === 0) isEquipped = true;
                
                // Special robustness checks for default IDs
                if (item.id === 'skin_default' && (equippedVal === 'default' || !equippedVal)) isEquipped = true;
                if (item.id === 'theme_neon_blue' && (equippedVal === 'blue' || !equippedVal)) isEquipped = true;
                if (item.id === 'cabinet_default' && (equippedVal === 'default' || !equippedVal)) isEquipped = true;
                if (item.id === 'trophy_room_default' && (equippedVal === 'default' || !equippedVal)) isEquipped = true;
                if (item.id === 'property_studio' && (equippedVal === 'studio' || !equippedVal)) isEquipped = true;
                if (item.id === 'wall_concrete' && (equippedVal === 'concrete' || !equippedVal)) isEquipped = true;
                if (item.id === 'floor_wood' && (equippedVal === 'wood' || !equippedVal)) isEquipped = true;
                if (item.id === 'disk_acid' && (equippedVal === 'acid' || !equippedVal)) isEquipped = true;

            } else if (item.type === 'avatar') {
                isEquipped = equippedVal === item.value;
                // Default avatar check
                if (item.id === 'avatar_astronaut' && !equippedVal) isEquipped = true;
            } else if (item.type === 'decoration' || item.type === 'furniture') {
                isEquipped = isUnlocked; // Active if owned
            }

            const card = document.createElement('div');
            // Visual border
            let borderClass = 'border-slate-700';
            if (isEquipped) borderClass = 'border-fuchsia-500 shadow-lg shadow-fuchsia-500/20';
            else if (isUnlocked) borderClass = 'border-green-500/50';

            card.className = `glass-panel p-4 rounded-lg flex flex-col items-center text-center transition-all ${borderClass}`;

            let buttonHtml = '';

            if (isUnlocked) {
                 if (item.type === 'decoration' || item.type === 'furniture') {
                    buttonHtml = `<button class="w-full py-2 bg-green-600 text-white font-bold rounded cursor-default"><i class="fas fa-check"></i> Owned</button>`;
                 } else if (isEquipped) {
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
                btn.addEventListener('click', (e) => {
                    this.buy(item, e);
                });
            } else if (isUnlocked && !isEquipped && item.type !== 'decoration' && item.type !== 'furniture') {
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
            // General Save Trigger
            if (['hub_skin', 'theme', 'cabinet', 'trophy_room', 'avatar', 'property', 'wallpaper', 'flooring', 'music_disk'].includes(item.type)) {
                this.saveSystem.equipItem(item.type, item.value);
            }

            // Specific Side Effects
            if (item.type === 'avatar') {
                // Update Player Profile Object
                const profile = this.saveSystem.getProfile();
                if (profile) {
                    profile.avatar = item.value;
                    this.saveSystem.save();
                }
            } 
            
            if (item.type === 'theme') {
                // Update CSS Hook immediately
                document.body.className = `theme-${item.value}`;
            }

            if (item.type === 'music_disk') {
                SoundManager.getInstance().setMusicStyle(item.value);
                this.showToast(`Now playing: ${item.name}`);
            }

            this.render();
        } catch (e) {
            console.error("Store: Failed to equip item", e);
        }
    }

    buy(item, event) {
        try {
            if (this.saveSystem.buyItem(item.id, item.cost)) {
                this.render();

                // Force Update HUD
                if (typeof window.updateHubStats === 'function') {
                     window.updateHubStats();
                } else if (typeof updateHubStats === 'function') {
                     updateHubStats();
                }

                // Visual feedback: Particles
                const particleSystem = ParticleSystem.getInstance();
                if (particleSystem) {
                    // Spawn particles at the click location (button center)
                    const rect = event.target.getBoundingClientRect();
                    const x = rect.left + rect.width / 2;
                    const y = rect.top + rect.height / 2;
                    particleSystem.emit(x, y, '#fbbf24', 30);
                }

                // Sound
                SoundManager.getInstance().playSound('score');

                // Toast Notification
                this.showToast(`Purchased ${item.name}!`);

            } else {
                alert("Not enough coins!");
            }
        } catch (e) {
            console.error("Store: Transaction failed", e);
        }
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg font-bold z-[100] animate-bounce';
        toast.innerHTML = `<i class="fas fa-check-circle mr-2"></i> ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    updateCurrencyDisplays() {
        const val = this.saveSystem.getCurrency();
        this.currencyDisplays.forEach(el => {
            if (el) el.innerText = val;
        });
    }
}