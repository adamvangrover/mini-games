export default class CircuitGame {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;

        this.gridSize = 5;
        this.cellSize = 60;
        this.board = [];
        this.numbers = {}; // index -> number

        this.path = []; // array of indices
        this.visited = new Set();
        this.isDragging = false;

        this.isComplete = false;

        this.boundOnPointerDown = this.onPointerDown.bind(this);
        this.boundOnPointerMove = this.onPointerMove.bind(this);
        this.boundOnPointerUp = this.onPointerUp.bind(this);
        this.boundOnResize = this.onResize.bind(this);

        this.time = 0;
    }

    init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = 'game-container relative bg-[#0a192f] overflow-hidden';

        // Back button
        const btn = document.createElement('button');
        btn.innerHTML = '<i class="fas fa-arrow-left"></i> BACK';
        btn.className = "absolute top-4 left-4 px-4 py-2 bg-[#112240] hover:bg-[#64ffda] text-[#64ffda] hover:text-[#0a192f] font-mono rounded shadow border border-[#64ffda] transition-colors z-50 pointer-events-auto";
        btn.onclick = () => window.miniGameHub && window.miniGameHub.goBack();
        this.container.appendChild(btn);

        // Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.style.touchAction = 'none'; // Prevent scrolling
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.container.appendChild(this.canvas);

        this.generateLevel();

        window.addEventListener('resize', this.boundOnResize);
        this.canvas.addEventListener('pointerdown', this.boundOnPointerDown);
        this.canvas.addEventListener('pointermove', this.boundOnPointerMove);
        this.canvas.addEventListener('pointerup', this.boundOnPointerUp);
        this.canvas.addEventListener('pointercancel', this.boundOnPointerUp);

        this.onResize();
        this.gameLoop();
    }

    generateLevel() {
        this.path = [];
        this.visited.clear();
        this.isComplete = false;

        let path = null;
        while (!path) {
            path = this.tryGenerateHamiltonianPath();
        }

        this.numbers = {};
        // Place start, some middle markers, and end
        let markers = [0, Math.floor(path.length * 0.33), Math.floor(path.length * 0.66), path.length - 1];

        for (let i = 0; i < markers.length; i++) {
            let pIdx = markers[i];
            let [r, c] = path[pIdx];
            this.numbers[r * this.gridSize + c] = i + 1;
        }
    }

    tryGenerateHamiltonianPath() {
        let size = this.gridSize;
        // Random start point
        let sr = Math.floor(Math.random() * size);
        let sc = Math.floor(Math.random() * size);

        let path = [[sr, sc]];
        let visited = new Set([`${sr},${sc}`]);

        while (visited.size < size * size) {
            let [r, c] = path[path.length - 1];
            let neighbors = [];
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

            for (let i = 0; i < dirs.length; i++) {
                let dr = dirs[i][0], dc = dirs[i][1];
                let nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited.has(`${nr},${nc}`)) {
                    let unvisited_neighbors = 0;
                    for (let j = 0; j < dirs.length; j++) {
                        let ddr = dirs[j][0], ddc = dirs[j][1];
                        let nnr = nr + ddr, nnc = nc + ddc;
                        if (nnr >= 0 && nnr < size && nnc >= 0 && nnc < size && !visited.has(`${nnr},${nnc}`)) {
                            unvisited_neighbors++;
                        }
                    }
                    neighbors.push({nr, nc, count: unvisited_neighbors});
                }
            }

            if (neighbors.length === 0) return null;

            neighbors.sort((a, b) => {
                if (a.count !== b.count) return a.count - b.count;
                return Math.random() - 0.5;
            });

            let nextNode = neighbors[0];
            path.push([nextNode.nr, nextNode.nc]);
            visited.add(`${nextNode.nr},${nextNode.nc}`);
        }

        return path;
    }

    onResize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;

        // Recalculate cell size to fit screen
        const minDim = Math.min(this.canvas.width, this.canvas.height);
        this.cellSize = (minDim * 0.8) / this.gridSize;
    }

    getIndexFromCoords(x, y) {
        const offsetX = (this.canvas.width - this.gridSize * this.cellSize) / 2;
        const offsetY = (this.canvas.height - this.gridSize * this.cellSize) / 2;

        const col = Math.floor((x - offsetX) / this.cellSize);
        const row = Math.floor((y - offsetY) / this.cellSize);

        if (col >= 0 && col < this.gridSize && row >= 0 && row < this.gridSize) {
            return row * this.gridSize + col;
        }
        return -1;
    }

    onPointerDown(e) {
        if (this.isComplete) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const idx = this.getIndexFromCoords(x, y);
        if (idx !== -1) {
            // Start path only at 1
            if (this.numbers[idx] === 1) {
                this.isDragging = true;
                this.path = [idx];
                this.visited.clear();
                this.visited.add(idx);
            } else if (this.path.length > 0 && this.path[this.path.length - 1] === idx) {
                // Resume path from last node
                this.isDragging = true;
            }
        }
    }

    onPointerMove(e) {
        if (!this.isDragging || this.isComplete) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const idx = this.getIndexFromCoords(x, y);
        if (idx !== -1 && !this.visited.has(idx)) {
            const lastIdx = this.path[this.path.length - 1];

            // Check adjacency
            const lx = lastIdx % this.gridSize;
            const ly = Math.floor(lastIdx / this.gridSize);
            const cx = idx % this.gridSize;
            const cy = Math.floor(idx / this.gridSize);

            if ((Math.abs(lx - cx) === 1 && ly === cy) || (Math.abs(ly - cy) === 1 && lx === cx)) {
                this.path.push(idx);
                this.visited.add(idx);
                this.checkWin();
            }
        } else if (idx !== -1 && this.visited.has(idx) && this.path.length > 1) {
            // Backtracking
            const prevIdx = this.path[this.path.length - 2];
            if (idx === prevIdx) {
                const removed = this.path.pop();
                this.visited.delete(removed);
            }
        }
    }

    onPointerUp() {
        this.isDragging = false;
    }

    checkWin() {
        if (this.visited.size !== this.gridSize * this.gridSize) return;

        // Verify sequence
        let nextExpected = 1;
        let valid = true;
        for (let i = 0; i < this.path.length; i++) {
            const node = this.path[i];
            if (this.numbers[node]) {
                if (this.numbers[node] !== nextExpected) {
                    valid = false;
                    break;
                }
                nextExpected++;
            }
        }

        if (valid) {
            this.isComplete = true;
            setTimeout(() => {
                this.generateLevel();
            }, 2000);
        }
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.fillStyle = '#0a192f';
        this.ctx.fillRect(0, 0, w, h);

        const offsetX = (w - this.gridSize * this.cellSize) / 2;
        const offsetY = (h - this.gridSize * this.cellSize) / 2;

        // Draw grid connections (PCB traces background)
        this.ctx.strokeStyle = '#112240';
        this.ctx.lineWidth = 4;
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cx = offsetX + x * this.cellSize + this.cellSize/2;
                const cy = offsetY + y * this.cellSize + this.cellSize/2;
                if (x < this.gridSize - 1) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(cx, cy);
                    this.ctx.lineTo(cx + this.cellSize, cy);
                    this.ctx.stroke();
                }
                if (y < this.gridSize - 1) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(cx, cy);
                    this.ctx.lineTo(cx, cy + this.cellSize);
                    this.ctx.stroke();
                }
            }
        }

        // Draw Path
        if (this.path.length > 0) {
            this.ctx.strokeStyle = this.isComplete ? '#00ff00' : '#64ffda';
            this.ctx.lineWidth = 12;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = this.isComplete ? '#00ff00' : '#64ffda';

            this.ctx.beginPath();
            const firstIdx = this.path[0];
            this.ctx.moveTo(
                offsetX + (firstIdx % this.gridSize) * this.cellSize + this.cellSize/2,
                offsetY + Math.floor(firstIdx / this.gridSize) * this.cellSize + this.cellSize/2
            );
            for (let i = 1; i < this.path.length; i++) {
                const idx = this.path[i];
                this.ctx.lineTo(
                    offsetX + (idx % this.gridSize) * this.cellSize + this.cellSize/2,
                    offsetY + Math.floor(idx / this.gridSize) * this.cellSize + this.cellSize/2
                );
            }
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }

        // Draw nodes
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = 'bold 20px monospace';

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const idx = y * this.gridSize + x;
                const cx = offsetX + x * this.cellSize + this.cellSize/2;
                const cy = offsetY + y * this.cellSize + this.cellSize/2;

                const isVisited = this.visited.has(idx);
                const hasNum = this.numbers[idx] !== undefined;

                if (hasNum) {
                    this.ctx.fillStyle = isVisited ? '#0a192f' : '#64ffda';
                    this.ctx.beginPath();
                    this.ctx.arc(cx, cy, 18, 0, Math.PI*2);
                    this.ctx.fill();

                    this.ctx.fillStyle = isVisited ? '#64ffda' : '#0a192f';
                    this.ctx.fillText(this.numbers[idx], cx, cy);

                    this.ctx.strokeStyle = '#64ffda';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                } else {
                    this.ctx.fillStyle = isVisited ? '#64ffda' : '#233554';
                    this.ctx.beginPath();
                    this.ctx.arc(cx, cy, 8, 0, Math.PI*2);
                    this.ctx.fill();
                }
            }
        }

        // Pulse animation on complete
        if (this.isComplete) {
            this.ctx.fillStyle = `rgba(100, 255, 218, ${Math.sin(this.time * 10) * 0.2 + 0.2})`;
            this.ctx.fillRect(0, 0, w, h);
        }
    }

    gameLoop(timestamp) {
        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
        this.time = timestamp / 1000 || 0;
        this.draw();
    }

    shutdown() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.boundOnResize);
        if (this.canvas) {
            this.canvas.removeEventListener('pointerdown', this.boundOnPointerDown);
            this.canvas.removeEventListener('pointermove', this.boundOnPointerMove);
            this.canvas.removeEventListener('pointerup', this.boundOnPointerUp);
            this.canvas.removeEventListener('pointercancel', this.boundOnPointerUp);
        }
        if (this.container) this.container.innerHTML = '';
    }
}