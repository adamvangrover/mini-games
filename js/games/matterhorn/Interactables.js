export default class Interactables {
    constructor() {
        this.items = [];
    }

    add(mesh, radius, callback) {
        this.items.push({ mesh, radius, callback });
    }

    check(player, input, prompt) {
        let active = false;
        for (const i of this.items) {
            const dist = player.position.distanceTo(i.mesh.position);
            if (dist < i.radius) {
                prompt.show();
                if (input.interact) i.callback();
                active = true;
                return; // Only one interaction at a time
            }
        }
        if (!active) prompt.hide();
    }
}
