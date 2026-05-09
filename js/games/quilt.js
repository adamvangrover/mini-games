export default class QuiltGame {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;

        this.gridSize = 6;
        this.cellSize = 50;
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;

        this.pieces = [];
        this.boardMatrix = [];

        this.isDragging = false;
        this.draggedPiece = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        this.isComplete = false;

        this.colors = ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#ff69b4'];

        this.boundOnPointerDown = this.onPointerDown.bind(this);
        this.boundOnPointerMove = this.onPointerMove.bind(this);
        this.boundOnPointerUp = this.onPointerUp.bind(this);
        this.boundOnResize = this.onResize.bind(this);
    }

    init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = 'game-container relative bg-[#f1f2f6] overflow-hidden';

        // Header
        const header = document.createElement('div');
        header.className = "absolute top-4 left-0 w-full flex justify-between items-center px-4 z-50 pointer-events-none";
        header.innerHTML = `
            <button id="qt-back" class="px-4 py-2 bg-white text-slate-800 font-bold rounded shadow hover:bg-slate-100 transition-colors pointer-events-auto border border-slate-300"><i class="fas fa-arrow-left"></i> BACK</button>
            <h1 class="text-2xl font-bold text-slate-800 tracking-wider bg-white/80 px-4 py-1 rounded shadow pointer-events-auto">QUILT</h1>
            <div class="px-4 py-2 opacity-0">spacer</div>
        `;
        this.container.appendChild(header);
        document.getElementById('qt-back').onclick = () => window.miniGameHub && window.miniGameHub.goBack();

        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.style.touchAction = 'none';
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        window.addEventListener('resize', this.boundOnResize);
        this.canvas.addEventListener('pointerdown', this.boundOnPointerDown);
        this.canvas.addEventListener('pointermove', this.boundOnPointerMove);
        this.canvas.addEventListener('pointerup', this.boundOnPointerUp);
        this.canvas.addEventListener('pointercancel', this.boundOnPointerUp);

        this.generateLevel();
        this.onResize();
        this.gameLoop();
    }

    generateLevel() {
        this.isComplete = false;
        this.boardMatrix = new Array(this.gridSize * this.gridSize).fill(null);

        // Define pieces (width, height in cells)
        const pieceDefs = [
            { w: 2, h: 3 },
            { w: 3, h: 2 },
            { w: 1, h: 4 },
            { w: 2, h: 2 },
            { w: 4, h: 1 },
            { w: 1, h: 2 },
            { w: 2, h: 1 }
        ];

        // We need area to sum to 36.
        // 6+6+4+4+4+2+2 = 28. Add one more 2x4 = 8. Total 36.
        const levelPieces = [
            { w: 2, h: 3, c: 0 }, { w: 3, h: 2, c: 1 },
            { w: 2, h: 2, c: 2 }, { w: 2, h: 2, c: 3 },
            { w: 1, h: 4, c: 4 }, { w: 4, h: 1, c: 0 },
            { w: 2, h: 4, c: 1 }
        ];

        this.pieces = levelPieces.map((p, i) => ({
            id: i,
            w: p.w,
            h: p.h,
            color: this.colors[p.c % this.colors.length],
            x: 50 + (i % 3) * 120, // initial tray pos
            y: 500 + Math.floor(i / 3) * 120,
            snapped: false,
            gridX: -1,
            gridY: -1,
            targetX: 50 + (i % 3) * 120,
            targetY: 500 + Math.floor(i / 3) * 120
        }));
    }

    onResize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;

        const minDim = Math.min(this.canvas.width, this.canvas.height);
        this.cellSize = (minDim * 0.6) / this.gridSize;

        this.gridOffsetX = (this.canvas.width - this.gridSize * this.cellSize) / 2;
        this.gridOffsetY = 80; // top padding

        // Update piece targets if they are in tray
        this.pieces.forEach((p, i) => {
            if (!p.snapped) {
                p.targetX = this.canvas.width * 0.1 + (i % 4) * (this.cellSize * 2.5);
                p.targetY = this.gridOffsetY + this.gridSize * this.cellSize + 50 + Math.floor(i / 4) * (this.cellSize * 2.5);
            } else {
                p.targetX = this.gridOffsetX + p.gridX * this.cellSize;
                p.targetY = this.gridOffsetY + p.gridY * this.cellSize;
            }
        });
    }

    onPointerDown(e) {
        if (this.isComplete) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find piece to drag (reverse order for top-most)
        for (let i = this.pieces.length - 1; i >= 0; i--) {
            const p = this.pieces[i];
            const px = p.x;
            const py = p.y;
            const pw = p.w * this.cellSize;
            const ph = p.h * this.cellSize;

            if (x >= px && x <= px + pw && y >= py && y <= py + ph) {
                this.isDragging = true;
                this.draggedPiece = p;
                this.dragOffsetX = x - px;
                this.dragOffsetY = y - py;

                // Bring to front
                this.pieces.splice(i, 1);
                this.pieces.push(p);

                if (p.snapped) {
                    this.removeFromBoard(p);
                    p.snapped = false;
                }
                break;
            }
        }
    }

    onPointerMove(e) {
        if (!this.isDragging || !this.draggedPiece) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.draggedPiece.targetX = x - this.dragOffsetX;
        this.draggedPiece.targetY = y - this.dragOffsetY;
    }

    onPointerUp(e) {
        if (!this.isDragging || !this.draggedPiece) return;

        const p = this.draggedPiece;
        this.isDragging = false;
        this.draggedPiece = null;

        // Check drop snap to grid
        const cx = p.targetX + (p.w * this.cellSize) / 2;
        const cy = p.targetY + (p.h * this.cellSize) / 2;

        if (cx > this.gridOffsetX && cx < this.gridOffsetX + this.gridSize * this.cellSize &&
            cy > this.gridOffsetY && cy < this.gridOffsetY + this.gridSize * this.cellSize) {

            // Calc nearest grid cell
            let gridX = Math.round((p.targetX - this.gridOffsetX) / this.cellSize);
            let gridY = Math.round((p.targetY - this.gridOffsetY) / this.cellSize);

            // Bounds check
            if (gridX >= 0 && gridX + p.w <= this.gridSize &&
                gridY >= 0 && gridY + p.h <= this.gridSize) {

                // Collision check with other pieces
                if (this.canPlaceOnBoard(p, gridX, gridY)) {
                    this.placeOnBoard(p, gridX, gridY);
                    this.playBlip();
                    this.checkWin();
                    return;
                }
            }
        }

        // Return to tray if invalid drop
        const idx = this.pieces.indexOf(p);
        p.targetX = this.canvas.width * 0.1 + (idx % 4) * (this.cellSize * 2.5);
        p.targetY = this.gridOffsetY + this.gridSize * this.cellSize + 50 + Math.floor(idx / 4) * (this.cellSize * 2.5);
    }

    canPlaceOnBoard(p, gx, gy) {
        for (let y = 0; y < p.h; y++) {
            for (let x = 0; x < p.w; x++) {
                if (this.boardMatrix[(gy + y) * this.gridSize + (gx + x)] !== null) return false;
            }
        }
        return true;
    }

    placeOnBoard(p, gx, gy) {
        p.snapped = true;
        p.gridX = gx;
        p.gridY = gy;
        p.targetX = this.gridOffsetX + gx * this.cellSize;
        p.targetY = this.gridOffsetY + gy * this.cellSize;

        for (let y = 0; y < p.h; y++) {
            for (let x = 0; x < p.w; x++) {
                this.boardMatrix[(gy + y) * this.gridSize + (gx + x)] = p.id;
            }
        }
    }

    removeFromBoard(p) {
        for (let i = 0; i < this.boardMatrix.length; i++) {
            if (this.boardMatrix[i] === p.id) {
                this.boardMatrix[i] = null;
            }
        }
    }

    playBlip() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    }

    checkWin() {
        const isFull = this.boardMatrix.every(cell => cell !== null);
        if (isFull) {
            this.isComplete = true;
            setTimeout(() => {
                this.generateLevel();
                this.onResize();
            }, 2000);
        }
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.clearRect(0, 0, w, h);

        // Draw Grid Background
        this.ctx.fillStyle = '#dfe4ea';
        this.ctx.fillRect(this.gridOffsetX, this.gridOffsetY, this.gridSize * this.cellSize, this.gridSize * this.cellSize);

        this.ctx.strokeStyle = '#ced6e0';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let i = 0; i <= this.gridSize; i++) {
            this.ctx.moveTo(this.gridOffsetX + i * this.cellSize, this.gridOffsetY);
            this.ctx.lineTo(this.gridOffsetX + i * this.cellSize, this.gridOffsetY + this.gridSize * this.cellSize);

            this.ctx.moveTo(this.gridOffsetX, this.gridOffsetY + i * this.cellSize);
            this.ctx.lineTo(this.gridOffsetX + this.gridSize * this.cellSize, this.gridOffsetY + i * this.cellSize);
        }
        this.ctx.stroke();

        // Draw Pieces
        this.pieces.forEach(p => {
            // Physics / Lerp
            p.x += (p.targetX - p.x) * 0.3;
            p.y += (p.targetY - p.y) * 0.3;

            const pw = p.w * this.cellSize;
            const ph = p.h * this.cellSize;

            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = 'rgba(0,0,0,0.2)';
            this.ctx.shadowBlur = p === this.draggedPiece ? 15 : 5;
            this.ctx.shadowOffsetY = p === this.draggedPiece ? 8 : 2;

            // Draw rounded rect
            this.ctx.beginPath();
            this.ctx.roundRect(p.x + 2, p.y + 2, pw - 4, ph - 4, 8);
            this.ctx.fill();

            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetY = 0;

            // Inner bevel effect
            this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.roundRect(p.x + 4, p.y + 4, pw - 8, ph - 8, 6);
            this.ctx.stroke();
        });

        if (this.isComplete) {
            this.ctx.fillStyle = 'rgba(46, 213, 115, 0.2)';
            this.ctx.fillRect(this.gridOffsetX, this.gridOffsetY, this.gridSize * this.cellSize, this.gridSize * this.cellSize);
        }
    }

    gameLoop() {
        this.animationId = requestAnimationFrame(() => this.gameLoop());
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