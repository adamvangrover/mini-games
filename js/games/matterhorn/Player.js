import State from "./State.js";
import { Utils } from "./Utils.js";

export default class Player {
    constructor(scene) {
        this.scene = scene;

        this.position = new THREE.Vector3(0, 5, 0);
        this.velocity = new THREE.Vector3();

        this.speed = 6;
        this.runMultiplier = 1.8;
        this.gravity = -20;
        this.onGround = false;

        this.height = 1.8;

        // A simple visible placeholder model
        // Fallback for older Three.js
        const geo = (typeof THREE.CapsuleGeometry !== 'undefined')
            ? new THREE.CapsuleGeometry(0.35, 1.2, 4, 8)
            : new THREE.CylinderGeometry(0.35, 0.35, 1.2, 8);

        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        // Procedural animation properties
        this.animationTime = 0;
        this.bobSpeed = 10;
        this.bobAmount = 0.07;
        this.tiltAmount = 0.1;

        // Interaction anchor point
        this.interactionPoint = new THREE.Vector3();

        // Stats
        this.lightPower = 0;
    }

    update(dt, input) {
        // ---- MOVEMENT ----
        const direction = new THREE.Vector3();
        if (input.forward) direction.z -= 1;
        if (input.backward) direction.z += 1;
        if (input.left) direction.x -= 1;
        if (input.right) direction.x += 1;

        const isRunning = input.shift && State.get("stamina") > 5;
        const finalSpeed = isRunning ? this.speed * this.runMultiplier : this.speed;

        if (direction.length() > 0) {
            direction.normalize();
            const angle = input.cameraYaw;
            direction.applyAxisAngle(new THREE.Vector3(0,1,0), angle);
        }

        // Horizontal velocity
        const targetVelocityX = direction.x * finalSpeed;
        const targetVelocityZ = direction.z * finalSpeed;

        this.velocity.x = Utils.lerp(this.velocity.x, targetVelocityX, 0.15);
        this.velocity.z = Utils.lerp(this.velocity.z, targetVelocityZ, 0.15);


        // ---- STAMINA ----
        if (isRunning && direction.length() > 0) {
            State.set("stamina", Utils.clamp(State.get("stamina") - dt * 12, 0, 100));
        } else {
            State.set("stamina", Utils.clamp(State.get("stamina") + dt * 8, 0, 100));
        }

        // ---- GRAVITY ----
        if (!this.onGround) this.velocity.y += this.gravity * dt;

        // Apply velocity
        this.position.addScaledVector(this.velocity, dt);

        // Simple ground collision (terrain from World.js handles height)
        const world = State.get("world");
        if (world) {
            const groundY = world.getHeightAt(this.position.x, this.position.z);
            if (this.position.y <= groundY + this.height / 2) {
                this.position.y = groundY + this.height / 2;
                this.velocity.y = 0;
                this.onGround = true;
            } else {
                this.onGround = false;
            }
        }

        // ---- TEMPERATURE (higher altitude = colder) ----
        const altitude = this.position.y;
        const targetTemp = Utils.clamp(100 - (altitude * 0.04), 0, 100);
        const curr = State.get("temperature");
        State.set("temperature", Utils.lerp(curr, targetTemp, dt * 0.3));

        // ---- UPDATE MESH & PROCEDURAL ANIMATION ----
        this.mesh.position.copy(this.position);

        const horizontalSpeed = new THREE.Vector2(this.velocity.x, this.velocity.z).length();

        if (this.onGround && horizontalSpeed > 1) {
             // Bobbing
            const runFactor = isRunning ? 1.5 : 1;
            this.animationTime += dt * this.bobSpeed * runFactor;
            const bobOffset = Math.sin(this.animationTime) * this.bobAmount * runFactor;
            this.mesh.position.y += bobOffset;

            // Tilting
            const rightVector = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0));
            const rightVelocity = new THREE.Vector3(this.velocity.x, 0, this.velocity.z).dot(rightVector);
            const targetTilt = -rightVelocity * 0.05 * this.tiltAmount; // Small multiplier to make it subtle
            this.mesh.rotation.z = Utils.lerp(this.mesh.rotation.z, targetTilt, dt * 10);
        } else {
             // Reset tilt when idle
            this.mesh.rotation.z = Utils.lerp(this.mesh.rotation.z, 0, dt * 10);
        }

        // Interaction anchor (about 1.5m in front of player)
        this.interactionPoint.set(0, this.height * 0.5, -1.5)
            .applyAxisAngle(new THREE.Vector3(0,1,0), input.cameraYaw)
            .add(this.position);
    }
}
