export default class QuiltGame {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.animationFrameId = null;
        this.boundGameLoop = this.gameLoop.bind(this);

        this.gridSize = 6;
        this.cellSize = 50;
        this.offsetX = 0;
        this.offsetY = 0;

        this.pieces = [];
        this.board = []; // 2D array tracking occupancy
        this.draggedPiece = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        this.colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    }

    init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = 'game-container flex flex-col bg-slate-900 text-slate-100 relative overflow-hidden touch-none';

        // Header
        const header = document.createElement('div');
        header.className = "absolute top-4 left-0 w-full flex justify-between items-center px-4 z-50 pointer-events-none";
        header.innerHTML = `
            <button id="qt-back" class="px-4 py-2 bg-slate-800 text-white font-bold rounded shadow border border-slate-700 hover:bg-slate-700 transition-colors uppercase text-xs tracking-widest pointer-events-auto"><i class="fas fa-arrow-left"></i> Back</button>
            <h1 class="text-xl font-bold tracking-widest uppercase">Quilt</h1>
            <div class="px-4 py-2 opacity-0">spacer</div>
        `;
        this.container.appendChild(header);

        // Use timeout to ensure DOM has updated before attaching event listener
        setTimeout(() => {
            const backBtn = document.getElementById('qt-back');
            if (backBtn) backBtn.onclick = () => window.miniGameHub.goBack();
        }, 0);

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'absolute inset-0 w-full h-full block';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.boundResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.boundResize);

        // Input Handling
        this.boundStart = this.handleStart.bind(this);
        this.boundMove = this.handleMove.bind(this);
        this.boundEnd = this.handleEnd.bind(this);

        this.canvas.addEventListener('mousedown', this.boundStart);
        this.canvas.addEventListener('mousemove', this.boundMove);
        this.canvas.addEventListener('mouseup', this.boundEnd);
        this.canvas.addEventListener('touchstart', this.boundStart, {passive: false});
        this.canvas.addEventListener('touchmove', this.boundMove, {passive: false});
        this.canvas.addEventListener('touchend', this.boundEnd, {passive: false});

        this.handleResize();
        this.generateLevel();
        this.gameLoop();
    }

    handleResize() {
        if (!this.canvas || !this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        // Calculate board position (centered top)
        this.cellSize = Math.min(rect.width * 0.8 / this.gridSize, (rect.height - 200) / this.gridSize, 60);
        this.offsetX = (rect.width - (this.gridSize * this.cellSize)) / 2;
        this.offsetY = 80; // Below header

        // Reposition pieces in tray if they aren't on the board
        this.layoutTray();
    }

    generateLevel() {
        // Simple predefined level for 6x6
        this.board = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(null));

        // 6x6 grid requires 36 area total
        const pieceDefs = [
            { w: 3, h: 3, id: 0 }, // 9
            { w: 3, h: 2, id: 1 }, // 6
            { w: 2, h: 3, id: 2 }, // 6
            { w: 2, h: 2, id: 3 }, // 4
            { w: 1, h: 4, id: 4 }, // 4
            { w: 4, h: 1, id: 5 }, // 4
            { w: 1, h: 2, id: 6 }, // 2
            { w: 1, h: 1, id: 7 }  // 1
        ];

        this.pieces = pieceDefs.map((def, i) => ({
            id: def.id,
            w: def.w,
            h: def.h,
            color: this.colors[i % this.colors.length],
            x: 0,
            y: 0,
            gridX: -1, // -1 means in tray
            gridY: -1,
            isPlaced: false
        }));

        this.layoutTray();
    }

    layoutTray() {
        // Arrange pieces at the bottom
        let currentX = 20;
        let currentY = this.offsetY + (this.gridSize * this.cellSize) + 40;
        let rowHeight = 0;

        this.pieces.forEach(p => {
            if (p.isPlaced) {
                // Keep it on board, just update physical pos based on new grid metrics
                p.x = this.offsetX + (p.gridX * this.cellSize);
                p.y = this.offsetY + (p.gridY * this.cellSize);
                return;
            }

            const pWidth = p.w * this.cellSize;
            const pHeight = p.h * this.cellSize;

            if (currentX + pWidth > this.canvas.width - 20) {
                currentX = 20;
                currentY += rowHeight + 20;
                rowHeight = 0;
            }

            p.x = currentX;
            p.y = currentY;

            currentX += pWidth + 20;
            rowHeight = Math.max(rowHeight, pHeight);
        });
    }

    getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    handleStart(e) {
        e.preventDefault();
        const pos = this.getPointerPos(e);

        // Check collision from top (last drawn/dragged)
        for (let i = this.pieces.length - 1; i >= 0; i--) {
            const p = this.pieces[i];
            if (pos.x >= p.x && pos.x <= p.x + (p.w * this.cellSize) &&
                pos.y >= p.y && pos.y <= p.y + (p.h * this.cellSize)) {

                this.draggedPiece = p;
                this.dragOffsetX = pos.x - p.x;
                this.dragOffsetY = pos.y - p.y;

                // Remove from board if it was placed
                if (p.isPlaced) {
                    for(let r=p.gridY; r<p.gridY+p.h; r++) {
                        for(let c=p.gridX; c<p.gridX+p.w; c++) {
                            this.board[r][c] = null;
                        }
                    }
                    p.isPlaced = false;
                    p.gridX = -1;
                    p.gridY = -1;
                }

                // Move to top of render array
                this.pieces.splice(i, 1);
                this.pieces.push(p);
                break;
            }
        }
    }

    handleMove(e) {
        e.preventDefault();
        if (!this.draggedPiece) return;

        const pos = this.getPointerPos(e);
        this.draggedPiece.x = pos.x - this.dragOffsetX;
        this.draggedPiece.y = pos.y - this.dragOffsetY;
    }

    handleEnd(e) {
        e.preventDefault();
        if (!this.draggedPiece) return;

        const p = this.draggedPiece;

        // Calculate grid position (center of piece)
        const centerX = p.x + (p.w * this.cellSize) / 2;
        const centerY = p.y + (p.h * this.cellSize) / 2;

        // Snap to grid coordinates
        let gX = Math.round((centerX - this.offsetX) / this.cellSize - p.w/2);
        let gY = Math.round((centerY - this.offsetY) / this.cellSize - p.h/2);

        // Validate placement
        let valid = false;

        if (gX >= 0 && gY >= 0 && gX + p.w <= this.gridSize && gY + p.h <= this.gridSize) {
            // Check overlaps
            let overlap = false;
            for(let r=gY; r<gY+p.h; r++) {
                for(let c=gX; c<gX+p.w; c++) {
                    if (this.board[r][c] !== null) overlap = true;
                }
            }

            if (!overlap) {
                valid = true;
                p.gridX = gX;
                p.gridY = gY;
                p.isPlaced = true;
                p.x = this.offsetX + (gX * this.cellSize);
                p.y = this.offsetY + (gY * this.cellSize);

                // Mark board
                for(let r=gY; r<gY+p.h; r++) {
                    for(let c=gX; c<gX+p.w; c++) {
                        this.board[r][c] = p.id;
                    }
                }
            }
        }

        if (!valid) {
            // Return to tray
            this.layoutTray();
        }

        this.draggedPiece = null;
        this.checkWin();
    }

    checkWin() {
        // Win if entire board is filled (no nulls)
        let filled = 0;
        for(let r=0; r<this.gridSize; r++) {
            for(let c=0; c<this.gridSize; c++) {
                if (this.board[r][c] !== null) filled++;
            }
        }

        if (filled === this.gridSize * this.gridSize) {
            setTimeout(() => {
                if (window.miniGameHub && window.miniGameHub.soundManager) {
                    window.miniGameHub.soundManager.playSound('win');
                }
                alert("Quilt Complete!");
            }, 100);
        }
    }

    gameLoop() {
        if (!this.canvas) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Board Grid
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let i = 0; i <= this.gridSize; i++) {
            const x = this.offsetX + (i * this.cellSize);
            const y = this.offsetY + (i * this.cellSize);

            // Vertical
            this.ctx.moveTo(x, this.offsetY);
            this.ctx.lineTo(x, this.offsetY + (this.gridSize * this.cellSize));

            // Horizontal
            this.ctx.moveTo(this.offsetX, y);
            this.ctx.lineTo(this.offsetX + (this.gridSize * this.cellSize), y);
        }
        this.ctx.stroke();

        // Draw Pieces
        this.pieces.forEach(p => {
            this.ctx.fillStyle = p.color;

            const px = p.x;
            const py = p.y;
            const pw = p.w * this.cellSize;
            const ph = p.h * this.cellSize;

            // Draw block with subtle bevel/shadow
            this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
            this.ctx.shadowBlur = p === this.draggedPiece ? 15 : 5;
            this.ctx.shadowOffsetX = p === this.draggedPiece ? 5 : 2;
            this.ctx.shadowOffsetY = p === this.draggedPiece ? 5 : 2;

            // Slight inset for visual grid on the piece itself
            this.ctx.fillRect(px, py, pw, ph);

            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;

            // Draw inner grid lines for pieces > 1x1 to show component blocks
            this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for(let i=1; i<p.w; i++) {
                this.ctx.moveTo(px + (i * this.cellSize), py);
                this.ctx.lineTo(px + (i * this.cellSize), py + ph);
            }
            for(let i=1; i<p.h; i++) {
                this.ctx.moveTo(px, py + (i * this.cellSize));
                this.ctx.lineTo(px + pw, py + (i * this.cellSize));
            }
            this.ctx.stroke();

            // Border highlight
            this.ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            this.ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
        });

        this.animationFrameId = requestAnimationFrame(this.boundGameLoop);
    }

    cleanup() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        window.removeEventListener('resize', this.boundResize);
        if (this.canvas) {
            this.canvas.removeEventListener('mousedown', this.boundStart);
            this.canvas.removeEventListener('mousemove', this.boundMove);
            this.canvas.removeEventListener('mouseup', this.boundEnd);
            this.canvas.removeEventListener('touchstart', this.boundStart);
            this.canvas.removeEventListener('touchmove', this.boundMove);
            this.canvas.removeEventListener('touchend', this.boundEnd);
        }
        if (this.container) {
            this.container.innerHTML = '';
            this.container.className = 'game-container hidden';
        }
    }
}
