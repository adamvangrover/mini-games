export default class CameraController {
    constructor(camera, player) {
        this.camera = camera;
        this.player = player;

        this.distance = 6;
        this.height = 2;
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

        this.camera.position.lerp(desired, dt * 5);
        this.camera.lookAt(target);
    }
}
