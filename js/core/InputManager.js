export default class InputManager {
    constructor() {
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
    }

    isKeyDown(code) {
        return !!this.keys[code];
    }
}
