import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';

export default class CyberHacking {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.input = InputManager.getInstance();
        this.boundResize = this.resize.bind(this);
        this.boundLoop = this.loop.bind(this);
        this.lastTime = 0;

        // Hex Grid State
        this.hexRadius = 40;
        this.gridWidth = 7;
        this.gridHeight = 5;
        this.nodes = [];
        this.offsetX = 0;
        this.offsetY = 0;

        // Game State
        this.timeLeft = 60;
        this.isGameOver = false;
        this.glitchIntensity = 0;
    }

    async init(container) {
        this.container = container;

        this.container.innerHTML = `
            <div class="relative w-full h-full bg-slate-900 overflow-hidden font-mono select-none" id="cyberHacking-ui">
                <canvas id="cyberHacking-canvas" class="absolute inset-0 block"></canvas>

                <div class="absolute top-0 left-0 w-full p-4 flex justify-between text-green-500 z-10 pointer-events-none text-xl font-bold tracking-widest drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]">
                    <div>TRACE ROUTE: <span id="ch-status">ACTIVE</span></div>
                    <div>TIME: <span id="ch-time">60.00</span>s</div>
                </div>

                <!-- CRT Overlay -->
                <div class="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50 z-20 mix-blend-overlay"></div>

                <button class="back-btn absolute bottom-4 right-4 px-4 py-2 bg-red-900 hover:bg-red-700 text-red-100 rounded font-bold z-30 transition-colors pointer-events-auto border border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]">ABORT</button>
            </div>
        `;

        this.canvas = this.container.querySelector('#cyberHacking-canvas');
        this.ctx = this.canvas.getContext('2d');

        window.addEventListener('resize', this.boundResize);
        this.resize();

        this.generateGrid();

        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    generateGrid() {
        this.nodes = [];
        for (let q = 0; q < this.gridWidth; q++) {
            for (let r = 0; r < this.gridHeight; r++) {
                // Offset coordinates to pixel coordinates
                const x = this.hexRadius * (3/2 * q);
                const y = this.hexRadius * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);

                // Random connections (0-5 representing the 6 sides of a hex)
                const connections = [];
                const numConnections = Math.floor(Math.random() * 3) + 1; // 1 to 3 connections
                while(connections.length < numConnections) {
                    const dir = Math.floor(Math.random() * 6);
                    if (!connections.includes(dir)) connections.push(dir);
                }

                this.nodes.push({ q, r, x, y, connections, rotation: 0, isPowered: false, isTarget: (q === this.gridWidth-1 && r === this.gridHeight-1), isSource: (q===0 && r===0) });
            }
        }

        // Ensure source is powered
        const source = this.nodes.find(n => n.isSource);
        if (source) source.isPowered = true;
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
        if (this.isGameOver) return;

        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.gameOver(false);
        }

        document.getElementById('ch-time').innerText = this.timeLeft.toFixed(2);

        // Increase glitch as time runs out
        this.glitchIntensity = Math.max(0, (15 - this.timeLeft) / 15);

        // Handle Clicks
        if (this.input.mouse.down && !this.wasMouseDown) {
            const mx = this.input.mouse.x;
            const my = this.input.mouse.y;

            // Adjust for canvas scale and offset
            const rect = this.canvas.getBoundingClientRect();
            const px = (mx - rect.left) - this.offsetX;
            const py = (my - rect.top) - this.offsetY;

            this.handleNodeClick(px, py);
        }
        this.wasMouseDown = this.input.mouse.down;
    }

    handleNodeClick(px, py) {
        for (const node of this.nodes) {
            // Simple bounding box check first, then distance
            if (Math.abs(px - node.x) < this.hexRadius && Math.abs(py - node.y) < this.hexRadius) {
                const distSq = (px - node.x) * (px - node.x) + (py - node.y) * (py - node.y);
                if (distSq <= this.hexRadius * this.hexRadius) {
                    node.rotation = (node.rotation + 1) % 6;
                    this.soundManager.playSound('hover');
                    this.evaluatePower();
                    break;
                }
            }
        }
    }

    evaluatePower() {
        // Reset all
        for (const n of this.nodes) n.isPowered = false;

        const source = this.nodes.find(n => n.isSource);
        if (!source) return;

        source.isPowered = true;

        const queue = [source];
        const visited = new Set();
        visited.add(source);

        let targetPowered = false;

        while (queue.length > 0) {
            const current = queue.shift();

            // Get actual world directions current node connects to
            const activeDirs = current.connections.map(c => (c + current.rotation) % 6);

            // Directions array for Hex Q/R coordinates (Flat topped)
            // 0: Right, 1: Bottom Right, 2: Bottom Left, 3: Left, 4: Top Left, 5: Top Right
            // Need to match visual connections to coordinate neighbors
            // Based on earlier rendering: 0 is Right.
            const hexDirs = [
                {dq: 1, dr: 0},     // 0: Right
                {dq: 0, dr: 1},     // 1: Bottom Right
                {dq: -1, dr: 1},    // 2: Bottom Left
                {dq: -1, dr: 0},    // 3: Left
                {dq: 0, dr: -1},    // 4: Top Left
                {dq: 1, dr: -1}     // 5: Top Right
            ];

            for (const dir of activeDirs) {
                const vec = hexDirs[dir];
                const nq = current.q + vec.dq;
                const nr = current.r + vec.dr;

                const neighbor = this.nodes.find(n => n.q === nq && n.r === nr);

                if (neighbor && !visited.has(neighbor)) {
                    // Check if neighbor connects back
                    const oppositeDir = (dir + 3) % 6;
                    const neighborActiveDirs = neighbor.connections.map(c => (c + neighbor.rotation) % 6);

                    if (neighborActiveDirs.includes(oppositeDir)) {
                        neighbor.isPowered = true;
                        visited.add(neighbor);
                        queue.push(neighbor);

                        if (neighbor.isTarget) targetPowered = true;
                    }
                }
            }
        }

        if (targetPowered) {
            this.gameOver(true);
        }
    }

    draw() {
        if (!this.ctx) return;

        this.ctx.fillStyle = '#020617'; // slate-950
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();

        // Apply Glitch offset
        if (this.glitchIntensity > 0 && Math.random() < this.glitchIntensity * 0.5) {
            this.ctx.translate((Math.random() - 0.5) * 10 * this.glitchIntensity, 0);
            this.ctx.globalCompositeOperation = 'difference';
        }

        this.ctx.translate(this.offsetX, this.offsetY);

        for (const node of this.nodes) {
            this.drawHexNode(node);
        }

        this.ctx.restore();
    }

    drawHexNode(node) {
        const x = node.x;
        const y = node.y;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(node.rotation * (Math.PI / 3));

        // Base Hexagon
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle_deg = 60 * i - 30;
            const angle_rad = Math.PI / 180 * angle_deg;
            const hx = this.hexRadius * Math.cos(angle_rad);
            const hy = this.hexRadius * Math.sin(angle_rad);
            if (i === 0) this.ctx.moveTo(hx, hy);
            else this.ctx.lineTo(hx, hy);
        }
        this.ctx.closePath();

        this.ctx.fillStyle = node.isSource ? 'rgba(34, 197, 94, 0.2)' : (node.isTarget ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.5)');
        this.ctx.fill();
        this.ctx.strokeStyle = node.isPowered ? '#22c55e' : '#334155';
        this.ctx.lineWidth = node.isPowered ? 3 : 1;
        this.ctx.stroke();

        // Draw Connections
        this.ctx.strokeStyle = node.isPowered ? '#4ade80' : '#64748b';
        this.ctx.lineWidth = node.isPowered ? 4 : 2;
        this.ctx.lineCap = 'round';

        for (const dir of node.connections) {
            const angle_deg = 60 * dir - 30; // point to flat edge center
            // Need center of edge
            const angle_rad = Math.PI / 180 * (angle_deg + 30);
            const ex = (this.hexRadius * 0.8) * Math.cos(angle_rad);
            const ey = (this.hexRadius * 0.8) * Math.sin(angle_rad);

            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(ex, ey);
            this.ctx.stroke();
        }

        // Center dot
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 5, 0, Math.PI*2);
        this.ctx.fillStyle = node.isPowered ? '#86efac' : '#94a3b8';
        this.ctx.fill();

        this.ctx.restore();
    }

    resize() {
        if (!this.canvas || !this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        // Center the grid
        const gridPixelWidth = this.hexRadius * (3/2 * (this.gridWidth - 1));
        const gridPixelHeight = this.hexRadius * Math.sqrt(3) * (this.gridHeight - 0.5); // approx

        this.offsetX = (this.canvas.width - gridPixelWidth) / 2;
        this.offsetY = (this.canvas.height - gridPixelHeight) / 2;
    }

    gameOver(win) {
        this.isGameOver = true;
        const statusEl = document.getElementById('ch-status');
        if (win) {
            statusEl.innerText = 'ACCESS GRANTED';
            statusEl.style.color = '#4ade80';
            this.soundManager.playSound('score');
        } else {
            statusEl.innerText = 'TRACE COMPLETE. SYSTEM LOCKED.';
            statusEl.style.color = '#ef4444';
            this.soundManager.playSound('explosion');
        }
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
