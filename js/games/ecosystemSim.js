import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class EcosystemSim {
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

        this.timeScale = 1;
        this.entities = [];
        this.dayLength = 120; // seconds
        this.timeOfDay = 0; // 0 to 1

        // Stats
        this.stats = {
            plants: 0,
            herbivores: 0,
            carnivores: 0,
            days: 0,
            maxDays: this.saveSystem.getGameConfig('ecosystem_maxDays') || 0
        };

        // Spatial hashing for optimized collisions
        this.gridSize = 50;
        this.grid = new Map();

        // Pre-allocate arrays for spatial hash to reduce GC
        this.searchResult = [];
    }

    async init(container) {
        this.container = container;

        this.container.innerHTML = `
            <div class="relative w-full h-full bg-slate-900 overflow-hidden font-mono select-none" id="ecosystemSim-ui">
                <canvas id="ecosystemSim-canvas" class="absolute inset-0 block"></canvas>

                <!-- HUD -->
                <div class="absolute top-4 left-4 z-10 bg-black/50 p-4 rounded border border-slate-700 backdrop-blur-sm pointer-events-none text-xs">
                    <h1 class="text-xl font-bold text-green-400 mb-2 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]">Ecosystem Sim</h1>
                    <div class="flex flex-col gap-1">
                        <div class="text-green-300">Plants: <span id="eco-plants">0</span></div>
                        <div class="text-blue-300">Herbivores: <span id="eco-herbs">0</span></div>
                        <div class="text-red-400">Carnivores: <span id="eco-carns">0</span></div>
                        <div class="text-yellow-400 mt-2">Days Survived: <span id="eco-days">0</span> (Best: ${this.stats.maxDays})</div>
                    </div>
                </div>

                <!-- Controls -->
                <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/70 p-2 rounded-full border border-slate-600 flex gap-4 backdrop-blur-md">
                    <button class="tool-btn px-4 py-2 rounded-full bg-slate-800 text-green-400 hover:bg-green-900 border border-green-500 transition-colors" data-tool="plant">🌱 Plant</button>
                    <button class="tool-btn px-4 py-2 rounded-full bg-slate-800 text-blue-400 hover:bg-blue-900 border border-blue-500 transition-colors" data-tool="herbivore">🐇 Herbivore</button>
                    <button class="tool-btn px-4 py-2 rounded-full bg-slate-800 text-red-400 hover:bg-red-900 border border-red-500 transition-colors" data-tool="carnivore">🐺 Carnivore</button>
                </div>

                <div class="absolute bottom-4 right-4 z-10 bg-black/70 p-2 rounded border border-slate-600 flex gap-2">
                    <button id="speed-btn" class="px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600">Speed: 1x</button>
                </div>

                <button class="back-btn absolute top-4 right-4 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded font-bold z-20 transition-colors pointer-events-auto">BACK</button>
            </div>
        `;

        this.canvas = this.container.querySelector('#ecosystemSim-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on base

        // Setup Tools
        this.currentTool = 'plant';
        const toolBtns = this.container.querySelectorAll('.tool-btn');
        toolBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                toolBtns.forEach(b => b.classList.remove('ring-2', 'ring-white'));
                btn.classList.add('ring-2', 'ring-white');
                this.currentTool = btn.dataset.tool;
            });
        });
        toolBtns[0].classList.add('ring-2', 'ring-white');

        // Setup Canvas Interaction
        let isDrawing = false;
        const placeEntity = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.currentTool === 'plant') {
                // Throttle plant placement slightly
                if (Math.random() < 0.3) this.spawnEntity('plant', x, y);
            } else {
                // Ensure we don't spam too many animals at once
                if (!isDrawing || Math.random() < 0.05) {
                    this.spawnEntity(this.currentTool, x, y);
                }
            }
        };

        this.canvas.addEventListener('pointerdown', (e) => {
            isDrawing = true;
            placeEntity(e);
        });
        this.canvas.addEventListener('pointermove', (e) => {
            if (isDrawing) placeEntity(e);
        });
        window.addEventListener('pointerup', () => isDrawing = false);

        // Setup Speed Control
        document.getElementById('speed-btn').addEventListener('click', (e) => {
            if (this.timeScale === 1) this.timeScale = 2;
            else if (this.timeScale === 2) this.timeScale = 4;
            else this.timeScale = 1;
            e.target.innerText = `Speed: ${this.timeScale}x`;
        });

        window.addEventListener('resize', this.boundResize);
        this.resize();

        // Initial Seed
        this.seedWorld();

        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    seedWorld() {
        this.entities = [];
        const w = this.canvas.width;
        const h = this.canvas.height;

        for(let i=0; i<50; i++) this.spawnEntity('plant', Math.random()*w, Math.random()*h);
        for(let i=0; i<10; i++) this.spawnEntity('herbivore', Math.random()*w, Math.random()*h);
        for(let i=0; i<2; i++) this.spawnEntity('carnivore', Math.random()*w, Math.random()*h);
    }

    spawnEntity(type, x, y) {
        const entity = {
            id: Math.random().toString(36).substr(2, 9),
            type: type,
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            energy: 100,
            age: 0,
            maxAge: type === 'plant' ? 200 : (type === 'herbivore' ? 60 : 80),
            state: 'idle', // idle, seek, flee
            reproduceTimer: 0,
            radius: type === 'plant' ? 3 : (type === 'herbivore' ? 4 : 5)
        };

        // Add some random initial velocity for animals
        if (type !== 'plant') {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20;
            entity.vx = Math.cos(angle) * speed;
            entity.vy = Math.sin(angle) * speed;
        }

        this.entities.push(entity);
    }

    // Spatial Hashing methods
    getGridKey(x, y) {
        return Math.floor(x / this.gridSize) + ',' + Math.floor(y / this.gridSize);
    }

    updateGrid() {
        this.grid.clear();
        for (let i = 0; i < this.entities.length; i++) {
            const e = this.entities[i];
            const key = this.getGridKey(e.x, e.y);
            let cell = this.grid.get(key);
            if (!cell) {
                cell = [];
                this.grid.set(key, cell);
            }
            cell.push(e);
        }
    }

    getNearbyEntities(x, y, radius) {
        this.searchResult.length = 0;
        const minCellX = Math.floor((x - radius) / this.gridSize);
        const maxCellX = Math.floor((x + radius) / this.gridSize);
        const minCellY = Math.floor((y - radius) / this.gridSize);
        const maxCellY = Math.floor((y + radius) / this.gridSize);

        for (let cy = minCellY; cy <= maxCellY; cy++) {
            for (let cx = minCellX; cx <= maxCellX; cx++) {
                const cell = this.grid.get(cx + ',' + cy);
                if (cell) {
                    for (let i = 0; i < cell.length; i++) {
                        this.searchResult.push(cell[i]);
                    }
                }
            }
        }
        return this.searchResult;
    }

    loop(timestamp) {
        if (!this.canvas) return;

        const dt = ((timestamp - this.lastTime) / 1000) * this.timeScale;
        this.lastTime = timestamp;

        // Cap dt to prevent tunneling on lag
        this.update(Math.min(dt, 0.1 * this.timeScale));
        this.draw();

        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    update(dt) {
        this.updateGrid();

        this.stats.plants = 0;
        this.stats.herbivores = 0;
        this.stats.carnivores = 0;

        // Time progression
        this.timeOfDay += (dt / this.dayLength);
        if (this.timeOfDay >= 1) {
            this.timeOfDay = 0;
            this.stats.days++;
            document.getElementById('eco-days').innerText = this.stats.days;
            if (this.stats.days > this.stats.maxDays) {
                this.stats.maxDays = this.stats.days;
                this.saveSystem.setGameConfig('ecosystem_maxDays', this.stats.maxDays);
            }
        }

        const w = this.canvas.width;
        const h = this.canvas.height;

        // We use swap-and-pop for efficient removal
        for (let i = 0; i < this.entities.length; i++) {
            const e = this.entities[i];
            let remove = false;

            e.age += dt;
            e.reproduceTimer += dt;

            // Base decay
            if (e.type !== 'plant') {
                e.energy -= dt * 2;
                if (e.energy <= 0 || e.age >= e.maxAge) remove = true;
            } else {
                // Plants slowly gain energy from sun (daytime only)
                if (this.timeOfDay > 0.25 && this.timeOfDay < 0.75) {
                    e.energy += dt * 5;
                }
                if (e.age >= e.maxAge) remove = true;
            }

            if (!remove) {
                // AI Logic
                if (e.type === 'herbivore') {
                    this.stats.herbivores++;
                    this.updateAnimalLogic(e, dt, 'plant', 'carnivore', 50, 100, 30);
                } else if (e.type === 'carnivore') {
                    this.stats.carnivores++;
                    this.updateAnimalLogic(e, dt, 'herbivore', null, 80, 0, 40);
                } else if (e.type === 'plant') {
                    this.stats.plants++;
                    // Reproduction
                    if (e.energy > 150 && e.reproduceTimer > 10 && this.entities.length < 2000) {
                        e.energy -= 50;
                        e.reproduceTimer = 0;
                        const angle = Math.random() * Math.PI * 2;
                        const dist = 10 + Math.random() * 20;
                        this.spawnEntity('plant', e.x + Math.cos(angle)*dist, e.y + Math.sin(angle)*dist);
                    }
                }

                // Physics/Movement (animals only)
                if (e.type !== 'plant') {
                    // Friction
                    e.vx *= 0.95;
                    e.vy *= 0.95;

                    // Enforce max speed
                    const speedSq = e.vx*e.vx + e.vy*e.vy;
                    const maxSpeed = e.type === 'herbivore' ? 50 : 60;
                    if (speedSq > maxSpeed*maxSpeed) {
                        const speed = Math.sqrt(speedSq);
                        e.vx = (e.vx / speed) * maxSpeed;
                        e.vy = (e.vy / speed) * maxSpeed;
                    }

                    e.x += e.vx * dt;
                    e.y += e.vy * dt;

                    // Bounds wrapping
                    if (e.x < 0) e.x += w;
                    if (e.x > w) e.x -= w;
                    if (e.y < 0) e.y += h;
                    if (e.y > h) e.y -= h;
                }
            }

            if (remove) {
                // Swap and pop
                this.entities[i] = this.entities[this.entities.length - 1];
                this.entities.pop();
                i--; // Re-evaluate this index
            }
        }

        // Update UI every few frames
        if (Math.random() < 0.1) {
            document.getElementById('eco-plants').innerText = this.stats.plants;
            document.getElementById('eco-herbs').innerText = this.stats.herbivores;
            document.getElementById('eco-carns').innerText = this.stats.carnivores;
        }

        // Complete Extinction safeguard
        if (this.stats.plants === 0 && this.stats.herbivores === 0 && this.stats.carnivores === 0 && this.entities.length === 0) {
            this.seedWorld();
        }
    }

    updateAnimalLogic(animal, dt, foodType, predatorType, viewDist, fleeDist, baseSpeed) {
        // Use squared distances to avoid Math.sqrt in hot loop
        const viewDistSq = viewDist * viewDist;
        const fleeDistSq = fleeDist * fleeDist;

        let nearestFood = null;
        let minDistSq = viewDistSq;

        let nearestPredator = null;
        let minPredatorDistSq = fleeDistSq;

        const neighbors = this.getNearbyEntities(animal.x, animal.y, Math.max(viewDist, fleeDist));

        for (let i = 0; i < neighbors.length; i++) {
            const other = neighbors[i];
            if (other.id === animal.id) continue;

            // Handle Toroidal distance (wrapping)
            let dx = other.x - animal.x;
            let dy = other.y - animal.y;

            const halfW = this.canvas.width / 2;
            const halfH = this.canvas.height / 2;
            if (dx > halfW) dx -= this.canvas.width;
            else if (dx < -halfW) dx += this.canvas.width;
            if (dy > halfH) dy -= this.canvas.height;
            else if (dy < -halfH) dy += this.canvas.height;

            const distSq = dx*dx + dy*dy;

            if (other.type === foodType && distSq < minDistSq) {
                minDistSq = distSq;
                nearestFood = { dx, dy, distSq, entity: other };
            }

            if (predatorType && other.type === predatorType && distSq < minPredatorDistSq) {
                minPredatorDistSq = distSq;
                nearestPredator = { dx, dy, distSq };
            }
        }

        // Action prioritization
        if (nearestPredator) {
            animal.state = 'flee';
            // Flee vector (normalized)
            const dist = Math.sqrt(nearestPredator.distSq);
            animal.vx -= (nearestPredator.dx / dist) * baseSpeed * 1.5 * dt;
            animal.vy -= (nearestPredator.dy / dist) * baseSpeed * 1.5 * dt;
            animal.energy -= dt * 5; // Running costs energy
        } else if (nearestFood && animal.energy < 80) {
            animal.state = 'seek';
            const dist = Math.sqrt(nearestFood.distSq);

            // Eat logic
            if (dist < animal.radius + nearestFood.entity.radius) {
                nearestFood.entity.energy = 0; // kill it
                animal.energy = Math.min(100, animal.energy + (foodType === 'plant' ? 30 : 50));
            } else {
                // Seek vector
                animal.vx += (nearestFood.dx / dist) * baseSpeed * dt;
                animal.vy += (nearestFood.dy / dist) * baseSpeed * dt;
            }
        } else {
            animal.state = 'idle';
            // Random wander
            animal.vx += (Math.random() - 0.5) * baseSpeed * dt;
            animal.vy += (Math.random() - 0.5) * baseSpeed * dt;

            // Reproduction (if well fed and not busy)
            if (animal.energy > 80 && animal.reproduceTimer > 5 && this.entities.length < 1000) {
                animal.energy -= 40;
                animal.reproduceTimer = 0;
                this.spawnEntity(animal.type, animal.x, animal.y);
            }
        }
    }

    draw() {
        if (!this.ctx) return;

        // Draw Base Terrain (Night/Day cycle)
        // 0 = Midnight, 0.5 = Noon
        const timeOffset = Math.abs(this.timeOfDay - 0.5) * 2; // 0 at noon, 1 at midnight
        const r = Math.floor(20 - timeOffset * 15);
        const g = Math.floor(30 - timeOffset * 20);
        const b = Math.floor(40 - timeOffset * 10);
        this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Rendering optimization: Batch by type to avoid changing fillStyle constantly
        const plants = [];
        const herbs = [];
        const carns = [];

        for (let i = 0; i < this.entities.length; i++) {
            const e = this.entities[i];
            if (e.type === 'plant') plants.push(e);
            else if (e.type === 'herbivore') herbs.push(e);
            else if (e.type === 'carnivore') carns.push(e);
        }

        // Draw Plants
        this.ctx.fillStyle = '#4ade80'; // Green
        this.ctx.beginPath();
        for (let i = 0; i < plants.length; i++) {
            const p = plants[i];
            // Integer coordinates for perf
            this.ctx.rect((p.x - p.radius) | 0, (p.y - p.radius) | 0, p.radius*2, p.radius*2);
        }
        this.ctx.fill();

        // Draw Herbivores
        this.ctx.fillStyle = '#60a5fa'; // Blue
        this.ctx.beginPath();
        for (let i = 0; i < herbs.length; i++) {
            const p = herbs[i];
            this.ctx.rect((p.x - p.radius) | 0, (p.y - p.radius) | 0, p.radius*2, p.radius*2);
        }
        this.ctx.fill();

        // Draw Carnivores
        this.ctx.fillStyle = '#f87171'; // Red
        this.ctx.beginPath();
        for (let i = 0; i < carns.length; i++) {
            const p = carns[i];
            this.ctx.rect((p.x - p.radius) | 0, (p.y - p.radius) | 0, p.radius*2, p.radius*2);
        }
        this.ctx.fill();

        // Draw Light Overlay for night
        if (timeOffset > 0.5) {
             this.ctx.fillStyle = `rgba(0,0,10, ${(timeOffset - 0.5) * 0.8})`;
             this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    resize() {
        if (!this.canvas || !this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    async shutdown() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.boundResize);
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
