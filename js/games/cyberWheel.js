import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';

export default class CyberWheel {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.container = null;
        this.iframe = null;
        this.isActive = false;

        // Expose a bridge so the iframe can call showGameOver
        window.cyberWheelGameOver = this.handleGameOver.bind(this);
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = ''; // Clear container

        this.iframe = document.createElement('iframe');
        this.iframe.src = 'cyber_wheel.html';
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
        this.iframe.style.border = 'none';
        this.iframe.style.position = 'absolute';
        this.iframe.style.top = '0';
        this.iframe.style.left = '0';
        this.iframe.style.zIndex = '10'; // Above canvas if any

        this.container.appendChild(this.iframe);
        this.isActive = true;
    }

    handleGameOver(score) {
        if (window.miniGameHub && window.miniGameHub.showGameOver) {
            window.miniGameHub.showGameOver(score, () => {
                // Restart logic - reload iframe
                if (this.iframe) {
                    this.iframe.src = this.iframe.src; // Reload
                }
            });
        }
    }

    update(dt) {
        // Handled internally by iframe, but we must implement the method
    }

    draw() {
        // Handled internally by iframe, but we must implement the method
    }

    shutdown() {
        this.isActive = false;
        if (this.iframe) {
            this.iframe.remove();
            this.iframe = null;
        }
        delete window.cyberWheelGameOver;
    }
}
