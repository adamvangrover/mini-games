import SoundManager from '../core/SoundManager.js';

export default class NeonChance {
    constructor() {
        this.ctx = null;
        this.canvas = null;
        this.container = null;
        this.mode = 'MENU'; // MENU, COIN, DICE
        this.animation = { active: false, t: 0, result: null };
        this.coinState = { angle: 0, height: 0, face: 'HEADS' }; // HEADS, TAILS
        this.diceState = { value: 1, rotation: 0 };
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.style.position = 'relative';

        this.canvas = document.createElement('canvas');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.display = 'block';
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        // UI Layer
        const ui = document.createElement('div');
        ui.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; display:flex; flex-direction:column; justify-content:center; align-items:center;";
        ui.innerHTML = `
            <div id="chance-menu" class="flex flex-col gap-4 pointer-events-auto">
                <h1 class="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-8" style="text-shadow: 0 0 20px rgba(0,255,255,0.5);">NEON CHANCE</h1>
                <button id="btn-coin" class="px-8 py-4 bg-slate-800 border-2 border-cyan-500 rounded text-xl font-bold text-cyan-400 hover:bg-slate-700 hover:scale-105 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    <i class="fas fa-coins mr-2"></i> FLIP COIN
                </button>
                <button id="btn-dice" class="px-8 py-4 bg-slate-800 border-2 border-fuchsia-500 rounded text-xl font-bold text-fuchsia-400 hover:bg-slate-700 hover:scale-105 transition-all shadow-[0_0_15px_rgba(217,70,239,0.3)]">
                    <i class="fas fa-dice mr-2"></i> ROLL DICE
                </button>
                <button id="btn-exit" class="mt-8 px-6 py-2 bg-red-900/50 border border-red-500 rounded text-red-300 hover:bg-red-800/50">EXIT</button>
            </div>

            <div id="chance-controls" class="hidden pointer-events-auto flex flex-col items-center gap-4 mt-[300px]">
                <button id="btn-action" class="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow-lg text-xl">FLIP!</button>
                <button id="btn-back" class="px-4 py-2 text-slate-400 hover:text-white underline">Back to Menu</button>
            </div>
        `;
        this.container.appendChild(ui);

        this.menuDiv = document.getElementById('chance-menu');
        this.controlsDiv = document.getElementById('chance-controls');
        this.actionBtn = document.getElementById('btn-action');

        // Bindings
        document.getElementById('btn-coin').onclick = () => this.setMode('COIN');
        document.getElementById('btn-dice').onclick = () => this.setMode('DICE');
        document.getElementById('btn-exit').onclick = () => window.miniGameHub.goBack();
        document.getElementById('btn-back').onclick = () => this.setMode('MENU');

        this.actionBtn.onclick = () => this.triggerAction();

        window.addEventListener('resize', this.resize.bind(this));
        this.resize();
    }

    setMode(mode) {
        this.mode = mode;
        this.animation.active = false;

        if (mode === 'MENU') {
            this.menuDiv.classList.remove('hidden');
            this.controlsDiv.classList.add('hidden');
        } else {
            this.menuDiv.classList.add('hidden');
            this.controlsDiv.classList.remove('hidden');

            if (mode === 'COIN') {
                this.actionBtn.textContent = "FLIP COIN";
                this.actionBtn.className = "px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow-lg text-xl transition-all shadow-[0_0_20px_cyan]";
            } else {
                this.actionBtn.textContent = "ROLL DICE";
                this.actionBtn.className = "px-8 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded shadow-lg text-xl transition-all shadow-[0_0_20px_magenta]";
            }
        }
    }

    triggerAction() {
        if (this.animation.active) return;

        this.animation.active = true;
        this.animation.t = 0;

        if (this.mode === 'COIN') {
            SoundManager.getInstance().playSound('jump'); // Using jump as a generic swoosh
            this.animation.result = Math.random() > 0.5 ? 'HEADS' : 'TAILS';
            // Duration ~2s
        } else {
             SoundManager.getInstance().playSound('click');
             this.animation.result = Math.floor(Math.random() * 6) + 1;
        }
    }

    resize() {
        if (this.canvas && this.container) {
            this.canvas.width = this.container.clientWidth;
            this.canvas.height = this.container.clientHeight;
        }
    }

    update(dt) {
        if (this.animation.active) {
            this.animation.t += dt;

            if (this.mode === 'COIN') {
                const duration = 2.0;
                if (this.animation.t >= duration) {
                    this.animation.active = false;
                    this.coinState.face = this.animation.result;
                    this.coinState.height = 0;
                    this.coinState.angle = 0;
                    SoundManager.getInstance().playSound('score');
                    window.miniGameHub.showToast(`It's ${this.animation.result}!`);
                } else {
                    // Parabolic arc for height
                    const progress = this.animation.t / duration;
                    this.coinState.height = Math.sin(progress * Math.PI) * 200;
                    // Spin fast then slow down
                    this.coinState.angle = (this.animation.t * 20) % (Math.PI * 2);
                }
            } else if (this.mode === 'DICE') {
                const duration = 1.0;
                if (this.animation.t >= duration) {
                    this.animation.active = false;
                    this.diceState.value = this.animation.result;
                    SoundManager.getInstance().playSound('score');
                    window.miniGameHub.showToast(`You rolled a ${this.animation.result}!`);
                } else {
                     // Scramble value
                     if (Math.random() > 0.8) SoundManager.getInstance().playSound('click');
                     this.diceState.value = Math.floor(Math.random() * 6) + 1;
                     this.diceState.rotation += dt * 10;
                }
            }
        }
    }

    draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2 - 50;

        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, w, h);

        // Grid background
        this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        this.ctx.lineWidth = 1;
        const gridSize = 50;
        const offset = (Date.now() / 50) % gridSize;

        for(let x=0; x<w; x+=gridSize) {
            this.ctx.beginPath(); this.ctx.moveTo(x,0); this.ctx.lineTo(x,h); this.ctx.stroke();
        }
        for(let y=0; y<h; y+=gridSize) {
            this.ctx.beginPath(); this.ctx.moveTo(0,y); this.ctx.lineTo(w,y); this.ctx.stroke();
        }

        if (this.mode === 'COIN') {
            this.drawCoin(cx, cy - this.coinState.height, this.coinState.angle);
        } else if (this.mode === 'DICE') {
            this.drawDice(cx, cy, this.diceState.value, this.diceState.rotation);
        }
    }

    drawCoin(x, y, angle) {
        const size = 80;
        // Simulate 3D spin by scaling width
        const scaleX = Math.cos(angle);
        const drawWidth = Math.abs(scaleX * size);

        // Face determination
        // If cos(angle) > 0, we see front. If < 0, back.
        // But we want to land on specific face.
        // During animation, we just flip.
        // At end, we show result.

        let face = this.coinState.face;
        if (this.animation.active) {
            // Flashing faces
             face = Math.sin(angle) > 0 ? 'HEADS' : 'TAILS';
        }

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(scaleX, 1);

        // Outer Ring
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size, 0, Math.PI * 2);
        this.ctx.fillStyle = '#f59e0b'; // Gold
        this.ctx.fill();
        this.ctx.strokeStyle = '#fcd34d';
        this.ctx.lineWidth = 5;
        this.ctx.stroke();

        // Inner detail
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#d97706';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Text (Ensure it's not mirrored if scaleX is negative)
        this.ctx.scale(Math.sign(scaleX) || 1, 1);

        this.ctx.fillStyle = '#78350f';
        this.ctx.font = 'bold 30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(face === 'HEADS' ? '$' : '%', 0, 0); // Symbols for heads/tails

        this.ctx.restore();

        // Shadow
        const shadowScale = 1 - (this.coinState.height / 300);
        if (shadowScale > 0) {
            this.ctx.beginPath();
            this.ctx.ellipse(x, y + this.coinState.height + 100, size * shadowScale, size * 0.3 * shadowScale, 0, 0, Math.PI*2);
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.fill();
        }
    }

    drawDice(x, y, value, rotation) {
        const size = 100;
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation);

        // Draw Rounded Rect for Dice Body
        this.ctx.beginPath();
        this.ctx.roundRect(-size/2, -size/2, size, size, 15);
        this.ctx.fillStyle = '#d946ef'; // Fuchsia
        this.ctx.fill();
        this.ctx.strokeStyle = '#f0abfc';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#d946ef';
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Draw Pips
        this.ctx.fillStyle = 'white';
        const pipSize = 10;
        const pos = size / 4;

        const drawPip = (px, py) => {
            this.ctx.beginPath();
            this.ctx.arc(px, py, pipSize, 0, Math.PI*2);
            this.ctx.fill();
        };

        // Standard Dice Pip Positions
        if (value % 2 === 1) drawPip(0, 0); // Center for 1, 3, 5
        if (value > 1) { drawPip(-pos, -pos); drawPip(pos, pos); } // 2, 3, 4, 5, 6
        if (value > 3) { drawPip(pos, -pos); drawPip(-pos, pos); } // 4, 5, 6
        if (value === 6) { drawPip(-pos, 0); drawPip(pos, 0); } // 6

        this.ctx.restore();
    }

    shutdown() {
        window.removeEventListener('resize', this.resize);
    }
}
