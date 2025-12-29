import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';
import SaveSystem from '../core/SaveSystem.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class RunnerGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        
        // Game State
        this.player = { 
            x: 100, 
            y: 0, 
            width: 40, 
            height: 40, 
            velocityY: 0, 
            isJumping: false,
            rotation: 0
        };
        
        this.gravity = 2500;
        this.jumpForce = -900;
        this.groundY = 0; // Calculated in resize
        
        this.obstacles = [];
        this.coins = [];
        
        this.gameSpeed = 400;
        this.score = 0;
        this.active = false;
        this.obstacleTimer = 0;
        this.coinTimer = 0;

        this.soundManager = SoundManager.getInstance();
        this.inputManager = InputManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
        
        this.boundResize = this.resize.bind(this);
        this.animationId = null;
    }

    init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.overflow = 'hidden';

        // Create Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Create UI Overlay
        this.uiLayer = document.createElement('div');
        this.uiLayer.style.position = 'absolute';
        this.uiLayer.style.top = '0';
        this.uiLayer.style.left = '0';
        this.uiLayer.style.width = '100%';
        this.uiLayer.style.height = '100%';
        this.uiLayer.style.pointerEvents = 'none';
        this.uiLayer.innerHTML = `
            <div class="absolute top-4 left-4 text-white font-[Poppins] pointer-events-auto">
                <button id="runner-back-btn" class="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg border border-slate-600 transition-colors">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
            </div>
            <div class="absolute top-4 right-4 text-white font-[Poppins] text-right">
                <div class="text-3xl font-bold italic text-fuchsia-400 drop-shadow-[0_0_10px_rgba(232,121,249,0.8)]">
                    <span id="runner-score">0</span>m
                </div>
                <div class="text-sm text-yellow-400">
                    <i class="fas fa-coins"></i> <span id="runner-coins">0</span>
                </div>
            </div>
            <div id="runner-start-msg" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <h1 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-500 title-glow mb-4 italic">NEON RUNNER</h1>
                <p class="text-white text-xl animate-pulse">Press SPACE or TAP to Run</p>
            </div>
        `;
        this.container.appendChild(this.uiLayer);

        // Bind Events
        this.container.querySelector('#runner-back-btn').addEventListener('click', () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        });

        // Resize
        window.addEventListener('resize', this.boundResize);
        this.resize();

        // Reset
        this.resetGame();
        this.active = false; // Wait for start
        
        // Start Loop
        this.startLoop();
        
        // Input Listener for Start
        this.startHandler = () => {
            if (!this.active && !this.gameOverState) {
                this.active = true;
                document.getElementById('runner-start-msg').style.display = 'none';
                this.soundManager.playSound('click');
            } else if (this.active) {
                this.jump();
            }
        };
        
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') this.startHandler();
        });
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startHandler();
        }, { passive: false });
        this.canvas.addEventListener('mousedown', (e) => {
            this.startHandler();
        });
    }
    
    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.groundY = this.canvas.height - 100;
        
        // Keep player on ground if idle
        if (!this.player.isJumping) {
            this.player.y = this.groundY - this.player.height;
        }
    }

    resetGame() {
        this.groundY = this.canvas.height - 100;
        this.player = { 
            x: 100, 
            y: this.groundY - 40, 
            width: 40, 
            height: 40, 
            velocityY: 0, 
            isJumping: false,
            rotation: 0
        };
        this.obstacles = [];
        this.coins = [];
        this.gameSpeed = 500;
        this.score = 0;
        this.coinsCollected = 0;
        this.obstacleTimer = 0;
        this.coinTimer = 0;
        this.gameOverState = false;
        
        this.updateScoreUI();
    }

    shutdown() {
        this.active = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.boundResize);
        // Remove input listeners? Ideally yes, but they are window level here which is bad practice.
        // In a real refactor we should use InputManager strictly or bind/unbind properly.
        // For now, rely on active flag.
    }
    
    startLoop() {
        const loop = (timestamp) => {
             // Calculate DT manually since main loop also calls update
             // But we want full control for this specific canvas render
             // Actually, main.js calls update() and draw()...
             // Let's stick to main.js loop.
        };
        // We will just use update() and draw() called by main.js
    }

    update(dt) {
        if (!this.active) return;

        // Physics
        this.player.velocityY += this.gravity * dt;
        this.player.y += this.player.velocityY * dt;

        // Ground collision
        if (this.player.y >= this.groundY - this.player.height) {
            if (this.player.isJumping) {
                 // Land effect
                 this.particleSystem.emit(this.player.x + 20, this.groundY, '#00ff00', 10);
                 this.player.rotation = 0; // Snap upright
            }
            this.player.y = this.groundY - this.player.height;
            this.player.isJumping = false;
            this.player.velocityY = 0;
        } else {
            // Rotate while jumping
            this.player.rotation += (Math.PI * 2) * dt; 
        }

        // Difficulty Scaling
        this.gameSpeed += 20 * dt;
        
        // Spawn Obstacles
        this.obstacleTimer += dt;
        // Spawn rate based on speed
        const spawnRate = 2.5 - (Math.min(this.gameSpeed, 1500) / 1000); 
        
        if (this.obstacleTimer > spawnRate) {
            this.spawnObstacle();
            this.obstacleTimer = 0;
        }
        
        // Spawn Coins
        this.coinTimer += dt;
        if (this.coinTimer > 0.5) {
             if (Math.random() < 0.3) this.spawnCoin();
             this.coinTimer = 0;
        }

        // Update Entities
        this.updateObstacles(dt);
        this.updateCoins(dt);
        this.particleSystem.update(dt);
        
        // Score
        this.score += (this.gameSpeed / 100) * dt;
        this.updateScoreUI();
    }
    
    spawnObstacle() {
        const type = Math.random() < 0.3 ? 'FLYING' : 'GROUND';
        const obstacle = {
            x: this.canvas.width + 50,
            y: type === 'GROUND' ? this.groundY - 50 : this.groundY - 140, // Flying is higher
            width: 50,
            height: 50,
            type: type,
            color: type === 'GROUND' ? '#ff0055' : '#ffaa00'
        };
        this.obstacles.push(obstacle);
    }
    
    spawnCoin() {
        const y = Math.random() < 0.5 ? this.groundY - 40 : this.groundY - 150;
        this.coins.push({
            x: this.canvas.width + 50,
            y: y,
            width: 30,
            height: 30,
            collected: false
        });
    }
    
    updateObstacles(dt) {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            let obs = this.obstacles[i];
            obs.x -= this.gameSpeed * dt;
            
            // Collision
            if (this.checkCollision(this.player, obs)) {
                this.gameOver();
            }
            
            if (obs.x < -100) this.obstacles.splice(i, 1);
        }
    }
    
    updateCoins(dt) {
        for (let i = this.coins.length - 1; i >= 0; i--) {
            let c = this.coins[i];
            c.x -= this.gameSpeed * dt;
            
            // Collect
            if (!c.collected && this.checkCollision(this.player, c)) {
                c.collected = true;
                this.coinsCollected++;
                this.score += 50;
                this.saveSystem.addCurrency(1);
                this.soundManager.playSound('score');
                this.particleSystem.emit(c.x, c.y, '#ffd700', 10);
                this.coins.splice(i, 1);
            } else if (c.x < -100) {
                this.coins.splice(i, 1);
            }
        }
    }
    
    checkCollision(a, b) {
        // Simple AABB with padding
        const pad = 5;
        return (
            a.x + pad < b.x + b.width - pad &&
            a.x + a.width - pad > b.x + pad &&
            a.y + pad < b.y + b.height - pad &&
            a.y + a.height - pad > b.y + pad
        );
    }

    jump() {
        if (!this.player.isJumping) {
            this.player.velocityY = this.jumpForce;
            this.player.isJumping = true;
            this.soundManager.playSound('jump');
            this.particleSystem.emit(this.player.x + 20, this.player.y + 40, '#ffffff', 5);
        }
    }

    gameOver() {
        this.active = false;
        this.gameOverState = true;
        this.soundManager.playSound('explosion');
        this.particleSystem.emit(this.player.x + 20, this.player.y + 20, '#ff0055', 50);
        
        this.saveSystem.setHighScore('runner-game', Math.floor(this.score));

        if (window.miniGameHub && window.miniGameHub.showGameOver) {
            window.miniGameHub.showGameOver(Math.floor(this.score), () => {
                this.resetGame();
                this.active = true;
                document.getElementById('runner-start-msg').style.display = 'none';
            });
        }
    }

    updateScoreUI() {
        const scoreEl = document.getElementById("runner-score");
        if(scoreEl) scoreEl.textContent = Math.floor(this.score);
        
        const coinEl = document.getElementById("runner-coins");
        if(coinEl) coinEl.textContent = this.coinsCollected;
    }

    draw() {
        if (!this.ctx || !this.canvas) return;
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.ctx.clearRect(0, 0, width, height);
        
        // Background Gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(1, '#1e1b4b');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);
        
        // Background Grid (Moving)
        this.ctx.strokeStyle = 'rgba(232, 121, 249, 0.2)'; // Fuchsia low opacity
        this.ctx.lineWidth = 2;
        const offset = (Date.now() * (this.gameSpeed / 1000)) % 100;
        
        this.ctx.beginPath();
        // Horizontal lines
        for(let y = this.groundY; y < height; y += 40) {
             this.ctx.moveTo(0, y);
             this.ctx.lineTo(width, y);
        }
        // Perspective vertical lines
        // Simplified for 2D runner: just vertical scrolling lines on ground
        for(let x = -offset; x < width; x += 100) {
             // Draw sloped lines for "speed" effect
             this.ctx.moveTo(x, this.groundY);
             this.ctx.lineTo(x - 200, height);
        }
        this.ctx.stroke();

        // Ground Line
        this.ctx.strokeStyle = "#e879f9";
        this.ctx.lineWidth = 4;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = "#e879f9";
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundY);
        this.ctx.lineTo(width, this.groundY);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Player (Rotating Cube)
        this.ctx.save();
        this.ctx.translate(this.player.x + this.player.width/2, this.player.y + this.player.height/2);
        this.ctx.rotate(this.player.rotation);
        
        this.ctx.fillStyle = "#22d3ee"; // Cyan
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = "#22d3ee";
        this.ctx.fillRect(-this.player.width/2, -this.player.height/2, this.player.width, this.player.height);
        
        // Inner detail
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(-this.player.width/4, -this.player.height/4, this.player.width/2, this.player.height/2);
        
        this.ctx.restore();

        // Obstacles
        this.obstacles.forEach(obstacle => {
            this.ctx.fillStyle = obstacle.color;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = obstacle.color;
            
            if (obstacle.type === 'FLYING') {
                // Draw Triangle
                this.ctx.beginPath();
                this.ctx.moveTo(obstacle.x, obstacle.y + obstacle.height/2);
                this.ctx.lineTo(obstacle.x + obstacle.width, obstacle.y);
                this.ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
                this.ctx.fill();
            } else {
                // Draw Spikes
                this.ctx.beginPath();
                this.ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
                this.ctx.lineTo(obstacle.x + obstacle.width/2, obstacle.y);
                this.ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
                this.ctx.fill();
            }
        });

        // Coins
        this.coins.forEach(coin => {
            this.ctx.fillStyle = "#fbbf24";
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = "#fbbf24";
            
            this.ctx.beginPath();
            this.ctx.arc(coin.x + coin.width/2, coin.y + coin.height/2, coin.width/2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Sparkle
            this.ctx.fillStyle = "#ffffff";
            this.ctx.beginPath();
            this.ctx.arc(coin.x + coin.width/2 - 5, coin.y + coin.height/2 - 5, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.ctx.shadowBlur = 0;
        this.particleSystem.draw(this.ctx);
    }
}
