import State from "../State.js";

export default class ChocolateGame {
    constructor(onFinish) {
        this.onFinish = onFinish;

        this.active = true;

        this.root = document.createElement("div");
        this.root.id = "chocolate-game";
        this.root.style = `
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.85);
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            color:white; font-family: sans-serif;
            z-index: 2000;
        `;

        this.label = document.createElement("div");
        this.label.textContent = "⛰ Swiss Chocolate Mix — Press SPACE when the bar hits the center!";
        this.label.style.marginBottom = "30px";
        this.root.appendChild(this.label);

        this.canvas = document.createElement("canvas");
        this.canvas.width = 600;
        this.canvas.height = 80;
        this.canvas.style.border = "2px solid white";
        this.root.appendChild(this.canvas);

        document.body.appendChild(this.root);

        this.ctx = this.canvas.getContext("2d");

        this.x = 0;
        this.speed = 4;

        this.spacePressed = false;

        this.keyHandler = (e) => {
            if (e.code === "Space") {
                this.spacePressed = true;
            }
        };
        window.addEventListener("keydown", this.keyHandler);

        // Start loop
        this._loop = this._loop.bind(this);
        requestAnimationFrame(this._loop);
    }

    _loop() {
        if (!this.active) return;
        this.update();
        requestAnimationFrame(this._loop);
    }

    update() {
        this.x += this.speed;
        if (this.x > this.canvas.width) {
            this.x = 0;
        }

        this.draw();

        if (this.spacePressed) {
            this.endGame();
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0,0,600,80);

        // Target zone
        ctx.fillStyle = "green";
        ctx.fillRect(250, 0, 100, 80);

        // Moving bar
        ctx.fillStyle = "white";
        ctx.fillRect(this.x, 0, 10, 80);
    }

    endGame() {
        // Score based on distance from center
        const center = 300;
        const dist = Math.abs(this.x - center);
        const score = Math.max(0, 100 - dist);

        const reward = Math.round(score * 0.3);
        State.addMoney(reward);

        this.cleanup();
        this.onFinish(`Chocolate made! Earned ₣${reward}`);
    }

    cleanup() {
        this.active = false;
        this.root.remove();
        window.removeEventListener("keydown", this.keyHandler);
    }
}
