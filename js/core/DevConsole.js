import SaveSystem from './SaveSystem.js';

export default class DevConsole {
    constructor() {
        this.visible = false;
        this.container = null;
        this.input = null;
        this.log = null;
        this.saveSystem = SaveSystem.getInstance();

        this.init();
    }

    init() {
        // Create UI
        this.container = document.createElement('div');
        this.container.id = 'dev-console';
        this.container.className = 'fixed top-0 left-0 w-full h-1/3 bg-black/90 text-green-400 font-mono text-sm z-[10000] hidden flex flex-col border-b-2 border-green-500 shadow-2xl';
        this.container.innerHTML = `
            <div id="dev-log" class="flex-1 overflow-y-auto p-4 space-y-1"></div>
            <div class="flex border-t border-green-800">
                <span class="px-2 py-2 select-none">></span>
                <input id="dev-input" type="text" class="flex-1 bg-transparent border-none outline-none text-green-400 p-2" placeholder="Enter command (type 'help')..." autocomplete="off">
            </div>
        `;
        document.body.appendChild(this.container);

        this.log = this.container.querySelector('#dev-log');
        this.input = this.container.querySelector('#dev-input');

        // Toggle Key (Backtick/Tilde)
        document.addEventListener('keydown', (e) => {
            if (e.key === '`' || e.key === '~') {
                e.preventDefault();
                this.toggle();
            }
            if (this.visible && e.key === 'Enter') {
                this.processCommand();
            }
        });

        this.print("NeonOS Developer Console v1.0.0 initialized.");
    }

    toggle() {
        this.visible = !this.visible;
        if (this.visible) {
            this.container.classList.remove('hidden');
            this.input.focus();
        } else {
            this.container.classList.add('hidden');
        }
    }

    print(msg, type = 'info') {
        const line = document.createElement('div');
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        if (type === 'error') line.className = 'text-red-500';
        if (type === 'success') line.className = 'text-yellow-400 font-bold';
        this.log.appendChild(line);
        this.log.scrollTop = this.log.scrollHeight;
    }

    processCommand() {
        const raw = this.input.value.trim();
        this.input.value = '';
        if (!raw) return;

        this.print(`> ${raw}`);
        const [cmd, ...args] = raw.split(' ');

        switch (cmd.toLowerCase()) {
            case 'help':
                this.print("Available commands:");
                this.print("  add_coins <amount>");
                this.print("  set_level <level>");
                this.print("  unlock_all (games & achievements)");
                this.print("  reset_save");
                this.print("  toggle_crt");
                this.print("  god_mode (current game)");
                break;

            case 'add_coins':
                const amount = parseInt(args[0]);
                if (isNaN(amount)) {
                    this.print("Usage: add_coins <amount>", 'error');
                } else {
                    this.saveSystem.addCurrency(amount);
                    this.print(`Added ${amount} coins. New balance: ${this.saveSystem.getCurrency()}`, 'success');
                    if(window.updateHubStats) window.updateHubStats(); // Helper global
                }
                break;

            case 'set_level':
                const level = parseInt(args[0]);
                if (isNaN(level)) {
                    this.print("Usage: set_level <level>", 'error');
                } else {
                    this.saveSystem.data.level = level;
                    this.saveSystem.save();
                    this.print(`Level set to ${level}`, 'success');
                }
                break;

            case 'unlock_all':
                // Unlock all games
                Object.keys(window.miniGameHub?.gameRegistry || {}).forEach(id => {
                    this.saveSystem.unlockGame(id);
                });
                // Unlock all achievements
                import('./AchievementRegistry.js').then(({ AchievementRegistry }) => {
                    Object.keys(AchievementRegistry).forEach(id => {
                        this.saveSystem.unlockAchievement(id);
                    });
                    this.print("All games and achievements unlocked.", 'success');
                });
                break;

            case 'reset_save':
                localStorage.clear();
                this.print("Save data cleared. Reloading...", 'error');
                setTimeout(() => location.reload(), 1000);
                break;

            case 'toggle_crt':
                const crt = document.getElementById('crt-overlay');
                if (crt) {
                    if (crt.classList.contains('hidden')) {
                        crt.classList.remove('hidden');
                        this.saveSystem.setSetting('crt', true);
                        this.print("CRT Effect ON", 'success');
                    } else {
                        crt.classList.add('hidden');
                        this.saveSystem.setSetting('crt', false);
                        this.print("CRT Effect OFF", 'success');
                    }
                }
                break;

            default:
                this.print(`Unknown command: ${cmd}`, 'error');
        }
    }
}
