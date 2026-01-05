import InputManager from '../core/InputManager.js';
import ParticleSystem from '../core/ParticleSystem.js';
import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class NeonFactory {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.GRID_SIZE = 40;
        this.rows = Math.ceil(this.canvas.height / this.GRID_SIZE);
        this.cols = Math.ceil(this.canvas.width / this.GRID_SIZE);

        this.resetGame();

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);

        // Input
        this.boundHandleClick = this.handleClick.bind(this);
        this.canvas.addEventListener('mousedown', this.boundHandleClick);

        this.createToolbar();
        this.loadState();
    }

    createToolbar() {
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800 p-2 rounded flex gap-2 border border-slate-600';

        const items = [
            { type: 'conveyor', icon: 'fa-arrow-right', cost: 10 },
            { type: 'miner', icon: 'fa-hammer', cost: 50 },
            { type: 'furnace', icon: 'fa-fire', cost: 100 },
            { type: 'assembler', icon: 'fa-wrench', cost: 150 },
            { type: 'splitter', icon: 'fa-arrows-split-up-and-left', cost: 80 },
            { type: 'merger', icon: 'fa-compress-arrows-alt', cost: 80 },
            { type: 'seller', icon: 'fa-dollar-sign', cost: 200 }
        ];

        items.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'w-12 h-12 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center text-white relative';
            btn.innerHTML = `<i class="fas ${item.icon}"></i><span class="absolute -top-2 -right-2 bg-black text-xs px-1 rounded">${item.cost}</span>`;
            btn.onclick = () => this.selectedTool = item.type;
            this.toolbar.appendChild(btn);
        });

        // Rotate tool
        const rBtn = document.createElement('button');
        rBtn.className = 'w-12 h-12 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center text-white';
        rBtn.innerHTML = '<i class="fas fa-sync"></i>';
        rBtn.onclick = () => this.rotation = (this.rotation + 1) % 4;
        this.toolbar.appendChild(rBtn);

        // Save Btn
        const saveBtn = document.createElement('button');
        saveBtn.className = 'w-12 h-12 bg-green-700 hover:bg-green-600 rounded flex items-center justify-center text-white';
        saveBtn.innerHTML = '<i class="fas fa-save"></i>';
        saveBtn.onclick = () => { this.saveState(); this.soundManager.playSound('click'); };
        this.toolbar.appendChild(saveBtn);

        this.container.appendChild(this.toolbar);
    }

    resetGame() {
        this.money = 500;
        this.grid = Array(this.rows).fill().map(() => Array(this.cols).fill(null));
        this.items = []; // Moving items
        this.selectedTool = 'conveyor';
        this.rotation = 0; // 0: Right, 1: Down, 2: Left, 3: Up

        // Initial resources
        this.grid[5][5] = { type: 'ore_vein', static: true }; // Iron
        this.grid[5][8] = { type: 'ore_vein', static: true }; // Iron
        this.grid[8][5] = { type: 'copper_vein', static: true }; // Copper
    }

    saveState() {
        const data = {
            money: this.money,
            grid: this.grid,
            rows: this.rows,
            cols: this.cols
        };
        // Simple serialization of grid (circular refs check not needed for simple objs)
        this.saveSystem.setGameConfig('neon-factory', data);
        window.miniGameHub.showToast("Factory Saved");
    }

    loadState() {
        const data = this.saveSystem.getGameConfig('neon-factory');
        if (data && data.grid) {
            this.money = data.money || 500;
            // Map saved grid back to current size (if resized)
            // For prototype, just try to load directly
            if (data.rows === this.rows && data.cols === this.cols) {
                this.grid = data.grid;
            } else {
                 // Resize logic or just reset safely
                 // Copy over what fits
                 for(let r=0; r<Math.min(this.rows, data.rows); r++) {
                     for(let c=0; c<Math.min(this.cols, data.cols); c++) {
                         this.grid[r][c] = data.grid[r][c];
                     }
                 }
            }
        }
    }

    resize() {
        if(!this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        const newRows = Math.ceil(this.canvas.height / this.GRID_SIZE);
        const newCols = Math.ceil(this.canvas.width / this.GRID_SIZE);

        // Expand grid if larger
        if (newRows > this.rows || newCols > this.cols) {
             const newGrid = Array(newRows).fill().map(() => Array(newCols).fill(null));
             for(let r=0; r<this.rows; r++) {
                 for(let c=0; c<this.cols; c++) {
                     newGrid[r][c] = this.grid[r][c];
                 }
             }
             this.grid = newGrid;
             this.rows = newRows;
             this.cols = newCols;
        }
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const c = Math.floor((e.clientX - rect.left) / this.GRID_SIZE);
        const r = Math.floor((e.clientY - rect.top) / this.GRID_SIZE);

        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            if (e.button === 0) { // Left click: Place
                this.placeBuilding(r, c);
            } else if (e.button === 2) { // Right click: Remove
                // Remove logic
                if (this.grid[r][c] && !this.grid[r][c].static) {
                     this.grid[r][c] = null;
                     this.soundManager.playSound('click');
                }
            }
        }
    }

    placeBuilding(r, c) {
        if (this.grid[r][c] && !this.grid[r][c].type.includes('vein')) return; // Occupied by building
        if (this.grid[r][c] && this.grid[r][c].type.includes('vein') && this.selectedTool !== 'miner') return; // Vein blocked

        const costs = { conveyor: 10, miner: 50, furnace: 100, seller: 200, splitter: 80, merger: 80, assembler: 150 };
        const cost = costs[this.selectedTool];

        if (this.money >= cost) {
            if (this.selectedTool === 'miner' && (!this.grid[r][c] || !this.grid[r][c].type.includes('vein'))) return;

            this.money -= cost;
            const veinType = (this.grid[r][c] && this.grid[r][c].type.includes('vein')) ? this.grid[r][c].type : null;

            this.grid[r][c] = {
                type: this.selectedTool,
                dir: this.rotation,
                timer: 0,
                // Splitter state
                splitIndex: 0,
                // Miner state
                veinType: veinType,
                // Assembler state
                buffer: []
            };
            this.soundManager.playSound('click');
        }
    }

    update(dt) {
        // Update buildings
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                if (!b) continue;

                if (b.type === 'miner') {
                    b.timer += dt;
                    if (b.timer > 2.0) {
                        b.timer = 0;
                        const res = b.veinType === 'copper_vein' ? 'copper_ore' : 'iron_ore';
                        this.spawnItem(r, c, res);
                    }
                }

                if (b.type === 'furnace') {
                    // Logic handled in item arrival
                }
            }
        }

        // Update Items
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];

            // Move item
            if (item.targetX !== undefined) {
                const speed = 2.0 * dt; // Grid cells per second
                const dx = item.targetX - item.x;
                const dy = item.targetY - item.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < speed) {
                    item.x = item.targetX;
                    item.y = item.targetY;
                    delete item.targetX;

                    // Arrival logic
                    const r = Math.round(item.y);
                    const c = Math.round(item.x);
                    const b = this.grid[r] && this.grid[r][c];

                    if (b) {
                        if (b.type === 'seller') {
                            this.sellItem(item);
                            this.items.splice(i, 1);
                            continue;
                        }
                        if (b.type === 'furnace') {
                            if (item.type.includes('_ore')) {
                                // Smelt
                                item.type = item.type.replace('_ore', '_ingot');
                                item.color = item.type === 'copper_ingot' ? '#d97706' : '#9ca3af'; // Orange/Gray
                            }
                        }
                        if (b.type === 'assembler') {
                            // Buffer logic
                            b.buffer.push(item);
                            this.items.splice(i, 1);

                            // Check recipe: Copper Ingot + Copper Ingot = Wire
                            // Or Iron Ingot + Iron Ingot = Plate (Placeholder)
                            const copperCount = b.buffer.filter(it => it.type === 'copper_ingot').length;
                            if (copperCount >= 2) {
                                // Craft Wire
                                b.buffer = b.buffer.filter(it => it.type !== 'copper_ingot'); // Remove all? No remove 2
                                // Need robust remove logic, simplify:
                                // Remove first 2 coppers
                                let removed = 0;
                                b.buffer = b.buffer.filter(it => {
                                    if(it.type === 'copper_ingot' && removed < 2) { removed++; return false; }
                                    return true;
                                });

                                this.spawnItem(r, c, 'wire');
                            }
                            continue;
                        }
                    }
                } else {
                    item.x += (dx/dist) * speed;
                    item.y += (dy/dist) * speed;
                }
            } else {
                // Find next move
                const r = Math.round(item.y);
                const c = Math.round(item.x);
                const b = this.grid[r] && this.grid[r][c];

                if (b) {
                    let nextR, nextC;

                    if (['conveyor', 'miner', 'furnace', 'merger', 'assembler'].includes(b.type)) {
                        const dirs = [[1,0], [0,1], [-1,0], [0,-1]];
                        const d = dirs[b.dir];
                        nextR = r + d[1];
                        nextC = c + d[0];
                    } else if (b.type === 'splitter') {
                        // Outputs to Front, Left, Right relative to rotation
                        const dirs = [[1,0], [0,1], [-1,0], [0,-1]]; // 0:R, 1:D, 2:L, 3:U
                        // Relative offsets: 0 (front), 1 (right), 3 (left)
                        const outputs = [0, 1, 3].map(offset => (b.dir + offset) % 4);

                        // Try next output
                        const dIndex = outputs[b.splitIndex % 3];
                        const d = dirs[dIndex];
                        nextR = r + d[1];
                        nextC = c + d[0];

                        b.splitIndex++; // Cycle
                    }

                    if (nextR !== undefined && this.isValid(nextR, nextC)) {
                         // Simple collision check: is anyone else moving to this cell?
                         const occupied = this.items.some(it =>
                             (it !== item) &&
                             ((Math.round(it.x) === nextC && Math.round(it.y) === nextR) ||
                              (it.targetX === nextC && it.targetY === nextR))
                         );

                         if (!occupied) {
                             item.targetX = nextC;
                             item.targetY = nextR;
                         }
                    }
                }
            }
        }
    }

    sellItem(item) {
        const prices = {
            'iron_ore': 1, 'copper_ore': 2,
            'iron_ingot': 5, 'copper_ingot': 8,
            'wire': 25
        };
        this.money += prices[item.type] || 1;
        this.soundManager.playSound('coin');
    }

    isValid(r, c) {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    spawnItem(r, c, type) {
        const colors = {
            'iron_ore': '#777', 'copper_ore': '#b45309',
            'iron_ingot': '#ccc', 'copper_ingot': '#f59e0b',
            'wire': '#ef4444' // Red wire
        };
        this.items.push({
            x: c, y: r,
            type: type,
            color: colors[type] || '#fff'
        });
    }

    draw() {
        if (!this.ctx) return;
        this.ctx.fillStyle = '#1e1e2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid
        this.ctx.strokeStyle = '#2a2a3a';
        this.ctx.lineWidth = 1;
        for (let r = 0; r <= this.rows; r++) {
            this.ctx.beginPath(); this.ctx.moveTo(0, r*this.GRID_SIZE); this.ctx.lineTo(this.canvas.width, r*this.GRID_SIZE); this.ctx.stroke();
        }
        for (let c = 0; c <= this.cols; c++) {
            this.ctx.beginPath(); this.ctx.moveTo(c*this.GRID_SIZE, 0); this.ctx.lineTo(c*this.GRID_SIZE, this.canvas.height); this.ctx.stroke();
        }

        // Buildings
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const b = this.grid[r][c];
                if (b) {
                    const x = c * this.GRID_SIZE;
                    const y = r * this.GRID_SIZE;

                    if (b.type.includes('vein')) {
                        this.ctx.fillStyle = b.type === 'copper_vein' ? '#78350f' : '#444';
                        this.ctx.fillRect(x+5, y+5, 30, 30);
                    } else {
                        this.ctx.fillStyle = this.getColor(b.type);
                        this.ctx.fillRect(x+2, y+2, 36, 36);

                        // Direction arrow
                        this.ctx.fillStyle = '#000';
                        this.ctx.save();
                        this.ctx.translate(x + 20, y + 20);
                        this.ctx.rotate(b.dir * Math.PI / 2);
                        this.ctx.fillText('>', -5, 5);
                        this.ctx.restore();

                        // Text for type
                        this.ctx.fillStyle = '#fff';
                        this.ctx.font = '10px Arial';
                        if(b.type === 'splitter') this.ctx.fillText('S', x+15, y+22);
                        if(b.type === 'merger') this.ctx.fillText('M', x+15, y+22);
                        if(b.type === 'assembler') this.ctx.fillText('A', x+15, y+22);
                    }
                }
            }
        }

        // Items
        this.items.forEach(item => {
            this.ctx.fillStyle = item.color;
            this.ctx.beginPath();
            if (item.type === 'wire') {
                this.ctx.fillRect(item.x * this.GRID_SIZE + 15, item.y * this.GRID_SIZE + 18, 10, 4);
            } else {
                this.ctx.arc(item.x * this.GRID_SIZE + 20, item.y * this.GRID_SIZE + 20, 6, 0, Math.PI*2);
                this.ctx.fill();
            }
        });

        // HUD
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Money: $${this.money}`, 20, 30);
    }

    getColor(type) {
        const colors = { conveyor: '#555', miner: '#a55', furnace: '#d50', seller: '#2d2', splitter: '#d0d', merger: '#0dd', assembler: '#25d' };
        return colors[type] || '#fff';
    }

    async shutdown() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.canvas) this.canvas.remove();
        if (this.toolbar) this.toolbar.remove();
        // Auto-save on exit?
        this.saveState();
    }
}
