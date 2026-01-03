export default class NumberRecycler {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        this.canvas = game.canvas;
        this.mathEngine = game.mathEngine;
        this.input = game.input;

        this.isActive = false;
        this.score = 0;
        this.completedEquations = 0;
        this.targetEquations = 5;

        this.currentEquation = null;
        this.slots = [];
        this.draggables = [];
        this.draggingItem = null;
    }

    init() {
        this.isActive = true;
        this.completedEquations = 0;
        this.setupLevel();
    }

    setupLevel() {
        // Generate equation like "x + 5 = 12"
        const prob = this.mathEngine.generateProblem(); // {question: "7 + 5", answer: 12}
        // Parse "7 + 5" into parts
        const parts = prob.question.split(' '); // ["7", "+", "5"]
        // parts[0] is '7', parts[1] is '+', parts[2] is '5'
        const c = prob.answer;

        this.equationStructure = [parts[0], parts[1], parts[2], '=', c];

        // Blank out 'a' (index 0) or 'b' (index 2)
        const blankIdx = [0, 2][Math.floor(Math.random() * 2)];
        this.targetValue = this.equationStructure[blankIdx];
        this.equationStructure[blankIdx] = '?';

        // Create Slots
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        this.slots = [{
            x: centerX - 100 + (blankIdx * 60),
            y: centerY - 50,
            width: 50,
            height: 50,
            value: null,
            expected: this.targetValue
        }];

        // Create Draggables (Correct + Distractions)
        this.draggables = [];
        const opts = [parseInt(this.targetValue)];
        while(opts.length < 4) {
            const r = Math.floor(Math.random() * 20);
            if (!opts.includes(r)) opts.push(r);
        }
        opts.sort(() => Math.random() - 0.5);

        opts.forEach((val, i) => {
            this.draggables.push({
                x: centerX - 150 + (i * 80),
                y: centerY + 100,
                width: 50,
                height: 50,
                value: val,
                isDragging: false,
                homeX: centerX - 150 + (i * 80),
                homeY: centerY + 100
            });
        });
    }

    update(dt) {
        if (!this.isActive) return;

        const mx = this.input.mouse.x;
        const my = this.input.mouse.y;
        const mDown = this.input.mouse.down;

        // Drag Logic
        if (mDown && !this.draggingItem) {
            for (let d of this.draggables) {
                if (mx >= d.x && mx <= d.x + d.width && my >= d.y && my <= d.y + d.height) {
                    this.draggingItem = d;
                    d.isDragging = true;
                    break;
                }
            }
        }

        if (!mDown && this.draggingItem) {
            // Drop
            let dropped = false;
            for (let s of this.slots) {
                if (this.checkOverlap(this.draggingItem, s)) {
                    // Check Logic
                    if (parseInt(this.draggingItem.value) === parseInt(s.expected)) {
                        this.handleCorrect();
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

        if (this.draggingItem) {
            this.draggingItem.x = mx - this.draggingItem.width / 2;
            this.draggingItem.y = my - this.draggingItem.height / 2;
        }
    }

    handleCorrect() {
        window.miniGameHub.soundManager.playSound('powerup');
        this.completedEquations++;
        if (this.completedEquations >= this.targetEquations) {
            this.game.nextLevel();
        } else {
            this.setupLevel();
        }
    }

    handleIncorrect() {
        window.miniGameHub.soundManager.playSound('error');
        // Visual feedback?
    }

    checkOverlap(r1, r2) {
        return (r1.x < r2.x + r2.width &&
                r1.x + r1.width > r2.x &&
                r1.y < r2.y + r2.height &&
                r1.y + r1.height > r2.y);
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Chamber UI
        ctx.fillStyle = '#222';
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 4;
        ctx.strokeRect(100, 100, this.canvas.width - 200, this.canvas.height - 200);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '30px Arial';
        ctx.fillText(`Fuel Refinement: ${this.completedEquations}/${this.targetEquations}`, this.canvas.width/2, 60);

        // Equation
        const startX = this.canvas.width / 2 - 100;
        const startY = this.canvas.height / 2;

        this.equationStructure.forEach((part, i) => {
            const x = startX + (i * 60);
            if (part === '?') {
                ctx.strokeStyle = '#ff0';
                ctx.strokeRect(x - 20, startY - 30, 40, 40);
            } else {
                ctx.fillStyle = '#fff';
                ctx.fillText(part, x, startY);
            }
        });

        // Draggables
        this.draggables.forEach(d => {
            ctx.fillStyle = '#444';
            ctx.fillRect(d.x, d.y, d.width, d.height);
            ctx.strokeStyle = '#0ff';
            ctx.strokeRect(d.x, d.y, d.width, d.height);

            ctx.fillStyle = '#fff';
            ctx.fillText(d.value, d.x + d.width/2, d.y + d.height/2 + 10);
        });
    }
}
