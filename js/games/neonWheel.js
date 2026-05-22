import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonWheel {
    constructor() {
        this.container = null;
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();

        this.phrases = [
            { category: "PHRASE", text: "MAY THE FORCE BE WITH YOU" },
            { category: "TECH", text: "ARTIFICIAL INTELLIGENCE" },
            { category: "GAME", text: "SUPER MARIO BROS" },
            { category: "MOVIE", text: "THE MATRIX" },
            { category: "PLACE", text: "NEON CITY" },
            { category: "THING", text: "QUANTUM COMPUTER" },
            { category: "PHRASE", text: "TO INFINITY AND BEYOND" },
            { category: "TECH", text: "BLOCKCHAIN TECHNOLOGY" },
            { category: "GAME", text: "THE LEGEND OF ZELDA" },
            { category: "FOOD", text: "SPICY RAMEN NOODLES" }
        ];

        this.wheelWedges = [
            { value: 500, color: "#ff00ff" },
            { value: 900, color: "#00ffff" },
            { value: "BANKRUPT", color: "#000000" },
            { value: 600, color: "#ff00ff" },
            { value: 300, color: "#00ffff" },
            { value: 800, color: "#ffff00" },
            { value: "LOSE TURN", color: "#555555" },
            { value: 700, color: "#ff00ff" },
            { value: 400, color: "#00ffff" },
            { value: 1000, color: "#ffaa00" },
            { value: 550, color: "#ff00ff" },
            { value: 2500, color: "#00ff00" }
        ];

        this.currentPhrase = null;
        this.guessedLetters = new Set();
        this.score = 0;
        this.roundScore = 0;
        this.spinsLeft = 5; // To prevent infinite games
        this.gameState = 'START'; // START, SPINNING, GUESSING, SOLVING, OVER
        this.currentWedge = null;
        this.wheelAngle = 0;
        this.spinVelocity = 0;

        // Canvas setup for wheel
        this.wheelCanvas = null;
        this.wheelCtx = null;

        // Loop binding
        this.boundUpdate = this.update.bind(this);
        this.lastTime = 0;
        this.animationFrame = null;
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white font-['Poppins'] p-4 relative overflow-hidden">
                <!-- Background Grid -->
                <div class="absolute inset-0 pointer-events-none opacity-20" style="background-image: linear-gradient(0deg, transparent 24%, rgba(0, 255, 255, .3) 25%, rgba(0, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, .3) 75%, rgba(0, 255, 255, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 255, .3) 25%, rgba(0, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(0, 255, 255, .3) 75%, rgba(0, 255, 255, .3) 76%, transparent 77%, transparent); background-size: 50px 50px;"></div>

                <!-- Header -->
                <div class="w-full max-w-4xl flex justify-between items-center z-10 mb-4 px-4 py-2 bg-slate-800/80 border border-cyan-500 rounded-lg shadow-[0_0_15px_rgba(0,255,255,0.3)]">
                    <div class="text-xl font-bold text-cyan-400">NEON WHEEL</div>
                    <div class="flex gap-6">
                        <div class="text-center">
                            <div class="text-xs text-slate-400">ROUND SCORE</div>
                            <div id="nw-round-score" class="text-2xl font-bold text-yellow-400">0</div>
                        </div>
                        <div class="text-center">
                            <div class="text-xs text-slate-400">TOTAL BANK</div>
                            <div id="nw-total-score" class="text-2xl font-bold text-green-400">0</div>
                        </div>
                        <div class="text-center">
                            <div class="text-xs text-slate-400">SPINS LEFT</div>
                            <div id="nw-spins-left" class="text-2xl font-bold text-fuchsia-400">5</div>
                        </div>
                    </div>
                    <button id="nw-back-btn" class="px-4 py-2 bg-red-600 hover:bg-red-500 rounded font-bold transition-colors">BACK</button>
                </div>

                <!-- Game Area Split -->
                <div class="w-full max-w-5xl flex-1 flex flex-col lg:flex-row gap-6 z-10">

                    <!-- Left: Wheel Area -->
                    <div class="flex-1 flex flex-col items-center justify-center relative bg-slate-800/50 rounded-xl border border-slate-700 p-4 shadow-lg">
                        <div id="nw-wheel-container" class="relative w-[300px] h-[300px] mb-4">
                            <canvas id="nw-wheel-canvas" width="300" height="300" class="rounded-full shadow-[0_0_30px_rgba(255,0,255,0.2)]"></canvas>
                            <!-- Flipper -->
                            <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] z-10" style="transform-origin: top center;"></div>
                        </div>

                        <div class="h-16 flex items-center justify-center w-full">
                            <div id="nw-spin-result" class="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 drop-shadow-[0_0_10px_rgba(255,0,255,0.5)] transition-all">
                                SPIN TO PLAY
                            </div>
                        </div>

                        <div class="flex gap-4 mt-4 w-full">
                            <button id="nw-spin-btn" class="flex-1 py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-black text-xl rounded-lg shadow-[0_0_15px_rgba(255,0,255,0.5)] transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">SPIN WHEEL</button>
                            <button id="nw-buy-vowel-btn" class="py-4 px-6 bg-cyan-700 hover:bg-cyan-600 text-white font-bold rounded-lg shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">BUY VOWEL ($250)</button>
                            <button id="nw-solve-btn" class="py-4 px-6 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg shadow-[0_0_10px_rgba(255,255,0,0.3)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">SOLVE</button>
                        </div>
                    </div>

                    <!-- Right: Board & Keyboard -->
                    <div class="flex-[1.5] flex flex-col gap-4">
                        <!-- Category -->
                        <div class="bg-fuchsia-900/50 border border-fuchsia-500 text-fuchsia-300 px-4 py-2 rounded text-center font-bold tracking-widest shadow-[0_0_10px_rgba(255,0,255,0.2)]">
                            CATEGORY: <span id="nw-category">???</span>
                        </div>

                        <!-- Puzzle Board -->
                        <div id="nw-board" class="bg-slate-800 border-2 border-slate-600 rounded-lg p-4 flex flex-wrap justify-center gap-2 min-h-[200px] content-center shadow-inner">
                            <!-- Letter boxes injected here -->
                        </div>

                        <!-- Keyboard -->
                        <div id="nw-keyboard" class="bg-slate-800/80 border border-slate-700 rounded-lg p-4 mt-auto">
                            <!-- Keys injected here -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Solve Modal Overlay -->
            <div id="nw-solve-modal" class="hidden absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div class="bg-slate-800 border-2 border-yellow-500 p-8 rounded-xl max-w-lg w-full text-center shadow-[0_0_30px_rgba(255,255,0,0.3)]">
                    <h2 class="text-3xl font-black text-yellow-400 mb-6">SOLVE THE PUZZLE</h2>
                    <input type="text" id="nw-solve-input" class="w-full bg-slate-900 border border-slate-600 text-white text-2xl p-4 rounded mb-6 text-center uppercase focus:outline-none focus:border-yellow-400" autocomplete="off" placeholder="TYPE YOUR ANSWER">
                    <div class="flex gap-4">
                        <button id="nw-submit-solve-btn" class="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded transition-colors">SUBMIT</button>
                        <button id="nw-cancel-solve-btn" class="flex-1 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded transition-colors">CANCEL</button>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.initWheel();
        this.startNewRound();

        // Start animation loop for wheel
        this.lastTime = performance.now();
        this.animationFrame = requestAnimationFrame(this.boundUpdate);
    }

    bindEvents() {
        document.getElementById('nw-back-btn').onclick = () => window.miniGameHub.goBack();

        this.spinBtn = document.getElementById('nw-spin-btn');
        this.buyVowelBtn = document.getElementById('nw-buy-vowel-btn');
        this.solveBtn = document.getElementById('nw-solve-btn');

        this.spinBtn.onclick = () => this.spinWheel();
        this.buyVowelBtn.onclick = () => this.buyVowel();
        this.solveBtn.onclick = () => this.openSolveModal();

        document.getElementById('nw-cancel-solve-btn').onclick = () => {
            document.getElementById('nw-solve-modal').classList.add('hidden');
            this.updateControls();
        };

        document.getElementById('nw-submit-solve-btn').onclick = () => this.submitSolve();

        const solveInput = document.getElementById('nw-solve-input');
        solveInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitSolve();
        });
    }

    initWheel() {
        this.wheelCanvas = document.getElementById('nw-wheel-canvas');
        this.wheelCtx = this.wheelCanvas.getContext('2d');
        this.drawWheel();
    }

    drawWheel() {
        const ctx = this.wheelCtx;
        const cx = 150;
        const cy = 150;
        const radius = 140;
        const totalWedges = this.wheelWedges.length;
        const arc = (Math.PI * 2) / totalWedges;

        ctx.clearRect(0, 0, 300, 300);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.wheelAngle);

        for (let i = 0; i < totalWedges; i++) {
            const angle = i * arc;
            const wedge = this.wheelWedges[i];

            // Wedge Background
            ctx.beginPath();
            ctx.arc(0, 0, radius, angle, angle + arc, false);
            ctx.lineTo(0, 0);
            ctx.fillStyle = wedge.color;
            ctx.fill();

            // Border
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#222';
            ctx.stroke();

            // Text
            ctx.save();
            // Center of the wedge arc
            ctx.rotate(angle + arc / 2);
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillStyle = (wedge.color === "#000000" || wedge.color === "#555555") ? "#fff" : "#000";
            ctx.font = "bold 14px Arial";
            // Move out to edge and draw text
            ctx.fillText(wedge.value.toString(), radius - 10, 0);
            ctx.restore();
        }

        // Inner circle
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0ff';
        ctx.stroke();

        ctx.restore();
    }

    startNewRound() {
        // Pick random phrase
        const idx = Math.floor(Math.random() * this.phrases.length);
        this.currentPhrase = this.phrases[idx];
        this.guessedLetters.clear();

        document.getElementById('nw-category').textContent = this.currentPhrase.category;

        this.roundScore = 0;
        this.spinsLeft = 5;
        this.updateHUD();

        this.buildBoard();
        this.buildKeyboard();

        this.gameState = 'START';
        this.updateControls();
        this.setSpinResult("SPIN TO START");
    }

    buildBoard() {
        const board = document.getElementById('nw-board');
        board.innerHTML = '';

        const words = this.currentPhrase.text.split(' ');

        words.forEach(word => {
            const wordDiv = document.createElement('div');
            wordDiv.className = "flex gap-1 mb-2";

            for (let i = 0; i < word.length; i++) {
                const char = word[i];
                const box = document.createElement('div');
                box.className = "w-10 h-12 sm:w-12 sm:h-16 flex items-center justify-center font-bold text-2xl sm:text-3xl border-2 shadow-sm transition-all duration-500";

                // Keep references for updating later
                box.dataset.char = char;

                if (/[A-Z]/.test(char)) {
                    box.classList.add('bg-white', 'border-slate-300', 'text-transparent'); // Hidden letter
                } else {
                    box.classList.add('bg-transparent', 'border-transparent', 'text-cyan-400'); // Punctuation/Space
                    box.textContent = char;
                    box.classList.remove('text-transparent');
                }

                wordDiv.appendChild(box);
            }
            board.appendChild(wordDiv);
        });
    }

    buildKeyboard() {
        const kb = document.getElementById('nw-keyboard');
        kb.innerHTML = '';

        const rows = [
            "QWERTYUIOP",
            "ASDFGHJKL",
            "ZXCVBNM"
        ];

        rows.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = "flex justify-center gap-1 sm:gap-2 mb-2";

            for (let i = 0; i < row.length; i++) {
                const char = row[i];
                const btn = document.createElement('button');
                btn.className = "nw-key w-8 h-10 sm:w-10 sm:h-12 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded shadow-[0_4px_0_#334155] active:shadow-[0_0px_0_#334155] active:translate-y-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed";
                btn.textContent = char;
                btn.id = `nw-key-${char}`;

                // Vowels have special styling and logic
                if (['A','E','I','O','U'].includes(char)) {
                    btn.classList.remove('bg-slate-700', 'hover:bg-slate-600');
                    btn.classList.add('bg-cyan-900', 'text-cyan-200');
                    // Disable vowels by default until "Buy Vowel" is clicked
                    btn.disabled = true;
                }

                btn.onclick = () => this.handleGuess(char);
                rowDiv.appendChild(btn);
            }
            kb.appendChild(rowDiv);
        });

        this.updateKeyboardState();
    }

    updateKeyboardState() {
        const isVowelGuessing = this.gameState === 'GUESSING_VOWEL';
        const isConsonantGuessing = this.gameState === 'GUESSING_CONSONANT';

        const keys = document.querySelectorAll('.nw-key');
        keys.forEach(btn => {
            const char = btn.textContent;
            const isVowel = ['A','E','I','O','U'].includes(char);
            const isGuessed = this.guessedLetters.has(char);

            if (isGuessed) {
                btn.disabled = true;
                btn.classList.add('opacity-30');
            } else if (isVowel) {
                btn.disabled = !isVowelGuessing;
            } else {
                btn.disabled = !isConsonantGuessing;
            }
        });
    }

    updateControls() {
        this.spinBtn.disabled = this.gameState !== 'START' && this.gameState !== 'TURN_END';
        this.buyVowelBtn.disabled = (this.gameState !== 'START' && this.gameState !== 'TURN_END') || this.roundScore < 250;
        this.solveBtn.disabled = this.gameState !== 'START' && this.gameState !== 'TURN_END';

        if (this.spinsLeft <= 0 && (this.gameState === 'START' || this.gameState === 'TURN_END')) {
             this.spinBtn.disabled = true;
             this.setSpinResult("OUT OF SPINS - MUST SOLVE");
        }
    }

    updateHUD() {
        document.getElementById('nw-round-score').textContent = `$${this.roundScore}`;
        document.getElementById('nw-total-score').textContent = `$${this.score}`;
        document.getElementById('nw-spins-left').textContent = this.spinsLeft;
    }

    setSpinResult(text, colorClass = "text-cyan-400") {
        const el = document.getElementById('nw-spin-result');
        el.className = `text-3xl font-black tracking-wider transition-all ${colorClass} drop-shadow-[0_0_10px_currentColor]`;
        el.textContent = text;

        // Pop effect
        el.style.transform = 'scale(1.2)';
        setTimeout(() => el.style.transform = 'scale(1)', 200);
    }

    spinWheel() {
        if (this.gameState !== 'START' && this.gameState !== 'TURN_END') return;
        if (this.spinsLeft <= 0) return;

        this.spinsLeft--;
        this.updateHUD();
        this.soundManager.playSound('click'); // Or a spin sound

        this.gameState = 'SPINNING';
        this.updateControls();
        this.updateKeyboardState();
        this.setSpinResult("SPINNING...", "text-fuchsia-400");

        // Random spin velocity between 0.3 and 0.6 rads per frame
        this.spinVelocity = 0.3 + Math.random() * 0.3;
    }

    buyVowel() {
        if (this.roundScore < 250) return;
        this.soundManager.playSound('click');
        this.roundScore -= 250;
        this.updateHUD();

        this.gameState = 'GUESSING_VOWEL';
        this.updateControls();
        this.updateKeyboardState();
        this.setSpinResult("CHOOSE A VOWEL", "text-cyan-400");
    }

    handleGuess(char) {
        if (this.guessedLetters.has(char)) return;

        this.guessedLetters.add(char);
        this.soundManager.playSound('click');

        // Reveal letters
        const boxes = document.querySelectorAll('#nw-board div[data-char]');
        let count = 0;

        boxes.forEach(box => {
            if (box.dataset.char === char) {
                count++;
                // Flip animation
                box.style.transform = 'rotateY(90deg)';
                setTimeout(() => {
                    box.classList.remove('bg-white', 'text-transparent', 'border-slate-300');
                    box.classList.add('bg-cyan-900/50', 'text-white', 'border-cyan-500', 'shadow-[0_0_10px_rgba(0,255,255,0.5)]');
                    box.textContent = char;
                    box.style.transform = 'rotateY(0deg)';
                }, 250);
            }
        });

        const isVowel = ['A','E','I','O','U'].includes(char);

        if (count > 0) {
            this.soundManager.playSound('score');
            if (!isVowel) {
                // Add score for consonants
                const added = this.currentWedge.value * count;
                this.roundScore += added;
                this.setSpinResult(`FOUND ${count} ${char}'s! (+$${added})`, "text-green-400");
            } else {
                this.setSpinResult(`FOUND ${count} ${char}'s!`, "text-green-400");
            }
        } else {
            this.soundManager.playSound('error');
            this.setSpinResult(`NO ${char}'s!`, "text-red-500");
        }

        this.updateHUD();
        this.updateKeyboardState();

        // Brief pause to show result before next turn
        setTimeout(() => {
            this.checkWinCondition();
        }, 1500);
    }

    checkWinCondition() {
        // Are all letters revealed?
        const unrevealed = Array.from(document.querySelectorAll('#nw-board div[data-char]')).filter(box => {
            const char = box.dataset.char;
            return /[A-Z]/.test(char) && !this.guessedLetters.has(char);
        });

        if (unrevealed.length === 0) {
            this.handleRoundWin();
        } else {
            this.gameState = 'TURN_END';
            this.updateControls();
            this.updateKeyboardState();
            if (this.spinsLeft > 0) {
                 this.setSpinResult("SPIN OR SOLVE", "text-yellow-400");
            } else {
                 this.setSpinResult("MUST SOLVE NOW", "text-red-400");
            }
        }
    }

    openSolveModal() {
        this.soundManager.playSound('click');
        document.getElementById('nw-solve-modal').classList.remove('hidden');
        document.getElementById('nw-solve-input').value = '';
        document.getElementById('nw-solve-input').focus();
        this.gameState = 'SOLVING';
        this.updateControls();
    }

    submitSolve() {
        const input = document.getElementById('nw-solve-input').value.toUpperCase().trim();
        document.getElementById('nw-solve-modal').classList.add('hidden');

        // Remove spaces and punctuation from target for loose comparison, or strict?
        // Let's do strict but ignore extra spaces
        const target = this.currentPhrase.text.replace(/\s+/g, ' ');
        const guess = input.replace(/\s+/g, ' ');

        if (guess === target) {
            this.soundManager.playSound('powerup');
            // Reveal all
            const boxes = document.querySelectorAll('#nw-board div[data-char]');
            boxes.forEach(box => {
                const char = box.dataset.char;
                if (/[A-Z]/.test(char) && !this.guessedLetters.has(char)) {
                    box.classList.remove('bg-white', 'text-transparent', 'border-slate-300');
                    box.classList.add('bg-yellow-900/50', 'text-yellow-400', 'border-yellow-500');
                    box.textContent = char;
                }
            });
            this.handleRoundWin(true); // Bonus for solving early
        } else {
            this.soundManager.playSound('error');
            this.setSpinResult("INCORRECT SOLUTION!", "text-red-500");
            setTimeout(() => {
                this.gameState = 'TURN_END';
                this.updateControls();
                if (this.spinsLeft <= 0) {
                     this.gameOver();
                } else {
                     this.setSpinResult("SPIN AGAIN", "text-yellow-400");
                }
            }, 2000);
        }
    }

    handleRoundWin(solvedEarly = false) {
        this.gameState = 'OVER';
        this.updateControls();

        let bonus = 0;
        if (solvedEarly) {
            // Count unrevealed consonants for bonus
            const unrevealedConsonants = Array.from(this.currentPhrase.text).filter(c => /[A-Z]/.test(c) && !['A','E','I','O','U'].includes(c) && !this.guessedLetters.has(c));
            bonus = unrevealedConsonants.length * 500;
        }

        const roundTotal = this.roundScore + bonus + 1000; // 1000 base win bonus
        this.score += roundTotal;
        this.updateHUD();

        this.setSpinResult(`YOU WON $${roundTotal}!`, "text-green-400");

        // Small particle burst (using container)
        for(let i=0; i<30; i++) {
             const spark = document.createElement('div');
             spark.className = 'absolute w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_10px_#fdba74] pointer-events-none z-50';
             spark.style.left = '50%';
             spark.style.top = '50%';
             const angle = Math.random() * Math.PI * 2;
             const dist = 50 + Math.random() * 150;
             spark.animate([
                 { transform: 'translate(0,0) scale(1)', opacity: 1 },
                 { transform: `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px) scale(0)`, opacity: 0 }
             ], { duration: 1000 + Math.random()*1000, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
             this.container.appendChild(spark);
             setTimeout(() => spark.remove(), 2000);
        }

        setTimeout(() => {
            window.miniGameHub.showGameOver(this.score, () => {
                this.score = 0; // Reset total score on replay
                this.startNewRound();
            });
        }, 3000);
    }

    gameOver() {
        this.gameState = 'OVER';
        this.updateControls();
        this.soundManager.playSound('error');
        this.setSpinResult("GAME OVER", "text-red-600");

        setTimeout(() => {
            window.miniGameHub.showGameOver(this.score, () => {
                this.score = 0;
                this.startNewRound();
            });
        }, 2000);
    }

    update(time) {
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        if (this.gameState === 'SPINNING') {
            this.wheelAngle += this.spinVelocity;

            // Friction
            this.spinVelocity *= 0.98;

            if (this.spinVelocity < 0.002) {
                this.spinVelocity = 0;
                this.determineSpinResult();
            }

            // Click sound effect as wedges pass (approximated)
            const wedgeArc = (Math.PI * 2) / this.wheelWedges.length;
            const currentWedgeIdx = Math.floor(((this.wheelAngle + Math.PI/2) % (Math.PI * 2)) / wedgeArc);
            if (this.lastWedgeIdx !== currentWedgeIdx) {
                // Play a very short/quiet tick sound if available, else just rely on visual
                this.lastWedgeIdx = currentWedgeIdx;
            }

            this.drawWheel();
        }

        this.animationFrame = requestAnimationFrame(this.boundUpdate);
    }

    determineSpinResult() {
        // Calculate which wedge is at the top (top is at angle -Math.PI/2 relative to center)
        // Normalizing angle
        let normalizedAngle = this.wheelAngle % (Math.PI * 2);
        if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;

        // The top pointer is at -90 degrees (or 270 deg / 1.5 PI).
        // Since wheel rotates clockwise, we need to find what part of the wheel is at the top.
        const topAngle = (Math.PI * 1.5 - normalizedAngle + Math.PI * 2) % (Math.PI * 2);

        const wedgeArc = (Math.PI * 2) / this.wheelWedges.length;
        const wedgeIndex = Math.floor(topAngle / wedgeArc);

        this.currentWedge = this.wheelWedges[wedgeIndex];

        if (this.currentWedge.value === 'BANKRUPT') {
            this.soundManager.playSound('error');
            this.roundScore = 0;
            this.updateHUD();
            this.setSpinResult("BANKRUPT!", "text-red-500");
            setTimeout(() => {
                this.gameState = 'TURN_END';
                this.updateControls();
                if (this.spinsLeft <= 0) this.gameOver();
            }, 2000);
        } else if (this.currentWedge.value === 'LOSE TURN') {
            this.soundManager.playSound('error');
            this.setSpinResult("LOSE TURN!", "text-red-500");
            setTimeout(() => {
                this.gameState = 'TURN_END';
                this.updateControls();
                if (this.spinsLeft <= 0) this.gameOver();
            }, 2000);
        } else {
            this.soundManager.playSound('powerup');
            this.setSpinResult(`$${this.currentWedge.value}! GUESS A CONSONANT`, "text-yellow-400");
            this.gameState = 'GUESSING_CONSONANT';
            this.updateControls();
            this.updateKeyboardState();
        }
    }

    draw() {
        // Used for rendering if tied to main hub loop, but we use internal RAF for smoother wheel animation
    }

    async shutdown() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
