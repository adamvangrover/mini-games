export class GameLoop {
    lastTime: number = 0;
    isRunning: boolean = false;
    onUpdate: (dt: number) => void;
    onDraw: () => void;

    constructor(onUpdate: (dt: number) => void, onDraw: () => void) {
        this.onUpdate = onUpdate;
        this.onDraw = onDraw;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
    }

    stop() {
        this.isRunning = false;
    }

    loop = (time: number) => {
        if (!this.isRunning) return;
        const dt = (time - this.lastTime) / 1000; // Delta time in seconds
        this.lastTime = time;

        this.onUpdate(dt);
        this.onDraw();

        requestAnimationFrame(this.loop);
    }
}
