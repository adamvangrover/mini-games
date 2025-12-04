import State from "./State.js";

export default class UI {
    constructor(root) {
        this.root = root;
        this.hud = root.querySelector('#mh-hud-container');
        this.altitudeEl = root.querySelector('#mh-altitude');
        this.promptEl = root.querySelector('#mh-prompt');
        this.notificationsEl = root.querySelector('#mh-notifications');
        this.notifications = [];
        this.prompt = {
            show: (text) => {
                this.promptEl.classList.remove('hidden');
                this.promptEl.querySelector('#mh-prompt-text').textContent = text;
            },
            hide: () => {
                this.promptEl.classList.add('hidden');
            }
        };
    }

    show() {
        if(this.hud) this.hud.classList.remove('hidden');
    }

    hide() {
        if(this.hud) this.hud.classList.add('hidden');
    }

    update(dt) {
        const alt = State.get("altitude");
        if (this.altitudeEl) this.altitudeEl.textContent = alt;

        // Process notifications
        if (this.notifications.length > 0) {
            const msg = this.notifications.shift();
            const el = document.createElement('div');
            el.className = "bg-blue-600/80 text-white px-4 py-2 rounded animate-fade-in-out";
            el.textContent = msg;
            this.notificationsEl.appendChild(el);

            setTimeout(() => {
                if(el.parentNode) el.parentNode.removeChild(el);
            }, 3000);
        }
    }
}
