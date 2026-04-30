export default class CorpCrossclimbGame {
    constructor() {
        this.container = null;
        this.ladderEl = null;
        this.keyboardEl = null;

        // Game State
        this.ladder = [
            "START",
            "S____",
            "S____",
            "_____",
            "FINISH"
        ];
        this.clues = [
            "Begin",
            "To stare",
            "Steps",
            "Hair on head",
            "End"
        ];
        this.currentRow = 1;
        this.currentCol = 1;
        this.gridState = []; // 2D array of letters

        // Settings
        this.colors = {
            bg: '#f8fafc',
            text: '#0f172a',
            primary: '#2563eb',
            border: '#cbd5e1'
        };
    }

    init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = 'game-container flex flex-col bg-slate-50 text-slate-900 font-sans relative overflow-hidden items-center justify-start pt-12';

        // Header
        const header = document.createElement('div');
        header.className = "absolute top-4 left-0 w-full flex justify-between items-center px-4 z-50";
        header.innerHTML = `
            <button id="cc-back" class="px-4 py-2 bg-white text-slate-700 font-bold rounded shadow border border-slate-200 hover:bg-slate-100 transition-colors uppercase text-xs tracking-widest"><i class="fas fa-arrow-left"></i> Back</button>
            <h1 class="text-xl font-bold tracking-widest uppercase text-slate-800">Crossclimb</h1>
            <div class="px-4 py-2 opacity-0">spacer</div>
        `;
        this.container.appendChild(header);
        document.getElementById('cc-back').onclick = () => window.miniGameHub.goBack();

        this.generateLevel();
        this.renderUI();
    }

    generateLevel() {
        // Advanced: A real implementation would fetch/generate a valid word ladder.
        // For this demo, we hardcode a simple ladder: START -> STARE -> STAIR -> HAIR -> FINISH
        this.ladder = [
            "START",
            "STARE",
            "STAIR",
            "HAIR",  // Note: different length for visual interest, though strict ladders keep length
            "FINISH"
        ];
        // We clear out the middle for the player to solve
        this.gridState = [
            ["S","T","A","R","T"],
            ["S","","","",""],
            ["S","","","",""],
            ["","","","",""], // We'll pad shorter words or just let UI handle it
            ["F","I","N","I","S","H"]
        ];
        this.targetState = [
            ["S","T","A","R","T"],
            ["S","T","A","R","E"],
            ["S","T","A","I","R"],
            ["H","A","I","R"],
            ["F","I","N","I","S","H"]
        ];
    }

    renderUI() {
        // Clue Area
        this.clueContainer = document.createElement('div');
        this.clueContainer.className = "w-full max-w-md px-4 mb-8 text-center min-h-[60px]";
        this.container.appendChild(this.clueContainer);

        // Ladder Area
        this.ladderEl = document.createElement('div');
        this.ladderEl.className = "w-full max-w-md flex flex-col items-center gap-2 mb-8";
        this.container.appendChild(this.ladderEl);

        this.renderLadder();
        this.updateClue();

        // Keyboard (Simplified)
        this.keyboardEl = document.createElement('div');
        this.keyboardEl.className = "w-full max-w-md mt-auto mb-8 px-2 flex flex-col gap-2";
        const rows = [
            ['Q','W','E','R','T','Y','U','I','O','P'],
            ['A','S','D','F','G','H','J','K','L'],
            ['ENTER', 'Z','X','C','V','B','N','M', 'DEL']
        ];

        rows.forEach(row => {
            const rowEl = document.createElement('div');
            rowEl.className = "flex justify-center gap-1 w-full";
            row.forEach(key => {
                const btn = document.createElement('button');
                btn.textContent = key;
                btn.className = "bg-slate-200 text-slate-800 font-bold rounded flex-1 py-3 text-sm hover:bg-slate-300 transition-colors shadow-sm";
                if (key === 'ENTER' || key === 'DEL') btn.style.flex = "1.5";
                btn.onclick = () => this.handleKeyPress(key);
                rowEl.appendChild(btn);
            });
            this.keyboardEl.appendChild(rowEl);
        });

        this.container.appendChild(this.keyboardEl);

        // Add physical keyboard listener
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        document.addEventListener('keydown', this.boundHandleKeyDown);
    }

    renderLadder() {
        this.ladderEl.innerHTML = '';

        this.gridState.forEach((row, r) => {
            const rowEl = document.createElement('div');
            rowEl.className = "flex justify-center gap-1 cursor-pointer";
            rowEl.onclick = () => {
                if (r > 0 && r < this.gridState.length - 1) { // Dont let click on start/end
                    this.currentRow = r;
                    this.currentCol = 0;
                    // Find first empty
                    for(let c=0; c<this.gridState[r].length; c++) {
                        if(this.gridState[r][c] === '') {
                            this.currentCol = c;
                            break;
                        }
                    }
                    this.updateFocusVisuals();
                    this.updateClue();
                }
            };

            row.forEach((char, c) => {
                const cell = document.createElement('div');
                cell.className = "w-10 h-10 border-2 flex items-center justify-center font-bold text-lg uppercase transition-all";

                if (r === 0 || r === this.gridState.length - 1) {
                    // Fixed start/end
                    cell.className += " border-slate-300 bg-slate-100 text-slate-500";
                } else {
                    // Editable
                    cell.className += " border-slate-300 bg-white text-slate-800";
                }

                cell.id = `cell-${r}-${c}`;
                cell.textContent = char;
                rowEl.appendChild(cell);
            });
            this.ladderEl.appendChild(rowEl);
        });

        this.updateFocusVisuals();
    }

    updateFocusVisuals() {
        // Clear old focus
        document.querySelectorAll('[id^="cell-"]').forEach(el => {
            if (el.classList.contains('bg-white')) {
                el.classList.remove('border-blue-500', 'border-2', 'ring-2', 'ring-blue-200');
                el.classList.add('border-slate-300');
            }
        });

        // Set new focus if editable row
        if (this.currentRow > 0 && this.currentRow < this.gridState.length - 1) {
            const targetCell = document.getElementById(`cell-${this.currentRow}-${this.currentCol}`);
            if (targetCell) {
                targetCell.classList.remove('border-slate-300');
                targetCell.classList.add('border-blue-500', 'border-2', 'ring-2', 'ring-blue-200');
            }

            // Highlight whole row slightly
            const rowCells = this.ladderEl.children[this.currentRow].children;
            for(let cell of rowCells) {
                if(cell !== targetCell) {
                    cell.classList.remove('border-slate-300');
                    cell.classList.add('border-blue-300');
                }
            }
        }
    }

    updateClue() {
        this.clueContainer.innerHTML = `
            <div class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Clue ${this.currentRow + 1}</div>
            <div class="text-xl text-slate-800 italic">"${this.clues[this.currentRow]}"</div>
        `;
    }

    handleKeyDown(e) {
        if (e.key === 'Backspace') this.handleKeyPress('DEL');
        else if (e.key === 'Enter') this.handleKeyPress('ENTER');
        else if (/^[a-zA-Z]$/.test(e.key)) this.handleKeyPress(e.key.toUpperCase());
    }

    handleKeyPress(key) {
        if (this.currentRow === 0 || this.currentRow === this.gridState.length - 1) return;

        const rowData = this.gridState[this.currentRow];
        const maxCol = this.targetState[this.currentRow].length; // Ensure we don't go out of bounds of target word length

        if (key === 'DEL') {
            if (this.currentCol > 0 && rowData[this.currentCol] === '') {
                this.currentCol--;
            }
            rowData[this.currentCol] = '';
        } else if (key === 'ENTER') {
            // Check row correctness
            let correct = true;
            for(let i=0; i<maxCol; i++) {
                if (rowData[i] !== this.targetState[this.currentRow][i]) correct = false;
            }

            if (correct) {
                // Move down
                if (this.currentRow < this.gridState.length - 2) {
                    this.currentRow++;
                    this.currentCol = 0;
                    this.updateClue();
                } else {
                    this.checkWinCondition();
                }
            } else {
                // Shake row
                const rowEl = this.ladderEl.children[this.currentRow];
                rowEl.animate([
                    { transform: 'translateX(-5px)' },
                    { transform: 'translateX(5px)' },
                    { transform: 'translateX(-5px)' },
                    { transform: 'translateX(5px)' },
                    { transform: 'translateX(0)' }
                ], { duration: 300 });
            }
        } else {
            // Letter
            if (this.currentCol < maxCol) {
                rowData[this.currentCol] = key;
                if (this.currentCol < maxCol - 1) this.currentCol++;
            }
        }

        this.renderLadder();
    }

    checkWinCondition() {
        // Simplified win check
        setTimeout(() => alert("Ladder Complete!"), 500);
    }

    cleanup() {
        document.removeEventListener('keydown', this.boundHandleKeyDown);
        if (this.container) {
            this.container.innerHTML = '';
            this.container.className = 'game-container hidden';
        }
    }
}
