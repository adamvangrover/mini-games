import State from "../State.js";

export default class PhotoGame {
    constructor(scene, camera, wildlifeManager, onFinish) {
        this.scene = scene;
        this.camera = camera;
        this.wildlifeManager = wildlifeManager;
        this.onFinish = onFinish;

        this.active = true;
        this.zoom = 1;
        this.initialZoom = camera.zoom;

        // Overlay
        this.root = document.createElement("div");
        this.root.style = `
            position: fixed; inset:0;
            background: rgba(0,0,0,0.2);
            backdrop-filter: blur(2px);
            pointer-events:none;
            z-index: 1900;
        `;

        // Reticle
        this.reticle = document.createElement("div");
        this.reticle.style = `
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 200px; height: 150px;
            border: 2px solid rgba(255,255,255,0.8);
            box-shadow: 0 0 0 1000px rgba(0,0,0,0.5);
        `;
        this.root.appendChild(this.reticle);

        document.body.appendChild(this.root);

        this.info = document.createElement("div");
        this.info.style = `
            position: absolute; bottom:20px; left:20px;
            color:white; font-size:20px; text-shadow: 0 2px 4px black;
        `;
        this.info.textContent = "Mouse Wheel = Zoom | Click = Capture | ESC = Exit";
        this.root.appendChild(this.info);

        this.clickHandler = () => this.takePhoto();
        this.wheelHandler = (e) => this.handleZoom(e);
        this.keyHandler = (e) => {
            if (e.code === "Escape") this.endGame(0);
        };

        // Use a slight delay to avoid immediate click trigger from interaction
        setTimeout(() => {
             window.addEventListener("click", this.clickHandler);
             window.addEventListener("wheel", this.wheelHandler);
             window.addEventListener("keydown", this.keyHandler);
             // Enable pointer events on root for capturing clicks if needed,
             // but global click listener works too.
             this.root.style.pointerEvents = "auto";
        }, 100);
    }

    handleZoom(e) {
        this.zoom += e.deltaY * -0.001;
        this.zoom = Math.max(0.5, Math.min(3, this.zoom));
        this.camera.zoom = this.zoom;
        this.camera.updateProjectionMatrix();
    }

    takePhoto() {
        if (!this.active) return;

        // Detect animals in frame
        let score = 0;

        const frustum = new THREE.Frustum();
        const projScreenMatrix = new THREE.Matrix4();
        projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(projScreenMatrix);

        // Access animals
        const ibexList = this.wildlifeManager ? this.wildlifeManager.ibex : [];

        for (const ibex of ibexList) {
            if (frustum.containsPoint(ibex.mesh.position)) {
                const dist = this.camera.position.distanceTo(ibex.mesh.position);
                // Score better if closer, but not too close
                if (dist < 50) {
                    score += Math.max(0, 80 - dist * 0.7);
                }
            }
        }

        const reward = Math.round(score);

        // Shutter flash
        const flash = document.createElement("div");
        flash.style = `
            position:fixed; inset:0;
            background:white; opacity:1;
            pointer-events:none;
            transition:opacity 0.3s;
            z-index: 2000;
        `;
        document.body.appendChild(flash);

        setTimeout(() => {
            flash.style.opacity = 0;
            setTimeout(() => flash.remove(), 300);
        }, 20);

        if (score > 0) {
            State.addMoney(reward);
            this.onFinish(`📸 Great shot! Earned ₣${reward}`);
        } else {
            this.onFinish(`📸 No animals in frame.`);
        }

        this.endGame(reward);
    }

    endGame(r) {
        this.active = false;
        this.root.remove();
        window.removeEventListener("click", this.clickHandler);
        window.removeEventListener("wheel", this.wheelHandler);
        window.removeEventListener("keydown", this.keyHandler);

        // Reset camera zoom
        this.camera.zoom = this.initialZoom;
        this.camera.updateProjectionMatrix();

        if (r === 0 && !this.onFinishCalled) {
             // If exited without taking photo (ESC)
             this.onFinish(`Photo mode exited.`);
        }
    }
}
