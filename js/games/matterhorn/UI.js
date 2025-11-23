import HUD from "./HUD.js";
import Prompt from "./Prompt.js";
import Notifications from "./Notifications.js";

export default class UI {
    constructor(root) {
        this.root = root;
        this.hud = new HUD();
        this.prompt = new Prompt();
        this.notifications = new Notifications();

        this.visible = false;
    }

    show() {
        const container = document.getElementById("mh-hud-container");
        if(container) container.classList.remove("hidden");
        this.visible = true;
    }

    hide() {
        const container = document.getElementById("mh-hud-container");
        if(container) container.classList.add("hidden");
        this.visible = false;
    }

    update(dt) {
        this.hud.update(dt);
        this.prompt.update(dt);
        this.notifications.update(dt);
    }
}
