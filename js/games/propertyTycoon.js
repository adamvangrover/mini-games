import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class PropertyTycoon {
    constructor() {
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        // Game State
        this.cash = 1500;
        this.playerPos = 0;
        this.boardSize = 16; // Simple 16-tile square board (4x4)
        this.tiles = this.generateBoard();
        this.lastTime = 0;
        this.diceRoll = 0;
        this.isRolling = false;
        this.rollTimer = 0;

        // Input state
        this.keys = {};
        this.keyCooldown = false;

        // Bindings
        this.boundResize = this.resize.bind(this);
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
    }

    generateBoard() {
        const tiles = [];
        for (let i = 0; i < 16; i++) {
            if (i === 0) tiles.push({ name: 'START', type: 'special', color: '#00ff00' });
            else if (i === 4) tiles.push({ name: 'JAIL', type: 'special', color: '#ff0000' });
            else if (i === 8) tiles.push({ name: 'FREE PARKING', type: 'special', color: '#ffff00' });
            else if (i === 12) tiles.push({ name: 'GO TO JAIL', type: 'special', color: '#ff0000' });
            else {
                // Properties
                const cost = 50 + (i * 20);
                tiles.push({
                    name: `SECTOR ${i}`,
                    type: 'property',
                    cost: cost,
                    rent: Math.floor(cost * 0.2),
                    owner: null,
                    color: `hsl(${i * 22}, 80%, 50%)`
                });
            }
        }
        return tiles;
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        window.addEventListener('resize', this.boundResize);
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);

        this.resize();
        this.isActive = true;
        this.lastTime = performance.now();
        this.gameLoop = requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.draw(); // Force redraw
    }

    handleKeyDown(e) {
        this.keys[e.code] = true;

        if (e.code === 'Space' && !this.keyCooldown && !this.isRolling) {
            this.rollDice();
            this.keyCooldown = true;
        }
        if (e.code === 'Enter' && !this.keyCooldown) {
            this.buyProperty();
            this.keyCooldown = true;
        }
    }

    handleKeyUp(e) {
        this.keys[e.code] = false;
        if (e.code === 'Space' || e.code === 'Enter') {
            this.keyCooldown = false;
        }
    }

    rollDice() {
        this.isRolling = true;
        this.rollTimer = 0;
        this.soundManager.playSound('jump');
    }

    buyProperty() {
        const tile = this.tiles[this.playerPos];
        if (tile.type === 'property' && tile.owner === null && this.cash >= tile.cost) {
            this.cash -= tile.cost;
            tile.owner = 'Player';
            this.soundManager.playSound('coin');
        } else {
            this.soundManager.playSound('error');
        }
    }

    loop(timestamp) {
        if (!this.isActive) return;
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        this.gameLoop = requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        if (this.isRolling) {
            this.rollTimer += dt;
            // Visual rolling effect
            this.diceRoll = Math.floor(Math.random() * 6) + 1;

            if (this.rollTimer > 1.0) {
                this.isRolling = false;
                this.playerPos = (this.playerPos + this.diceRoll) % 16;

                // Land logic
                const tile = this.tiles[this.playerPos];
                if (tile.type === 'property' && tile.owner === 'CPU') {
                    this.cash -= tile.rent;
                    this.soundManager.playSound('hit');
                } else {
                    this.soundManager.playSound('click');
                }

                // Simulate CPU buying properties randomly to add pressure
                const randomTile = this.tiles[Math.floor(Math.random() * 16)];
                if (randomTile.type === 'property' && randomTile.owner === null && Math.random() > 0.5) {
                    randomTile.owner = 'CPU';
                }
            }
        }
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Background
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, w, h);

        // Draw Board
        const boardSize = Math.min(w, h) * 0.8;
        const offsetX = (w - boardSize) / 2;
        const offsetY = (h - boardSize) / 2;
        const tileSize = boardSize / 5; // 4x4 outer ring means 5 tiles across

        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2;

        for (let i = 0; i < 16; i++) {
            let tx, ty;
            if (i < 5) { tx = i; ty = 0; }
            else if (i < 8) { tx = 4; ty = i - 4; }
            else if (i < 13) { tx = 12 - i; ty = 4; }
            else { tx = 0; ty = 16 - i; }

            const px = offsetX + tx * tileSize;
            const py = offsetY + ty * tileSize;

            const tile = this.tiles[i];

            // Tile background
            this.ctx.fillStyle = tile.owner === 'Player' ? 'rgba(0,255,255,0.2)' :
                                 tile.owner === 'CPU' ? 'rgba(255,0,255,0.2)' : '#111';
            this.ctx.fillRect(px, py, tileSize, tileSize);
            this.ctx.strokeRect(px, py, tileSize, tileSize);

            // Color bar
            this.ctx.fillStyle = tile.color;
            this.ctx.fillRect(px, py, tileSize, tileSize * 0.2);

            // Name
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(tile.name, px + tileSize/2, py + tileSize/2);

            if (tile.type === 'property') {
                this.ctx.fillText(`$${tile.cost}`, px + tileSize/2, py + tileSize * 0.8);
            }

            // Draw Player
            if (this.playerPos === i) {
                this.ctx.fillStyle = '#00ffff';
                this.ctx.beginPath();
                this.ctx.arc(px + tileSize/2, py + tileSize/2, tileSize*0.15, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = '#00ffff';
                this.ctx.stroke();
                this.ctx.shadowBlur = 0;
            }
        }

        // Draw UI/HUD Center
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`CASH: $${this.cash}`, w/2, h/2 - 20);

        if (this.isRolling) {
             this.ctx.fillText(`ROLLING... ${this.diceRoll}`, w/2, h/2 + 20);
        } else {
             this.ctx.font = '16px monospace';
             this.ctx.fillText(`PRESS SPACE TO ROLL`, w/2, h/2 + 20);

             const currentTile = this.tiles[this.playerPos];
             if (currentTile.type === 'property' && currentTile.owner === null) {
                 this.ctx.fillStyle = '#00ffff';
                 this.ctx.fillText(`PRESS ENTER TO BUY ($${currentTile.cost})`, w/2, h/2 + 50);
             }
        }
    }

    async shutdown() {
        this.isActive = false;
        if (this.gameLoop) cancelAnimationFrame(this.gameLoop);

        window.removeEventListener('resize', this.boundResize);
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
