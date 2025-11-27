// Matterhorn specific Input adapter that wraps the global InputManager
export default class InputAdapter {
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
        this.lastInteractState = false;

        this._onPointerLockChange = this._onPointerLockChange.bind(this);
        this._onClick = this._onClick.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);

        this.bindEvents();
    }

    bindEvents() {
        // We still need local listeners for pointer lock and specific mouse movement
        // because global input manager might store absolute position, but here we need movement delta
        // efficiently for camera look.
        // Actually, InputManager stores mouse x/y, but not movement delta per frame easily without diffing.
        // Let's keep local mouse movement for 3D camera control to ensure smooth FPS look.

        window.addEventListener("mousemove", this._onMouseMove);
        window.addEventListener("click", this._onClick);
        document.addEventListener("pointerlockchange", this._onPointerLockChange);
    }

    unbindEvents() {
        window.removeEventListener("mousemove", this._onMouseMove);
        window.removeEventListener("click", this._onClick);
        document.removeEventListener("pointerlockchange", this._onPointerLockChange);

        if (document.pointerLockElement === document.body) {
            document.exitPointerLock();
        }
    }

    _onMouseMove(e) {
        if (!this.mouseLocked) return;

        this.cameraYaw -= e.movementX * 0.002;
        this.cameraPitch -= e.movementY * 0.002;
        this.cameraPitch = Math.max(-1.2, Math.min(1.2, this.cameraPitch));
    }

    _onClick() {
         if (!this.mouseLocked && document.getElementById('matterhorn-game') && !document.getElementById('matterhorn-game').classList.contains('hidden')) {
             document.body.requestPointerLock();
        }
    }

    _onPointerLockChange() {
        this.mouseLocked = (document.pointerLockElement === document.body);
    }

    update() {
        if (!window.inputManager) return;

        // Map Global InputManager keys to Matterhorn state
        this.forward = window.inputManager.isKeyDown('KeyW');
        this.backward = window.inputManager.isKeyDown('KeyS');
        this.left = window.inputManager.isKeyDown('KeyA');
        this.right = window.inputManager.isKeyDown('KeyD');
        this.shift = window.inputManager.isKeyDown('ShiftLeft');

        // Handle single-frame interact press
        const interactNow = window.inputManager.isKeyDown('KeyE');
        this.interact = (interactNow && !this.lastInteractState);
        this.lastInteractState = interactNow;
    }
}
