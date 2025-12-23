import CityGame from './neonCity/CityGame.js';

export default class NeonCityAdapter {
    constructor() {
        this.game = null;
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.active = false;
        this.resizeHandler = null;
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = ''; // Clear previous

        // Setup Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.className = 'block touch-none select-none outline-none';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Initialize Game Logic
        this.game = new CityGame(container);
        // Note: CityGame constructor sets up entities and UI immediately.

        // Event Listeners
        this.resizeHandler = this.resize.bind(this);
        window.addEventListener('resize', this.resizeHandler);
        this.resize();

        this.active = true;
    }

    resize() {
        if (!this.container || !this.canvas) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        if (this.game) this.game.resize(rect.width, rect.height);
    }

    update(dt) {
        if (!this.active || !this.game) return;
        this.game.update(dt);
    }

    draw() {
        if (!this.active || !this.game || !this.ctx) return;

        // Clear background
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.game.draw(this.ctx);
    }

    shutdown() {
        this.active = false;
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }

        // Clean up UI created by CityGame
        const chat = document.getElementById('neon-city-chat');
        if (chat && chat.parentNode) chat.parentNode.removeChild(chat);

        this.game = null;
        this.ctx = null;
        this.container.innerHTML = '';
    }
}
