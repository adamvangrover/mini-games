import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class WhaleScannerGame {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.lastTime = 0;
        this.animationFrameId = null;
        this.boundGameLoop = this.gameLoop.bind(this);

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();

        // Game State
        this.timeRemaining = 120; // seconds for operation
        this.maxHeat = 100;
        this.currentHeat = 0;
        this.heatDissipationRate = 2; // Heat lost per second
        this.score = 0;
        this.gameTime = 0;
        this.catalystsFound = 0;
        this.targetCatalysts = 5;
        this.gameState = 'PLAYING'; // PLAYING, WON, LOST

        // Entites
        this.nodes = [];
        this.agents = [];
        this.maxNodes = 25;

        // Visual effects
        this.glitchIntensity = 0;
        this.terminalLines = [
            "INITIATING OPERATION ABSOLUTE RESOLVE",
            "CONNECTING TO EDGAR MAINFRAME...",
            "BYPASSING PROXY LAYERS...",
            "NODE NETWORK ESTABLISHED."
        ];
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = 'game-container flex flex-col bg-black text-green-500 font-mono relative overflow-hidden';

        // Add Back Button
        const backBtn = document.createElement('button');
        backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> DISCONNECT';
        backBtn.className = "absolute top-4 left-4 px-4 py-1 bg-black text-green-500 font-bold border border-green-500 hover:bg-green-500 hover:text-black transition-colors z-50 uppercase text-xs tracking-widest";
        backBtn.onclick = () => {
             this.soundManager.playSound('click');
             window.miniGameHub.goBack();
        };
        this.container.appendChild(backBtn);

        // Header
        const header = document.createElement('div');
        header.className = "absolute top-4 right-4 text-right z-50 pointer-events-none";
        header.innerHTML = `
            <h1 class="text-xl font-bold tracking-widest uppercase glitch-text" data-text="OPERATION ABSOLUTE RESOLVE" style="text-shadow: 2px 0 red, -2px 0 cyan;">OPERATION ABSOLUTE RESOLVE</h1>
            <p class="text-xs opacity-70 text-cyan-400">WHALESCANNER PROTOCOL v3.0</p>
        `;
        this.container.appendChild(header);

        // Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'absolute inset-0 w-full h-full block';
        // Add a slight CRT curvature via CSS
        this.canvas.style.transform = 'scale(1.02)';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        // Bind handleResize to this context before adding listener
        this.handleResize = () => {
            if (!this.canvas || !this.container) return;
            const rect = this.container.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        };
        window.addEventListener('resize', this.handleResize);
        this.handleResize();

        // Setup UI
        this.setupUI();

        // Initial setup
        this.generateNodes();

        this.soundManager.setBGMVolume(0.5);

        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }

    setupUI() {
        this.uiLayer = document.createElement('div');
        this.uiLayer.className = "absolute bottom-0 left-0 w-full p-4 flex justify-between items-end z-40 pointer-events-none";

        this.uiLayer.innerHTML = `
            <div class="flex flex-col gap-2 w-1/3">
                <div class="text-xs uppercase text-cyan-400 font-bold">SYSTEM HEAT</div>
                <div class="w-full bg-gray-900 border border-green-500 h-4 relative">
                    <div id="ws-heat-bar" class="h-full bg-green-500 transition-all duration-200 w-0"></div>
                </div>
                <div class="text-xs text-red-500 hidden animate-pulse font-bold" id="ws-warning">WARNING: CRITICAL LOAD</div>
            </div>

            <div class="flex flex-col gap-1 text-center w-1/3">
                <div class="text-[10px] uppercase opacity-70">TIME TILL TRACE</div>
                <div class="text-2xl font-bold text-red-400" id="ws-time">120.00</div>
            </div>

            <div class="flex flex-col gap-1 text-right w-1/3">
                <div class="text-xs uppercase opacity-70">CATALYSTS EXTRACTED</div>
                <div class="text-2xl font-bold text-cyan-400"><span id="ws-score">0</span> / ${this.targetCatalysts}</div>
            </div>
        `;
        this.container.appendChild(this.uiLayer);

        // Terminal overlay
        this.terminalLayer = document.createElement('div');
        this.terminalLayer.className = "absolute top-20 left-4 w-64 h-48 overflow-hidden font-mono text-[10px] text-green-400 pointer-events-none opacity-80 z-40";
        this.terminalLayer.id = "ws-terminal";
        this.container.appendChild(this.terminalLayer);

        // Click to deploy agent
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState !== 'PLAYING') {
                 if (this.gameState === 'WON' || this.gameState === 'LOST') {
                      this.init(this.container); // restart
                 }
                 return;
            }

            const rect = this.canvas.getBoundingClientRect();
            // Adjust for CSS scaling if necessary
            const x = (e.clientX - rect.left) / 1.02;
            const y = (e.clientY - rect.top) / 1.02;

            this.deployAgent(x, y);
        });
    }

    logTerminal(msg) {
        this.terminalLines.push(`> ${msg}`);
        if(this.terminalLines.length > 12) this.terminalLines.shift();

        const term = document.getElementById('ws-terminal');
        if(term) {
            term.innerHTML = this.terminalLines.join('<br>');
        }
    }

    generateNodes() {
        this.nodes = [];
        for (let i = 0; i < this.maxNodes; i++) {

            // Determine type
            const rand = Math.random();
            let type = 'data';
            let secLevel = 1;

            if (rand > 0.9) {
                type = 'catalyst';
                secLevel = 3;
            } else if (rand > 0.75) {
                type = 'honeypot';
                secLevel = 2;
            } else if (rand > 0.5) {
                type = 'secure_data';
                secLevel = 2;
            }

            this.nodes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 30, // Faster movement
                vy: (Math.random() - 0.5) * 30,
                size: Math.random() * 4 + 3,
                type: type,
                securityLevel: secLevel, // 1 to 3
                analyzed: false,
                id: Math.floor(Math.random() * 10000).toString(16).padStart(4, '0').toUpperCase()
            });
        }
    }

    deployAgent(x, y) {
        // Deploying generates heat
        const deploymentHeat = 15;
        if (this.currentHeat + deploymentHeat > this.maxHeat) {
            this.logTerminal("ERR: SYSTEM OVERLOAD IMMINENT.");
            this.soundManager.playSound('error');
            this.glitchIntensity = 1.0;
            return; // Can't deploy
        }

        this.currentHeat += deploymentHeat;
        this.logTerminal(`AGENT DEPLOYED AT [${x|0}, ${y|0}]`);
        this.soundManager.playSound('shoot');

        this.agents.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: 120, // Scan range
            life: 1.5, // Dies faster
            maxLife: 1.5,
            power: 1 // Decryption power per tick
        });

        this.updateHUD();
    }

    updateHUD() {
        if(this.gameState !== 'PLAYING') return;

        const heatBar = document.getElementById('ws-heat-bar');
        const timeEl = document.getElementById('ws-time');
        const scoreEl = document.getElementById('ws-score');
        const warning = document.getElementById('ws-warning');

        if (heatBar) {
             const pct = (this.currentHeat / this.maxHeat) * 100;
             heatBar.style.width = `${pct}%`;

             // Color coding heat
             if (pct > 80) heatBar.className = "h-full transition-all duration-200 bg-red-500";
             else if (pct > 50) heatBar.className = "h-full transition-all duration-200 bg-yellow-500";
             else heatBar.className = "h-full transition-all duration-200 bg-green-500";
        }

        if (warning) {
             if (this.currentHeat > 85) warning.classList.remove('hidden');
             else warning.classList.add('hidden');
        }

        if (timeEl) timeEl.textContent = Math.max(0, this.timeRemaining).toFixed(2);
        if (scoreEl) scoreEl.textContent = this.catalystsFound;
    }

    endGame(won) {
        this.gameState = won ? 'WON' : 'LOST';
        this.logTerminal(won ? "OPERATION SUCCESS. DISCONNECTING." : "CRITICAL FAILURE. TRACE INITIATED.");
        if(won) this.soundManager.playSound('win');
        else this.soundManager.playSound('explosion'); // Or game over

        const overlay = document.createElement('div');
        overlay.className = "absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 pointer-events-none";

        if (won) {
            // Reward
            const reward = 50 + (Math.floor(this.timeRemaining) * 2);
            this.saveSystem.addCurrency(reward);

            overlay.innerHTML = `
                <h1 class="text-6xl font-bold text-cyan-400 mb-4 tracking-widest uppercase">DATA EXTRACTED</h1>
                <p class="text-xl text-green-500 mb-8">Bounty: +${reward} Coins</p>
                <p class="text-sm opacity-50 animate-pulse">Click anywhere to restart</p>
            `;
            if(!this.saveSystem.hasAchievement('master_hacker')) {
                 this.saveSystem.unlockAchievement('master_hacker');
                 window.miniGameHub.showToast("Achievement Unlocked: Master Hacker!");
            }
        } else {
            overlay.innerHTML = `
                <h1 class="text-6xl font-bold text-red-600 mb-4 tracking-widest uppercase glitch-text" data-text="SYSTEM COMPROMISED">SYSTEM COMPROMISED</h1>
                <p class="text-xl text-red-400 mb-8">${this.timeRemaining <= 0 ? "TRACE COMPLETED." : "THERMAL OVERLOAD."}</p>
                 <p class="text-sm opacity-50 animate-pulse">Click anywhere to restart</p>
            `;
        }

        this.container.appendChild(overlay);
    }

    update(dt) {
        if(this.gameState !== 'PLAYING') return;

        this.gameTime += dt;
        this.timeRemaining -= dt;

        // Heat Dissipation
        if (this.currentHeat > 0) {
            this.currentHeat -= this.heatDissipationRate * dt;
            if (this.currentHeat < 0) this.currentHeat = 0;
        }

        // Glitch decay
        if (this.glitchIntensity > 0) {
            this.glitchIntensity -= dt * 2;
            if(this.glitchIntensity < 0) this.glitchIntensity = 0;
        }

        // Check loss conditions
        if (this.timeRemaining <= 0) {
            this.timeRemaining = 0;
            this.endGame(false);
            return;
        }
        if (this.currentHeat >= this.maxHeat) {
            this.currentHeat = this.maxHeat;
            this.endGame(false);
            return;
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

        // Update agents & analyze
        for (let i = this.agents.length - 1; i >= 0; i--) {
            let agent = this.agents[i];
            agent.life -= dt;
            agent.radius += (agent.maxRadius - agent.radius) * 10 * dt;

            // Check collisions with nodes
            for (let j = 0; j < this.nodes.length; j++) {
                let node = this.nodes[j];
                if (node.analyzed) continue;

                let dx = node.x - agent.x;
                let dy = node.y - agent.y;
                let distSq = dx * dx + dy * dy;

                if (distSq < agent.radius * agent.radius) {
                    // Try to break security
                    node.securityLevel -= agent.power * dt * 10; // Agent power applied over time

                    if (node.securityLevel <= 0) {
                        node.analyzed = true;

                        // Handle result based on type
                        if (node.type === 'catalyst') {
                            this.catalystsFound++;
                            this.logTerminal(`CATALYST NODE ${node.id} DECRYPTED.`);
                            this.soundManager.playSound('score');
                            this.glitchIntensity = 0.5; // Brief flash

                            if (this.catalystsFound >= this.targetCatalysts) {
                                 this.endGame(true);
                                 return;
                            }
                        } else if (node.type === 'honeypot') {
                            // Massive heat spike
                            this.currentHeat += 30;
                            this.logTerminal(`WARNING: HONEYPOT ${node.id} TRIPPED!`);
                            this.soundManager.playSound('explosion'); // Harsh sound
                            this.glitchIntensity = 1.0;
                            node.vx *= 3; node.vy *= 3; // Make it freak out visually
                        } else {
                            // Normal data
                            this.currentHeat -= 5; // Cool down slightly on successful data parse
                            this.soundManager.playSound('hover');
                        }
                    }
                }
            }

            if (agent.life <= 0) {
                this.agents.splice(i, 1);
            }
        }

        // Regenerate nodes occasionally to keep board full
        if (this.nodes.length < this.maxNodes && Math.random() < 0.02) {
             const rand = Math.random();
             let type = 'data';
             let secLevel = 1;
             if (rand > 0.8) { type = 'honeypot'; secLevel = 2; }

            this.nodes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 30,
                vy: (Math.random() - 0.5) * 30,
                size: Math.random() * 4 + 3,
                type: type,
                securityLevel: secLevel,
                analyzed: false,
                id: Math.floor(Math.random() * 10000).toString(16).padStart(4, '0').toUpperCase()
            });
        }

        if (Math.floor(this.gameTime * 20) % 2 === 0) {
            this.updateHUD();
        }
    }

    draw() {
        // Base dark background
        this.ctx.fillStyle = '#050a0f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid background
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        const gridSize = 50;
        const offset = (this.gameTime * 10) % gridSize;
        for(let x=0; x<this.canvas.width; x+=gridSize) {
             this.ctx.moveTo(x, 0); this.ctx.lineTo(x, this.canvas.height);
        }
        for(let y=offset; y<this.canvas.height; y+=gridSize) {
             this.ctx.moveTo(0, y); this.ctx.lineTo(this.canvas.width, y);
        }
        this.ctx.stroke();

        // Draw connections between nodes based on proximity
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                let dx = this.nodes[i].x - this.nodes[j].x;
                let dy = this.nodes[i].y - this.nodes[j].y;
                let distSq = dx * dx + dy * dy;

                if (distSq < 20000) {
                    const alpha = 1 - (distSq / 20000);
                    // Line color depends on node state
                    if (this.nodes[i].analyzed && this.nodes[j].analyzed) {
                         this.ctx.strokeStyle = `rgba(100, 100, 100, ${alpha * 0.3})`;
                    } else if (this.nodes[i].type === 'honeypot' || this.nodes[j].type === 'honeypot') {
                         this.ctx.strokeStyle = `rgba(255, 0, 0, ${alpha * 0.2})`;
                    } else {
                         this.ctx.strokeStyle = `rgba(0, 255, 255, ${alpha * 0.2})`;
                    }
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.nodes[i].x | 0, this.nodes[i].y | 0);
                    this.ctx.lineTo(this.nodes[j].x | 0, this.nodes[j].y | 0);
                    this.ctx.stroke();
                }
            }
        }

        // Draw agents
        this.ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < this.agents.length; i++) {
            let agent = this.agents[i];
            const alpha = Math.max(0, agent.life / agent.maxLife);

            // Expanding ring
            this.ctx.strokeStyle = `rgba(0, 255, 150, ${alpha})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(agent.x | 0, agent.y | 0, agent.radius | 0, 0, Math.PI * 2);
            this.ctx.stroke();

            // Core
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            this.ctx.beginPath();
            this.ctx.arc(agent.x | 0, agent.y | 0, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalCompositeOperation = 'source-over';

        // Draw nodes
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'left';

        for (let i = 0; i < this.nodes.length; i++) {
            let node = this.nodes[i];

            // Determine colors and styles
            let fillColor = '#00ffcc'; // Default unanalyzed data
            let shadowColor = '#00ffcc';
            let shadowBlur = 5;
            let drawText = false;
            let textStr = '';
            let textColor = '';

            if (node.analyzed) {
                if (node.type === 'catalyst') {
                    fillColor = '#ffffff';
                    shadowColor = '#00ffff';
                    shadowBlur = 15;
                    drawText = true;
                    textStr = `[EXTRACTED]`;
                    textColor = '#00ffff';
                } else if (node.type === 'honeypot') {
                    fillColor = '#ff0000';
                    shadowColor = '#ff0000';
                    shadowBlur = 20;
                    drawText = true;
                    textStr = `[TRAP TRIPPED]`;
                    textColor = '#ff0000';
                } else {
                    fillColor = '#334444'; // Greyed out noise
                    shadowBlur = 0;
                }
            } else {
                // If under attack/decrypting
                if (node.securityLevel < (node.type==='catalyst'?3:2) && node.securityLevel > 0) {
                     drawText = true;
                     textStr = `DECRYPT: ${(node.securityLevel).toFixed(1)}`;
                     textColor = '#ffff00';
                     fillColor = '#ffff00';
                     shadowColor = '#ffff00';
                }
            }

            // Draw Chromatic Aberration for honeypots or high glitch
            if (!node.analyzed && node.type === 'honeypot' && Math.random() < 0.1) {
                 this.ctx.globalCompositeOperation = 'screen';
                 this.ctx.fillStyle = '#ff0000';
                 this.ctx.beginPath(); this.ctx.arc((node.x - 2) | 0, node.y | 0, node.size, 0, Math.PI * 2); this.ctx.fill();
                 this.ctx.fillStyle = '#0000ff';
                 this.ctx.beginPath(); this.ctx.arc((node.x + 2) | 0, node.y | 0, node.size, 0, Math.PI * 2); this.ctx.fill();
                 this.ctx.globalCompositeOperation = 'source-over';
            }

            // Draw Core Node
            this.ctx.fillStyle = fillColor;
            this.ctx.shadowColor = shadowColor;
            this.ctx.shadowBlur = shadowBlur;
            this.ctx.beginPath();
            this.ctx.arc(node.x | 0, node.y | 0, node.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0; // reset

            // Draw ID slightly offset
            if (!node.analyzed && Math.random() > 0.5) {
                this.ctx.fillStyle = 'rgba(0, 255, 200, 0.4)';
                this.ctx.fillText(node.id, (node.x + 8)|0, (node.y + 3)|0);
            }

            // Draw status text
            if (drawText) {
                this.ctx.fillStyle = textColor;
                this.ctx.fillText(textStr, (node.x + 8)|0, (node.y - 8)|0);
            }
        }

        // --- POST PROCESSING FX ---

        // CRT Scanlines
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let y = 0; y < this.canvas.height; y += 4) {
            this.ctx.fillRect(0, y, this.canvas.width, 1);
        }

        // Global Glitch Shift
        if (this.glitchIntensity > 0 && Math.random() < this.glitchIntensity) {
            const shiftY = (Math.random() - 0.5) * 20 * this.glitchIntensity;
            const sliceH = Math.random() * 50 + 10;
            const sliceY = Math.random() * this.canvas.height;

            // Draw a slice shifted
            this.ctx.drawImage(
                this.canvas,
                0, sliceY, this.canvas.width, sliceH,
                (Math.random() - 0.5) * 10 * this.glitchIntensity, sliceY + shiftY, this.canvas.width, sliceH
            );

            // Color overlay
            this.ctx.fillStyle = `rgba(255, 0, 0, ${this.glitchIntensity * 0.1})`;
            this.ctx.fillRect(0, sliceY, this.canvas.width, sliceH);
        }

        // Heat Vignette
        if (this.currentHeat > this.maxHeat * 0.7) {
            const intensity = (this.currentHeat / this.maxHeat - 0.7) / 0.3; // 0 to 1
            const gradient = this.ctx.createRadialGradient(
                this.canvas.width/2, this.canvas.height/2, this.canvas.height * 0.3,
                this.canvas.width/2, this.canvas.height/2, this.canvas.width * 0.8
            );
            gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
            gradient.addColorStop(1, `rgba(255, 0, 0, ${intensity * 0.5})`);
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    gameLoop(currentTime) {
        if (!this.isRunning) return;

        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Cap dt to prevent huge jumps if tab was inactive
        this.update(Math.min(dt, 0.1));
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

    // Add shutdown alias to maintain compatibility with different arcade hub versions
    async shutdown() {
        this.cleanup();
    }
}
