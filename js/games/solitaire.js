
import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';
import ParticleSystem from '../core/ParticleSystem.js';

export default class CyberSolitaire {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.particleSystem = ParticleSystem.getInstance();

        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        // Card Constants
        this.CARD_WIDTH = 80;
        this.CARD_HEIGHT = 120;
        this.CARD_SPACING = 20;
        this.SUITS = ['♥', '♦', '♣', '♠']; // Hearts, Diamonds, Clubs, Spades
        this.VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

        // State
        this.deck = [];
        this.piles = []; // Tableau (7)
        this.foundations = []; // 4
        this.stock = [];
        this.waste = [];

        this.dragCard = null;
        this.dragSource = null; // { type: 'pile'|'waste'|'foundation', index: 0 }
        this.dragOffset = { x: 0, y: 0 };

        this.time = 0;
        this.moves = 0;
        this.score = 0;
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = ''; // Clear
        this.canvas = document.createElement('canvas');
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Resize Handler
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);

        // Mouse/Touch Events
        this.bindEvents();

        this.resetGame();
        this.isActive = true;
        this.animate();
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.layout();
    }

    bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.onInputStart(e.clientX, e.clientY));
        this.canvas.addEventListener('touchstart', (e) => {
            if(e.touches.length > 0) this.onInputStart(e.touches[0].clientX, e.touches[0].clientY);
        }, {passive: false});

        window.addEventListener('mousemove', (e) => this.onInputMove(e.clientX, e.clientY));
        window.addEventListener('touchmove', (e) => {
            if(e.touches.length > 0) this.onInputMove(e.touches[0].clientX, e.touches[0].clientY);
        }, {passive: false});

        window.addEventListener('mouseup', (e) => this.onInputEnd());
        window.addEventListener('touchend', (e) => this.onInputEnd());
    }

    // --- Logic ---

    resetGame() {
        this.deck = this.createDeck();
        this.shuffle(this.deck);

        this.piles = Array(7).fill().map(() => []);
        this.foundations = Array(4).fill().map(() => []);
        this.stock = [];
        this.waste = [];

        // Deal
        for (let i = 0; i < 7; i++) {
            for (let j = i; j < 7; j++) {
                const card = this.deck.pop();
                if (i === j) card.faceUp = true;
                this.piles[j].push(card);
            }
        }
        this.stock = this.deck; // Remaining

        this.layout();
        this.score = 0;
        this.moves = 0;
    }

    createDeck() {
        const deck = [];
        this.SUITS.forEach(suit => {
            this.VALUES.forEach((val, index) => {
                deck.push({
                    suit,
                    value: val,
                    rank: index + 1, // 1-13
                    color: (suit === '♥' || suit === '♦') ? '#ff0055' : '#00ffff',
                    faceUp: false,
                    x: 0, y: 0
                });
            });
        });
        return deck;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    layout() {
        if (!this.canvas) return;
        const w = this.canvas.width;
        const startX = (w - (7 * this.CARD_WIDTH + 6 * this.CARD_SPACING)) / 2;

        // Stock & Waste positions (Top Left)
        this.stockPos = { x: startX, y: 20 };
        this.wastePos = { x: startX + this.CARD_WIDTH + this.CARD_SPACING, y: 20 };

        // Foundations (Top Right)
        this.foundationPos = [];
        for(let i=0; i<4; i++) {
            this.foundationPos.push({
                x: startX + (3 + i) * (this.CARD_WIDTH + this.CARD_SPACING),
                y: 20
            });
        }

        // Piles (Below)
        this.pilePos = [];
        for(let i=0; i<7; i++) {
            this.pilePos.push({
                x: startX + i * (this.CARD_WIDTH + this.CARD_SPACING),
                y: 20 + this.CARD_HEIGHT + this.CARD_SPACING
            });
        }
    }

    // --- Input Handling ---

    onInputStart(clientX, clientY) {
        if (!this.isActive) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Check Stock
        if (this.hitTest(x, y, this.stockPos.x, this.stockPos.y)) {
            this.drawStock();
            return;
        }

        // Check Waste
        if (this.waste.length > 0) {
            const card = this.waste[this.waste.length-1];
            // Rendered pos is wastePos
            if (this.hitTest(x, y, this.wastePos.x, this.wastePos.y)) {
                this.dragCard = [card];
                this.dragSource = { type: 'waste' };
                this.dragOffset = { x: x - this.wastePos.x, y: y - this.wastePos.y };
                return;
            }
        }

        // Check Piles (Reverse to grab top card first)
        for (let i = 0; i < 7; i++) {
            const pile = this.piles[i];
            // Iterate from top to bottom
            for (let j = pile.length - 1; j >= 0; j--) {
                const card = pile[j];
                if (!card.faceUp) continue;

                const cardY = this.pilePos[i].y + j * 30; // Fan offset
                if (x >= this.pilePos[i].x && x <= this.pilePos[i].x + this.CARD_WIDTH &&
                    y >= cardY && y <= cardY + this.CARD_HEIGHT) { // Simplified hit test
                        // Valid Grab
                        this.dragCard = pile.slice(j);
                        this.dragSource = { type: 'pile', index: i, cardIndex: j };
                        this.dragOffset = { x: x - this.pilePos[i].x, y: y - cardY };
                        return;
                }
            }
        }

        // Check Foundations? (Usually can drag out, skipping for simplicity unless requested)
    }

    onInputMove(clientX, clientY) {
        if (this.dragCard) {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = clientX - rect.left;
            this.mouseY = clientY - rect.top;
        }
    }

    onInputEnd() {
        if (!this.dragCard) return;

        // Logic to drop
        const dropSuccess = this.tryDrop();

        if (!dropSuccess) {
            // Return animation? Just snap back for now
        } else {
            this.moves++;
            this.score += 10;
            this.soundManager.playSound('click');

            // Flip next card in pile if needed
            if (this.dragSource.type === 'pile') {
                const pile = this.piles[this.dragSource.index];
                if (pile.length > 0 && !pile[pile.length-1].faceUp) {
                    pile[pile.length-1].faceUp = true;
                    this.score += 5;
                }
            }
        }

        this.dragCard = null;
        this.dragSource = null;

        this.checkWin();
    }

    checkWin() {
        // If all foundations have 13 cards (rank 13 is King)
        let total = 0;
        for (let f of this.foundations) {
            total += f.length;
        }
        if (total === 52) {
            this.isActive = false;
            // Bonus points for time?
            this.score += 1000;
            this.soundManager.playSound('powerup');
            // Trigger confetti/particles
            for(let i=0; i<100; i++) {
                this.particleSystem.emit(Math.random()*this.canvas.width, Math.random()*this.canvas.height, '#00ffff', 1);
            }
            setTimeout(() => {
                if (window.miniGameHub && window.miniGameHub.showGameOver) {
                    window.miniGameHub.showGameOver(this.score, () => {
                        this.init(this.container);
                    });
                }
            }, 2000);
        }
    }

    hitTest(mx, my, tx, ty) {
        return mx >= tx && mx <= tx + this.CARD_WIDTH && my >= ty && my <= ty + this.CARD_HEIGHT;
    }

    drawStock() {
        if (this.stock.length === 0) {
            // Recycle waste
            this.stock = this.waste.reverse().map(c => ({...c, faceUp: false}));
            this.waste = [];
        } else {
            const card = this.stock.pop();
            card.faceUp = true;
            this.waste.push(card);
        }
        this.soundManager.playSound('click');
    }

    tryDrop() {
        // Check Foundations
        if (this.dragCard.length === 1) {
            const card = this.dragCard[0];
            for(let i=0; i<4; i++) {
                const f = this.foundations[i];
                const pos = this.foundationPos[i];
                if (this.hitTest(this.mouseX, this.mouseY, pos.x, pos.y)) {
                    // Valid drop?
                    if (f.length === 0) {
                        if (card.rank === 1) { // Ace
                            this.executeMove('foundation', i);
                            return true;
                        }
                    } else {
                        const top = f[f.length-1];
                        if (top.suit === card.suit && top.rank === card.rank - 1) {
                            this.executeMove('foundation', i);
                            return true;
                        }
                    }
                }
            }
        }

        // Check Piles
        for(let i=0; i<7; i++) {
            const p = this.piles[i];
            const pos = this.pilePos[i];
            // Hit test on the bottom of the pile
            const pileY = pos.y + (p.length > 0 ? (p.length - 1) * 30 : 0);

            if (this.hitTest(this.mouseX, this.mouseY, pos.x, pileY)) {
                const card = this.dragCard[0];
                if (p.length === 0) {
                    if (card.rank === 13) { // King
                        this.executeMove('pile', i);
                        return true;
                    }
                } else {
                    const top = p[p.length-1];
                    // Alt color and rank - 1
                    if (top.color !== card.color && top.rank === card.rank + 1) {
                        this.executeMove('pile', i);
                        return true;
                    }
                }
            }
        }

        return false;
    }

    executeMove(targetType, targetIndex) {
        // Remove from source
        if (this.dragSource.type === 'waste') {
            this.waste.pop();
        } else if (this.dragSource.type === 'pile') {
            this.piles[this.dragSource.index].splice(this.dragSource.cardIndex, this.dragCard.length);
        }

        // Add to target
        if (targetType === 'foundation') {
            this.foundations[targetIndex].push(this.dragCard[0]);
            this.particleSystem.emit(this.foundationPos[targetIndex].x + 40, this.foundationPos[targetIndex].y + 60, '#00ffff', 20);
        } else if (targetType === 'pile') {
            this.piles[targetIndex].push(...this.dragCard);
        }
    }

    // --- Render ---

    animate() {
        if (!this.isActive) return;
        requestAnimationFrame(() => this.animate());
        this.time += 0.016;
        this.draw();
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Background
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, w, h);

        // HUD
        this.ctx.font = '20px "Press Start 2P"';
        this.ctx.fillStyle = '#00ffff';
        this.ctx.fillText(`SCORE: ${this.score}`, 20, 30);
        this.ctx.fillText(`MOVES: ${this.moves}`, 20, 60);

        if (!this.stockPos) return; // Not layout yet

        // Stock
        if (this.stock.length > 0) {
            this.drawCardBack(this.stockPos.x, this.stockPos.y);
        } else {
            this.drawPlaceholder(this.stockPos.x, this.stockPos.y, '↺');
        }

        // Waste
        if (this.waste.length > 0) {
            if (!this.dragCard || this.dragSource.type !== 'waste') {
                this.drawCard(this.waste[this.waste.length-1], this.wastePos.x, this.wastePos.y);
            } else if (this.waste.length > 1) {
                // Draw card below drag
                this.drawCard(this.waste[this.waste.length-2], this.wastePos.x, this.wastePos.y);
            }
        }

        // Foundations
        this.foundations.forEach((f, i) => {
            const pos = this.foundationPos[i];
            if (f.length > 0) {
                this.drawCard(f[f.length-1], pos.x, pos.y);
            } else {
                this.drawPlaceholder(pos.x, pos.y, this.SUITS[i]);
            }
        });

        // Piles
        this.piles.forEach((p, i) => {
            const pos = this.pilePos[i];
            if (p.length === 0) {
                this.drawPlaceholder(pos.x, pos.y, '');
            } else {
                p.forEach((card, ci) => {
                    // Skip if being dragged
                    if (this.dragCard && this.dragSource.type === 'pile' && this.dragSource.index === i && ci >= this.dragSource.cardIndex) return;

                    const y = pos.y + ci * 30; // Fan
                    if (card.faceUp) {
                        this.drawCard(card, pos.x, y);
                    } else {
                        this.drawCardBack(pos.x, y);
                    }
                });
            }
        });

        // Dragging
        if (this.dragCard) {
            this.dragCard.forEach((card, i) => {
                const x = this.mouseX - this.dragOffset.x;
                const y = this.mouseY - this.dragOffset.y + i * 30;
                this.drawCard(card, x, y, true);
            });
        }
    }

    drawCard(card, x, y, shadow=false) {
        const ctx = this.ctx;

        if (shadow) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
        }

        // Card Base
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = card.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, this.CARD_WIDTH, this.CARD_HEIGHT, 8);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Text
        ctx.fillStyle = card.color;
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${card.value} ${card.suit}`, x + 5, y + 25);

        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(card.suit, x + this.CARD_WIDTH/2, y + this.CARD_HEIGHT/2);
    }

    drawCardBack(x, y) {
        const ctx = this.ctx;
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, this.CARD_WIDTH, this.CARD_HEIGHT, 8);
        ctx.fill();
        ctx.stroke();

        // Pattern
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(x + this.CARD_WIDTH/2, y + this.CARD_HEIGHT/2, 20, 0, Math.PI*2);
        ctx.fill();
    }

    drawPlaceholder(x, y, text) {
        const ctx = this.ctx;
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.roundRect(x, y, this.CARD_WIDTH, this.CARD_HEIGHT, 8);
        ctx.stroke();
        ctx.setLineDash([]);

        if (text) {
            ctx.fillStyle = '#334155';
            ctx.font = '30px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x + this.CARD_WIDTH/2, y + this.CARD_HEIGHT/2);
        }
    }

    shutdown() {
        this.isActive = false;
        if (this.resizeObserver) this.resizeObserver.disconnect();
        if (this.canvas) this.canvas.remove();
        window.removeEventListener('mousemove', this.onInputMove);
        window.removeEventListener('touchmove', this.onInputMove);
        window.removeEventListener('mouseup', this.onInputEnd);
        window.removeEventListener('touchend', this.onInputEnd);
    }
}
