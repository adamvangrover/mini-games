import State from "../State.js";

export default class FondueGame {
    constructor(onFinish) {
        this.onFinish = onFinish;
        this.active = true;

        this.root = document.createElement("div");
        this.root.id = "fondue-game";
        this.root.style = `
            position: fixed; inset:0;
            background: rgba(0,0,0,0.85);
            display:flex;flex-direction:column;
            align-items:center;justify-content:center;
            color:white;font-family:sans-serif;
            z-index: 2000;
        `;

        this.label = document.createElement("div");
        this.label.innerHTML = "🧀 Swiss Fondue — Tap SPACE to raise heat<br>Don’t let it burn or go cold!";
        this.label.style.marginBottom = "30px";
        this.root.appendChild(this.label);

        this.canvas = document.createElement("canvas");
        this.canvas.width = 600;
        this.canvas.height = 80;
        this.canvas.style.border = "2px solid white";
        this.root.appendChild(this.canvas);

        document.body.appendChild(this.root);

        this.ctx = this.canvas.getContext("2d");

        this.temp = 50;
        this.space = false;

        this.keyHandler = (e) => {
            if (e.code === "Space") this.space = true;
        };
        window.addEventListener("keydown", this.keyHandler);

        this.time = 0;
        this.lastTime = performance.now();

        // Start loop
        this._loop = this._loop.bind(this);
        requestAnimationFrame(this._loop);
    }

    _loop(now) {
        if (!this.active) return;
        const dt = (now - this.lastTime) / 1000 || 0;
        this.lastTime = now;

        this.update(dt);
        requestAnimationFrame(this._loop);
    }

    update(dt) {
        // space = raise heat
        if (this.space) {
            this.temp += 40 * dt;
        } else {
            this.temp -= 12 * dt;
        }
        this.space = false;

        this.temp = Math.min(100, Math.max(0, this.temp));

        this.draw();

        this.time += dt;

        // Game lasts 10 seconds
        if (this.time >= 10) {
            this.endGame();
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0,0,600,80);

        // Green safe zone
        ctx.fillStyle = "green";
        ctx.fillRect(250, 0, 100, 80);

        // Temp bar
        ctx.fillStyle = "yellow";
        const x = (this.temp / 100) * 600;
        ctx.fillRect(x - 5, 0, 10, 80);
    }

    endGame() {
        const center = 300;
        const x = (this.temp / 100) * 600;
        const dist = Math.abs(x - center);

        const score = Math.max(0, 100 - dist);
        const reward = Math.round(score * 0.25);

        State.addMoney(reward);

        this.cleanup();
        this.onFinish(`Fondue cooked! Earned ₣${reward}`);
    }

    cleanup() {
        this.active = false;
        this.root.remove();
        window.removeEventListener("keydown", this.keyHandler);
    }
}
