export default class InputManager {
    constructor() {
        if (InputManager.instance) {
            return InputManager.instance;
        }

        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };

        this.bindEvents();
        InputManager.instance = this;
    }

    static getInstance() {
        if (!InputManager.instance) {
            InputManager.instance = new InputManager();
        }
        return InputManager.instance;
    }

    bindEvents() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        window.addEventListener('mousedown', () => {
            this.mouse.down = true;
        });

        window.addEventListener('mouseup', () => {
            this.mouse.down = false;
        });
    }

    isKeyDown(code) {
        return !!this.keys[code];
    }

    getMouse() {
        return this.mouse;
    }
}
