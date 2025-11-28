import State from "./State.js";

export default class CameraController {
    constructor(camera, player) {
        this.camera = camera;
        this.player = player;

        this.distance = 6;
        this.height = 2;
        this.lerpFactor = 4; // Added for smoother movement
    }

    update(dt, input) {
        const yaw = input.cameraYaw;
        const pitch = input.cameraPitch;

        // Camera target (player's head)
        const target = this.player.position.clone();
        target.y += this.height;

        const offset = new THREE.Vector3(
            Math.sin(yaw) * this.distance,
            -pitch * 2,
            Math.cos(yaw) * this.distance
        );

        const desired = target.clone().add(offset);

        // --- Camera Collision ---
        const world = State.get("world");
        if (world && world.getHeightAt) { // Check if world and method exist
            const terrainHeight = world.getHeightAt(desired.x, desired.z);
            if (desired.y < terrainHeight + 0.5) {
                desired.y = terrainHeight + 0.5;
            }
        }

        this.camera.position.lerp(desired, dt * this.lerpFactor);
        this.camera.lookAt(target);
    }
}
