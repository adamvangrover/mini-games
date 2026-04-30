export default class ZipLogicGame {
    constructor() {
        this.container = null;
        this.boardEl = null;
        this.uiEl = null;

        // Game State
        this.gridSize = 4;
        this.level = 1;
        this.score = 0;
        this.timeRemaining = 60;
        this.timerInterval = null;
        this.grid = []; // The solved grid values
        this.anchors = []; // Which cells are initially revealed
        this.playerPath = []; // Array of cell indices the player has drawn

        // Drawing State
        this.isDrawing = false;

        // Settings
        this.colors = {
            empty: '#1e293b',    // slate-800
            anchor: '#334155',   // slate-700
            path: '#d946ef',     // fuchsia-500
            error: '#ef4444',    // red-500
            success: '#22c55e'   // green-500
        };

        this.boundHandleTouchStart = this.handleTouchStart.bind(this);
        this.boundHandleTouchMove = this.handleTouchMove.bind(this);
        this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
        this.boundHandleMouseDown = this.handleMouseDown.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    }

    init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = 'game-container flex flex-col bg-slate-900 text-white font-sans relative overflow-hidden items-center justify-center';

        // Header
        const header = document.createElement('div');
        header.className = "absolute top-4 left-0 w-full flex justify-between items-center px-4 z-50";
        header.innerHTML = `
            <button id="nz-back" class="px-4 py-1 bg-slate-800 text-white font-bold rounded-full border border-slate-600 hover:bg-slate-700 transition-colors uppercase text-xs tracking-widest"><i class="fas fa-arrow-left"></i></button>
            <h1 class="text-xl font-bold tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">ZIP LOGIC</h1>
            <button id="nz-hint" class="px-4 py-1 bg-slate-800 text-cyan-400 font-bold rounded-full border border-slate-600 hover:bg-slate-700 transition-colors uppercase text-xs tracking-widest"><i class="fas fa-lightbulb"></i></button>
        `;
        this.container.appendChild(header);

        document.getElementById('nz-back').onclick = () => window.miniGameHub.goBack();
        document.getElementById('nz-hint').onclick = () => this.useHint();

        // UI Overlay (Score/Time)
        this.uiEl = document.createElement('div');
        this.uiEl.className = "absolute top-16 w-full flex justify-center gap-8 px-4 z-40";
        this.uiEl.innerHTML = `
            <div class="text-center"><div class="text-xs text-slate-400 uppercase">Level</div><div id="nz-level" class="text-2xl font-bold text-fuchsia-400">1</div></div>
            <div class="text-center"><div class="text-xs text-slate-400 uppercase">Time</div><div id="nz-time" class="text-2xl font-bold font-mono">1:00</div></div>
            <div class="text-center"><div class="text-xs text-slate-400 uppercase">Score</div><div id="nz-score" class="text-2xl font-bold text-cyan-400">0</div></div>
        `;
        this.container.appendChild(this.uiEl);

        // Board Container
        this.boardContainer = document.createElement('div');
        this.boardContainer.className = "relative w-full max-w-md aspect-square p-4 select-none touch-none";
        this.container.appendChild(this.boardContainer);

        // Path Canvas (for drawing lines between centers)
        this.pathCanvas = document.createElement('canvas');
        this.pathCanvas.className = "absolute inset-4 pointer-events-none z-10";
        this.boardContainer.appendChild(this.pathCanvas);
        this.pathCtx = this.pathCanvas.getContext('2d');

        // Grid Elements Container
        this.boardEl = document.createElement('div');
        this.boardEl.className = "absolute inset-4 grid gap-2 z-20";
        this.boardContainer.appendChild(this.boardEl);

        // Share Modal
        this.shareModal = document.createElement('div');
        this.shareModal.className = "hidden absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-8 text-center";
        this.container.appendChild(this.shareModal);

        // Event Listeners for drawing
        this.boardEl.addEventListener('touchstart', this.boundHandleTouchStart, { passive: false });
        this.boardEl.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false });
        document.addEventListener('touchend', this.boundHandleTouchEnd);

        this.boardEl.addEventListener('mousedown', this.boundHandleMouseDown);
        this.boardEl.addEventListener('mousemove', this.boundHandleMouseMove);
        document.addEventListener('mouseup', this.boundHandleMouseUp);

        window.addEventListener('resize', () => this.resizeCanvas());

        this.startLevel();
    }

    startLevel() {
        // Adjust grid size based on level
        if (this.level <= 5) this.gridSize = 4;
        else if (this.level <= 15) this.gridSize = 5;
        else if (this.level <= 30) this.gridSize = 6;
        else this.gridSize = Math.min(10, 4 + Math.floor(this.level / 5));

        this.generateLevel();
        this.renderGrid();
        this.resizeCanvas();
        this.playerPath = [];
        this.updatePaths();

        this.timeRemaining = this.gridSize * this.gridSize * 5; // 5 seconds per tile
        this.updateHUD();

        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            if (this.timeRemaining <= 0) {
                this.timeRemaining = 0;
                this.handleTimeout();
            }
            this.updateHUD();
        }, 1000);
    }

    generateLevel() {
        const size = this.gridSize;
        const totalCells = size * size;
        this.grid = new Array(totalCells).fill(0);
        this.anchors = new Array(totalCells).fill(false);

        // Simple randomized DFS to find a Hamiltonian path
        let path = [];
        let visited = new Array(totalCells).fill(false);

        const getNeighbors = (index) => {
            const x = index % size;
            const y = Math.floor(index / size);
            const neighbors = [];
            if (x > 0) neighbors.push(index - 1);
            if (x < size - 1) neighbors.push(index + 1);
            if (y > 0) neighbors.push(index - size);
            if (y < size - 1) neighbors.push(index + size);
            return neighbors.sort(() => Math.random() - 0.5); // Randomize directions
        };

        const dfs = (currentIndex) => {
            path.push(currentIndex);
            visited[currentIndex] = true;

            if (path.length === totalCells) return true;

            const neighbors = getNeighbors(currentIndex);
            for (let nextIndex of neighbors) {
                if (!visited[nextIndex]) {
                    if (dfs(nextIndex)) return true;
                }
            }

            path.pop();
            visited[currentIndex] = false;
            return false;
        };

        // Start from a random edge or corner usually works best, but pure random is fine for small grids
        // Try different starting nodes until a Hamiltonian path is found
        let foundPath = false;
        let startIndices = Array.from({length: totalCells}, (_, i) => i).sort(() => Math.random() - 0.5);

        for (let startIdx of startIndices) {
            path = [];
            visited.fill(false);
            if (dfs(startIdx)) {
                foundPath = true;
                break;
            }
        }

        // Fallback for extreme cases (should be rare for grids up to 10x10)
        if (!foundPath) {
            console.error("Failed to generate Hamiltonian path.");
            // Simple fallback: a zigzag pattern
            path = [];
            for (let y = 0; y < size; y++) {
                if (y % 2 === 0) {
                    for (let x = 0; x < size; x++) path.push(y * size + x);
                } else {
                    for (let x = size - 1; x >= 0; x--) path.push(y * size + x);
                }
            }
        }

        // Assign numbers to grid based on path
        for (let i = 0; i < path.length; i++) {
            this.grid[path[i]] = i + 1;
        }

        // Reveal anchors based on difficulty
        let numAnchors = 0;
        if (this.level <= 5) numAnchors = Math.floor(totalCells * 0.4); // 40% revealed
        else if (this.level <= 15) numAnchors = Math.floor(totalCells * 0.3); // 30%
        else numAnchors = Math.floor(totalCells * 0.2); // 20%

        // Always reveal 1 and the end
        this.anchors[path[0]] = true;
        this.anchors[path[path.length - 1]] = true;

        let revealed = 2;
        while (revealed < numAnchors) {
            const idx = Math.floor(Math.random() * totalCells);
            if (!this.anchors[idx]) {
                this.anchors[idx] = true;
                revealed++;
            }
        }
    }

    renderGrid() {
        this.boardEl.innerHTML = '';
        this.boardEl.style.gridTemplateColumns = `repeat(${this.gridSize}, minmax(0, 1fr))`;
        this.boardEl.style.gridTemplateRows = `repeat(${this.gridSize}, minmax(0, 1fr))`;

        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            const cell = document.createElement('div');
            cell.dataset.index = i;
            cell.className = "flex items-center justify-center font-bold text-xl rounded-md transition-colors duration-200 select-none cursor-pointer";

            if (this.anchors[i]) {
                cell.textContent = this.grid[i];
                cell.style.backgroundColor = this.colors.anchor;
            } else {
                cell.style.backgroundColor = this.colors.empty;
            }

            this.boardEl.appendChild(cell);
        }
    }

    resizeCanvas() {
        if (!this.pathCanvas) return;
        const rect = this.boardEl.getBoundingClientRect();
        this.pathCanvas.width = rect.width;
        this.pathCanvas.height = rect.height;
        this.updatePaths();
    }

    handleTouchStart(e) {
        if (e.touches.length > 1) return;
        e.preventDefault();
        this.isDrawing = true;
        this.processInput(e.touches[0].clientX, e.touches[0].clientY);
    }

    handleTouchMove(e) {
        if (!this.isDrawing) return;
        e.preventDefault();
        this.processInput(e.touches[0].clientX, e.touches[0].clientY);
    }

    handleTouchEnd(e) {
        this.isDrawing = false;
        this.checkWinCondition();
    }

    handleMouseDown(e) {
        this.isDrawing = true;
        this.processInput(e.clientX, e.clientY);
    }

    handleMouseMove(e) {
        if (!this.isDrawing) return;
        this.processInput(e.clientX, e.clientY);
    }

    handleMouseUp(e) {
        this.isDrawing = false;
        this.checkWinCondition();
    }

    processInput(x, y) {
        const element = document.elementFromPoint(x, y);
        if (!element || !element.dataset || element.dataset.index === undefined) return;

        const index = parseInt(element.dataset.index);

        // Start new path
        if (this.playerPath.length === 0) {
            if (this.anchors[index] && this.grid[index] === 1) {
                this.playerPath.push(index);
                this.updatePaths();
            }
            return;
        }

        const lastIndex = this.playerPath[this.playerPath.length - 1];
        if (index === lastIndex) return; // Same cell

        // If backtracking, remove end of path
        const existingIdx = this.playerPath.indexOf(index);
        if (existingIdx !== -1) {
            this.playerPath = this.playerPath.slice(0, existingIdx + 1);
            this.updatePaths();
            return;
        }

        // Check adjacency
        const x1 = index % this.gridSize;
        const y1 = Math.floor(index / this.gridSize);
        const x2 = lastIndex % this.gridSize;
        const y2 = Math.floor(lastIndex / this.gridSize);

        const isAdjacent = Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1;

        if (isAdjacent) {
            // Check anchor validity
            const expectedValue = this.playerPath.length + 1;
            if (this.anchors[index] && this.grid[index] !== expectedValue) {
                // Invalid anchor hit
                element.style.backgroundColor = this.colors.error;
                setTimeout(() => this.updatePaths(), 200); // Visual feedback
                return;
            }

            this.playerPath.push(index);
            this.updatePaths();
        }
    }

    updatePaths() {
        if (!this.boardEl) return;

        // Reset visual state
        Array.from(this.boardEl.children).forEach((cell, idx) => {
            if (this.anchors[idx]) {
                cell.style.backgroundColor = this.colors.anchor;
                cell.textContent = this.grid[idx];
            } else {
                cell.style.backgroundColor = this.colors.empty;
                cell.textContent = '';
            }
            cell.style.boxShadow = 'none';
        });

        // Clear Canvas
        this.pathCtx.clearRect(0, 0, this.pathCanvas.width, this.pathCanvas.height);

        if (this.playerPath.length === 0) return;

        // Draw Line
        this.pathCtx.beginPath();
        this.pathCtx.strokeStyle = this.colors.path;
        this.pathCtx.lineWidth = 8;
        this.pathCtx.lineCap = 'round';
        this.pathCtx.lineJoin = 'round';

        const cells = Array.from(this.boardEl.children);

        this.playerPath.forEach((idx, i) => {
            const cell = cells[idx];

            // Visuals for cells in path
            if (!this.anchors[idx]) {
                cell.textContent = i + 1;
            }
            cell.style.backgroundColor = this.colors.path;
            cell.style.boxShadow = `0 0 10px ${this.colors.path}80`;

            // Canvas coordinates for line
            const rect = cell.getBoundingClientRect();
            const boardRect = this.boardEl.getBoundingClientRect();
            const x = rect.left - boardRect.left + rect.width / 2;
            const y = rect.top - boardRect.top + rect.height / 2;

            if (i === 0) this.pathCtx.moveTo(x, y);
            else this.pathCtx.lineTo(x, y);
        });

        this.pathCtx.stroke();
    }

    checkWinCondition() {
        if (this.playerPath.length === this.gridSize * this.gridSize) {
            // Validate sequence just in case
            let valid = true;
            for(let i=0; i<this.playerPath.length; i++) {
                if(this.anchors[this.playerPath[i]] && this.grid[this.playerPath[i]] !== i+1) valid = false;
            }

            if (valid) {
                this.handleWin();
            }
        }
    }

    handleWin() {
        clearInterval(this.timerInterval);

        // Calculate Score
        const baseScore = this.gridSize * 100;
        const timeBonus = this.timeRemaining * 10;
        const levelScore = baseScore + timeBonus;
        this.score += levelScore;
        this.updateHUD();

        // Visual celebration
        Array.from(this.boardEl.children).forEach(cell => {
            cell.style.backgroundColor = this.colors.success;
            cell.style.boxShadow = `0 0 15px ${this.colors.success}`;
        });
        this.pathCtx.strokeStyle = this.colors.success;
        this.pathCtx.stroke();

        setTimeout(() => this.showEndLevelMenu(true, levelScore), 1000);
    }

    handleTimeout() {
        clearInterval(this.timerInterval);
        this.showEndLevelMenu(false, 0);
    }

    useHint() {
        if (this.playerPath.length === this.gridSize * this.gridSize) return;

        this.score = Math.max(0, this.score - 50); // Penalty
        this.updateHUD();

        const expectedValue = this.playerPath.length + 1;
        const targetIdx = this.grid.indexOf(expectedValue);

        if (targetIdx !== -1) {
            const cell = this.boardEl.children[targetIdx];
            cell.style.backgroundColor = this.colors.success;
            cell.textContent = expectedValue;
            setTimeout(() => this.updatePaths(), 1000);
        }
    }

    showEndLevelMenu(won, levelScore) {
        this.shareModal.innerHTML = '';
        this.shareModal.classList.remove('hidden');

        const title = document.createElement('h2');
        title.className = `text-4xl font-black mb-4 ${won ? 'text-green-400' : 'text-red-400'} uppercase tracking-widest`;
        title.textContent = won ? "LEVEL CLEARED" : "TIME UP";
        this.shareModal.appendChild(title);

        if (won) {
            const scoreText = document.createElement('p');
            scoreText.className = "text-xl mb-6 font-mono text-cyan-400";
            scoreText.textContent = `+${levelScore} PTS`;
            this.shareModal.appendChild(scoreText);
        }

        const btnContainer = document.createElement('div');
        btnContainer.className = "flex gap-4 flex-wrap justify-center";
        this.shareModal.appendChild(btnContainer);

        if (won) {
            const nextBtn = document.createElement('button');
            nextBtn.className = "px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded shadow-[0_0_15px_rgba(217,70,239,0.5)] transition-all";
            nextBtn.textContent = "NEXT LEVEL";
            nextBtn.onclick = () => {
                this.level++;
                this.shareModal.classList.add('hidden');
                this.startLevel();
            };
            btnContainer.appendChild(nextBtn);

            const shareBtn = document.createElement('button');
            shareBtn.className = "px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded flex items-center gap-2";
            shareBtn.innerHTML = '<i class="fas fa-share-nodes"></i> SHARE';
            shareBtn.onclick = () => this.generateShareText(shareBtn);
            btnContainer.appendChild(shareBtn);
        } else {
            const retryBtn = document.createElement('button');
            retryBtn.className = "px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all";
            retryBtn.textContent = "RETRY";
            retryBtn.onclick = () => {
                this.shareModal.classList.add('hidden');
                this.startLevel();
            };
            btnContainer.appendChild(retryBtn);
        }
    }

    generateShareText(btn) {
        let text = `Zip Logic Puzzle - Level ${this.level}\nScore: ${this.score}\n`;
        for (let i = 0; i < this.gridSize; i++) {
            let row = '';
            for (let j = 0; j < this.gridSize; j++) {
                const idx = i * this.gridSize + j;
                if (this.anchors[idx]) row += '🟪'; // Anchor
                else row += '🟦'; // Path
            }
            text += row + '\n';
        }
        text += `Play here: ${window.location.href}`;

        navigator.clipboard.writeText(text).then(() => {
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> COPIED';
            setTimeout(() => btn.innerHTML = originalHtml, 2000);
        });
    }

    updateHUD() {
        const levelEl = document.getElementById('nz-level');
        const timeEl = document.getElementById('nz-time');
        const scoreEl = document.getElementById('nz-score');

        if (levelEl) levelEl.textContent = this.level;
        if (scoreEl) scoreEl.textContent = this.score;
        if (timeEl) {
            const m = Math.floor(this.timeRemaining / 60);
            const s = this.timeRemaining % 60;
            timeEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        }
    }

    cleanup() {
        clearInterval(this.timerInterval);
        if (this.boardEl) {
            this.boardEl.removeEventListener('touchstart', this.boundHandleTouchStart);
            this.boardEl.removeEventListener('touchmove', this.boundHandleTouchMove);
            this.boardEl.removeEventListener('mousedown', this.boundHandleMouseDown);
            this.boardEl.removeEventListener('mousemove', this.boundHandleMouseMove);
        }
        document.removeEventListener('touchend', this.boundHandleTouchEnd);
        document.removeEventListener('mouseup', this.boundHandleMouseUp);
        window.removeEventListener('resize', this.resizeCanvas);

        if (this.container) {
            this.container.innerHTML = '';
            this.container.className = 'game-container hidden';
        }
    }
}
