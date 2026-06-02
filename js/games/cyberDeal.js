import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class CyberDeal {
    constructor() {
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        this.baseValues = [0, 1, 5, 10, 25, 50, 75, 100, 200, 300, 400, 500, 750, 1000, 5000, 10000, 25000, 50000, 75000, 100000, 200000, 300000, 400000, 500000, 750000, 1000000];
        this.briefcases = [];
        this.selectedCase = null;
        this.state = 'SELECT_OWN'; // SELECT_OWN, OPEN_CASES, OFFER, GAME_OVER
        this.casesToOpen = 6;
        this.offer = 0;
        this.winnings = 0;

        this.initGame();

        this.boundResize = this.resize.bind(this);
        this.boundClick = this.handleClick.bind(this);
    }

    initGame() {
        let values = [...this.baseValues];
        // Shuffle
        for (let i = values.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }

        this.briefcases = values.map((val, index) => ({
            id: index + 1,
            value: val,
            isOpen: false
        }));
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        window.addEventListener('resize', this.boundResize);
        this.canvas.addEventListener('click', this.boundClick);

        this.resize();
        this.isActive = true;
        this.lastTime = performance.now();
        this.gameLoop = requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.draw();
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (this.state === 'OFFER') {
            // Handle Offer Buttons
            const w = this.canvas.width;
            const h = this.canvas.height;
            const cx = w/2;
            const cy = h/2;

            // "DEAL" button roughly at (cx - 100, cy + 50, 80x40)
            if (mx >= cx - 140 && mx <= cx - 20 && my >= cy + 30 && my <= cy + 80) {
                this.winnings = this.offer;
                this.state = 'GAME_OVER';
                this.soundManager.playSound('coin');
                return;
            }

            // "NO DEAL" button roughly at (cx + 20, cy + 50, 120x40)
            if (mx >= cx + 20 && mx <= cx + 140 && my >= cy + 30 && my <= cy + 80) {
                this.state = 'OPEN_CASES';
                this.soundManager.playSound('click');
                // Calculate next round cases
                const remaining = this.briefcases.filter(b => !b.isOpen && b.id !== this.selectedCase.id).length;
                if (remaining > 1) {
                    this.casesToOpen = Math.min(this.casesToOpen - 1, remaining - 1);
                    if (this.casesToOpen < 1) this.casesToOpen = 1;
                } else {
                    this.casesToOpen = 1;
                }
                return;
            }
            return;
        }

        if (this.state === 'GAME_OVER') {
            this.initGame();
            this.selectedCase = null;
            this.state = 'SELECT_OWN';
            this.casesToOpen = 6;
            this.winnings = 0;
            return;
        }

        // Handle Case Clicks
        const layout = this.getLayout();
        for (const bc of this.briefcases) {
            if (bc.isOpen || (this.selectedCase && bc.id === this.selectedCase.id)) continue;

            const pos = layout.find(l => l.id === bc.id);
            if (!pos) continue;

            if (mx >= pos.x && mx <= pos.x + pos.w && my >= pos.y && my <= pos.y + pos.h) {
                if (this.state === 'SELECT_OWN') {
                    this.selectedCase = bc;
                    this.state = 'OPEN_CASES';
                    this.soundManager.playSound('coin');
                } else if (this.state === 'OPEN_CASES') {
                    bc.isOpen = true;
                    this.casesToOpen--;
                    if (bc.value > 100000) this.soundManager.playSound('error');
                    else this.soundManager.playSound('click');

                    if (this.casesToOpen === 0) {
                        this.calculateOffer();
                        this.state = 'OFFER';
                        this.soundManager.playSound('jump'); // simulate phone ring
                    }

                    // Check if only 1 case left to open
                    const remaining = this.briefcases.filter(b => !b.isOpen && b.id !== this.selectedCase.id).length;
                    if (remaining === 0) {
                         this.winnings = this.selectedCase.value;
                         this.state = 'GAME_OVER';
                    }
                }
                break;
            }
        }
    }

    calculateOffer() {
        const remainingValues = this.briefcases.filter(b => !b.isOpen).map(b => b.value);
        const sum = remainingValues.reduce((a, b) => a + b, 0);
        const avg = sum / remainingValues.length;
        // Banker is greedy, offers less early on
        const turnFactor = 1 - (remainingValues.length / 26); // 0 early, approaches 1 late
        this.offer = Math.floor(avg * (0.3 + (turnFactor * 0.6)));
    }

    getLayout() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const caseW = 60;
        const caseH = 40;
        const cols = 7;
        const rows = 4;
        const startX = w/2 - ((cols * (caseW + 10)) / 2) + 30;
        const startY = h/2 - ((rows * (caseH + 10)) / 2) + 20;

        const layout = [];
        let r = 0;
        let c = 0;
        for (let i = 1; i <= 26; i++) {
            layout.push({
                id: i,
                x: startX + c * (caseW + 10),
                y: startY + r * (caseH + 10),
                w: caseW,
                h: caseH
            });
            c++;
            if (c >= cols) {
                c = 0;
                r++;
            }
        }
        return layout;
    }

    loop(timestamp) {
        if (!this.isActive) return;
        this.draw();
        this.gameLoop = requestAnimationFrame((t) => this.loop(t));
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, w, h);

        // Value Board (Left and Right)
        this.ctx.font = '14px monospace';
        const leftVals = this.baseValues.slice(0, 13);
        const rightVals = this.baseValues.slice(13, 26);

        leftVals.forEach((val, i) => {
            const isOpen = this.briefcases.find(b => b.value === val).isOpen;
            this.ctx.fillStyle = isOpen ? '#333' : '#ff00ff';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`$${val.toLocaleString()}`, 20, 60 + i * 25);
        });

        rightVals.forEach((val, i) => {
            const isOpen = this.briefcases.find(b => b.value === val).isOpen;
            this.ctx.fillStyle = isOpen ? '#333' : '#00ffff';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`$${val.toLocaleString()}`, w - 20, 60 + i * 25);
        });

        // Main Area
        if (this.state === 'OFFER') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
            this.ctx.fillRect(w/2 - 200, h/2 - 100, 400, 200);
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.strokeRect(w/2 - 200, h/2 - 100, 400, 200);

            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.font = '24px monospace';
            this.ctx.fillText('BANKER OFFER', w/2, h/2 - 40);
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = 'bold 36px monospace';
            this.ctx.fillText(`$${this.offer.toLocaleString()}`, w/2, h/2 + 10);

            // Deal Btn
            this.ctx.fillStyle = '#004400';
            this.ctx.fillRect(w/2 - 140, h/2 + 30, 120, 50);
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '20px monospace';
            this.ctx.fillText('DEAL', w/2 - 80, h/2 + 60);

            // No Deal Btn
            this.ctx.fillStyle = '#440000';
            this.ctx.fillRect(w/2 + 20, h/2 + 30, 120, 50);
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillText('NO DEAL', w/2 + 80, h/2 + 60);

        } else if (this.state === 'GAME_OVER') {
             this.ctx.fillStyle = '#fff';
             this.ctx.textAlign = 'center';
             this.ctx.font = '36px monospace';
             this.ctx.fillText(`YOU WON $${this.winnings.toLocaleString()}`, w/2, h/2);

             if (this.selectedCase) {
                 this.ctx.font = '20px monospace';
                 this.ctx.fillText(`YOUR CASE CONTAINED $${this.selectedCase.value.toLocaleString()}`, w/2, h/2 + 40);
             }
             this.ctx.font = '16px monospace';
             this.ctx.fillText(`CLICK TO PLAY AGAIN`, w/2, h/2 + 80);
        } else {
            // Draw Cases
            const layout = this.getLayout();
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            for (const bc of this.briefcases) {
                const pos = layout.find(l => l.id === bc.id);
                if (!pos) continue;

                if (this.selectedCase && bc.id === this.selectedCase.id) {
                    // Draw at bottom
                    this.ctx.fillStyle = '#444';
                    this.ctx.fillRect(w/2 - 40, h - 80, 80, 50);
                    this.ctx.strokeStyle = '#00ffff';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(w/2 - 40, h - 80, 80, 50);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 24px monospace';
                    this.ctx.fillText(bc.id, w/2, h - 55);
                } else if (!bc.isOpen) {
                    this.ctx.fillStyle = '#222';
                    this.ctx.fillRect(pos.x, pos.y, pos.w, pos.h);
                    this.ctx.strokeStyle = '#666';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(pos.x, pos.y, pos.w, pos.h);
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 20px monospace';
                    this.ctx.fillText(bc.id, pos.x + pos.w/2, pos.y + pos.h/2);
                }
            }

            // Top Status
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '24px monospace';
            this.ctx.textAlign = 'center';
            if (this.state === 'SELECT_OWN') {
                this.ctx.fillText('SELECT YOUR CASE', w/2, 40);
            } else if (this.state === 'OPEN_CASES') {
                this.ctx.fillText(`OPEN ${this.casesToOpen} MORE CASES`, w/2, 40);
            }
        }
    }

    async shutdown() {
        this.isActive = false;
        if (this.gameLoop) cancelAnimationFrame(this.gameLoop);

        window.removeEventListener('resize', this.boundResize);
        if(this.canvas) this.canvas.removeEventListener('click', this.boundClick);

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
