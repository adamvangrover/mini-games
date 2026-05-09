export default class AscensionGame {
    constructor() {
        this.container = null;
        this.board = [];
        this.words = ["DATA", "DATE", "LATE", "LAKE", "LIKE", "BIKE"]; // verified word ladder
        this.targetLength = 6;
        this.isComplete = false;

        this.draggedItem = null;
        this.placeholder = null;
    }

    init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = 'game-container flex flex-col bg-[#050510] text-[#00ffcc] font-mono relative overflow-hidden items-center justify-center p-4';

        // Header
        const header = document.createElement('div');
        header.className = "absolute top-4 left-0 w-full flex justify-between items-center px-4 z-50";
        header.innerHTML = `
            <button id="asc-back" class="px-4 py-2 bg-[#00ffcc] text-[#050510] font-bold rounded shadow hover:bg-white transition-colors uppercase pointer-events-auto">[ RETURN ]</button>
            <h1 class="text-2xl font-bold tracking-widest uppercase" style="text-shadow: 0 0 10px #00ffcc;">ASCENSION</h1>
            <div class="px-4 py-2 opacity-0">spacer</div>
        `;
        this.container.appendChild(header);
        document.getElementById('asc-back').onclick = () => window.miniGameHub && window.miniGameHub.goBack();

        this.statusEl = document.createElement('div');
        this.statusEl.className = "mb-8 text-xl text-center h-8";
        this.statusEl.innerText = "ALIGN THE PROTOCOL";
        this.container.appendChild(this.statusEl);

        this.listEl = document.createElement('div');
        this.listEl.className = "w-full max-w-sm flex flex-col gap-2 relative";
        this.container.appendChild(this.listEl);

        this.generateLevel();
    }

    generateLevel() {
        this.isComplete = false;

        // Randomize
        this.board = [...this.words].sort(() => Math.random() - 0.5);
        this.renderList();
    }

    renderList() {
        this.listEl.innerHTML = '';

        this.board.forEach((word, index) => {
            const row = document.createElement('div');
            row.className = "w-full p-4 bg-[#112240] border-2 border-[#00ffcc] rounded flex justify-center text-3xl font-bold cursor-grab active:cursor-grabbing select-none hover:bg-[#233554] transition-colors relative";
            row.innerText = word;
            row.draggable = true;
            row.dataset.index = index;

            // Check validity with neighbors (distance = 1)
            let validTop = index === 0 || this.getDistance(this.board[index-1], word) === 1;
            let validBot = index === this.board.length - 1 || this.getDistance(word, this.board[index+1]) === 1;

            if (validTop && validBot) {
                row.classList.remove('border-[#00ffcc]');
                row.classList.add('border-[#ff00ff]', 'text-[#ff00ff]');
            }

            // Drag Events
            row.addEventListener('dragstart', (e) => {
                if (this.isComplete) {
                    e.preventDefault();
                    return;
                }
                this.draggedItem = row;
                e.dataTransfer.effectAllowed = "move";
                setTimeout(() => row.style.opacity = '0.5', 0);
            });

            row.addEventListener('dragend', () => {
                this.draggedItem.style.opacity = '1';
                this.draggedItem = null;
                this.checkWin();
            });

            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";

                const bounding = row.getBoundingClientRect();
                const offset = bounding.y + (bounding.height / 2);
                if (e.clientY - offset > 0) {
                    row.style.borderBottom = "4px solid #fff";
                    row.style.borderTop = "";
                } else {
                    row.style.borderTop = "4px solid #fff";
                    row.style.borderBottom = "";
                }
            });

            row.addEventListener('dragleave', () => {
                row.style.borderTop = "";
                row.style.borderBottom = "";
            });

            row.addEventListener('drop', (e) => {
                e.preventDefault();
                row.style.borderTop = "";
                row.style.borderBottom = "";

                if (this.draggedItem !== row) {
                    const dragIdx = parseInt(this.draggedItem.dataset.index);
                    const dropIdx = parseInt(row.dataset.index);

                    // Reorder array
                    const item = this.board.splice(dragIdx, 1)[0];

                    const bounding = row.getBoundingClientRect();
                    const offset = bounding.y + (bounding.height / 2);
                    let targetIdx = dropIdx;

                    if (dragIdx < dropIdx && e.clientY - offset <= 0) targetIdx--;
                    if (dragIdx > dropIdx && e.clientY - offset > 0) targetIdx++;

                    this.board.splice(targetIdx, 0, item);

                    this.renderList();
                    this.triggerScrambleAnimation(targetIdx);
                }
            });

            this.listEl.appendChild(row);
        });
    }

    triggerScrambleAnimation(index) {
        const row = this.listEl.children[index];
        if (!row) return;

        const targetWord = this.board[index];
        let iterations = 0;
        const maxIterations = 10;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

        const interval = setInterval(() => {
            row.innerText = targetWord.split('').map((c, i) => {
                if (i < iterations / maxIterations * targetWord.length) return targetWord[i];
                return chars[Math.floor(Math.random() * chars.length)];
            }).join('');

            iterations++;
            if (iterations > maxIterations) {
                clearInterval(interval);
                row.innerText = targetWord;
            }
        }, 30);
    }

    getDistance(a, b) {
        if (!a || !b) return -1;
        if (a.length !== b.length) return -1;
        let dist = 0;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) dist++;
        }
        return dist;
    }

    checkWin() {
        let valid = true;
        for (let i = 0; i < this.board.length - 1; i++) {
            if (this.getDistance(this.board[i], this.board[i+1]) !== 1) {
                valid = false;
                break;
            }
        }

        if (valid) {
            this.isComplete = true;
            this.statusEl.innerText = "PROTOCOL ASCENDED";
            this.statusEl.style.textShadow = "0 0 10px #ff00ff";
            this.statusEl.style.color = "#ff00ff";

            // Scramble all
            for(let i=0; i<this.board.length; i++) {
                setTimeout(() => this.triggerScrambleAnimation(i), i * 100);
            }

            setTimeout(() => {
                this.generateLevel();
                this.statusEl.innerText = "ALIGN THE PROTOCOL";
                this.statusEl.style.textShadow = "none";
                this.statusEl.style.color = "#00ffcc";
            }, 3000);
        }
    }

    shutdown() {
        if (this.container) this.container.innerHTML = '';
    }
}