
import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';
import ParticleSystem from '../core/ParticleSystem.js';
import SaveSystem from '../core/SaveSystem.js';
import { CHARACTERS, STAGES } from './neonCombat/CombatData.js';
import Fighter from './neonCombat/Fighter.js';

export default class NeonCombat {
    constructor() {
        this.ctx = null;
        this.canvas = null;
        this.input = InputManager.getInstance();
        this.audio = SoundManager.getInstance();
        this.particles = ParticleSystem.getInstance();
        this.saveSystem = SaveSystem.getInstance();

        this.state = 'MENU'; // MENU, SELECT, PLAYING, GAME_OVER
        this.width = 0;
        this.height = 0;

        this.player1 = null;
        this.player2 = null; // AI

        // Selection State
        this.p1Selection = 'cyber-01';
        this.p2Selection = 'viper-7';
        this.stageSelection = 'rooftop';
        this.unlockedChars = ['cyber-01', 'viper-7', 'titan-x'];
        this.unlockedStages = ['rooftop', 'dojo', 'sewers'];

        this.cameraShake = 0;
        this.cameraX = 0;
        this.winner = null;

        this.boundResize = this.resize.bind(this);

        // Stats
        this.stats = { wins: 0, streak: 0 };
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.className = 'absolute top-0 left-0 w-full h-full bg-slate-950';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Load Progress
        const data = this.saveSystem.getGameConfig('neon-combat') || {};
        this.stats = { wins: data.wins || 0, streak: data.streak || 0 };
        if (this.stats.wins >= 5 && !this.unlockedChars.includes('neon-ninja')) {
             this.unlockedChars.push('neon-ninja');
             window.miniGameHub.showToast("UNLOCKED: NEON NINJA");
        }
        if (data.unlockedVoid && !this.unlockedStages.includes('void')) {
             this.unlockedStages.push('void');
        }

        // Initial Resize
        this.resize();
        window.addEventListener('resize', this.boundResize);

        // Start at Select Screen
        this.createSelectUI();
        this.state = 'SELECT';
    }

    createSelectUI() {
        this.container.innerHTML = '';
        this.container.appendChild(this.canvas);

        const overlay = document.createElement('div');
        overlay.id = 'combat-select-ui';
        overlay.className = 'absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center pointer-events-none bg-black/60 backdrop-blur-sm';
        overlay.innerHTML = `
            <h1 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-8 filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">NEON COMBAT</h1>

            <div class="flex gap-12 w-full max-w-4xl justify-center pointer-events-auto">
                <!-- P1 Select -->
                <div class="flex flex-col items-center bg-slate-900/80 p-6 rounded-xl border border-cyan-500/50 min-w-[300px]">
                    <h2 class="text-cyan-400 text-2xl font-bold mb-4">PLAYER 1</h2>
                    <div class="grid grid-cols-2 gap-2 mb-4" id="p1-grid"></div>
                    <div id="p1-preview" class="text-white text-center h-32 flex flex-col justify-center"></div>
                </div>

                <!-- VS -->
                <div class="flex flex-col justify-center">
                    <div class="text-5xl font-black text-white italic">VS</div>
                </div>

                <!-- P2 Select (AI) -->
                <div class="flex flex-col items-center bg-slate-900/80 p-6 rounded-xl border border-fuchsia-500/50 min-w-[300px]">
                    <h2 class="text-fuchsia-400 text-2xl font-bold mb-4">OPPONENT</h2>
                    <div class="grid grid-cols-2 gap-2 mb-4" id="p2-grid"></div>
                    <div id="p2-preview" class="text-white text-center h-32 flex flex-col justify-center"></div>
                </div>
            </div>

            <div class="mt-8 flex gap-4 pointer-events-auto">
                <button id="btn-fight" class="px-8 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-2xl skew-x-[-10deg] hover:scale-110 transition-transform shadow-[0_0_20px_rgba(251,191,36,0.5)]">FIGHT</button>
                <button class="px-6 py-3 bg-slate-700 text-white font-bold skew-x-[-10deg] hover:bg-slate-600" onclick="window.miniGameHub.goBack()">EXIT</button>
            </div>

            <div class="mt-4 text-slate-400 text-sm font-mono">
                CONTROLS: WASD to Move • F/G to Attack • H for SPECIAL • Space to Jump
            </div>
            <div class="absolute top-4 right-4 text-slate-500 font-mono text-xs">v2.0.0 EXPANDED</div>
        `;
        this.container.appendChild(overlay);

        this.renderCharacterGrid('p1-grid', this.p1Selection, (id) => {
            this.p1Selection = id;
            this.updatePreviews();
            this.audio.playSound('click');
        });

        this.renderCharacterGrid('p2-grid', this.p2Selection, (id) => {
            this.p2Selection = id;
            this.updatePreviews();
            this.audio.playSound('click');
        });

        this.updatePreviews();

        document.getElementById('btn-fight').onclick = () => {
            this.audio.playSound('powerup');
            this.startGame();
        };

        // Konami Code Listener
        this.konamiBuffer = [];
        this.konamiCode = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
        this.boundKonami = (e) => {
            this.konamiBuffer.push(e.key);
            if (this.konamiBuffer.length > this.konamiCode.length) this.konamiBuffer.shift();
            if (JSON.stringify(this.konamiBuffer) === JSON.stringify(this.konamiCode)) {
                if (!this.unlockedChars.includes('glitch-god')) {
                    this.unlockedChars.push('glitch-god');
                    window.miniGameHub.showToast("CHEAT ACTIVATED: GLITCH GOD UNLOCKED");
                    this.createSelectUI(); // Refresh
                }
            }
        };
        window.addEventListener('keydown', this.boundKonami);
    }

    renderCharacterGrid(containerId, currentId, onSelect) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        Object.values(CHARACTERS).forEach(char => {
            if (!this.unlockedChars.includes(char.id)) return;

            const btn = document.createElement('button');
            btn.className = `w-12 h-12 border-2 ${currentId === char.id ? 'border-white bg-slate-700 shadow-[0_0_10px_white]' : 'border-slate-600 bg-slate-800'} rounded hover:bg-slate-700 transition-colors`;
            btn.style.backgroundColor = currentId === char.id ? char.color : '';

            // Icon (First Letter)
            btn.textContent = char.name[0];
            btn.style.color = currentId === char.id ? '#000' : char.color;
            btn.style.fontWeight = 'bold';

            btn.onclick = () => {
                onSelect(char.id);
                // Re-render both grids to update selection highlight (lazy way)
                // Actually just update styles manually or refresh whole UI?
                // Let's just refresh previews for now, updating classes is tricky without ref
                this.createSelectUI();
            };
            container.appendChild(btn);
        });
    }

    updatePreviews() {
        const p1 = CHARACTERS[this.p1Selection];
        const p2 = CHARACTERS[this.p2Selection];

        const renderPreview = (el, char) => {
            el.innerHTML = `
                <div class="text-xl font-bold" style="color:${char.color}">${char.name}</div>
                <div class="text-xs text-slate-400 mb-2">${char.description}</div>
                <div class="flex justify-center gap-2 text-xs">
                    <span class="bg-slate-800 px-1">SPD: ${char.stats.speed}</span>
                    <span class="bg-slate-800 px-1">PWR: ${char.stats.power}</span>
                    <span class="bg-slate-800 px-1">HP: ${char.stats.health}</span>
                </div>
            `;
        };

        renderPreview(document.getElementById('p1-preview'), p1);
        renderPreview(document.getElementById('p2-preview'), p2);
    }

    createGameUI() {
        // Clear Select UI
        const oldUI = document.getElementById('combat-select-ui');
        if(oldUI) oldUI.remove();
        if(this.hud) this.hud.remove();

        // HUD Overlay
        this.hud = document.createElement('div');
        this.hud.className = 'absolute top-0 left-0 w-full p-4 pointer-events-none flex flex-col justify-between h-full';

        const p1 = CHARACTERS[this.p1Selection];
        const p2 = CHARACTERS[this.p2Selection];

        this.hud.innerHTML = `
            <div class="flex justify-between items-start w-full font-mono select-none">
                <!-- P1 HUD -->
                <div class="w-1/3">
                    <div class="text-cyan-400 font-bold text-xl mb-1 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" style="color: ${p1.color}">${p1.name}</div>
                    <div class="h-6 bg-slate-900 border-2 border-white skew-x-[-20deg] relative overflow-hidden shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        <div id="p1-hp" class="h-full transition-all duration-200" style="width: 100%; background: linear-gradient(90deg, ${p1.gradient[0]}, ${p1.gradient[1]})"></div>
                    </div>
                    <div class="mt-1 h-3 bg-slate-900 border border-yellow-500 skew-x-[-20deg] w-3/4 relative overflow-hidden">
                        <div id="p1-energy" class="h-full bg-yellow-400 transition-all duration-200 shadow-[0_0_10px_rgba(250,204,21,0.5)]" style="width: 0%"></div>
                    </div>
                </div>

                <!-- Timer -->
                <div class="text-center pt-2">
                    <div id="timer" class="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] tracking-widest">60</div>
                </div>

                <!-- P2 HUD -->
                <div class="w-1/3 text-right">
                    <div class="text-fuchsia-400 font-bold text-xl mb-1 drop-shadow-[0_0_5px_rgba(217,70,239,0.8)]" style="color: ${p2.color}">${p2.name}</div>
                    <div class="h-6 bg-slate-900 border-2 border-white skew-x-[20deg] relative overflow-hidden shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        <div id="p2-hp" class="h-full transition-all duration-200 float-right" style="width: 100%; background: linear-gradient(-90deg, ${p2.gradient[0]}, ${p2.gradient[1]})"></div>
                    </div>
                     <div class="mt-1 h-3 bg-slate-900 border border-yellow-500 skew-x-[20deg] w-3/4 ml-auto relative overflow-hidden">
                        <div id="p2-energy" class="h-full bg-yellow-400 transition-all duration-200 float-right shadow-[0_0_10px_rgba(250,204,21,0.5)]" style="width: 0%"></div>
                    </div>
                </div>
            </div>

            <div id="combat-msg" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-red-600 drop-shadow-[0_0_30px_rgba(255,0,0,0.8)] hidden scale-0 transition-transform z-50">
                FIGHT!
            </div>

            <button class="pointer-events-auto absolute bottom-8 right-8 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded border border-slate-600 z-50 back-btn shadow-lg" onclick="window.miniGameHub.goBack()">Exit</button>
        `;
        this.container.appendChild(this.hud);
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        if(this.player1) this.player1.groundY = this.height - 100;
        if(this.player2) this.player2.groundY = this.height - 100;
    }

    startGame() {
        window.removeEventListener('keydown', this.boundKonami); // Clean listener
        this.createGameUI();
        this.state = 'PLAYING';
        this.timer = 60;
        this.timerTick = 0;
        this.winner = null;

        const groundY = this.height - 100;

        this.player1 = new Fighter(this, 200, groundY, CHARACTERS[this.p1Selection], false);
        this.player2 = new Fighter(this, this.width - 200, groundY, CHARACTERS[this.p2Selection], true);

        // Look at each other
        this.player1.facing = 1;
        this.player2.facing = -1;

        // Choose Stage based on P2 (simple logic for now, or random)
        // If P2 is hidden char, force Void
        if (this.p2Selection === 'glitch-god') this.stageSelection = 'void';
        else if (this.p2Selection === 'neon-ninja') this.stageSelection = 'dojo';
        else if (this.p2Selection === 'titan-x') this.stageSelection = 'sewers';
        else this.stageSelection = 'rooftop';

        // If unlocked Void, random chance
        if (this.unlockedStages.includes('void') && Math.random() < 0.1) this.stageSelection = 'void';

        this.updateHUD();
        this.showMessage("FIGHT!");
    }

    showMessage(text) {
        const el = document.getElementById('combat-msg');
        if(el) {
            el.innerHTML = text;
            el.classList.remove('hidden');
            el.classList.remove('scale-0');
            el.classList.add('scale-150');
            setTimeout(() => {
                el.classList.remove('scale-150');
                el.classList.add('scale-100');
            }, 100);
            setTimeout(() => {
                el.classList.add('scale-0');
                setTimeout(() => el.classList.add('hidden'), 200);
            }, 2000);
        }
    }

    update(dt) {
        if (this.state === 'SELECT') {
            // Animated background for menu
            this.drawSelectBackground(dt);
            return;
        }

        if (this.state !== 'PLAYING' && this.state !== 'GAME_OVER') return;

        // Timer
        if (this.state === 'PLAYING') {
            this.timerTick += dt;
            if (this.timerTick >= 1) {
                this.timer--;
                this.timerTick = 0;
                const el = document.getElementById('timer');
                if(el) el.textContent = this.timer;
                if (this.timer <= 0) {
                    this.endRound(null); // Time over
                }
            }
        }

        // Camera Shake Decay
        if (this.cameraShake > 0) {
            this.cameraShake -= dt * 30;
            if (this.cameraShake < 0) this.cameraShake = 0;
        }

        // Update Fighters
        this.player1.update(dt, this.player2);
        this.player2.update(dt, this.player1);

        // Physics: Wall clamp
        this.clampPlayer(this.player1);
        this.clampPlayer(this.player2);

        // Dynamic Camera Pan
        const midX = (this.player1.x + this.player2.x) / 2;
        const targetCamX = (this.width / 2) - midX;
        this.cameraX += (targetCamX - this.cameraX) * dt * 2;
        this.cameraX = Math.max(-150, Math.min(150, this.cameraX));

        // Check Win Condition
        if (this.state === 'PLAYING') {
            if (this.player1.hp <= 0) this.endRound(this.player2);
            else if (this.player2.hp <= 0) this.endRound(this.player1);
        }
    }

    clampPlayer(p) {
        if (p.x < 40) p.x = 40;
        if (p.x > this.width - 40) p.x = this.width - 40;
    }

    endRound(winner) {
        this.state = 'GAME_OVER';
        this.winner = winner;
        let msg = "DRAW";
        let score = 0;

        if (winner === this.player1) {
            msg = "<span class='text-cyan-400'>VICTORY</span>";
            score = Math.floor(this.player1.hp * 10 + this.timer * 50);
            this.stats.wins++;
            this.stats.streak++;
            this.audio.playSound('powerup');

            // Unlocks
            if (this.stats.wins >= 5 && !this.unlockedChars.includes('neon-ninja')) {
                this.unlockedChars.push('neon-ninja');
                window.miniGameHub.showToast("UNLOCKED: NEON NINJA");
            }
            if (this.player1.hp === this.player1.maxHp && !this.unlockedStages.includes('void')) {
                this.unlockedStages.push('void');
                window.miniGameHub.showToast("UNLOCKED: THE VOID");
                this.saveSystem.setGameConfig('neon-combat', { ...this.stats, unlockedVoid: true });
            } else {
                this.saveSystem.setGameConfig('neon-combat', this.stats);
            }

        } else if (winner === this.player2) {
            msg = "<span class='text-red-500'>DEFEAT</span>";
            this.audio.playSound('crash');
            this.stats.streak = 0;
            this.saveSystem.setGameConfig('neon-combat', this.stats);
        } else {
            // Time over
            if (this.player1.hp > this.player2.hp) {
                msg = "TIME UP<br><span class='text-sm text-cyan-400'>WINNER BY DECISION</span>";
                score = 500;
                this.stats.wins++;
                this.saveSystem.setGameConfig('neon-combat', this.stats);
            } else if (this.player2.hp > this.player1.hp) {
                msg = "TIME UP<br><span class='text-sm text-red-500'>YOU LOSE</span>";
                this.stats.streak = 0;
            }
        }

        this.showMessage(msg);

        setTimeout(() => {
            window.miniGameHub.showGameOver(score, () => {
                this.init(this.container); // Full Reset to Select
            });
        }, 3000);
    }

    draw() {
        if (this.state === 'SELECT') {
            this.drawSelectBackground(0.016);
            return;
        }

        // Clear
        const stage = STAGES[this.stageSelection];
        this.ctx.fillStyle = stage.colors.sky;
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.save();

        // Apply Camera
        if (this.cameraShake > 0) {
            const dx = (Math.random() - 0.5) * this.cameraShake;
            const dy = (Math.random() - 0.5) * this.cameraShake;
            this.ctx.translate(dx, dy);
        }
        this.ctx.translate(this.cameraX * 0.2, 0); // Parallax factor

        // Background
        this.drawBackground(stage);

        this.ctx.translate(this.cameraX * 0.8, 0); // Front layer moves more

        // Draw Fighters
        this.player1.draw(this.ctx);
        this.player2.draw(this.ctx);

        // Particles
        this.particles.update(0.016);
        this.particles.draw(this.ctx);

        this.ctx.restore();
    }

    drawSelectBackground(dt) {
         // Dynamic grid background
         this.ctx.fillStyle = '#020617';
         this.ctx.fillRect(0, 0, this.width, this.height);
         this.ctx.strokeStyle = '#1e293b';
         this.ctx.lineWidth = 2;
         const time = Date.now() / 1000;
         for(let x = 0; x < this.width; x+= 50) {
             this.ctx.beginPath();
             this.ctx.moveTo(x, 0);
             this.ctx.lineTo(x, this.height);
             this.ctx.stroke();
         }
         // Moving glowing line
         const y = (time * 100) % this.height;
         this.ctx.strokeStyle = '#06b6d4';
         this.ctx.shadowBlur = 10;
         this.ctx.shadowColor = '#06b6d4';
         this.ctx.beginPath();
         this.ctx.moveTo(0, y);
         this.ctx.lineTo(this.width, y);
         this.ctx.stroke();
         this.ctx.shadowBlur = 0;
    }

    drawBackground(stage) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const groundY = h - 100;

        const c = stage.colors;

        // Distant Grid (Parallax)
        ctx.save();
        ctx.strokeStyle = c.grid + '33'; // Low opacity
        ctx.lineWidth = 1;

        // Vertical grid lines
        for (let x = -200; x < w + 200; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        // Horizon
        ctx.beginPath();
        ctx.moveTo(-200, h * 0.4);
        ctx.lineTo(w + 200, h * 0.4);
        ctx.strokeStyle = c.accent + '4d';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = c.accent;
        ctx.stroke();
        ctx.restore();

        // Environment Specifics
        if (stage.id === 'rooftop') {
             // City Silhouette
            ctx.save();
            ctx.fillStyle = '#0f172a';
            for(let i=0; i<15; i++) {
                 const height = 150 + Math.sin(i * 132) * 100;
                 const x = (i * (w/12)) - 100;
                 ctx.fillRect(x, groundY - height, w/14, height);
                 // Windows
                 if (Math.random() > 0.7) {
                     ctx.fillStyle = Math.random() > 0.5 ? '#22d3ee' : '#e879f9';
                     ctx.shadowBlur = 5;
                     ctx.shadowColor = ctx.fillStyle;
                     ctx.fillRect(x + 10, groundY - height + 20, 10, height - 40);
                     ctx.fillStyle = '#0f172a';
                     ctx.shadowBlur = 0;
                 }
            }
            ctx.restore();
        } else if (stage.id === 'dojo') {
             // Pillars
             ctx.fillStyle = '#450a0a';
             ctx.fillRect(100, groundY - 300, 40, 300);
             ctx.fillRect(w - 140, groundY - 300, 40, 300);
             // Banner
             ctx.fillStyle = '#ef4444';
             ctx.textAlign = 'center';
             ctx.font = 'bold 40px monospace';
             ctx.fillText('DOJO', w/2, groundY - 200);
        } else if (stage.id === 'sewers') {
             // Sludge pipes
             ctx.fillStyle = '#14532d';
             ctx.fillRect(0, groundY - 150, w, 20);
             // Drip
             const t = Date.now() / 500;
             ctx.fillStyle = '#22c55e';
             ctx.beginPath();
             ctx.arc(w/2, groundY - 130 + (t%1)*130, 5, 0, Math.PI*2);
             ctx.fill();
        }

        // Floor
        ctx.save();
        // Gradient Floor
        const grad = ctx.createLinearGradient(0, groundY, 0, h);
        grad.addColorStop(0, c.grid + '33');
        grad.addColorStop(1, '#000000cc');
        ctx.fillStyle = grad;
        ctx.fillRect(-200, groundY, w + 400, 100);

        ctx.beginPath();
        ctx.moveTo(-200, groundY);
        ctx.lineTo(w + 200, groundY);
        ctx.strokeStyle = c.grid;
        ctx.shadowColor = c.grid;
        ctx.shadowBlur = 20;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }

    handleInput() {
        // Handled in Update via InputManager
    }

    updateHUD() {
        if (!this.player1 || !this.player2) return;

        const p1Pct = (this.player1.hp / this.player1.maxHp) * 100;
        const p2Pct = (this.player2.hp / this.player2.maxHp) * 100;
        const p1En = (this.player1.energy / this.player1.maxEnergy) * 100;
        const p2En = (this.player2.energy / this.player2.maxEnergy) * 100;

        const elP1Hp = document.getElementById('p1-hp');
        const elP2Hp = document.getElementById('p2-hp');
        const elP1En = document.getElementById('p1-energy');
        const elP2En = document.getElementById('p2-energy');

        if(elP1Hp) elP1Hp.style.width = `${Math.max(0, p1Pct)}%`;
        if(elP2Hp) elP2Hp.style.width = `${Math.max(0, p2Pct)}%`;
        if(elP1En) elP1En.style.width = `${Math.max(0, p1En)}%`;
        if(elP2En) elP2En.style.width = `${Math.max(0, p2En)}%`;

        // Full Energy Glow
        if(elP1En) {
            if (p1En >= 100) elP1En.classList.add('animate-pulse', 'bg-white');
            else elP1En.classList.remove('animate-pulse', 'bg-white');
        }
    }

    shutdown() {
        window.removeEventListener('resize', this.boundResize);
        window.removeEventListener('keydown', this.boundKonami);
        this.container.innerHTML = '';
    }
}
