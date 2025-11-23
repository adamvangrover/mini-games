export default class Notifications {
    constructor() {
        this.root = document.getElementById("mh-notifications");
        this.queue = [];
    }

    push(text) {
        if(!this.root) return;
        const div = document.createElement("div");
        div.className = "mh-notif";
        div.innerText = text;
        this.root.appendChild(div);

        setTimeout(() => {
            div.style.opacity = 0;
            div.style.transform = "translateX(80px)";
            setTimeout(() => div.remove(), 300);
        }, 2000);
    }

    update() {}
}
