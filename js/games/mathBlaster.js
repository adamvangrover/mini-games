import TrashZapper from './mathBlaster/TrashZapper.js';
import NumberRecycler from './mathBlaster/NumberRecycler.js';
import SatelliteShowdown from './mathBlaster/SatelliteShowdown.js';
import MathEngine from './mathBlaster/MathEngine.js';

export default class MathBlasterGame {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.state = 'MENU'; // MENU, TRASH, RECYCLER, BOSS, VICTORY

        // Wrap input for simple state access
        this.inputWrapper = {
            keys: {},
            lastKeys: {},
            mouse: { x: 0, y: 0, down: false }
        };

        this.mathEngine = new MathEngine();
        this.games = {}; // Initialize in init
        this.currentGame = null;
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.style.position = 'relative';

        this.canvas = document.createElement('canvas');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.display = 'block';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        this.bindInput();

        // Initialize games now that canvas exists
        this.games = {
            TRASH: new TrashZapper(this),
            RECYCLER: new NumberRecycler(this),
            BOSS: new SatelliteShowdown(this)
        };

        // Start with Trash Zapper
        this.switchState('TRASH');

        this.boundResize = () => this.resize();
        window.addEventListener('resize', this.boundResize);
    }

    bindInput() {
        this.boundMouseMove = e => {
            const rect = this.canvas.getBoundingClientRect();
            this.inputWrapper.mouse.x = e.clientX - rect.left;
            this.inputWrapper.mouse.y = e.clientY - rect.top;
        };
        this.canvas.addEventListener('mousemove', this.boundMouseMove);

        this.boundMouseDown = () => this.inputWrapper.mouse.down = true;
        this.canvas.addEventListener('mousedown', this.boundMouseDown);

        this.boundMouseUp = () => this.inputWrapper.mouse.down = false;
        this.canvas.addEventListener('mouseup', this.boundMouseUp);

        // Touch support
        this.boundTouchMove = e => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            this.inputWrapper.mouse.x = e.touches[0].clientX - rect.left;
            this.inputWrapper.mouse.y = e.touches[0].clientY - rect.top;
        };
        this.canvas.addEventListener('touchmove', this.boundTouchMove, {passive: false});

        this.boundTouchStart = (e) => {
             this.inputWrapper.mouse.down = true;
             const rect = this.canvas.getBoundingClientRect();
             this.inputWrapper.mouse.x = e.touches[0].clientX - rect.left;
             this.inputWrapper.mouse.y = e.touches[0].clientY - rect.top;
        };
        this.canvas.addEventListener('touchstart', this.boundTouchStart, {passive: false});

        this.boundTouchEnd = () => this.inputWrapper.mouse.down = false;
        this.canvas.addEventListener('touchend', this.boundTouchEnd);
    }

    switchState(newState) {
        this.state = newState;
        this.currentGame = this.games[newState];
        if (this.currentGame) {
            this.currentGame.init();
        } else if (newState === 'VICTORY') {
            window.miniGameHub.showGameOver(1000, () => this.switchState('TRASH'));
        }
    }

    nextLevel() {
        if (this.state === 'TRASH') this.switchState('RECYCLER');
        else if (this.state === 'RECYCLER') this.switchState('BOSS');
        else if (this.state === 'BOSS') this.victory();
    }

    victory() {
        window.miniGameHub.soundManager.playSound('win');
        window.miniGameHub.showGameOver(5000, () => this.switchState('TRASH'));
    }

    gameOver() {
        window.miniGameHub.showGameOver(0, () => this.switchState('TRASH'));
    }

    update(dt) {
        // Sync input
        const im = window.miniGameHub.inputManager;
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].forEach(k => {
             this.inputWrapper.keys[k === ' ' ? 'Space' : k] = im.keys[k];
        });

        if (this.currentGame) {
            this.currentGame.update(dt);
        }

        // Update last keys
        Object.keys(this.inputWrapper.keys).forEach(k => {
            this.inputWrapper.lastKeys[k] = this.inputWrapper.keys[k];
        });
    }

    draw() {
        if (this.currentGame) {
            this.currentGame.draw();
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.currentGame && this.currentGame.resize) this.currentGame.resize();
    }

    shutdown() {
        // Cleanup listeners
        if (this.boundResize) window.removeEventListener('resize', this.boundResize);
        if (this.boundMouseMove) this.canvas.removeEventListener('mousemove', this.boundMouseMove);
        if (this.boundMouseDown) this.canvas.removeEventListener('mousedown', this.boundMouseDown);
        if (this.boundMouseUp) this.canvas.removeEventListener('mouseup', this.boundMouseUp);
        if (this.boundTouchMove) this.canvas.removeEventListener('touchmove', this.boundTouchMove);
        if (this.boundTouchStart) this.canvas.removeEventListener('touchstart', this.boundTouchStart);
        if (this.boundTouchEnd) this.canvas.removeEventListener('touchend', this.boundTouchEnd);
    }

    get input() {
        return this.inputWrapper;
    }
}
