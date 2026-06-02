import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class MicroCity {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.boundResize = this.resize.bind(this);
        this.boundLoop = this.loop.bind(this);
        this.lastTime = 0;

        // Grid definition
        this.gridSize = 30; // Cells
        this.cellSize = 0; // Calculated on resize
        this.grid = [];
        this.initGrid();

        // City Stats
        this.stats = {
            population: 0,
            funds: this.saveSystem.getGameConfig('microCity_funds') || 10000,
            day: 0
        };

        // Tools: none(0), road(1), residential(2), commercial(3), industrial(4), bulldozer(5)
        this.currentTool = 1;

        // Traffic Simulation
        this.cars = []; // {x, y, targetX, targetY, progress}

        this.timeScale = 1;
        this.tickTimer = 0;

        // Try to load saved city
        const savedGrid = this.saveSystem.getGameConfig('microCity_grid');
        if (savedGrid && savedGrid.length === this.gridSize) {
             this.grid = savedGrid;
        }
    }

    initGrid() {
        this.grid = new Array(this.gridSize).fill(0).map(() =>
            new Array(this.gridSize).fill(0).map(() => ({ type: 0, density: 0 }))
        );
    }

    async init(container) {
        this.container = container;

        this.container.innerHTML = `
            <div class="relative w-full h-full bg-[#111] overflow-hidden font-mono select-none" id="microCity-ui">
                <canvas id="microCity-canvas" class="absolute inset-0 block"></canvas>

                <!-- Top Bar -->
                <div class="absolute top-0 w-full bg-slate-900 border-b border-cyan-800 p-2 flex justify-between items-center text-cyan-400 z-10 shadow-[0_2px_10px_rgba(8,145,178,0.3)]">
                    <div class="font-bold text-xl tracking-widest"><i class="fas fa-city mr-2"></i>MICRO CITY</div>
                    <div class="flex gap-6 text-sm">
                        <div title="Population" class="text-green-400"><i class="fas fa-users mr-1"></i><span id="mc-pop">0</span></div>
                        <div title="Funds" class="text-yellow-400"><i class="fas fa-coins mr-1"></i>$<span id="mc-funds">10000</span></div>
                        <div title="Day" class="text-slate-400"><i class="fas fa-calendar mr-1"></i>Day <span id="mc-day">0</span></div>
                    </div>
                    <button class="back-btn px-4 py-1 bg-red-900/80 hover:bg-red-700 text-red-200 border border-red-500 rounded text-xs uppercase pointer-events-auto transition-colors">EXIT</button>
                </div>

                <!-- Tools Palette -->
                <div class="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10 bg-slate-900/90 p-2 border border-cyan-800 rounded">
                    <button class="mc-tool w-10 h-10 rounded border-2 border-slate-600 bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors" data-tool="1" title="Road ($10)"><i class="fas fa-road"></i></button>
                    <button class="mc-tool w-10 h-10 rounded border-2 border-green-600 bg-green-900/50 hover:bg-green-800 text-green-400 flex items-center justify-center transition-colors" data-tool="2" title="Residential ($100)"><i class="fas fa-home"></i></button>
                    <button class="mc-tool w-10 h-10 rounded border-2 border-blue-600 bg-blue-900/50 hover:bg-blue-800 text-blue-400 flex items-center justify-center transition-colors" data-tool="3" title="Commercial ($100)"><i class="fas fa-store"></i></button>
                    <button class="mc-tool w-10 h-10 rounded border-2 border-yellow-600 bg-yellow-900/50 hover:bg-yellow-800 text-yellow-400 flex items-center justify-center transition-colors" data-tool="4" title="Industrial ($100)"><i class="fas fa-industry"></i></button>
                    <div class="h-px bg-cyan-800 my-1"></div>
                    <button class="mc-tool w-10 h-10 rounded border-2 border-red-600 bg-red-900/50 hover:bg-red-800 text-red-400 flex items-center justify-center transition-colors" data-tool="5" title="Bulldoze ($5)"><i class="fas fa-bulldozer"></i></button>
                </div>
            </div>
        `;

        this.canvas = this.container.querySelector('#microCity-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Setup Tools
        const toolBtns = this.container.querySelectorAll('.mc-tool');
        toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                toolBtns.forEach(b => b.classList.remove('ring-2', 'ring-white', 'scale-110'));
                btn.classList.add('ring-2', 'ring-white', 'scale-110');
                this.currentTool = parseInt(btn.dataset.tool);
            });
        });
        toolBtns[0].classList.add('ring-2', 'ring-white', 'scale-110'); // Default road

        // Setup Interaction
        let isDragging = false;

        const handleInteraction = (e) => {
            const rect = this.canvas.getBoundingClientRect();

            // Calculate offsets to center the grid
            const gridPixelSize = this.gridSize * this.cellSize;
            const offsetX = (rect.width - gridPixelSize) / 2;
            const offsetY = (rect.height - gridPixelSize) / 2;

            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const gx = Math.floor((mouseX - offsetX) / this.cellSize);
            const gy = Math.floor((mouseY - offsetY) / this.cellSize);

            if (gx >= 0 && gx < this.gridSize && gy >= 0 && gy < this.gridSize) {
                this.applyTool(gx, gy);
            }
        };

        this.canvas.addEventListener('pointerdown', (e) => { isDragging = true; handleInteraction(e); });
        this.canvas.addEventListener('pointermove', (e) => { if (isDragging) handleInteraction(e); });
        window.addEventListener('pointerup', () => isDragging = false);

        window.addEventListener('resize', this.boundResize);
        this.resize();

        this.updateUI();

        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    applyTool(x, y) {
        const cell = this.grid[y][x];
        const costMap = { 1: 10, 2: 100, 3: 100, 4: 100, 5: 5 };

        // Bulldoze
        if (this.currentTool === 5) {
            if (cell.type !== 0 && this.stats.funds >= 5) {
                if (cell.type === 2) this.stats.population -= cell.density; // Removing house removes pop immediately
                cell.type = 0;
                cell.density = 0;
                this.stats.funds -= 5;
                this.updateUI();
                this.soundManager.playSound('explosion'); // Reusing sound for bulldoze
            }
            return;
        }

        // Don't overwrite existing zones unless it's empty
        if (cell.type !== 0) return;

        const cost = costMap[this.currentTool];
        if (this.stats.funds >= cost) {
            this.stats.funds -= cost;
            cell.type = this.currentTool;
            cell.density = 0;
            this.updateUI();
            this.soundManager.playSound('click');
        } else {
             // Not enough funds (play error sound once per click, managed by sound manager throttling ideally, but we'll keep it simple)
        }
    }

    loop(timestamp) {
        if (!this.canvas) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        this.update(Math.min(dt, 0.1));
        this.draw();

        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    update(dt) {
        this.tickTimer += dt;

        // Simulation Tick (every 1 second)
        if (this.tickTimer >= 1.0) {
            this.tickTimer -= 1.0;
            this.stats.day++;

            this.simulateCity();
            this.updateUI();

            // Save periodically
            if (this.stats.day % 10 === 0) {
                this.saveSystem.setGameConfig('microCity_grid', this.grid);
                this.saveSystem.setGameConfig('microCity_funds', this.stats.funds);
            }
        }

        // Traffic animation update
        for (let i = 0; i < this.cars.length; i++) {
             const car = this.cars[i];
             car.progress += dt * 2; // Speed
             if (car.progress >= 1) {
                  // Remove car when it reaches destination
                  this.cars[i] = this.cars[this.cars.length - 1];
                  this.cars.pop();
                  i--;
             }
        }
    }

    simulateCity() {
        let taxRevenue = 0;
        let newPop = 0;

        // Find all roads for traffic spawning
        const roads = [];
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x].type === 1) roads.push({x, y});
            }
        }

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];

                // Needs Road Access to develop
                const hasRoad = this.checkRoadAccess(x, y);

                if (!hasRoad) continue;

                if (cell.type === 2) { // Residential
                    // Growth condition: Low density grows randomly, high density needs jobs
                    if (cell.density < 5 && Math.random() < 0.1) {
                        cell.density++;
                    }
                    newPop += cell.density;
                    taxRevenue += cell.density * 1; // $1 per pop

                    // Spawn traffic from home to random road
                    if (cell.density > 0 && Math.random() < 0.2 && roads.length > 1) {
                        const target = roads[Math.floor(Math.random() * roads.length)];
                        this.spawnCar(x, y, target.x, target.y);
                    }
                }
                else if (cell.type === 3) { // Commercial
                    // Growth condition: Needs population
                    if (this.stats.population > 10 * (cell.density + 1) && cell.density < 5 && Math.random() < 0.1) {
                        cell.density++;
                    }
                    taxRevenue += cell.density * 5; // $5 per shop lvl
                }
                else if (cell.type === 4) { // Industrial
                    // Growth condition: Always grows slowly
                    if (cell.density < 5 && Math.random() < 0.05) {
                        cell.density++;
                    }
                    taxRevenue += cell.density * 10; // $10 per factory lvl

                    // Spawn freight traffic
                    if (cell.density > 0 && Math.random() < 0.3 && roads.length > 1) {
                         const target = roads[Math.floor(Math.random() * roads.length)];
                         this.spawnCar(x, y, target.x, target.y, '#f97316'); // Orange freight
                    }
                }
            }
        }

        // Road upkeep
        const roadCount = roads.length;
        const upkeep = roadCount * 1;

        this.stats.population = newPop;
        this.stats.funds += (taxRevenue - upkeep);
    }

    spawnCar(startX, startY, endX, endY, color = '#fff') {
        // Find nearest road to start
        let rX = startX, rY = startY;
        if (this.checkRoad(startX-1, startY)) rX--;
        else if (this.checkRoad(startX+1, startY)) rX++;
        else if (this.checkRoad(startX, startY-1)) rY--;
        else if (this.checkRoad(startX, startY+1)) rY++;
        else return; // No road access directly

        this.cars.push({
            x: rX, y: rY,
            tx: endX, ty: endY,
            progress: 0,
            color: color
        });
    }

    checkRoad(x, y) {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return false;
        return this.grid[y][x].type === 1;
    }

    checkRoadAccess(x, y) {
        return this.checkRoad(x-1, y) || this.checkRoad(x+1, y) ||
               this.checkRoad(x, y-1) || this.checkRoad(x, y+1);
    }

    updateUI() {
        document.getElementById('mc-pop').innerText = this.stats.population;
        document.getElementById('mc-funds').innerText = this.stats.funds;
        document.getElementById('mc-day').innerText = this.stats.day;
    }

    draw() {
        if (!this.ctx) return;

        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const gridPixelSize = this.gridSize * this.cellSize;
        const offsetX = Math.floor((this.canvas.width - gridPixelSize) / 2);
        const offsetY = Math.floor((this.canvas.height - gridPixelSize) / 2);

        // Draw Grid Background
        this.ctx.strokeStyle = '#1e293b';
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        for (let i = 0; i <= this.gridSize; i++) {
            this.ctx.moveTo(offsetX + i * this.cellSize, offsetY);
            this.ctx.lineTo(offsetX + i * this.cellSize, offsetY + gridPixelSize);
            this.ctx.moveTo(offsetX, offsetY + i * this.cellSize);
            this.ctx.lineTo(offsetX + gridPixelSize, offsetY + i * this.cellSize);
        }
        this.ctx.stroke();

        // Draw Zones
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                if (cell.type === 0) continue;

                const px = offsetX + x * this.cellSize;
                const py = offsetY + y * this.cellSize;

                if (cell.type === 1) {
                    // Road
                    this.ctx.fillStyle = '#334155';
                    this.ctx.fillRect(px, py, this.cellSize, this.cellSize);

                    // Road markings
                    this.ctx.fillStyle = '#94a3b8';
                    this.ctx.fillRect(px + this.cellSize/2 - 1, py + this.cellSize/2 - 1, 2, 2);
                } else {
                    // Zones (R, C, I)
                    let baseColor;
                    if (cell.type === 2) baseColor = '#166534'; // Green
                    if (cell.type === 3) baseColor = '#1e3a8a'; // Blue
                    if (cell.type === 4) baseColor = '#713f12'; // Yellow/Brown

                    this.ctx.fillStyle = baseColor;
                    this.ctx.fillRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2);

                    // Draw buildings based on density
                    if (cell.density > 0) {
                        if (cell.type === 2) this.ctx.fillStyle = '#4ade80';
                        if (cell.type === 3) this.ctx.fillStyle = '#60a5fa';
                        if (cell.type === 4) this.ctx.fillStyle = '#facc15';

                        const pad = 2;
                        const bdSize = this.cellSize - pad*2;

                        // Simple 2x2 subdivision for density visual
                        if (cell.density >= 1) this.ctx.fillRect(px+pad, py+pad, bdSize/2-1, bdSize/2-1);
                        if (cell.density >= 2) this.ctx.fillRect(px+pad+bdSize/2, py+pad+bdSize/2, bdSize/2-1, bdSize/2-1);
                        if (cell.density >= 3) this.ctx.fillRect(px+pad+bdSize/2, py+pad, bdSize/2-1, bdSize/2-1);
                        if (cell.density >= 4) this.ctx.fillRect(px+pad, py+pad+bdSize/2, bdSize/2-1, bdSize/2-1);
                        if (cell.density >= 5) {
                             this.ctx.fillStyle = '#fff'; // Max density cap
                             this.ctx.fillRect(px+pad+bdSize/4, py+pad+bdSize/4, bdSize/2, bdSize/2);
                        }
                    }
                }
            }
        }

        // Draw Traffic
        for (let i = 0; i < this.cars.length; i++) {
             const car = this.cars[i];
             const cx = offsetX + (car.x + (car.tx - car.x) * car.progress) * this.cellSize + this.cellSize/2;
             const cy = offsetY + (car.y + (car.ty - car.y) * car.progress) * this.cellSize + this.cellSize/2;

             this.ctx.fillStyle = car.color;
             this.ctx.fillRect(cx - 1, cy - 1, 3, 3);
        }
    }

    resize() {
        if (!this.canvas || !this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        // Calculate cell size to fit screen
        const minDim = Math.min(rect.width, rect.height - 60); // Account for top bar
        this.cellSize = Math.floor((minDim * 0.9) / this.gridSize);
        if (this.cellSize < 5) this.cellSize = 5; // Minimum size
    }

    async shutdown() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.boundResize);

        // Final save on exit
        this.saveSystem.setGameConfig('microCity_grid', this.grid);
        this.saveSystem.setGameConfig('microCity_funds', this.stats.funds);

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
