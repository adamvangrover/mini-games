import InputManager from '../core/InputManager.js';
import SoundManager from '../core/SoundManager.js';

export default class CyberSolitaire {
    constructor() {
        this.inputManager = InputManager.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.container = null;

        this.deck = [];
        this.piles = {
            stock: [],
            waste: [],
            foundations: [[], [], [], []], // 4 piles
            tableau: [[], [], [], [], [], [], []] // 7 piles
        };

        this.dragState = {
            active: false,
            cards: [], // Cards being dragged
            sourcePileType: null, // 'waste', 'tableau', 'foundation'
            sourcePileIndex: null,
            startX: 0,
            startY: 0,
            originX: 0,
            originY: 0,
            el: null // The visual element being dragged (container of cards)
        };

        this.score = 0;
        this.moves = 0;
        this.time = 0;
        this.timerInterval = null;

        this.suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        this.ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.colors = {
            hearts: 'red', diamonds: 'red',
            clubs: 'black', spades: 'black'
        };
        this.symbols = {
            hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠'
        };
    }

    async init(container) {
        this.container = container;
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        this.container.classList.add('bg-slate-900');

        this.renderLayout();
        this.startNewGame();

        // Event Listeners for global mouse up/move to handle drag release anywhere
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundMouseUp = this.onMouseUp.bind(this);
        document.addEventListener('mousemove', this.boundMouseMove);
        document.addEventListener('mouseup', this.boundMouseUp);
        document.addEventListener('touchmove', this.boundMouseMove, {passive: false});
        document.addEventListener('touchend', this.boundMouseUp);
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="absolute inset-0 flex flex-col p-4 pointer-events-none select-none">
                <!-- Header -->
                <div class="flex justify-between items-center mb-4 pointer-events-auto">
                    <h2 class="text-2xl font-bold text-cyan-400 neon-text">CYBER SOLITAIRE</h2>
                    <div class="flex gap-6 text-white font-mono">
                        <div>SCORE: <span id="cs-score" class="text-yellow-400">0</span></div>
                        <div>MOVES: <span id="cs-moves" class="text-fuchsia-400">0</span></div>
                        <div>TIME: <span id="cs-time" class="text-green-400">0:00</span></div>
                    </div>
                    <button id="cs-new-game" class="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 rounded text-sm text-white border border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)]">New Game</button>
                </div>

                <!-- Game Area -->
                <div class="flex-1 relative pointer-events-auto" id="cs-game-area">
                    <!-- Top Row: Stock, Waste, Gap, Foundations -->
                    <div class="flex justify-between h-32 mb-4">
                        <div class="flex gap-4">
                            <div id="pile-stock" class="w-24 h-36 border-2 border-slate-700 rounded-lg bg-slate-800/50 flex items-center justify-center cursor-pointer hover:border-cyan-500 transition-colors"></div>
                            <div id="pile-waste" class="w-24 h-36 border-2 border-dashed border-slate-700 rounded-lg"></div>
                        </div>
                        <div class="flex gap-4">
                            <div id="pile-foundation-0" class="w-24 h-36 border-2 border-slate-700 rounded-lg bg-slate-800/30 flex items-center justify-center text-3xl text-slate-700 select-none">♥</div>
                            <div id="pile-foundation-1" class="w-24 h-36 border-2 border-slate-700 rounded-lg bg-slate-800/30 flex items-center justify-center text-3xl text-slate-700 select-none">♦</div>
                            <div id="pile-foundation-2" class="w-24 h-36 border-2 border-slate-700 rounded-lg bg-slate-800/30 flex items-center justify-center text-3xl text-slate-700 select-none">♣</div>
                            <div id="pile-foundation-3" class="w-24 h-36 border-2 border-slate-700 rounded-lg bg-slate-800/30 flex items-center justify-center text-3xl text-slate-700 select-none">♠</div>
                        </div>
                    </div>

                    <!-- Bottom Row: Tableau -->
                    <div class="flex justify-between h-full pt-4">
                        <div id="pile-tableau-0" class="w-24 h-full relative"></div>
                        <div id="pile-tableau-1" class="w-24 h-full relative"></div>
                        <div id="pile-tableau-2" class="w-24 h-full relative"></div>
                        <div id="pile-tableau-3" class="w-24 h-full relative"></div>
                        <div id="pile-tableau-4" class="w-24 h-full relative"></div>
                        <div id="pile-tableau-5" class="w-24 h-full relative"></div>
                        <div id="pile-tableau-6" class="w-24 h-full relative"></div>
                    </div>
                </div>
            </div>

            <style>
                .cs-card {
                    width: 6rem; /* w-24 */
                    height: 9rem; /* h-36 */
                    background: #1e293b; /* slate-800 */
                    border: 2px solid;
                    border-radius: 0.5rem;
                    position: absolute;
                    display: flex;
                    flex-direction: column;
                    padding: 0.25rem;
                    cursor: grab;
                    user-select: none;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
                    transition: transform 0.1s;
                }
                .cs-card:hover {
                    filter: brightness(1.1);
                }
                .cs-card.red { border-color: #ef4444; color: #ef4444; box-shadow: 0 0 5px rgba(239, 68, 68, 0.3); }
                .cs-card.black { border-color: #3b82f6; color: #3b82f6; box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }

                .cs-card-back {
                    background: repeating-linear-gradient(
                        45deg,
                        #0f172a,
                        #0f172a 10px,
                        #1e293b 10px,
                        #1e293b 20px
                    );
                    border: 2px solid #64748b;
                    border-radius: 0.5rem;
                    width: 6rem;
                    height: 9rem;
                    position: absolute;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
                }
            </style>
        `;

        document.getElementById('cs-new-game').addEventListener('click', () => {
            this.soundManager.playSound('click');
            this.startNewGame();
        });

        document.getElementById('pile-stock').addEventListener('click', () => this.drawStock());
    }

    startNewGame() {
        this.score = 0;
        this.moves = 0;
        this.time = 0;
        this.updateStats();

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.time++;
            this.updateStats();
        }, 1000);

        // Initialize Deck
        this.deck = [];
        for (let suit of this.suits) {
            for (let i = 0; i < this.ranks.length; i++) {
                this.deck.push({
                    suit: suit,
                    rank: this.ranks[i],
                    value: i + 1, // 1-13
                    color: this.colors[suit],
                    faceUp: false,
                    id: `${suit}-${this.ranks[i]}`
                });
            }
        }
        this.shuffle(this.deck);

        // Reset Piles
        this.piles.stock = [...this.deck];
        this.piles.waste = [];
        this.piles.foundations = [[], [], [], []];
        this.piles.tableau = [[], [], [], [], [], [], []];

        // Deal
        let cardIdx = 0;
        // Logic: Deal to tableau.
        // Col 0: 1 card
        // Col 1: 2 cards
        // ...
        // Col 6: 7 cards
        // Top card face up

        // Remove cards from stock for tableau
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j <= i; j++) {
                let card = this.piles.stock.pop();
                if (j === i) card.faceUp = true;
                this.piles.tableau[i].push(card);
            }
        }

        this.renderPiles();
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    updateStats() {
        const min = Math.floor(this.time / 60);
        const sec = this.time % 60;
        document.getElementById('cs-time').textContent = `${min}:${sec.toString().padStart(2, '0')}`;
        document.getElementById('cs-score').textContent = this.score;
        document.getElementById('cs-moves').textContent = this.moves;
    }

    createCardElement(card) {
        if (!card.faceUp) {
            const el = document.createElement('div');
            el.className = 'cs-card-back cursor-default';
            return el;
        }

        const el = document.createElement('div');
        el.className = `cs-card ${card.color} font-bold`;
        el.dataset.id = card.id;

        const symbol = this.symbols[card.suit];

        el.innerHTML = `
            <div class="text-lg leading-none">${card.rank}</div>
            <div class="text-xl leading-none">${symbol}</div>
            <div class="absolute bottom-1 right-1 transform rotate-180 flex flex-col items-center">
                <div class="text-lg leading-none">${card.rank}</div>
                <div class="text-xl leading-none">${symbol}</div>
            </div>
            <div class="absolute inset-0 flex items-center justify-center text-4xl opacity-20 pointer-events-none">
                ${symbol}
            </div>
        `;
        return el;
    }

    renderPiles() {
        // Stock
        const stockEl = document.getElementById('pile-stock');
        stockEl.innerHTML = '';
        if (this.piles.stock.length > 0) {
            const back = document.createElement('div');
            back.className = 'cs-card-back';
            back.style.position = 'static'; // Centered by flex
            stockEl.appendChild(back);
        } else {
            stockEl.innerHTML = '<span class="text-slate-600 text-2xl">↻</span>';
        }

        // Waste
        const wasteEl = document.getElementById('pile-waste');
        wasteEl.innerHTML = '';
        if (this.piles.waste.length > 0) {
            // Show top 3? Just top 1 for now simplify
            const card = this.piles.waste[this.piles.waste.length - 1];
            const el = this.createCardElement(card);
            el.style.position = 'static';
            this.makeDraggable(el, 'waste', this.piles.waste.length - 1);
            wasteEl.appendChild(el);
        }

        // Foundations
        this.piles.foundations.forEach((pile, idx) => {
            const el = document.getElementById(`pile-foundation-${idx}`);
            // Clear but keep symbol
            const symbol = ['♥', '♦', '♣', '♠'][idx];
            el.innerHTML = pile.length === 0 ? symbol : '';

            if (pile.length > 0) {
                const card = pile[pile.length - 1];
                const cardEl = this.createCardElement(card);
                cardEl.style.position = 'static';
                // Foundations usually draggable? Yes, can move back to tableau
                this.makeDraggable(cardEl, 'foundation', idx);
                el.appendChild(cardEl);
            }
        });

        // Tableau
        this.piles.tableau.forEach((pile, idx) => {
            const pileEl = document.getElementById(`pile-tableau-${idx}`);
            pileEl.innerHTML = '';

            pile.forEach((card, cardIdx) => {
                const cardEl = this.createCardElement(card);
                cardEl.style.top = `${cardIdx * 1.5}rem`; // Waterfall

                if (card.faceUp) {
                    this.makeDraggable(cardEl, 'tableau', idx, cardIdx);
                }

                pileEl.appendChild(cardEl);
            });
        });
    }

    drawStock() {
        if (this.piles.stock.length === 0) {
            // Recycle waste
            if (this.piles.waste.length === 0) return;
            this.piles.stock = this.piles.waste.reverse().map(c => ({...c, faceUp: false}));
            this.piles.waste = [];
        } else {
            const card = this.piles.stock.pop();
            card.faceUp = true;
            this.piles.waste.push(card);
        }
        this.soundManager.playSound('click'); // simple sound
        this.moves++;
        this.renderPiles();
        this.updateStats();
    }

    makeDraggable(el, type, pileIdx, cardIdxInPile = -1) {
        el.addEventListener('mousedown', (e) => this.onMouseDown(e, type, pileIdx, cardIdxInPile));
        el.addEventListener('touchstart', (e) => this.onMouseDown(e, type, pileIdx, cardIdxInPile), {passive: false});
    }

    onMouseDown(e, type, pileIdx, cardIdx) {
        if (e.button !== 0 && e.type === 'mousedown') return; // Left click only
        e.preventDefault();

        // Get Cards to drag
        let cards = [];
        if (type === 'waste') {
            cards = [this.piles.waste[this.piles.waste.length - 1]];
        } else if (type === 'foundation') {
            cards = [this.piles.foundations[pileIdx][this.piles.foundations[pileIdx].length - 1]];
        } else if (type === 'tableau') {
            cards = this.piles.tableau[pileIdx].slice(cardIdx);
        }

        if (cards.length === 0) return;

        this.dragState = {
            active: true,
            cards: cards,
            sourcePileType: type,
            sourcePileIndex: pileIdx,
            sourceCardIdx: cardIdx,
            startX: e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX,
            startY: e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY,
        };

        // Create visual drag element (ghost)
        const ghost = document.createElement('div');
        ghost.style.position = 'fixed';
        ghost.style.zIndex = '1000';
        ghost.style.pointerEvents = 'none';
        ghost.style.left = '0';
        ghost.style.top = '0';
        ghost.style.transform = `translate(${this.dragState.startX - 48}px, ${this.dragState.startY - 20}px)`; // Offset slightly

        cards.forEach((card, i) => {
            const el = this.createCardElement(card);
            el.style.position = 'absolute';
            el.style.top = `${i * 1.5}rem`;
            ghost.appendChild(el);
        });

        document.body.appendChild(ghost);
        this.dragState.el = ghost;

        this.soundManager.playSound('hover');
    }

    onMouseMove(e) {
        if (!this.dragState.active) return;
        if(e.type === 'touchmove') e.preventDefault();

        const x = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
        const y = e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY;

        this.dragState.el.style.transform = `translate(${x - 48}px, ${y - 20}px)`;
    }

    onMouseUp(e) {
        if (!this.dragState.active) return;

        const x = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
        const y = e.type.includes('touch') ? e.changedTouches[0].clientY : e.clientY;

        // Hit Detection
        // Check Foundations
        for (let i = 0; i < 4; i++) {
            const el = document.getElementById(`pile-foundation-${i}`);
            const rect = el.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                if (this.tryMoveToFoundation(i)) {
                    this.finishDrag();
                    return;
                }
            }
        }

        // Check Tableau
        for (let i = 0; i < 7; i++) {
            const el = document.getElementById(`pile-tableau-${i}`);
            // Check mostly the bottom area of the pile
            const rect = el.getBoundingClientRect();
            // Extend rect downwards
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= window.innerHeight) {
                 if (this.tryMoveToTableau(i)) {
                     this.finishDrag();
                     return;
                 }
            }
        }

        this.cancelDrag();
    }

    tryMoveToFoundation(foundationIdx) {
        if (this.dragState.cards.length !== 1) return false;
        const card = this.dragState.cards[0];
        const pile = this.piles.foundations[foundationIdx];

        // Rule: Ace if empty, or +1 same suit
        if (pile.length === 0) {
            if (card.rank === 'A') {
                // Correct Suit?
                // Actually foundations are suit specific in layout 0=Hearts, 1=Diamonds...
                const targetSuit = ['hearts', 'diamonds', 'clubs', 'spades'][foundationIdx];
                if (card.suit === targetSuit) return this.executeMove('foundation', foundationIdx);
            }
        } else {
            const top = pile[pile.length - 1];
            if (card.suit === top.suit && card.value === top.value + 1) {
                return this.executeMove('foundation', foundationIdx);
            }
        }
        return false;
    }

    tryMoveToTableau(tableauIdx) {
        const draggingCards = this.dragState.cards;
        const bottomCard = draggingCards[0];
        const pile = this.piles.tableau[tableauIdx];

        // Rule: King if empty, or -1 and diff color
        if (pile.length === 0) {
            if (bottomCard.rank === 'K') return this.executeMove('tableau', tableauIdx);
        } else {
            const top = pile[pile.length - 1];
            if (bottomCard.color !== top.color && bottomCard.value === top.value - 1) {
                return this.executeMove('tableau', tableauIdx);
            }
        }
        return false;
    }

    executeMove(targetType, targetIdx) {
        // Remove from source
        const cards = this.dragState.cards;

        if (this.dragState.sourcePileType === 'waste') {
            this.piles.waste.pop();
        } else if (this.dragState.sourcePileType === 'foundation') {
            this.piles.foundations[this.dragState.sourcePileIndex].pop();
        } else if (this.dragState.sourcePileType === 'tableau') {
            const srcPile = this.piles.tableau[this.dragState.sourcePileIndex];
            // Remove the chunk
            srcPile.splice(this.dragState.sourceCardIdx, cards.length);
            // Flip new top card if face down
            if (srcPile.length > 0) {
                const newTop = srcPile[srcPile.length - 1];
                if (!newTop.faceUp) {
                    newTop.faceUp = true;
                    this.score += 5; // Points for flip
                }
            }
        }

        // Add to target
        if (targetType === 'foundation') {
            this.piles.foundations[targetIdx].push(cards[0]);
            this.score += 10;
            // Check win
            if (this.piles.foundations.every(p => p.length === 13)) {
                this.gameWin();
            }
        } else if (targetType === 'tableau') {
            this.piles.tableau[targetIdx].push(...cards);
        }

        this.moves++;
        this.updateStats();
        this.renderPiles();
        this.soundManager.playSound('click'); // Or card snap sound
        return true;
    }

    finishDrag() {
        if (this.dragState.el) this.dragState.el.remove();
        this.dragState = { active: false, cards: [] };
    }

    cancelDrag() {
        // Animate back? Nah, just snap
        this.finishDrag();
    }

    gameWin() {
        this.soundManager.playSound('powerup'); // Victory sound
        window.miniGameHub.showGameOver(this.score + (700 - this.time), () => this.startNewGame());
    }

    update(dt) {}
    draw() {}

    shutdown() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('mouseup', this.boundMouseUp);
        document.removeEventListener('touchmove', this.boundMouseMove);
        document.removeEventListener('touchend', this.boundMouseUp);
        this.container.innerHTML = '';
    }
}
