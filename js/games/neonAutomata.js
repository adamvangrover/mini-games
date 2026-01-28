import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class NeonAutomata {
    constructor() {
        // Core State
        this.data = 0;
        this.agents = [];
        this.nodes = []; // Data nodes to collect
        this.upgrades = {
            speed: 1,
            count: 1,
            efficiency: 1
        };

        // System
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();

        // Canvas
        this.canvas = null;
        this.ctx = null;
        this.rafId = null;
        this.lastTime = 0;

        // Config
        this.baseSpeed = 100;
        this.nodeSpawnRate = 0.5; // seconds
        this.nodeSpawnTimer = 0;
    }

    async init(container) {
        this.container = container;
        this.loadProgress();
        this.setupUI();
        this.resize();

        this.resizeHandler = () => this.resize();
        window.addEventListener('resize', this.resizeHandler);

        this.lastTime = performance.now();
        this.loop();
    }

    loadProgress() {
        const saved = this.saveSystem.getGameConfig('neon-automata');
        if (saved) {
            this.data = saved.data || 0;
            this.upgrades = saved.upgrades || { speed: 1, count: 1, efficiency: 1 };
        }
        this.resetSimulation();
    }

    saveProgress() {
        this.saveSystem.setGameConfig('neon-automata', {
            data: this.data,
            upgrades: this.upgrades
        });
    }

    resetSimulation() {
        this.agents = [];
        for(let i=0; i<this.upgrades.count; i++) {
            this.spawnAgent();
        }
        // Keep existing nodes or clear? Let's keep them so it feels persistent
        if (this.nodes.length === 0) {
             for(let i=0; i<5; i++) this.spawnNode();
        }
    }

    spawnAgent() {
        this.agents.push({
            x: Math.random() * (this.canvas ? this.canvas.width : 500),
            y: Math.random() * (this.canvas ? this.canvas.height : 500),
            vx: (Math.random() - 0.5) * 50,
            vy: (Math.random() - 0.5) * 50,
            target: null,
            state: 'idle', // idle, moving, collecting
            color: `hsl(${Math.random()*60 + 180}, 100%, 50%)`
        });
    }

    spawnNode() {
        if (!this.canvas) return;
        const margin = 50;
        this.nodes.push({
            x: margin + Math.random() * (this.canvas.width - margin*2),
            y: margin + Math.random() * (this.canvas.height - margin*2),
            value: 10 * this.upgrades.efficiency,
            radius: 0, // Animates in
            maxRadius: 5 + Math.random() * 5
        });
    }

    setupUI() {
        this.container.innerHTML = `
            <div class="relative w-full h-full bg-[#050510] text-cyan-400 font-mono flex flex-col overflow-hidden select-none">
                <!-- Header -->
                <div class="flex justify-between items-center p-4 border-b border-cyan-900 bg-black/50 backdrop-blur z-10">
                    <div>
                        <h1 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 shadow-cyan-500/50 drop-shadow-md">NEON AUTOMATA</h1>
                        <div class="text-xs text-gray-400">AI Training Simulation v1.0</div>
                    </div>
                    <div class="text-right">
                        <div class="text-3xl font-bold font-mono" id="automata-data">0</div>
                        <div class="text-xs text-cyan-600">DATABYTES COLLECTED</div>
                    </div>
                </div>

                <!-- Game Area -->
                <div class="flex-1 relative">
                    <canvas id="automata-canvas" class="absolute inset-0 block"></canvas>

                    <!-- Upgrade Panel -->
                    <div class="absolute bottom-4 left-4 right-4 flex gap-4 justify-center pointer-events-none">
                        <div class="pointer-events-auto bg-black/80 border border-cyan-800 p-2 rounded-xl flex gap-4 backdrop-blur shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                            ${this.renderButton('add-agent', 'fa-robot', 'Add Agent', 'count')}
                            ${this.renderButton('speed-up', 'fa-bolt', 'Overclock', 'speed')}
                            ${this.renderButton('efficiency', 'fa-microchip', 'Optimize', 'efficiency')}
                        </div>
                    </div>
                </div>

                <!-- Back Button -->
                <button class="absolute top-24 left-4 z-20 bg-red-900/50 hover:bg-red-900/80 text-white px-3 py-1 rounded text-xs border border-red-700 back-btn transition-colors">
                    <i class="fas fa-arrow-left"></i> Exit
                </button>
            </div>
        `;

        this.canvas = this.container.querySelector('#automata-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.container.querySelector('.back-btn').onclick = () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        };

        this.bindUpgrades();
        this.updateUI();
    }

    renderButton(id, icon, label, type) {
        return `
            <button id="${id}" class="flex flex-col items-center p-3 rounded-lg hover:bg-cyan-900/50 transition-all group disabled:opacity-30 disabled:cursor-not-allowed w-28 border border-transparent hover:border-cyan-500/30">
                <i class="fas ${icon} text-xl mb-1 group-hover:scale-110 transition-transform text-cyan-400"></i>
                <span class="text-[10px] uppercase font-bold text-gray-300">${label}</span>
                <span class="text-xs text-yellow-400 font-mono mt-1" id="cost-${type}">---</span>
                <div class="text-[9px] text-cyan-600">Lvl <span id="lvl-${type}">1</span></div>
            </button>
        `;
    }

    bindUpgrades() {
        const bind = (id, type) => {
            const btn = this.container.querySelector(`#${id}`);
            if (btn) btn.onclick = () => this.buyUpgrade(type);
        };
        bind('add-agent', 'count');
        bind('speed-up', 'speed');
        bind('efficiency', 'efficiency');
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
    }

    shutdown() {
        if (this.rafId) cancelAnimationFrame(this.rafId);
        window.removeEventListener('resize', this.resizeHandler);
        this.saveProgress();
    }

    // --- Logic ---

    getCost(type) {
        const base = { count: 100, speed: 150, efficiency: 200 };
        const growth = { count: 1.5, speed: 1.6, efficiency: 1.8 };
        return Math.floor(base[type] * Math.pow(growth[type], this.upgrades[type] - 1));
    }

    buyUpgrade(type) {
        const cost = this.getCost(type);
        if (this.data >= cost) {
            this.data -= cost;
            this.upgrades[type]++;
            this.soundManager.playSound('click');

            if (type === 'count') this.spawnAgent();

            this.saveProgress();
            this.updateUI();
        } else {
            this.soundManager.playTone(200, 'square', 0.1); // Error sound
        }
    }

    updateUI() {
        if(!this.container) return;

        // Update Data Display
        const el = this.container.querySelector('#automata-data');
        if(el) el.textContent = Math.floor(this.data).toLocaleString();

        // Update Buttons
        const updateBtn = (type, btnId) => {
            const cost = this.getCost(type);
            const btn = this.container.querySelector(`#${btnId}`);
            const costEl = this.container.querySelector(`#cost-${type}`);
            const lvlEl = this.container.querySelector(`#lvl-${type}`);

            if(costEl) costEl.textContent = cost.toLocaleString() + ' DB';
            if(lvlEl) lvlEl.textContent = this.upgrades[type];

            if(btn) {
                btn.disabled = this.data < cost;
                if(this.data < cost) btn.classList.add('grayscale');
                else btn.classList.remove('grayscale');
            }
        };

        updateBtn('count', 'add-agent');
        updateBtn('speed', 'speed-up');
        updateBtn('efficiency', 'efficiency');
    }

    loop() {
        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        this.update(dt);
        this.draw();

        this.rafId = requestAnimationFrame(() => this.loop());
    }

    update(dt) {
        if (!this.canvas) return;

        // Spawn Nodes
        this.nodeSpawnTimer += dt;
        if (this.nodeSpawnTimer > this.nodeSpawnRate) {
            if (this.nodes.length < 20) this.spawnNode();
            this.nodeSpawnTimer = 0;
        }

        // Update Nodes (Animation)
        this.nodes.forEach(n => {
            if(n.radius < n.maxRadius) n.radius += dt * 10;
        });

        // Update Agents
        this.agents.forEach(agent => {
            // Logic: Find nearest node
            let target = null;
            let minDist = Infinity;

            this.nodes.forEach(node => {
                const dx = node.x - agent.x;
                const dy = node.y - agent.y;
                const d = Math.sqrt(dx*dx + dy*dy);
                if(d < minDist) {
                    minDist = d;
                    target = node;
                }
            });

            const speed = this.baseSpeed * (1 + (this.upgrades.speed - 1) * 0.2);

            if (target) {
                // Move towards target
                const dx = target.x - agent.x;
                const dy = target.y - agent.y;
                const angle = Math.atan2(dy, dx);

                agent.vx = Math.cos(angle) * speed;
                agent.vy = Math.sin(angle) * speed;

                // Collect
                if (minDist < target.radius + 5) {
                    this.collectNode(target);
                    // Flash effect
                    agent.radius = 10;
                }
            } else {
                // Wander
                agent.vx += (Math.random() - 0.5) * 10;
                agent.vy += (Math.random() - 0.5) * 10;
                // Clamp speed
                const mag = Math.sqrt(agent.vx*agent.vx + agent.vy*agent.vy);
                if(mag > speed) {
                    agent.vx = (agent.vx/mag) * speed;
                    agent.vy = (agent.vy/mag) * speed;
                }
            }

            agent.x += agent.vx * dt;
            agent.y += agent.vy * dt;

            // Bounds
            if(agent.x < 0) agent.x = this.canvas.width;
            if(agent.x > this.canvas.width) agent.x = 0;
            if(agent.y < 0) agent.y = this.canvas.height;
            if(agent.y > this.canvas.height) agent.y = 0;

            if(agent.radius > 3) agent.radius -= dt * 20; // restore size
            else agent.radius = 3;
        });
    }

    collectNode(node) {
        const idx = this.nodes.indexOf(node);
        if(idx > -1) {
            this.nodes.splice(idx, 1);
            const amount = node.value * (1 + (this.upgrades.efficiency-1)*0.5);
            this.data += amount;
            this.updateUI(); // Ideally debounce this for performance, but fine for now
            this.soundManager.playTone(400 + Math.random()*200, 'sine', 0.05);
        }
    }

    draw() {
        if (!this.ctx || !this.canvas) return;

        // Trail effect
        this.ctx.fillStyle = 'rgba(5, 5, 16, 0.2)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid Lines (Subtle)
        this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
        this.ctx.lineWidth = 1;
        const gridSize = 50;
        // Optimization: Only draw if needed or static bg
        // For simplicity, drawing every frame but could be optimized
        /*
        this.ctx.beginPath();
        for(let x=0; x<this.canvas.width; x+=gridSize) { this.ctx.moveTo(x,0); this.ctx.lineTo(x,this.canvas.height); }
        for(let y=0; y<this.canvas.height; y+=gridSize) { this.ctx.moveTo(0,y); this.ctx.lineTo(this.canvas.width,y); }
        this.ctx.stroke();
        */

        // Draw Nodes
        this.nodes.forEach(node => {
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'cyan';
            this.ctx.stroke();
        });

        // Draw Agents
        this.agents.forEach(agent => {
            this.ctx.beginPath();
            this.ctx.arc(agent.x, agent.y, agent.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = agent.color;
            this.ctx.fill();
            this.ctx.shadowColor = agent.color;
            this.ctx.shadowBlur = 10;
        });
        this.ctx.shadowBlur = 0;
    }
}
