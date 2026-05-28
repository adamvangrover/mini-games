export default class NeonWire {
    constructor() {
        this.ctx = null;
        this.canvas = null;
        this.gridSize = 6;
        this.cellSize = 60;
        this.grid = [];
        this.level = 1;
        this.score = 0;
        this.timeLimit = 60;
        this.timeRemaining = 60;
        this.gameOver = false;
        this.levelComplete = false;
        this.particles = [];
        this.boundClick = this.handleClick.bind(this);
        this.lastTime = performance.now();
        this.animationFrame = null;
        
        // Node Types: 0: Empty, 1: Straight, 2: Corner, 3: T-Junction, 4: Cross, 5: Source, 6: Sink
        // Connections are [Top, Right, Bottom, Left] booleans
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.ctx = this.canvas.getContext('2d');
        container.appendChild(this.canvas);
        
        this.canvas.addEventListener('click', this.boundClick);

        // UI Layer
        this.uiContainer = document.createElement('div');
        this.uiContainer.style.position = 'absolute';
        this.uiContainer.style.top = '10px';
        this.uiContainer.style.left = '10px';
        this.uiContainer.style.color = '#0ff';
        this.uiContainer.style.fontFamily = "'Press Start 2P', monospace";
        this.uiContainer.style.fontSize = '16px';
        this.uiContainer.style.pointerEvents = 'none';
        container.appendChild(this.uiContainer);

        // Add back button
        const btn = document.createElement('button');
        btn.innerHTML = '<i class="fas fa-arrow-left"></i> BACK';
        btn.className = "absolute bottom-4 left-4 px-6 py-2 bg-slate-800/80 hover:bg-fuchsia-600 text-white font-bold rounded-full border border-slate-600 hover:border-fuchsia-400 transition-all z-50 pointer-events-auto backdrop-blur-sm";
        btn.onclick = () => window.miniGameHub.goBack();
        container.appendChild(btn);

        this.generateLevel();
        this.lastTime = performance.now();
        this.loop();
    }
    
    generateLevel() {
        this.grid = [];
        this.levelComplete = false;
        this.timeRemaining = this.timeLimit;
        
        // Very basic procedural generation for prototype
        for (let y = 0; y < this.gridSize; y++) {
            let row = [];
            for (let x = 0; x < this.gridSize; x++) {
                // Random node type (mostly 1 and 2)
                let type = Math.floor(Math.random() * 3) + 1;
                let rotation = Math.floor(Math.random() * 4);
                row.push({ type, rotation, powered: false, x, y });
            }
            this.grid.push(row);
        }
        
        // Force Source at 0,0 and Sink at end
        this.grid[0][0] = { type: 5, rotation: 0, powered: true, x: 0, y: 0 };
        this.grid[this.gridSize-1][this.gridSize-1] = { type: 6, rotation: 0, powered: false, x: this.gridSize-1, y: this.gridSize-1 };
        
        this.updatePower();
    }

    getConnections(node) {
        // [Top, Right, Bottom, Left]
        let base;
        switch(node.type) {
            case 1: base = [1, 0, 1, 0]; break; // Straight
            case 2: base = [1, 1, 0, 0]; break; // Corner
            case 3: base = [1, 1, 1, 0]; break; // T
            case 4: base = [1, 1, 1, 1]; break; // Cross
            case 5: base = [0, 1, 0, 0]; break; // Source (faces right)
            case 6: base = [1, 0, 0, 1]; break; // Sink (accepts top, left)
            default: base = [0, 0, 0, 0];
        }
        
        // Rotate array right by 'rotation' amount
        let rotated = [...base];
        for(let i=0; i<node.rotation; i++) {
            rotated.unshift(rotated.pop());
        }
        return rotated;
    }

    updatePower() {
        // Reset power
        for(let y=0; y<this.gridSize; y++) {
            for(let x=0; x<this.gridSize; x++) {
                if(this.grid[y][x].type !== 5) this.grid[y][x].powered = false;
            }
        }
        
        // Flood fill from source
        let queue = [{x:0, y:0}];
        let visited = new Set(['0,0']);
        
        while(queue.length > 0) {
            let curr = queue.shift();
            let node = this.grid[curr.y][curr.x];
            node.powered = true;
            
            // Check win
            if (node.type === 6) {
                this.levelComplete = true;
                this.score += Math.floor(this.timeRemaining) * 10;
                if (window.miniGameHub && window.miniGameHub.soundManager) {
                    window.miniGameHub.soundManager.playSound('win');
                }
                setTimeout(() => {
                    this.level++;
                    this.gridSize = Math.min(10, this.gridSize + 1);
                    this.timeLimit = Math.max(20, this.timeLimit - 5);
                    this.generateLevel();
                }, 2000);
                return;
            }
            
            let conns = this.getConnections(node);
            
            // Check Top
            if (conns[0] && curr.y > 0) {
                let neighbor = this.grid[curr.y-1][curr.x];
                let nConns = this.getConnections(neighbor);
                if (nConns[2] && !visited.has(`${curr.x},${curr.y-1}`)) {
                    visited.add(`${curr.x},${curr.y-1}`);
                    queue.push({x: curr.x, y: curr.y-1});
                }
            }
            // Check Right
            if (conns[1] && curr.x < this.gridSize-1) {
                let neighbor = this.grid[curr.y][curr.x+1];
                let nConns = this.getConnections(neighbor);
                if (nConns[3] && !visited.has(`${curr.x+1},${curr.y}`)) {
                    visited.add(`${curr.x+1},${curr.y}`);
                    queue.push({x: curr.x+1, y: curr.y});
                }
            }
            // Check Bottom
            if (conns[2] && curr.y < this.gridSize-1) {
                let neighbor = this.grid[curr.y+1][curr.x];
                let nConns = this.getConnections(neighbor);
                if (nConns[0] && !visited.has(`${curr.x},${curr.y+1}`)) {
                    visited.add(`${curr.x},${curr.y+1}`);
                    queue.push({x: curr.x, y: curr.y+1});
                }
            }
            // Check Left
            if (conns[3] && curr.x > 0) {
                let neighbor = this.grid[curr.y][curr.x-1];
                let nConns = this.getConnections(neighbor);
                if (nConns[1] && !visited.has(`${curr.x-1},${curr.y}`)) {
                    visited.add(`${curr.x-1},${curr.y}`);
                    queue.push({x: curr.x-1, y: curr.y});
                }
            }
        }
    }

    handleClick(e) {
        if(this.gameOver || this.levelComplete) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const startX = (this.canvas.width - (this.gridSize * this.cellSize)) / 2;
        const startY = (this.canvas.height - (this.gridSize * this.cellSize)) / 2;
        
        const gridX = Math.floor((mouseX - startX) / this.cellSize);
        const gridY = Math.floor((mouseY - startY) / this.cellSize);
        
        if (gridX >= 0 && gridX < this.gridSize && gridY >= 0 && gridY < this.gridSize) {
            let node = this.grid[gridY][gridX];
            if (node.type !== 5 && node.type !== 6) { // Don't rotate source/sink
                node.rotation = (node.rotation + 1) % 4;
                if (window.miniGameHub && window.miniGameHub.soundManager) {
                    window.miniGameHub.soundManager.playSound('click');
                }
                this.updatePower();
            }
        }
    }

    loop() {
        if (!this.canvas) return;
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        this.update(dt);
        this.draw();

        this.animationFrame = requestAnimationFrame(() => this.loop());
    }

    update(dt) {
        if (this.gameOver || this.levelComplete) return;

        this.timeRemaining -= dt;
        if (this.timeRemaining <= 0) {
            this.gameOver = true;
        }

        this.updateUI();

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw() {
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const startX = (this.canvas.width - (this.gridSize * this.cellSize)) / 2;
        const startY = (this.canvas.height - (this.gridSize * this.cellSize)) / 2;
        const Math_PI = Math.PI;

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                let node = this.grid[y][x];
                let px = startX + x * this.cellSize;
                let py = startY + y * this.cellSize;
                
                // Draw Cell BG
                this.ctx.strokeStyle = '#333';
                this.ctx.strokeRect(px, py, this.cellSize, this.cellSize);
                
                // Draw Node
                let cx = px + this.cellSize/2;
                let cy = py + this.cellSize/2;
                
                this.ctx.save();
                this.ctx.translate(cx, cy);
                
                // Color based on power
                let color = node.powered ? '#0ff' : '#555';
                if(node.type === 5) color = '#0f0'; // Source
                if(node.type === 6) color = node.powered ? '#0f0' : '#f00'; // Sink
                
                this.ctx.strokeStyle = color;
                this.ctx.fillStyle = color;
                this.ctx.lineWidth = 6;
                this.ctx.lineCap = 'round';
                
                if (node.powered) {
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = color;
                }

                let conns = this.getConnections(node);
                
                // Center dot
                if(node.type !== 1) {
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, 8, 0, Math_PI*2);
                    this.ctx.fill();
                }

                // Lines
                this.ctx.beginPath();
                let halfCell = this.cellSize/2;
                if(conns[0]) { this.ctx.moveTo(0,0); this.ctx.lineTo(0, -halfCell); }
                if(conns[1]) { this.ctx.moveTo(0,0); this.ctx.lineTo(halfCell, 0); }
                if(conns[2]) { this.ctx.moveTo(0,0); this.ctx.lineTo(0, halfCell); }
                if(conns[3]) { this.ctx.moveTo(0,0); this.ctx.lineTo(-halfCell, 0); }
                this.ctx.stroke();

                this.ctx.restore();
            }
        }

        if (this.levelComplete) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#0f0';
            this.ctx.font = '30px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("CONNECTION ESTABLISHED", this.canvas.width/2, this.canvas.height/2);
        } else if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px "Press Start 2P"';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("SYSTEM FAILURE", this.canvas.width/2, this.canvas.height/2 - 50);
            this.ctx.font = '15px "Press Start 2P"';
            this.ctx.fillText("Score: " + this.score, this.canvas.width/2, this.canvas.height/2);
        }
    }

    updateUI() {
        this.uiContainer.innerHTML = `LVL: ${this.level} | SCORE: ${this.score} | TIME: ${Math.ceil(this.timeRemaining)}`;
    }

    async shutdown() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        if (this.canvas) {
            this.canvas.removeEventListener('click', this.boundClick);
            if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
        }
        if (this.uiContainer && this.uiContainer.parentNode) {
            this.uiContainer.parentNode.removeChild(this.uiContainer);
        }
        this.canvas = null;
        
        if (window.miniGameHub && window.miniGameHub.saveSystem && this.score > 0) {
            window.miniGameHub.saveSystem.setHighScore('neon-wire', this.score);
        }
    }
}
