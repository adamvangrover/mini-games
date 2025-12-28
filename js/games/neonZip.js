
import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class NeonZip {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        // Game State
        this.gridSize = 6;
        this.cellSize = 0; // Calculated on resize
        this.dots = []; // 2D Array [row][col]
        this.colors = ['#00ffff', '#ff00ff', '#ffff00', '#00ff00', '#ff0000']; // Cyan, Magenta, Yellow, Green, Red
        this.currentPath = []; // Array of {r, c}
        this.isDragging = false;
        this.score = 0;
        this.moves = 30; // Starting moves

        // Visuals
        this.offset = { x: 0, y: 0 };
        this.animations = []; // { type: 'drop', r, c, y, targetY }

        // Juice
        this.particleSystem = ParticleSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.classList.add('flex', 'flex-col', 'items-center', 'justify-center', 'bg-slate-900');

        // UI Header
        const header = document.createElement('div');
        header.className = 'absolute top-4 w-full flex justify-between px-8 text-white z-10 pointer-events-none';
        header.innerHTML = `
            <div class="text-xl font-bold font-mono text-fuchsia-400">MOVES: <span id="nz-moves" class="text-white">30</span></div>
            <div class="text-xl font-bold font-mono text-cyan-400">SCORE: <span id="nz-score" class="text-white">0</span></div>
        `;
        this.container.appendChild(header);

        // Exit Button
        const exitBtn = document.createElement('button');
        exitBtn.className = 'absolute top-4 right-1/2 transform translate-x-1/2 px-4 py-2 bg-slate-800 border border-slate-600 rounded text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors z-20 pointer-events-auto font-mono';
        exitBtn.textContent = "RETURN TO HUB";
        exitBtn.onclick = () => window.miniGameHub.goBack();
        this.container.appendChild(exitBtn);

        // Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.touchAction = 'none'; // Prevent scrolling
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Init Logic
        this.isActive = true;
        this.initGrid();
        this.resize();

        // Listeners
        this.boundResize = this.resize.bind(this);
        this.boundDown = this.onDown.bind(this);
        this.boundMove = this.onMove.bind(this);
        this.boundUp = this.onUp.bind(this);
        this.boundTouchStart = this.onTouchStart.bind(this);
        this.boundTouchMove = this.onTouchMove.bind(this);

        window.addEventListener('resize', this.boundResize);

        // Input
        this.canvas.addEventListener('mousedown', this.boundDown);
        window.addEventListener('mousemove', this.boundMove);
        window.addEventListener('mouseup', this.boundUp);

        this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });
        window.addEventListener('touchmove', this.boundTouchMove, { passive: false });
        window.addEventListener('touchend', this.boundUp);
    }

    initGrid() {
        this.dots = [];
        for (let r = 0; r < this.gridSize; r++) {
            const row = [];
            for (let c = 0; c < this.gridSize; c++) {
                row.push({
                    color: this.colors[Math.floor(Math.random() * this.colors.length)],
                    yOffset: -500 - (Math.random() * 500) // For drop animation on start
                });
            }
            this.dots.push(row);
        }
    }

    resize() {
        if (!this.isActive) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        // Calculate grid metrics
        const minDim = Math.min(this.canvas.width, this.canvas.height);
        this.cellSize = (minDim * 0.8) / this.gridSize;

        this.offset.x = (this.canvas.width - this.cellSize * this.gridSize) / 2;
        this.offset.y = (this.canvas.height - this.cellSize * this.gridSize) / 2;
    }

    // --- Input Handling ---

    getGridPos(x, y) {
        const c = Math.floor((x - this.offset.x) / this.cellSize);
        const r = Math.floor((y - this.offset.y) / this.cellSize);
        if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
            return { r, c };
        }
        return null;
    }

    onDown(e) {
        if (this.moves <= 0) return;
        this.isDragging = true;
        const pos = this.getGridPos(e.offsetX, e.offsetY);
        if (pos) {
            this.addToPath(pos.r, pos.c);
        }
    }

    onMove(e) {
        if (!this.isDragging) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const pos = this.getGridPos(x, y);
        if (pos) {
            this.addToPath(pos.r, pos.c);
        }
    }

    onTouchStart(e) {
        if (this.moves <= 0) return;
        e.preventDefault();
        this.isDragging = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        const pos = this.getGridPos(x, y);
        if (pos) this.addToPath(pos.r, pos.c);
    }

    onTouchMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        const pos = this.getGridPos(x, y);
        if (pos) this.addToPath(pos.r, pos.c);
    }

    onUp() {
        if (this.isDragging) {
            this.endTurn();
        }
        this.isDragging = false;
        this.currentPath = [];
    }

    addToPath(r, c) {
        // Prevent duplicates at tip (wiggling)
        if (this.currentPath.length > 0) {
            const last = this.currentPath[this.currentPath.length - 1];
            if (last.r === r && last.c === c) return;

            // Backtracking (undo last step)
            if (this.currentPath.length > 1) {
                const prev = this.currentPath[this.currentPath.length - 2];
                if (prev.r === r && prev.c === c) {
                    this.currentPath.pop();
                    this.soundManager.playSound('click'); // distinct sound?
                    return;
                }
            }
        }

        const dot = this.dots[r][c];

        // First dot
        if (this.currentPath.length === 0) {
            this.currentPath.push({ r, c });
            this.soundManager.playSound('click');
            return;
        }

        const last = this.currentPath[this.currentPath.length - 1];
        const lastDot = this.dots[last.r][last.c];

        // Validations
        if (dot.color !== lastDot.color) return; // Must match color
        if (Math.abs(r - last.r) + Math.abs(c - last.c) !== 1) return; // Must be adjacent (no diagonals)

        // Check Loop (Square)
        // If we hit an existing node in the path (that isn't the immediate predecessor, handled by backtrack check)
        // Then it is a valid loop.
        const existingIdx = this.currentPath.findIndex(p => p.r === r && p.c === c);
        if (existingIdx !== -1) {
            // We hit a node already in path.
            // Since we blocked backtracking, this must be a loop closure.
            // We just add it (it will act as the "closer").
            this.currentPath.push({ r, c });
            this.soundManager.playSound('powerup');
            return;
        }

        this.currentPath.push({ r, c });
        this.soundManager.playSound('click');
    }

    endTurn() {
        if (this.currentPath.length < 2) return;

        // Determine if Square
        // A square is formed if the path contains a cycle.
        // Simple heuristic in Two Dots: if the last element equals a previous element?
        // My addToPath logic allows re-adding an element IF it's a loop.
        // So check for duplicates.
        const unique = new Set(this.currentPath.map(p => `${p.r},${p.c}`));
        const isSquare = unique.size < this.currentPath.length;

        const color = this.dots[this.currentPath[0].r][this.currentPath[0].c].color;
        let points = this.currentPath.length * 10;
        let dotsToRemove = [];

        if (isSquare) {
            // Clear ALL dots of this color
            for(let r=0; r<this.gridSize; r++){
                for(let c=0; c<this.gridSize; c++){
                    if (this.dots[r][c].color === color) {
                        dotsToRemove.push({r, c});
                    }
                }
            }
            points += 50;
            this.soundManager.playSound('powerup'); // Big sound
            this.moves += 1; // Bonus move for square
        } else {
            // Just clear path
            dotsToRemove = [...this.currentPath];
        }

        // Apply
        this.moves--;
        this.score += points;
        this.updateUI();

        // Remove dots
        dotsToRemove.forEach(p => {
            this.dots[p.r][p.c] = null;
            // Particles
            const px = this.offset.x + p.c * this.cellSize + this.cellSize/2;
            const py = this.offset.y + p.r * this.cellSize + this.cellSize/2;
            this.particleSystem.emit(px, py, color, 10);
        });

        // Drop & Refill
        this.applyGravity();

        if (this.moves <= 0) {
            setTimeout(() => {
                window.miniGameHub.showGameOver(this.score, () => this.resetGame());
            }, 1000);
        }
    }

    applyGravity() {
        for (let c = 0; c < this.gridSize; c++) {
            let writeRow = this.gridSize - 1;
            // Shift down
            for (let r = this.gridSize - 1; r >= 0; r--) {
                if (this.dots[r][c] !== null) {
                    if (r !== writeRow) {
                        this.dots[writeRow][c] = this.dots[r][c];
                        this.dots[writeRow][c].yOffset = (r - writeRow) * this.cellSize; // Animate drop
                        this.dots[r][c] = null;
                    }
                    writeRow--;
                }
            }
            // Fill top
            while (writeRow >= 0) {
                this.dots[writeRow][c] = {
                    color: this.colors[Math.floor(Math.random() * this.colors.length)],
                    yOffset: -500 // Start high up
                };
                writeRow--;
            }
        }
    }

    resetGame() {
        this.score = 0;
        this.moves = 30;
        this.updateUI();
        this.initGrid();
    }

    updateUI() {
        const movesEl = document.getElementById('nz-moves');
        const scoreEl = document.getElementById('nz-score');
        if (movesEl) movesEl.textContent = this.moves;
        if (scoreEl) scoreEl.textContent = this.score;
        if (movesEl && this.moves <= 5) movesEl.classList.add('text-red-500');
        else if (movesEl) movesEl.classList.remove('text-red-500');
    }

    update(dt) {
        if (!this.isActive) return;

        // Animate Y Offsets (Gravity)
        let animating = false;
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const dot = this.dots[r][c];
                if (dot && dot.yOffset !== 0) {
                    dot.yOffset += dt * 1000; // Speed
                    if (dot.yOffset > 0) dot.yOffset = 0;
                    else animating = true;
                }
            }
        }
    }

    draw() {
        if (!this.isActive || !this.ctx) return;

        // Clear
        this.ctx.fillStyle = '#0f172a'; // Slate 900
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid Background (Lines)
        this.ctx.strokeStyle = '#1e293b';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for(let i=0; i<=this.gridSize; i++) {
            const p = i * this.cellSize;
            // Horz
            this.ctx.moveTo(this.offset.x, this.offset.y + p);
            this.ctx.lineTo(this.offset.x + this.gridSize*this.cellSize, this.offset.y + p);
            // Vert
            this.ctx.moveTo(this.offset.x + p, this.offset.y);
            this.ctx.lineTo(this.offset.x + p, this.offset.y + this.gridSize*this.cellSize);
        }
        this.ctx.stroke();

        // Draw Connections (Current Path)
        if (this.currentPath.length > 1) {
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.lineWidth = this.cellSize * 0.2;
            const color = this.dots[this.currentPath[0].r][this.currentPath[0].c].color;
            this.ctx.strokeStyle = color;
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 20;

            this.ctx.beginPath();
            this.currentPath.forEach((p, i) => {
                const x = this.offset.x + p.c * this.cellSize + this.cellSize/2;
                const y = this.offset.y + p.r * this.cellSize + this.cellSize/2 + (this.dots[p.r][p.c].yOffset || 0);
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            });
            this.ctx.stroke();

            // Reset Shadow
            this.ctx.shadowBlur = 0;
        }

        // Draw Dots
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const dot = this.dots[r][c];
                if (!dot) continue;

                const cx = this.offset.x + c * this.cellSize + this.cellSize/2;
                const cy = this.offset.y + r * this.cellSize + this.cellSize/2 + dot.yOffset;

                const radius = this.cellSize * 0.3;

                this.ctx.fillStyle = dot.color;
                this.ctx.shadowColor = dot.color;
                this.ctx.shadowBlur = 15;

                // Highlight if in path
                const inPath = this.currentPath.some(p => p.r === r && p.c === c);
                if (inPath) {
                    this.ctx.shadowBlur = 30;
                    this.ctx.fillStyle = '#ffffff'; // White center for active
                }

                this.ctx.beginPath();
                this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                this.ctx.fill();

                if (inPath) {
                    // Outer ring
                    this.ctx.strokeStyle = dot.color;
                    this.ctx.lineWidth = 4;
                    this.ctx.beginPath();
                    this.ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
            }
        }
        this.ctx.shadowBlur = 0;
    }

    shutdown() {
        this.isActive = false;
        window.removeEventListener('resize', this.boundResize);
        window.removeEventListener('mousemove', this.boundMove);
        window.removeEventListener('mouseup', this.boundUp);
        window.removeEventListener('touchmove', this.boundTouchMove);
        window.removeEventListener('touchend', this.boundUp);
        this.container.innerHTML = '';
    }
}
