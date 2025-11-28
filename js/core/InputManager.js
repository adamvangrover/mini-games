export default class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        this.listeners = [];

        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            this.keys[e.code] = true; // Support both key and code
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            this.keys[e.code] = false;
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        window.addEventListener('mousedown', () => this.mouse.down = true);
        window.addEventListener('mouseup', () => this.mouse.down = false);
    }

    isKeyDown(key) {
        return !!this.keys[key];
    }

    getMouse() {
        return this.mouse;
        if (InputManager.instance) return InputManager.instance;

        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        this.touch = { x: 0, y: 0, active: false };

        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.boundMouseDown = this.handleMouseDown.bind(this);
        this.boundMouseUp = this.handleMouseUp.bind(this);
        this.boundMouseMove = this.handleMouseMove.bind(this);

        // Touch events
        this.boundTouchStart = this.handleTouchStart.bind(this);
        this.boundTouchEnd = this.handleTouchEnd.bind(this);
        this.boundTouchMove = this.handleTouchMove.bind(this);

        this.init();
    }

    init() {
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);
        window.addEventListener('mousedown', this.boundMouseDown);
        window.addEventListener('mouseup', this.boundMouseUp);
        window.addEventListener('mousemove', this.boundMouseMove);

        window.addEventListener('touchstart', this.boundTouchStart, { passive: false });
        window.addEventListener('touchend', this.boundTouchEnd);
        window.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    }

    cleanup() {
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);
        window.removeEventListener('mousedown', this.boundMouseDown);
        window.removeEventListener('mouseup', this.boundMouseUp);
        window.removeEventListener('mousemove', this.boundMouseMove);

        window.removeEventListener('touchstart', this.boundTouchStart);
        window.removeEventListener('touchend', this.boundTouchEnd);
        window.removeEventListener('touchmove', this.boundTouchMove);

        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);

        this.attach();

        InputManager.instance = this;
    }

    static getInstance() {
        return InputManager.instance || new InputManager();
    }

    attach() {
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mouseup', this.handleMouseUp);
        // Touch events...
    }

    detach() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mouseup', this.handleMouseUp);
    }

    reset() {
        this.keys = {};
        this.mouse.down = false;
    }

    handleKeyDown(e) {
        this.keys[e.code] = true;
    }

    handleKeyUp(e) {
        this.keys[e.code] = false;
    }

    handleMouseDown(e) {
        this.mouse.down = true;
    }

    handleMouseUp(e) {
        this.mouse.down = false;
    }

    handleMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
    }

    handleTouchStart(e) {
        this.touch.active = true;
        this.touch.x = e.touches[0].clientX;
        this.touch.y = e.touches[0].clientY;
    }

    handleTouchEnd(e) {
        if (e.touches.length === 0) {
            this.touch.active = false;
        }
    }

    handleTouchMove(e) {
        if (e.touches.length > 0) {
             this.touch.x = e.touches[0].clientX;
             this.touch.y = e.touches[0].clientY;
        }
    handleMouseDown() {
        this.mouse.down = true;
    }

    handleMouseUp() {
        this.mouse.down = false;
    }

    isKeyDown(code) {
        return !!this.keys[code];
    }
}
