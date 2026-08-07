import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';

export default class CorpRisk {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.container = null;
        this.iframe = null;
        this.isActive = false;

        window.corpRiskGameOver = this.handleGameOver.bind(this);
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';

        this.iframe = document.createElement('iframe');
        this.iframe.src = 'corp_risk.html';
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
        this.iframe.style.border = 'none';
        this.iframe.style.position = 'absolute';
        this.iframe.style.top = '0';
        this.iframe.style.left = '0';
        this.iframe.style.zIndex = '10';

        this.container.appendChild(this.iframe);
        this.isActive = true;
    }

    handleGameOver(score) {
        if (window.miniGameHub && window.miniGameHub.showGameOver) {
            window.miniGameHub.showGameOver(score, () => {
                if (this.iframe) {
                    this.iframe.src = this.iframe.src;
                }
            });
        }
    }

    update(dt) {
    }

    draw() {
    }

    shutdown() {
        this.isActive = false;
        if (this.iframe) {
            this.iframe.remove();
            this.iframe = null;
        }
        delete window.corpRiskGameOver;
    }
}
