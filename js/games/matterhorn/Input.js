export default class Input {
    constructor() {
        this.forward = false;
        this.backward = false;
        this.left = false;
        this.right = false;
        this.shift = false;
        this.interact = false;

        this.cameraYaw = 0;
        this.cameraPitch = 0;

        this.mouseLocked = false;

        this.recentInteractPress = false;

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onClick = this._onClick.bind(this);
        this._onPointerLockChange = this._onPointerLockChange.bind(this);

        this.bindEvents();
    }

    bindEvents() {
        window.addEventListener("keydown", this._onKeyDown);
        window.addEventListener("keyup", this._onKeyUp);
        window.addEventListener("mousemove", this._onMouseMove);
        window.addEventListener("click", this._onClick);
        document.addEventListener("pointerlockchange", this._onPointerLockChange);
    }

    unbindEvents() {
        window.removeEventListener("keydown", this._onKeyDown);
        window.removeEventListener("keyup", this._onKeyUp);
        window.removeEventListener("mousemove", this._onMouseMove);
        window.removeEventListener("click", this._onClick);
        document.removeEventListener("pointerlockchange", this._onPointerLockChange);
        if (document.pointerLockElement === document.body) {
            document.exitPointerLock();
        }
    }

    _onKeyDown(e) {
        if (e.code === "KeyW") this.forward = true;
        if (e.code === "KeyS") this.backward = true;
        if (e.code === "KeyA") this.left = true;
        if (e.code === "KeyD") this.right = true;
        if (e.code === "ShiftLeft") this.shift = true;
        if (e.code === "KeyE") this.recentInteractPress = true;
    }

    _onKeyUp(e) {
        if (e.code === "KeyW") this.forward = false;
        if (e.code === "KeyS") this.backward = false;
        if (e.code === "KeyA") this.left = false;
        if (e.code === "KeyD") this.right = false;
        if (e.code === "ShiftLeft") this.shift = false;
    }

    _onMouseMove(e) {
        if (!this.mouseLocked) return;

        this.cameraYaw -= e.movementX * 0.002;
        this.cameraPitch -= e.movementY * 0.002;
        this.cameraPitch = Math.max(-1.2, Math.min(1.2, this.cameraPitch));
    }

    _onClick() {
        // Only request pointer lock if the game is active (not paused/menu) and canvas is clicked
        // We'll handle this check in Game.js or ensure this is only called when appropriate
        if (!this.mouseLocked && document.getElementById('matterhorn-game') && !document.getElementById('matterhorn-game').classList.contains('hidden')) {
             // Don't lock if clicking on UI buttons?
             // For now, simple logic
             document.body.requestPointerLock();
        }
    }

    _onPointerLockChange() {
        this.mouseLocked = (document.pointerLockElement === document.body);
    }

    update() {
        // Interact flag only true for one frame
        this.interact = this.recentInteractPress;
        this.recentInteractPress = false;
    }
}
