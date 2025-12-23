import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';
import { AchievementRegistry } from '../core/AchievementRegistry.js';
import SaveSystem from '../core/SaveSystem.js';

export default class NeonJump {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.particleSystem = ParticleSystem.getInstance();
        this.saveSystem = SaveSystem.getInstance();

        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;

        // Game State
        this.player = {
            x: 0,
            y: 0,
            radius: 20,
            vx: 0,
            vy: 0,
            width: 40,
            height: 40,
            frame: 0,
            facingRight: true
        };

        this.platforms = [];
        this.items = [];
        this.enemies = [];
        this.cameraY = 0;
        this.score = 0;
        this.isActive = false;
        this.isGameOver = false;

        // Physics constants
        this.gravity = 1500;
        this.jumpForce = -800;
        this.moveSpeed = 400;

        this.resizeHandler = this.resize.bind(this);
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', this.resizeHandler);

        this.resetGame();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    resetGame() {
        this.player.x = this.width / 2;
        this.player.y = this.height - 150;
        this.player.vx = 0;
        this.player.vy = this.jumpForce;

        this.cameraY = 0;
        this.score = 0;
        this.isActive = true;
        this.isGameOver = false;

        this.platforms = [];
        this.items = [];
        this.enemies = [];

        // Initial platforms
        for (let i = 0; i < this.height; i += 100) {
            this.platforms.push(this.createPlatform(this.height - i));
        }
    }

    createPlatform(y) {
        return {
            x: Math.random() * (this.width - 60),
            y: y,
            width: 80,
            height: 20,
            type: Math.random() > 0.9 ? 'moving' : 'static',
            speed: (Math.random() - 0.5) * 200,
            broken: false
        };
    }

    createEnemy(y) {
        return {
            x: Math.random() * (this.width - 40),
            y: y - 40,
            width: 40,
            height: 40,
            type: 'bug'
        };
    }

    createItem(y) {
        return {
            x: Math.random() * (this.width - 30),
            y: y - 50,
            width: 30,
            height: 30,
            type: 'jetpack',
            active: true
        };
    }

    update(dt) {
        if (!this.isActive || this.isGameOver) return;

        const mouse = this.inputManager.getMouse();
        const leftKey = this.inputManager.isKeyDown('ArrowLeft') || this.inputManager.isKeyDown('KeyA');
        const rightKey = this.inputManager.isKeyDown('ArrowRight') || this.inputManager.isKeyDown('KeyD');

        let moveDir = 0;
        if (leftKey) moveDir = -1;
        if (rightKey) moveDir = 1;

        if (mouse.down) {
            if (mouse.x < this.width / 2) moveDir = -1;
            else moveDir = 1;
        }

        if (moveDir !== 0) {
            this.player.facingRight = moveDir > 0;
        }

        // Horizontal Movement
        this.player.vx = moveDir * this.moveSpeed;
        this.player.x += this.player.vx * dt;

        // Screen wrap
        if (this.player.x < -this.player.width/2) this.player.x = this.width + this.player.width/2;
        if (this.player.x > this.width + this.player.width/2) this.player.x = -this.player.width/2;

        // Gravity
        this.player.vy += this.gravity * dt;
        this.player.y += this.player.vy * dt;

        // Platform Collision (only when falling)
        if (this.player.vy > 0) {
            this.platforms.forEach(p => {
                if (
                    this.player.y + this.player.height/2 > p.y &&
                    this.player.y - this.player.height/2 < p.y + p.height &&
                    this.player.y - this.player.vy * dt + this.player.height/2 <= p.y + 10 &&
                    this.player.x + this.player.width/2 > p.x &&
                    this.player.x - this.player.width/2 < p.x + p.width
                ) {
                    this.jump();
                }
            });
        }

        // Enemy Collision
        this.enemies.forEach(e => {
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 30) {
                this.triggerGameOver();
            }
        });

        // Item Collision
        this.items.forEach((item, index) => {
             if (!item.active) return;
             const dx = this.player.x - item.x;
             const dy = this.player.y - item.y;
             const dist = Math.sqrt(dx*dx + dy*dy);
             if (dist < 40) {
                 item.active = false;
                 this.player.vy = this.jumpForce * 1.5; // Super jump
                 this.soundManager.playSound('powerup');
                 this.particleSystem.emit(this.player.x, this.player.y, '#ffff00', 20);
             }
        });

        // Camera Follow
        const targetY = this.height / 2;
        if (this.player.y < targetY) {
            const diff = targetY - this.player.y;
            this.player.y = targetY;

            const moveObj = (obj) => { obj.y += diff; };
            this.platforms.forEach(moveObj);
            this.enemies.forEach(moveObj);
            this.items.forEach(moveObj);

            this.score += Math.floor(diff);
        }

        // Logic Updates
        this.platforms.forEach(p => {
            if (p.type === 'moving') {
                p.x += p.speed * dt;
                if (p.x < 0 || p.x + p.width > this.width) p.speed *= -1;
            }
        });

        // Cleanup & Spawning
        this.platforms = this.platforms.filter(p => p.y < this.height);
        this.enemies = this.enemies.filter(e => e.y < this.height);
        this.items = this.items.filter(i => i.y < this.height);

        const highestY = Math.min(...this.platforms.map(p => p.y));
        if (highestY > 100) {
            const newY = highestY - (Math.random() * 60 + 80);
            this.platforms.push(this.createPlatform(newY));

            // Spawn Enemy chance 5%
            if (Math.random() < 0.05 && this.score > 1000) {
                this.enemies.push(this.createEnemy(newY));
            }

            // Spawn Item chance 3%
            if (Math.random() < 0.03) {
                this.items.push(this.createItem(newY));
            }
        }

        // Game Over
        if (this.player.y > this.height) {
            this.triggerGameOver();
        }
    }

    jump() {
        this.player.vy = this.jumpForce;
        this.soundManager.playSound('jump');
        this.particleSystem.emit(this.player.x, this.player.y + 20, '#00ffff', 5);
    }

    triggerGameOver() {
        this.isActive = false;
        this.isGameOver = true;
        this.soundManager.playSound('explosion');
        this.particleSystem.shake.intensity = 10;
        this.particleSystem.shake.duration = 0.5;

        const displayScore = Math.floor(this.score);

        // Achievements
        if (displayScore >= 50) this.checkAchievement('neon-jump-50');
        if (displayScore >= 100) this.checkAchievement('neon-jump-100');
        this.checkAchievement('first-play');
        this.saveSystem.addXP(Math.floor(displayScore / 10)); // 1 XP per 10 height

        window.miniGameHub.showGameOver(displayScore, () => this.resetGame());
    }

    checkAchievement(id) {
        if (this.saveSystem.unlockAchievement(id)) {
            const ach = AchievementRegistry[id];
            if (ach) {
                this.saveSystem.addXP(ach.xp);
                console.log(`Unlocked: ${ach.title}`);
            }
        }
    }

    draw() {
        // Background - Dark Cyberpunk Grid
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Grid lines
        this.ctx.strokeStyle = '#1e293b';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        const gridSize = 50;
        const offset = (this.score % gridSize); // Parallax-ish vertical
        for (let x = 0; x < this.width; x += gridSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
        }
        for (let y = offset; y < this.height; y += gridSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
        }
        this.ctx.stroke();

        // Draw Platforms
        this.platforms.forEach(p => {
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = p.type === 'moving' ? '#d946ef' : '#22c55e'; // Fuschia vs Green

            // Draw Tech Platform
            this.ctx.fillStyle = p.type === 'moving' ? '#86198f' : '#14532d'; // Darker base
            this.ctx.fillRect(p.x, p.y, p.width, p.height);

            // Top Glow Line
            this.ctx.fillStyle = p.type === 'moving' ? '#f0abfc' : '#4ade80'; // Lighter top
            this.ctx.fillRect(p.x, p.y, p.width, 4);

            // Tech markings
            this.ctx.fillStyle = '#00000055';
            this.ctx.fillRect(p.x + 10, p.y + 5, 5, 10);
            this.ctx.fillRect(p.x + p.width - 15, p.y + 5, 5, 10);
        });

        // Draw Items (Jetpack)
        this.ctx.font = '900 30px "Font Awesome 6 Free"';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        this.items.forEach(item => {
            if (item.active) {
                this.ctx.shadowColor = '#fbbf24';
                this.ctx.shadowBlur = 15;
                this.ctx.fillStyle = '#fbbf24';
                this.ctx.fillText('\uf135', item.x, item.y); // Rocket Icon
            }
        });

        // Draw Enemies
        this.enemies.forEach(e => {
            this.ctx.shadowColor = '#ef4444';
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = '#ef4444';
            // Animation bob
            const bob = Math.sin(Date.now() / 200) * 5;
            this.ctx.fillText('\uf188', e.x, e.y + bob); // Bug Icon
        });

        // Draw Player (Robot)
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y);
        if (!this.player.facingRight) {
            this.ctx.scale(-1, 1);
        }

        const avatar = this.saveSystem.data.avatar || { color: '#06b6d4', icon: 'fa-robot' };

        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = avatar.color;
        this.ctx.fillStyle = avatar.color;

        // Robot Icon lookup (Canvas needs unicode)
        // Simple map for now, fallback to default
        const iconMap = {
            'fa-robot': '\uf544',
            'fa-ghost': '\uf6e2',
            'fa-dragon': '\uf6d5',
            'fa-cat': '\uf6be',
            'fa-dog': '\uf6d3',
            'fa-user-astronaut': '\uf4fb',
            'fa-rocket': '\uf135',
            'fa-skull': '\uf54c',
            'fa-crown': '\uf521',
            'fa-bolt': '\uf0e7',
            'fa-heart': '\uf004'
        };
        const unicode = iconMap[avatar.icon] || '\uf544';

        this.ctx.font = '900 40px "Font Awesome 6 Free"';
        this.ctx.fillText(unicode, 0, 0);

        // Jet flame if moving up fast
        if (this.player.vy < -400) {
            this.ctx.shadowColor = '#f59e0b';
            this.ctx.fillStyle = '#f59e0b';
            this.ctx.font = '900 20px "Font Awesome 6 Free"';
            this.ctx.fillText('\uf06d', -10, 25); // Fire
            this.ctx.fillText('\uf06d', 10, 25);
        }

        this.ctx.restore();

        // Particles
        this.particleSystem.updateAndDraw(this.ctx, 0.016);

        // Score HUD
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 30px "Press Start 2P", monospace'; // Retro font
        this.ctx.textAlign = 'left';
        this.ctx.shadowBlur = 0;
        this.ctx.fillText(`${Math.floor(this.score)}`, 20, 50);
    }

    shutdown() {
        window.removeEventListener('resize', this.resizeHandler);
        if (this.canvas) this.canvas.remove();
    }
}
