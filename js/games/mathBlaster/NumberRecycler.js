export default class NumberRecycler {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;
        this.mathEngine = game.mathEngine;
        this.input = game.input;

        this.isActive = false;
        this.completedEquations = 0;
        this.targetEquations = 5;

        this.currentEquation = null;
        this.slots = [];
        this.draggables = [];
        this.draggingItem = null;
        this.particles = window.miniGameHub.particleSystem; // Global particle system
    }

    init() {
        this.isActive = true;
        this.completedEquations = 0;
        this.setupLevel();
    }

    setupLevel() {
        const prob = this.mathEngine.generateProblem();
        const parts = prob.question.split(' ');
        const c = prob.answer;

        this.equationStructure = [parts[0], parts[1], parts[2], '=', c];

        // Randomly blank out 'a' (0), 'b' (2), or 'c' (4) - wait, structure is [a, op, b, =, c]
        // Let's allow blanking the answer too for variety
        const validBlanks = [0, 2, 4];
        const blankIdx = validBlanks[Math.floor(Math.random() * validBlanks.length)];
        this.targetValue = this.equationStructure[blankIdx];
        this.equationStructure[blankIdx] = '?';

        // Update slots
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const spacing = 80;
        const startX = centerX - (2 * spacing); // Center the 5 parts

        this.slots = [];
        if (this.equationStructure[blankIdx] === '?') {
            this.slots.push({
                x: startX + (blankIdx * spacing) - 30,
                y: centerY - 80,
                width: 60,
                height: 60,
                value: null,
                expected: this.targetValue
            });
        }

        // Draggables
        this.draggables = [];
        const opts = [parseInt(this.targetValue)];
        while(opts.length < 4) {
            // Smart distractors
            let fake = parseInt(this.targetValue) + Math.floor(Math.random() * 10) - 5;
            if (fake !== parseInt(this.targetValue) && !opts.includes(fake)) opts.push(fake);
        }
        opts.sort(() => Math.random() - 0.5);

        const dragStartX = centerX - ((opts.length * 90) / 2) + 45;
        opts.forEach((val, i) => {
            this.draggables.push({
                x: dragStartX + (i * 90) - 30,
                y: centerY + 100,
                width: 60,
                height: 60,
                value: val,
                isDragging: false,
                homeX: dragStartX + (i * 90) - 30,
                homeY: centerY + 100,
                color: `hsl(${Math.random() * 360}, 70%, 50%)`
            });
        });
    }

    update(dt) {
        if (!this.isActive) return;

        const mx = this.input.mouse.x;
        const my = this.input.mouse.y;
        const mDown = this.input.mouse.down;

        // Drag Start
        if (mDown && !this.draggingItem) {
            for (let d of this.draggables) {
                if (mx >= d.x && mx <= d.x + d.width && my >= d.y && my <= d.y + d.height) {
                    this.draggingItem = d;
                    d.isDragging = true;
                    // Move to front (visual only, array order matters for hit test but handled by break)
                    break;
                }
            }
        }

        // Drag Release
        if (!mDown && this.draggingItem) {
            let dropped = false;
            for (let s of this.slots) {
                if (this.checkOverlap(this.draggingItem, s)) {
                    // Check Logic
                    if (parseInt(this.draggingItem.value) === parseInt(s.expected)) {
                        this.handleCorrect(s);
                    } else {
                        this.handleIncorrect();
                    }
                    dropped = true;
                }
            }

            // Reset position
            this.draggingItem.x = this.draggingItem.homeX;
            this.draggingItem.y = this.draggingItem.homeY;
            this.draggingItem.isDragging = false;
            this.draggingItem = null;
        }

        // Drag Move
        if (this.draggingItem) {
            this.draggingItem.x = mx - this.draggingItem.width / 2;
            this.draggingItem.y = my - this.draggingItem.height / 2;
        }
    }

    handleCorrect(slot) {
        window.miniGameHub.soundManager.playSound('powerup');
        // Visuals
        if (this.particles) this.particles.emit(slot.x + 30, slot.y + 30, '#0f0', 30);

        this.completedEquations++;
        if (this.completedEquations >= this.targetEquations) {
            window.miniGameHub.showToast("RECYCLER COMPLETE!");
            this.game.nextLevel();
        } else {
            this.setupLevel();
        }
    }

    handleIncorrect() {
        window.miniGameHub.soundManager.playSound('error');
        window.miniGameHub.showToast("INCORRECT!", 1000);
        // Maybe screen shake?
    }

    checkOverlap(r1, r2) {
        const c1 = { x: r1.x + r1.width/2, y: r1.y + r1.height/2 };
        const c2 = { x: r2.x + r2.width/2, y: r2.y + r2.height/2 };
        const dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
        return dist < 50; // Simple distance check
    }

    draw() {
        const ctx = this.ctx;
        // Background cleared by main loop

        // Chamber UI
        const cw = 600;
        const ch = 400;
        const cx = (this.canvas.width - cw) / 2;
        const cy = (this.canvas.height - ch) / 2;

        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#0ff';
        ctx.strokeRect(cx, cy, cw, ch);

        ctx.fillStyle = 'rgba(0, 20, 40, 0.8)';
        ctx.fillRect(cx, cy, cw, ch);
        ctx.shadowBlur = 0;

        // Header
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '24px "Segoe UI"';
        ctx.fillText(`FUSION CORE STABILIZATION`, this.canvas.width/2, cy + 40);

        // Progress Bar
        ctx.fillStyle = '#333';
        ctx.fillRect(cx + 100, cy + 60, cw - 200, 10);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(cx + 100, cy + 60, (this.completedEquations / this.targetEquations) * (cw - 200), 10);

        // Equation Parts
        const spacing = 80;
        const startX = this.canvas.width / 2 - (2 * spacing);
        const startY = this.canvas.height / 2 - 50;

        this.equationStructure.forEach((part, i) => {
            const x = startX + (i * spacing);

            if (part === '?') {
                // Draw Slot
                ctx.strokeStyle = '#ff0';
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(x - 30, startY - 30, 60, 60);
                ctx.setLineDash([]);

                ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
                ctx.fillRect(x - 30, startY - 30, 60, 60);
            } else {
                // Static part
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 40px monospace';
                ctx.textBaseline = 'middle';
                ctx.fillText(part, x, startY);
            }
        });

        ctx.textBaseline = 'alphabetic';

        // Draggables
        this.draggables.forEach(d => {
            // Shadow if dragging
            if (d.isDragging) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = d.color;
            }

            // Hexagon shape
            this.drawHexagon(ctx, d.x + d.width/2, d.y + d.height/2, d.width/2, d.color);
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 30px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(d.value, d.x + d.width/2, d.y + d.height/2);
            ctx.textBaseline = 'alphabetic';
        });
    }

    drawHexagon(ctx, x, y, r, color) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            ctx.lineTo(x + r * Math.cos(i * Math.PI / 3), y + r * Math.sin(i * Math.PI / 3));
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(40, 40, 40, 0.9)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.stroke();
    }

    resize() {
        this.setupLevel(); // Reset positions
    }
}
