import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonVaults {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.container = null;

        // Base game values representing $0.01 to $1,000,000 (scaled for points/coins)
        // 26 values total
        this.boardValues = [
            1, 5, 10, 25, 50, 75, 100, 200, 300, 400, 500, 750, 1000,
            5000, 10000, 25000, 50000, 75000, 100000, 200000, 300000, 400000, 500000, 750000, 1000000, 2000000
        ];

        this.vaults = []; // { id: 1..26, value: number, opened: boolean }
        this.playerVault = null;

        this.phase = 'select-player-vault'; // select-player-vault, open-vaults, banker-offer, game-over

        // Number of vaults to open per round
        this.roundSchedule = [6, 5, 4, 3, 2, 1, 1, 1, 1, 1];
        this.currentRound = 0;
        this.vaultsToOpenThisRound = this.roundSchedule[0];

        // UI Elements
        this.messageEl = null;
        this.vaultsContainerEl = null;
        this.boardLeftEl = null;
        this.boardRightEl = null;
        this.offerModalEl = null;
    }

    async init(container) {
        this.container = container;
        this.renderLayout();
        this.bindEvents();
        this.startGame();
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="flex flex-col items-center h-full w-full font-mono text-slate-300 relative select-none bg-slate-900 overflow-y-auto custom-scrollbar p-4">
                <h2 class="text-4xl font-bold text-yellow-500 neon-text mb-2 tracking-widest text-center mt-4">NEON VAULTS</h2>

                <div id="nv-message" class="text-xl text-white mb-6 h-8 text-center px-6 py-2 bg-slate-800 rounded-full border border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.3)]">
                    SELECT YOUR VAULT
                </div>

                <div class="flex flex-col lg:flex-row w-full max-w-6xl gap-4 flex-1">

                    <!-- Left Value Board -->
                    <div class="flex-none w-full lg:w-48 flex flex-col gap-1 p-2 bg-slate-800/80 rounded-lg border border-slate-700 h-fit" id="nv-board-left">
                        <!-- Values injected here -->
                    </div>

                    <!-- Center Vaults Area -->
                    <div class="flex-1 flex flex-col items-center justify-center relative">
                        <div id="nv-player-vault-area" class="h-32 w-full flex items-center justify-center mb-4 border-b border-slate-700/50 pb-4">
                            <!-- Player's chosen vault goes here visually -->
                            <div class="text-slate-500 text-sm">YOUR VAULT</div>
                        </div>

                        <div id="nv-vaults-grid" class="flex flex-wrap justify-center gap-3 max-w-2xl">
                            <!-- 26 Vaults injected here -->
                        </div>
                    </div>

                    <!-- Right Value Board -->
                    <div class="flex-none w-full lg:w-48 flex flex-col gap-1 p-2 bg-slate-800/80 rounded-lg border border-slate-700 h-fit" id="nv-board-right">
                        <!-- Values injected here -->
                    </div>

                </div>

                <!-- Banker Offer Modal Overlay -->
                <div id="nv-offer-modal" class="hidden absolute inset-0 bg-black/80 z-20 flex items-center justify-center p-4">
                    <div class="bg-slate-800 border-2 border-yellow-500 rounded-xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(234,179,8,0.3)] transform transition-transform scale-95">
                        <h3 class="text-2xl text-slate-300 mb-2"><i class="fas fa-phone-alt animate-pulse text-red-500 mr-2"></i> THE SYSTEM IS CALLING</h3>
                        <p class="text-slate-400 mb-6">Based on probability, the System offers to buy your vault for:</p>

                        <div id="nv-offer-amount" class="text-5xl font-black text-yellow-400 mb-8 title-glow">$0</div>

                        <div class="flex gap-4 justify-center">
                            <button id="nv-btn-deal" class="flex-1 px-6 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-xl transition-colors border-b-4 border-green-800 active:border-b-0 active:translate-y-1">DEAL</button>
                            <button id="nv-btn-nodeal" class="flex-1 px-6 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xl transition-colors border-b-4 border-red-800 active:border-b-0 active:translate-y-1">NO DEAL</button>
                        </div>
                    </div>
                </div>

            </div>
            <style>
                .nv-val {
                    background: linear-gradient(90deg, #1e293b, #0f172a);
                    color: #fbbf24;
                    padding: 4px 8px;
                    border: 1px solid #334155;
                    border-radius: 4px;
                    text-align: right;
                    font-weight: bold;
                    transition: all 0.3s;
                }
                .nv-val.eliminated {
                    opacity: 0.3;
                    background: #1e293b;
                    color: #64748b;
                    text-decoration: line-through;
                }
                .nv-vault {
                    width: 70px;
                    height: 50px;
                    background: linear-gradient(180deg, #64748b, #334155);
                    border: 2px solid #94a3b8;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.25rem;
                    font-weight: bold;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2);
                }
                .nv-vault:hover:not(.opened) {
                    transform: scale(1.1);
                    border-color: #cbd5e1;
                    box-shadow: 0 0 15px rgba(255,255,255,0.4);
                }
                .nv-vault.opened {
                    opacity: 0;
                    pointer-events: none;
                    transform: scale(0.5);
                }
                .nv-vault.player-owned {
                    border-color: #f59e0b;
                    box-shadow: 0 0 20px rgba(245, 158, 11, 0.5);
                    transform: scale(1.2);
                    cursor: default;
                }
                @media (max-width: 768px) {
                    .nv-vault { width: 50px; height: 40px; font-size: 1rem; }
                    .nv-val { font-size: 0.75rem; padding: 2px 4px; }
                }
            </style>
        `;

        this.messageEl = document.getElementById('nv-message');
        this.vaultsContainerEl = document.getElementById('nv-vaults-grid');
        this.boardLeftEl = document.getElementById('nv-board-left');
        this.boardRightEl = document.getElementById('nv-board-right');
        this.offerModalEl = document.getElementById('nv-offer-modal');
        this.playerVaultAreaEl = document.getElementById('nv-player-vault-area');
    }

    bindEvents() {
        // Delegated click for vaults
        this.vaultsContainerEl.addEventListener('click', (e) => {
            const vaultEl = e.target.closest('.nv-vault');
            if (!vaultEl) return;

            const id = parseInt(vaultEl.dataset.id);
            this.handleVaultClick(id, vaultEl);
        });

        // Deal / No Deal buttons
        document.getElementById('nv-btn-deal').addEventListener('click', () => this.handleDeal(true));
        document.getElementById('nv-btn-nodeal').addEventListener('click', () => this.handleDeal(false));
    }

    startGame() {
        this.phase = 'select-player-vault';
        this.currentRound = 0;
        this.vaultsToOpenThisRound = this.roundSchedule[0];
        this.playerVault = null;
        this.offerModalEl.classList.add('hidden');

        // Shuffle values
        let shuffledValues = [...this.boardValues];
        for (let i = shuffledValues.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledValues[i], shuffledValues[j]] = [shuffledValues[j], shuffledValues[i]];
        }

        this.vaults = [];
        for (let i = 0; i < 26; i++) {
            this.vaults.push({
                id: i + 1,
                value: shuffledValues[i],
                opened: false
            });
        }

        this.renderBoard();
        this.renderVaults();
        this.updateMessage();
    }

    renderBoard() {
        this.boardLeftEl.innerHTML = '';
        this.boardRightEl.innerHTML = '';

        // Left side: lower half (indices 0-12)
        for (let i = 0; i < 13; i++) {
            this.boardLeftEl.appendChild(this.createValElement(this.boardValues[i]));
        }
        // Right side: upper half (indices 13-25)
        for (let i = 13; i < 26; i++) {
            this.boardRightEl.appendChild(this.createValElement(this.boardValues[i]));
        }
    }

    createValElement(val) {
        const el = document.createElement('div');
        el.className = 'nv-val';
        el.id = `val-${val}`;
        el.textContent = this.formatCurrency(val);
        return el;
    }

    renderVaults() {
        this.vaultsContainerEl.innerHTML = '';
        this.playerVaultAreaEl.innerHTML = '<div class="text-slate-500 text-sm">YOUR VAULT</div>';

        for (let i = 0; i < 26; i++) {
            const v = this.vaults[i];
            const el = document.createElement('div');
            el.className = 'nv-vault';
            el.dataset.id = v.id;
            el.textContent = v.id;
            this.vaultsContainerEl.appendChild(el);
        }
    }

    formatCurrency(num) {
        return '$' + num.toLocaleString();
    }

    updateMessage() {
        if (this.phase === 'select-player-vault') {
            this.messageEl.textContent = "SELECT YOUR VAULT";
            this.messageEl.className = "text-xl text-yellow-400 mb-6 h-8 text-center px-6 py-2 bg-slate-800 rounded-full border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)] animate-pulse";
        } else if (this.phase === 'open-vaults') {
            this.messageEl.textContent = `OPEN ${this.vaultsToOpenThisRound} MORE VAULT${this.vaultsToOpenThisRound > 1 ? 'S' : ''}`;
            this.messageEl.className = "text-xl text-cyan-400 mb-6 h-8 text-center px-6 py-2 bg-slate-800 rounded-full border border-cyan-500/50";
        }
    }

    handleVaultClick(id, element) {
        if (element.classList.contains('opened') || element.classList.contains('player-owned')) return;
        if (this.phase === 'banker-offer' || this.phase === 'game-over') return;

        const vaultObj = this.vaults.find(v => v.id === id);

        if (this.phase === 'select-player-vault') {
            this.playerVault = vaultObj;
            element.classList.add('player-owned');

            // Move to dedicated area visually
            this.playerVaultAreaEl.innerHTML = '';
            this.playerVaultAreaEl.appendChild(element);

            this.soundManager.playSound('click');

            this.phase = 'open-vaults';
            this.updateMessage();
        } else if (this.phase === 'open-vaults') {
            this.openVault(vaultObj, element);
        }
    }

    openVault(vaultObj, element) {
        vaultObj.opened = true;
        element.classList.add('opened');

        // Visual reveal
        const revealEl = document.createElement('div');
        revealEl.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 border-2 rounded-lg p-8 flex items-center justify-center text-4xl font-bold shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all duration-1000';

        // Style based on value (red for high, blue for low)
        const isHighValue = vaultObj.value > 10000;
        revealEl.style.borderColor = isHighValue ? '#ef4444' : '#3b82f6';
        revealEl.style.color = isHighValue ? '#fca5a5' : '#93c5fd';
        revealEl.textContent = this.formatCurrency(vaultObj.value);

        this.container.appendChild(revealEl);

        // Sound
        if (isHighValue) {
            this.soundManager.playSound('error'); // Bad for player
        } else {
            this.soundManager.playSound('score'); // Good for player
        }

        // Cross off board
        const valBoardEl = document.getElementById(`val-${vaultObj.value}`);
        if (valBoardEl) {
            valBoardEl.classList.add('eliminated');
        }

        // Cleanup reveal
        setTimeout(() => {
            revealEl.style.opacity = '0';
            setTimeout(() => revealEl.remove(), 1000);

            this.vaultsToOpenThisRound--;

            if (this.vaultsToOpenThisRound <= 0) {
                this.triggerBanker();
            } else {
                this.updateMessage();
            }
        }, 1500);
    }

    triggerBanker() {
        this.phase = 'banker-offer';

        // Calculate offer based on expected value of remaining unopened vaults (including player's)
        const remainingVaults = this.vaults.filter(v => !v.opened);
        const sum = remainingVaults.reduce((acc, v) => acc + v.value, 0);
        const expectedValue = sum / remainingVaults.length;

        // The banker offer formula usually starts low and approaches EV later
        // Simplified: Offer = EV * (Round / TotalRounds)
        const roundFactor = (this.currentRound + 1) / this.roundSchedule.length;
        let offer = Math.floor(expectedValue * roundFactor);

        // Add some noise
        offer = Math.floor(offer * (0.95 + Math.random() * 0.1));

        this.currentOffer = offer;

        document.getElementById('nv-offer-amount').textContent = this.formatCurrency(offer);

        this.soundManager.playSound('click'); // Or a phone ringing sound if available
        this.messageEl.textContent = "THE SYSTEM IS CALLING...";
        this.messageEl.className = "text-xl text-red-500 mb-6 h-8 text-center px-6 py-2 bg-slate-800 rounded-full border border-red-500/50 animate-pulse";

        setTimeout(() => {
            this.offerModalEl.classList.remove('hidden');
            // Small scale animation
            requestAnimationFrame(() => {
                this.offerModalEl.firstElementChild.classList.remove('scale-95');
                this.offerModalEl.firstElementChild.classList.add('scale-100');
            });
        }, 1500);
    }

    handleDeal(accepted) {
        if (this.phase !== 'banker-offer') return;

        this.offerModalEl.firstElementChild.classList.remove('scale-100');
        this.offerModalEl.firstElementChild.classList.add('scale-95');

        setTimeout(() => {
            this.offerModalEl.classList.add('hidden');

            if (accepted) {
                this.soundManager.playSound('win');
                this.gameOver(this.currentOffer, "ACCEPTED SYSTEM OFFER");
            } else {
                this.soundManager.playSound('click');
                this.currentRound++;

                if (this.currentRound >= this.roundSchedule.length) {
                    // Final round, force open player vault
                    this.phase = 'game-over';
                    this.gameOver(this.playerVault.value, "OPENED YOUR VAULT");
                } else {
                    this.phase = 'open-vaults';
                    this.vaultsToOpenThisRound = this.roundSchedule[this.currentRound];
                    this.updateMessage();
                }
            }
        }, 300);
    }

    gameOver(winnings, reason) {
        this.phase = 'game-over';

        // Show player what was in their vault if they dealt
        let extraMsg = "";
        if (reason === "ACCEPTED SYSTEM OFFER") {
             extraMsg = `<br><span class="text-sm text-slate-400">Your vault contained: ${this.formatCurrency(this.playerVault.value)}</span>`;
        }

        this.messageEl.innerHTML = `${reason}: <span class="text-yellow-400">${this.formatCurrency(winnings)}</span>${extraMsg}`;
        this.messageEl.className = "text-xl text-white mb-6 h-auto min-h-8 text-center px-6 py-2 bg-slate-800 rounded-lg border border-yellow-500/50";

        // Scale winnings for Arcade Hub currency (e.g. max 1,000,000 -> ~10,000 coins)
        const score = Math.floor(winnings / 100);

        setTimeout(() => {
            window.miniGameHub.showGameOver(score, () => this.startGame());
        }, 3000);
    }

    update(dt) {}
    draw() {}

    shutdown() {
        this.container.innerHTML = '';
    }
}