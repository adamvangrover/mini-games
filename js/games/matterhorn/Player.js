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
        const geo = new THREE.CapsuleGeometry(0.35, 1.2, 4, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.castShadow = true;
        scene.add(this.mesh);

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
        this.velocity.x = Utils.lerp(this.velocity.x, direction.x * finalSpeed, 0.15);
        this.velocity.z = Utils.lerp(this.velocity.z, direction.z * finalSpeed, 0.15);

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

        // ---- UPDATE MESH ----
        this.mesh.position.copy(this.position);

        // Interaction anchor (about 1.5m in front of player)
        this.interactionPoint.set(0, this.height * 0.5, -1.5)
            .applyAxisAngle(new THREE.Vector3(0,1,0), input.cameraYaw)
            .add(this.position);
    }
}
