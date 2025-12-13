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
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Mouse
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

        // Touch - Map to Mouse for compatibility
        window.addEventListener('touchstart', (e) => {
            this.mouse.down = true;
            this.updateTouchPos(e);
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            this.mouse.down = false;
            // Keep last position or update if touches remain?
            // Usually keeping last pos is fine.
        });

        window.addEventListener('touchmove', (e) => {
            this.updateTouchPos(e);
        }, { passive: true });
    }

    updateTouchPos(e) {
        if (e.touches.length > 0) {
            this.mouse.x = e.touches[0].clientX;
            this.mouse.y = e.touches[0].clientY;
        }
    }

    isKeyDown(code) {
        return !!this.keys[code];
    }

    getMouse() {
        return this.mouse;
    }
}
