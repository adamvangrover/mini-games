export default class WhaleScannerGame {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.lastTime = 0;
        this.animationFrameId = null;
        this.boundGameLoop = this.gameLoop.bind(this);

        // Game State
        this.timeRemaining = 60; // seconds
        this.processingPower = 100; // total available
        this.usedPower = 0;
        this.nodes = [];
        this.agents = [];
        this.score = 0;
        this.gameTime = 0;
        this.catalystsFound = 0;

        // Settings
        this.maxNodes = 20;
    }

    init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = 'game-container flex flex-col bg-black text-green-500 font-mono relative overflow-hidden';

        // Add Back Button
        const backBtn = document.createElement('button');
        backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> DISCONNECT';
        backBtn.className = "absolute top-4 left-4 px-4 py-1 bg-black text-green-500 font-bold border border-green-500 hover:bg-green-500 hover:text-black transition-colors z-50 uppercase text-xs tracking-widest";
        backBtn.onclick = () => window.miniGameHub.goBack();
        this.container.appendChild(backBtn);

        // Header
        const header = document.createElement('div');
        header.className = "absolute top-4 right-4 text-right z-50 pointer-events-none";
        header.innerHTML = `
            <h1 class="text-xl font-bold tracking-widest uppercase glitch-text" data-text="WHALESCANNER">WHALESCANNER</h1>
            <p class="text-xs opacity-70">PROTOCOL v2.1.4</p>
        `;
        this.container.appendChild(header);

        // Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'absolute inset-0 w-full h-full block';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
        this.handleResize();

        // Setup UI
        this.setupUI();

        // Initial setup
        this.generateNodes();

        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }

    setupUI() {
        this.uiLayer = document.createElement('div');
        this.uiLayer.className = "absolute bottom-0 left-0 w-full p-4 flex justify-between items-end z-50 pointer-events-none";
        this.uiLayer.innerHTML = `
            <div class="flex flex-col gap-2">
                <div class="text-xs uppercase opacity-70">System Status</div>
                <div class="text-lg">PWR: <span id="ws-power">100</span>%</div>
                <div class="text-lg">TIME: <span id="ws-time">60.0</span>s</div>
            </div>
            <div class="flex flex-col gap-2 text-right">
                <div class="text-xs uppercase opacity-70">Analysis</div>
                <div class="text-lg">CATALYSTS: <span id="ws-score">0</span></div>
            </div>
        `;
        this.container.appendChild(this.uiLayer);

        // Click to deploy agent
        this.canvas.addEventListener('click', (e) => {
            if (this.usedPower >= this.processingPower) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            this.deployAgent(x, y);
        });
    }

    generateNodes() {
        this.nodes = [];
        for (let i = 0; i < this.maxNodes; i++) {
            this.nodes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                size: Math.random() * 3 + 2,
                type: Math.random() > 0.8 ? 'catalyst' : 'noise',
                analyzed: false,
                dataValue: Math.random() * 100
            });
        }
    }

    deployAgent(x, y) {
        if (this.usedPower + 10 > this.processingPower) return;

        this.usedPower += 10;
        this.agents.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: 150,
            life: 2.0,
            maxLife: 2.0
        });

        this.updateHUD();
    }

    updateHUD() {
        const powerEl = document.getElementById('ws-power');
        const timeEl = document.getElementById('ws-time');
        const scoreEl = document.getElementById('ws-score');

        if (powerEl) powerEl.textContent = Math.max(0, this.processingPower - this.usedPower).toFixed(0);
        if (timeEl) timeEl.textContent = Math.max(0, this.timeRemaining).toFixed(1);
        if (scoreEl) scoreEl.textContent = this.catalystsFound;
    }

    handleResize() {
        if (!this.canvas || !this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    update(dt) {
        this.gameTime += dt;
        this.timeRemaining -= dt;

        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            // Game over logic could go here
        }

        // Update nodes
        for (let i = 0; i < this.nodes.length; i++) {
            let node = this.nodes[i];
            node.x += node.vx * dt;
            node.y += node.vy * dt;

            // Bounce off edges
            if (node.x < 0 || node.x > this.canvas.width) node.vx *= -1;
            if (node.y < 0 || node.y > this.canvas.height) node.vy *= -1;

            node.x = Math.max(0, Math.min(this.canvas.width, node.x));
            node.y = Math.max(0, Math.min(this.canvas.height, node.y));
        }

        // Update agents
        for (let i = this.agents.length - 1; i >= 0; i--) {
            let agent = this.agents[i];
            agent.life -= dt;

            // Expand scan radius
            agent.radius += (agent.maxRadius - agent.radius) * 5 * dt;

            // Check collisions with nodes
            for (let j = 0; j < this.nodes.length; j++) {
                let node = this.nodes[j];
                if (node.analyzed) continue;

                let dx = node.x - agent.x;
                let dy = node.y - agent.y;
                let distSq = dx * dx + dy * dy;

                if (distSq < agent.radius * agent.radius) {
                    node.analyzed = true;
                    if (node.type === 'catalyst') {
                        this.catalystsFound++;
                    }
                }
            }

            if (agent.life <= 0) {
                this.usedPower -= 10;
                this.agents.splice(i, 1);
            }
        }

        // Regenerate nodes occasionally
        if (this.nodes.length < this.maxNodes && Math.random() < 0.05) {
            this.nodes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                size: Math.random() * 3 + 2,
                type: Math.random() > 0.8 ? 'catalyst' : 'noise',
                analyzed: false,
                dataValue: Math.random() * 100
            });
        }

        // Update HUD periodically to prevent thrashing
        if (Math.floor(this.gameTime * 10) % 2 === 0) {
            this.updateHUD();
        }
    }

    draw() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw connections
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                let dx = this.nodes[i].x - this.nodes[j].x;
                let dy = this.nodes[i].y - this.nodes[j].y;
                let distSq = dx * dx + dy * dy;

                if (distSq < 15000) {
                    this.ctx.moveTo(this.nodes[i].x | 0, this.nodes[i].y | 0);
                    this.ctx.lineTo(this.nodes[j].x | 0, this.nodes[j].y | 0);
                }
            }
        }
        this.ctx.stroke();

        // Draw nodes
        for (let i = 0; i < this.nodes.length; i++) {
            let node = this.nodes[i];

            if (node.analyzed) {
                if (node.type === 'catalyst') {
                    this.ctx.fillStyle = '#ff00ff'; // Fuchsia for found catalysts
                    this.ctx.shadowColor = '#ff00ff';
                    this.ctx.shadowBlur = 10;
                } else {
                    this.ctx.fillStyle = '#555555'; // Grey for noise
                    this.ctx.shadowBlur = 0;
                }
            } else {
                this.ctx.fillStyle = '#00ff00'; // Green for unanalyzed
                this.ctx.shadowColor = '#00ff00';
                this.ctx.shadowBlur = 5;
            }

            this.ctx.beginPath();
            this.ctx.arc(node.x | 0, node.y | 0, node.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0; // reset
        }

        // Draw agents
        for (let i = 0; i < this.agents.length; i++) {
            let agent = this.agents[i];

            this.ctx.strokeStyle = `rgba(0, 255, 255, ${agent.life / agent.maxLife})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(agent.x | 0, agent.y | 0, agent.radius | 0, 0, Math.PI * 2);
            this.ctx.stroke();

            // Inner core
            this.ctx.fillStyle = `rgba(0, 255, 255, ${agent.life / agent.maxLife * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(agent.x | 0, agent.y | 0, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Glitch effect occasionally
        if (Math.random() < 0.02) {
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.05)';
            this.ctx.fillRect(
                0,
                Math.random() * this.canvas.height,
                this.canvas.width,
                Math.random() * 50 + 10
            );
        }
    }

    gameLoop(currentTime) {
        if (!this.isRunning) return;

        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(dt);
        this.draw();

        this.animationFrameId = requestAnimationFrame(this.boundGameLoop);
    }

    cleanup() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        window.removeEventListener('resize', this.handleResize);
        if (this.container) {
            this.container.innerHTML = '';
            this.container.className = 'game-container hidden';
        }
    }
}
