export default class Prompt {
    constructor() {
        this.el = document.getElementById("mh-prompt");
        this.target = null;
    }

    show(text = "PRESS [E]") {
        if(this.el) {
            this.el.innerText = text;
            this.el.style.opacity = 1;
        }
    }

    hide() {
        if(this.el) this.el.style.opacity = 0;
    }

    update() {}
}
