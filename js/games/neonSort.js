import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class NeonSort {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();

        this.width = 800;
        this.height = 600;

        this.gameState = 'START'; // START, PLAYING, WON
        this.level = 1;
        this.tubes = [];
        this.selectedTube = -1;

        this.colors = ['#ff0055', '#00ffaa', '#00aaff', '#ffff00', '#ff8800', '#aa00ff'];

        this.uiContainer = null;
    }

    async init(container) {
        this.container = container;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
        this.canvas.style.cursor = 'pointer';
        this.container.appendChild(this.canvas);

        this.uiContainer = document.createElement('div');
        this.uiContainer.style.position = 'absolute';
        this.uiContainer.style.top = '0';
        this.uiContainer.style.left = '0';
        this.uiContainer.style.width = '100%';
        this.uiContainer.style.height = '100%';
        this.uiContainer.style.pointerEvents = 'none';
        this.uiContainer.style.color = 'white';
        this.uiContainer.style.fontFamily = 'monospace';
        this.uiContainer.innerHTML = `
            <div style="position: absolute; top: 20px; left: 20px; font-size: 24px; text-shadow: 0 0 10px #fff;">LEVEL: <span id="sort-level">1</span></div>
            <div id="sort-message" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px; text-align: center; text-shadow: 0 0 20px #0ff; pointer-events: auto; cursor: pointer;">NEON SORT<br><span style="font-size:24px">Click to Start</span></div>
        `;
        this.container.appendChild(this.uiContainer);

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.container);
        this.resize();

        this.handleClick = this.handleClick.bind(this);
        this.canvas.addEventListener('click', this.handleClick);
        document.getElementById('sort-message').addEventListener('click', () => {
            if(this.gameState === 'START' || this.gameState === 'WON') {
                if(this.gameState === 'WON') this.level++;
                this.startLevel();
            }
        });

        this.gameState = 'START';
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    startLevel() {
        this.gameState = 'PLAYING';
        this.selectedTube = -1;
        document.getElementById('sort-message').style.display = 'none';
        document.getElementById('sort-level').innerText = this.level;

        // Setup logic
        let numColors = Math.min(this.colors.length, 2 + Math.floor(this.level / 2));
        let numTubes = numColors + 2; // Always 2 empty tubes

        // Generate pool of items
        let pool = [];
        for(let c=0; c<numColors; c++) {
            for(let i=0; i<4; i++) {
                pool.push(this.colors[c]);
            }
        }

        // Shuffle
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        this.tubes = [];
        for(let t=0; t<numTubes; t++) {
            let items = [];
            if(t < numColors) {
                items = [pool.pop(), pool.pop(), pool.pop(), pool.pop()];
            }
            this.tubes.push(items);
        }
    }

    handleClick(e) {
        if(this.gameState !== 'PLAYING') return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Determine which tube was clicked
        const tubeWidth = 60;
        const tubeHeight = 240;
        const gap = 40;
        const totalWidth = this.tubes.length * tubeWidth + (this.tubes.length - 1) * gap;
        const startX = (this.width - totalWidth) / 2;
        const startY = (this.height - tubeHeight) / 2;

        for(let i=0; i<this.tubes.length; i++) {
            let tx = startX + i * (tubeWidth + gap);
            let ty = startY;

            // Allow clicking slightly outside the tube
            if (x >= tx - 20 && x <= tx + tubeWidth + 20 && y >= ty - 50 && y <= ty + tubeHeight + 50) {
                this.handleTubeClick(i);
                return;
            }
        }
    }

    handleTubeClick(index) {
        if(this.selectedTube === -1) {
            // Select if not empty
            if(this.tubes[index].length > 0) {
                this.selectedTube = index;
                this.soundManager.playSound('click');
            }
        } else {
            // Try to move
            if (this.selectedTube === index) {
                this.selectedTube = -1; // Deselect
            } else {
                let sourceTube = this.tubes[this.selectedTube];
                let targetTube = this.tubes[index];

                let item = sourceTube[sourceTube.length - 1];
                let targetTop = targetTube.length > 0 ? targetTube[targetTube.length - 1] : null;

                if (targetTube.length < 4 && (targetTop === null || targetTop === item)) {
                    // Valid move
                    targetTube.push(sourceTube.pop());
                    this.soundManager.playSound('drop');
                    this.selectedTube = -1;
                    this.checkWin();
                } else {
                    // Invalid move
                    this.soundManager.playSound('error');
                    this.selectedTube = -1;
                }
            }
        }
    }

    checkWin() {
        let isWin = true;
        for(let t of this.tubes) {
            if(t.length > 0 && t.length < 4) isWin = false; // Not full
            if(t.length === 4) {
                // Check if all same color
                let firstColor = t[0];
                for(let i=1; i<4; i++) {
                    if(t[i] !== firstColor) isWin = false;
                }
            }
        }

        if (isWin) {
            this.gameState = 'WON';
            this.soundManager.playSound('win');
            const msg = document.getElementById('sort-message');
            msg.innerHTML = 'LEVEL CLEARED<br><span style="font-size:24px">Click for Next Level</span>';
            msg.style.display = 'block';
            msg.style.textShadow = '0 0 20px #0f0';
        }
    }

    update(dt) {
        // purely event driven except for drawing
    }

    draw() {
        if (!this.ctx) return;

        // Background
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.width, this.height);

        if(this.gameState === 'START') return;

        const tubeWidth = 60;
        const tubeHeight = 240;
        const itemHeight = 55;
        const gap = 40;
        const totalWidth = this.tubes.length * tubeWidth + (this.tubes.length - 1) * gap;
        const startX = (this.width - totalWidth) / 2;
        const startY = (this.height - tubeHeight) / 2;

        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        for(let i=0; i<this.tubes.length; i++) {
            let tx = startX + i * (tubeWidth + gap);
            let ty = startY;

            // Draw highlight if selected
            if (this.selectedTube === i) {
                this.ctx.strokeStyle = '#fff';
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#fff';
            } else {
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                this.ctx.shadowBlur = 0;
            }

            // Draw Tube outline
            this.ctx.beginPath();
            this.ctx.moveTo(tx, ty);
            this.ctx.lineTo(tx, ty + tubeHeight - 10);
            this.ctx.arcTo(tx, ty + tubeHeight, tx + 10, ty + tubeHeight, 10);
            this.ctx.lineTo(tx + tubeWidth - 10, ty + tubeHeight);
            this.ctx.arcTo(tx + tubeWidth, ty + tubeHeight, tx + tubeWidth, ty + tubeHeight - 10, 10);
            this.ctx.lineTo(tx + tubeWidth, ty);
            this.ctx.stroke();

            // Draw Items
            this.ctx.shadowBlur = 10;
            let items = this.tubes[i];
            for(let j=0; j<items.length; j++) {
                this.ctx.fillStyle = items[j];
                this.ctx.shadowColor = items[j];

                let yOffset = 0;
                // If top item in selected tube, float it
                if (this.selectedTube === i && j === items.length - 1) {
                    yOffset = -40;
                }

                let drawY = ty + tubeHeight - (j + 1) * itemHeight - 5 + yOffset;

                // Memory Optimization: Using fillRect
                this.ctx.fillRect(tx + 5, drawY, tubeWidth - 10, itemHeight - 5);
            }
        }

        this.ctx.shadowBlur = 0;
    }

    async shutdown() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.canvas) {
            this.canvas.removeEventListener('click', this.handleClick);
            this.canvas.remove();
        }
        if (this.uiContainer) this.uiContainer.remove();

        const msg = document.getElementById('sort-message');
        if(msg) msg.removeEventListener('click', this.handleClick);
    }
}
