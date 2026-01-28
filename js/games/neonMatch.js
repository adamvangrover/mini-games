import SoundManager from '../core/SoundManager.js';

export default class NeonMatch {
    constructor() {
        this.container = null;
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.isLocked = false;

        this.soundManager = SoundManager.getInstance();

        this.icons = [
            'fa-ghost', 'fa-bolt', 'fa-bomb', 'fa-heart',
            'fa-star', 'fa-moon', 'fa-cloud', 'fa-fire'
        ];
    }

    async init(container) {
        this.container = container;
        this.setupGame();
    }

    setupGame() {
        this.matchedPairs = 0;
        this.moves = 0;
        this.flippedCards = [];
        this.isLocked = false;

        // Create Pairs
        let deck = [...this.icons, ...this.icons];
        deck = this.shuffle(deck);

        this.container.innerHTML = `
            <div class="flex flex-col items-center h-full w-full select-none">
                <h2 class="text-4xl font-bold text-fuchsia-400 neon-text mb-4">NEON MATCH</h2>
                <div class="flex gap-8 mb-6 text-xl text-white">
                    <div>Moves: <span id="nm-moves" class="text-yellow-400">0</span></div>
                    <div>Pairs: <span id="nm-pairs" class="text-cyan-400">0/8</span></div>
                </div>

                <div class="grid grid-cols-4 gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    ${deck.map((icon, index) => `
                        <div class="nm-card w-16 h-16 md:w-20 md:h-20 bg-slate-700 rounded-lg cursor-pointer transition-all duration-300 transform hover:scale-105 relative flex items-center justify-center border-2 border-slate-600 shadow-lg" data-icon="${icon}" data-index="${index}">
                            <i class="fas fa-question text-2xl text-slate-500 transition-opacity duration-300 opacity-100 card-back"></i>
                            <i class="fas ${icon} text-3xl text-white opacity-0 absolute transition-all duration-300 scale-0 card-front"></i>
                        </div>
                    `).join('')}
                </div>

                <button class="back-btn mt-8 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors">
                    <i class="fas fa-arrow-left mr-2"></i> Back
                </button>
            </div>
            <style>
                .nm-card.flipped {
                    background-color: #0f172a; /* Slate 900 */
                    border-color: #d946ef; /* Fuchsia 500 */
                    box-shadow: 0 0 15px #d946ef;
                    transform: rotateY(180deg);
                }
                .nm-card.matched {
                    background-color: #064e3b; /* Emerald 900 */
                    border-color: #10b981; /* Emerald 500 */
                    box-shadow: 0 0 15px #10b981;
                    opacity: 0.8;
                    pointer-events: none;
                }
                .nm-card.flipped .card-back { opacity: 0; }
                .nm-card.flipped .card-front { opacity: 1; transform: scale(1) rotateY(180deg); }

                .nm-card .card-front { transform: rotateY(180deg) scale(0); }

                .nm-card.active {
                    background-color: #1e293b;
                    border-color: #e879f9;
                    box-shadow: 0 0 10px #e879f9;
                }
                .nm-card.active .card-back { opacity: 0; transform: scale(0); }
                .nm-card.active .card-front { opacity: 1; transform: scale(1); }
            </style>
        `;

        this.cards = Array.from(this.container.querySelectorAll('.nm-card'));

        this.cards.forEach(card => {
            card.addEventListener('click', () => this.handleCardClick(card));
        });

        this.container.querySelector('.back-btn').addEventListener('click', () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        });
    }

    handleCardClick(card) {
        if (this.isLocked || card.classList.contains('active') || card.classList.contains('matched')) return;

        this.flipCard(card);
    }

    flipCard(card) {
        card.classList.add('active');
        this.flippedCards.push(card);
        this.soundManager.playSound('click'); // Or a specific flip sound if available

        if (this.flippedCards.length === 2) {
            this.moves++;
            document.getElementById('nm-moves').textContent = this.moves;
            this.checkMatch();
        }
    }

    checkMatch() {
        this.isLocked = true;
        const [card1, card2] = this.flippedCards;
        const icon1 = card1.dataset.icon;
        const icon2 = card2.dataset.icon;

        if (icon1 === icon2) {
            // Match
            this.soundManager.playSound('score'); // Success sound
            setTimeout(() => {
                card1.classList.add('matched');
                card2.classList.add('matched');
                card1.classList.remove('active');
                card2.classList.remove('active'); // Keep them visible but styled as matched

                card1.querySelector('.card-back').style.opacity = '0';
                card1.querySelector('.card-front').style.opacity = '1';
                card1.querySelector('.card-front').style.transform = 'scale(1)';

                card2.querySelector('.card-back').style.opacity = '0';
                card2.querySelector('.card-front').style.opacity = '1';
                card2.querySelector('.card-front').style.transform = 'scale(1)';

                this.flippedCards = [];
                this.matchedPairs++;
                document.getElementById('nm-pairs').textContent = `${this.matchedPairs}/8`;
                this.isLocked = false;

                if (this.matchedPairs === 8) {
                    this.gameOver();
                }
            }, 500);
        } else {
            // No Match
            this.soundManager.playTone(150, 'sawtooth', 0.1); // Error buzz
            setTimeout(() => {
                card1.classList.remove('active');
                card2.classList.remove('active');
                this.flippedCards = [];
                this.isLocked = false;
            }, 1000);
        }
    }

    gameOver() {
        setTimeout(() => {
            this.soundManager.playSound('victory'); // Or generic score
            if (window.miniGameHub) {
                // Calculate score based on moves (fewer is better)
                // Base 1000 - (moves - 8) * 20
                let score = Math.max(100, 1000 - (this.moves - 8) * 50);
                window.miniGameHub.showGameOver(score, () => this.setupGame());
            }
        }, 500);
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    update(dt) {}
    draw() {}
    shutdown() {
        this.container.innerHTML = '';
    }
}
