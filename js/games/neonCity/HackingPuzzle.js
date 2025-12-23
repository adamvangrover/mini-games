export default class HackingPuzzle {
    constructor(container, onComplete) {
        this.container = container;
        this.onComplete = onComplete;
        this.overlay = null;
        this.active = false;

        this.sequence = [];
        this.playerSequence = [];
    }

    start() {
        this.active = true;
        this.createOverlay();
        this.startRound();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm';
        this.overlay.innerHTML = `
            <div class="bg-slate-900 border-2 border-cyan-500 rounded-xl p-8 max-w-md w-full text-center shadow-[0_0_50px_rgba(6,182,212,0.5)]">
                <h2 class="text-3xl font-bold text-cyan-400 mb-2 font-mono">NODE_ACCESS_PROTOCOL</h2>
                <p class="text-gray-400 mb-6 text-sm">Memorize the pattern to bypass the firewall.</p>

                <div id="puzzle-grid" class="grid grid-cols-3 gap-4 mb-6 mx-auto w-64">
                    <!-- 9 Buttons -->
                    ${Array(9).fill(0).map((_, i) => `
                        <button data-id="${i}" class="puzzle-btn w-20 h-20 bg-slate-800 border border-slate-600 rounded hover:border-cyan-400 transition-all duration-200"></button>
                    `).join('')}
                </div>

                <div id="status-text" class="text-xl font-bold text-white h-8">WAIT...</div>
            </div>
        `;
        this.container.appendChild(this.overlay);

        // Bind clicks
        this.overlay.querySelectorAll('.puzzle-btn').forEach(btn => {
            btn.onclick = (e) => this.handleInput(parseInt(e.target.dataset.id));
        });
    }

    async startRound() {
        const status = this.overlay.querySelector('#status-text');
        status.textContent = "OBSERVE";
        status.className = "text-xl font-bold text-yellow-400 h-8 animate-pulse";

        // Disable input
        this.inputLocked = true;

        // Generate Sequence (length 4)
        this.sequence = [];
        for(let i=0; i<4; i++) {
            this.sequence.push(Math.floor(Math.random() * 9));
        }

        // Play Sequence
        await new Promise(r => setTimeout(r, 1000));

        for(let id of this.sequence) {
            await this.flashButton(id);
            await new Promise(r => setTimeout(r, 300));
        }

        this.inputLocked = false;
        this.playerSequence = [];
        status.textContent = "INPUT SEQUENCE";
        status.className = "text-xl font-bold text-green-400 h-8";
    }

    async flashButton(id) {
        const btn = this.overlay.querySelector(`button[data-id="${id}"]`);
        if(btn) {
            btn.classList.add('bg-cyan-500', 'shadow-[0_0_20px_cyan]');
            // Sound effect if possible
            if(window.miniGameHub && window.miniGameHub.soundManager) {
                window.miniGameHub.soundManager.playSound('click');
            }
            await new Promise(r => setTimeout(r, 300));
            btn.classList.remove('bg-cyan-500', 'shadow-[0_0_20px_cyan]');
        }
    }

    handleInput(id) {
        if(this.inputLocked) return;

        this.flashButton(id); // Visual feedback
        this.playerSequence.push(id);

        // Check validity so far
        const index = this.playerSequence.length - 1;
        if(this.playerSequence[index] !== this.sequence[index]) {
            this.fail();
            return;
        }

        if(this.playerSequence.length === this.sequence.length) {
            this.success();
        }
    }

    success() {
        this.inputLocked = true;
        const status = this.overlay.querySelector('#status-text');
        status.textContent = "ACCESS GRANTED";
        status.className = "text-xl font-bold text-cyan-400 h-8 animate-bounce";

        setTimeout(() => {
            this.close();
            if(this.onComplete) this.onComplete(true);
        }, 1000);
    }

    fail() {
        this.inputLocked = true;
        const status = this.overlay.querySelector('#status-text');
        status.textContent = "ACCESS DENIED";
        status.className = "text-xl font-bold text-red-500 h-8 shake";

        this.overlay.querySelector('.bg-slate-900').classList.add('border-red-500');

        setTimeout(() => {
            this.close();
            if(this.onComplete) this.onComplete(false);
        }, 1000);
    }

    close() {
        if(this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        this.active = false;
    }
}
