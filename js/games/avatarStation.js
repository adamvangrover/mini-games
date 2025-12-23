import SaveSystem from '../core/SaveSystem.js';

export default class AvatarStation {
    constructor() {
        this.container = null;
        this.saveSystem = SaveSystem.getInstance();
        this.colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#d946ef', '#ec4899'];
        this.icons = ['fa-robot', 'fa-ghost', 'fa-dragon', 'fa-cat', 'fa-dog', 'fa-user-astronaut', 'fa-rocket', 'fa-skull', 'fa-crown', 'fa-bolt', 'fa-heart'];
    }

    async init(container) {
        this.container = container;
        this.render();
    }

    render() {
        this.container.innerHTML = '';
        this.container.classList.add('flex', 'flex-col', 'items-center', 'justify-center', 'min-h-screen', 'bg-slate-900', 'text-white', 'p-4');

        const currentAvatar = this.saveSystem.data.avatar || { color: '#00ffff', icon: 'fa-robot' };

        this.container.innerHTML = `
            <div class="glass-panel p-8 rounded-2xl max-w-2xl w-full flex flex-col items-center animate-fade-in">
                <h2 class="text-3xl mb-8 title-glow text-center">Identity Module</h2>

                <!-- Preview -->
                <div id="avatar-preview" class="avatar-preview" style="background: ${currentAvatar.color}; box-shadow: 0 0 30px ${currentAvatar.color}">
                    <i class="fas ${currentAvatar.icon} text-black/80"></i>
                </div>

                <!-- Controls -->
                <div class="w-full space-y-6">
                    <div>
                        <h3 class="text-sm uppercase tracking-widest text-slate-400 mb-2">Neon Signature</h3>
                        <div class="flex flex-wrap justify-center gap-3">
                            ${this.colors.map(c => `
                                <button class="w-8 h-8 rounded-full border-2 border-white/20 hover:scale-110 transition-transform color-btn"
                                    style="background: ${c}" data-color="${c}">
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <h3 class="text-sm uppercase tracking-widest text-slate-400 mb-2">Hologram Icon</h3>
                        <div class="flex flex-wrap justify-center gap-3">
                            ${this.icons.map(icon => `
                                <button class="w-10 h-10 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-cyan-400 transition-colors icon-btn"
                                    data-icon="${icon}">
                                    <i class="fas ${icon}"></i>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="mt-8 flex gap-4">
                     <button id="avatar-save-btn" class="px-8 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 rounded font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(192,38,211,0.5)] transition-all hover:scale-105">
                        Initialize
                     </button>
                     <button class="back-btn px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded font-bold uppercase tracking-wider">
                        Cancel
                     </button>
                </div>
            </div>
        `;

        // Listeners
        this.container.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                this.updatePreview(color, null);
            });
        });

        this.container.querySelectorAll('.icon-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const icon = btn.dataset.icon;
                this.updatePreview(null, icon);
            });
        });

        this.container.querySelector('#avatar-save-btn').addEventListener('click', () => {
            this.saveSystem.save(); // Data is updated in real-time in memory via updatePreview? No, local state.
            // Wait, I should implement local state.
            const preview = document.getElementById('avatar-preview');
            const color = preview.dataset.color; // I'll store it on the element for convenience
            const icon = preview.dataset.icon;

            this.saveSystem.data.avatar = { color, icon };
            this.saveSystem.save();

            // Visual confirmation
            const btn = document.getElementById('avatar-save-btn');
            btn.textContent = "SAVED";
            btn.classList.add('bg-green-600');
            setTimeout(() => window.miniGameHub.goBack(), 500);
        });

        this.container.querySelector('.back-btn').addEventListener('click', () => {
             window.miniGameHub.goBack();
        });

        // Init preview state
        const preview = document.getElementById('avatar-preview');
        preview.dataset.color = currentAvatar.color;
        preview.dataset.icon = currentAvatar.icon;
    }

    updatePreview(color, icon) {
        const preview = document.getElementById('avatar-preview');
        const iconEl = preview.querySelector('i');

        if (color) {
            preview.style.background = color;
            preview.style.boxShadow = `0 0 30px ${color}`;
            preview.dataset.color = color;
        }
        if (icon) {
            iconEl.className = `fas ${icon} text-black/80`;
            preview.dataset.icon = icon;
        }
    }

    async shutdown() {
        this.container.innerHTML = '';
    }
}
