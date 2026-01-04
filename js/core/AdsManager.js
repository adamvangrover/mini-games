import SaveSystem from './SaveSystem.js';
import ParticleSystem from './ParticleSystem.js';

export default class AdsManager {
    constructor() {
        this.isActive = false;
        this.adContainer = null;
        this.onAdComplete = null;
        this.saveSystem = SaveSystem.getInstance();
        this.tickerActive = false;
        this.tickerInterval = null;
        this.miniGameActive = false;

        // --- Ad Content Library ---
        // Type: 'target_practice', 'quick_math', 'glitch_scrub'

        this.interstitials = [
            {
                title: "Support Neon Arcade!",
                subtitle: "Play this mini-game to unlock your reward!",
                icon: "fa-gamepad",
                iconColor: "text-yellow-400",
                buttonText: "START GAME",
                bgGradient: "from-indigo-900 to-purple-900",
                type: 'random' // Will pick random game
            },
            {
                title: "Glitch Cola Challenge",
                subtitle: "Catch the can before it glitches away!",
                icon: "fa-wine-bottle",
                iconColor: "text-fuchsia-400",
                buttonText: "START CHALLENGE",
                bgGradient: "from-fuchsia-900 to-pink-900",
                type: 'target_practice'
            },
            {
                title: "Brain Upgrade",
                subtitle: "Verify your CPU processing speed.",
                icon: "fa-microchip",
                iconColor: "text-cyan-400",
                buttonText: "CALCULATE",
                bgGradient: "from-blue-900 to-cyan-900",
                type: 'quick_math'
            },
            {
                title: "System Cleaner",
                subtitle: "Scrub away the corrupted pixels!",
                icon: "fa-broom",
                iconColor: "text-green-400",
                buttonText: "CLEAN SYSTEM",
                bgGradient: "from-green-900 to-emerald-900",
                type: 'glitch_scrub'
            }
        ];

        this.ambientAds = [
            "Glitch Cola: Taste the Static.",
            "Weather Update: 99% chance of Acid Rain in Sector 7.",
            "Lost: One pixel. If found, please return to (0,0).",
            "News: AI takes over toaster industry, toast is now perfectly burnt.",
            "Tip: Pressing buttons makes things happen.",
            "Wanted: Schrödinger's Cat. Dead or Alive.",
            "System: Garbage Collection imminent. Hide your trash.",
            "Deal: 50% off on all invisible items at the Void Shop.",
            "Quote: 'It works on my machine' - Anonymous Dev.",
            "Travel: Visit the Edge of the Map. Watch your step.",
            "Sport: Neon Ball finals tonight! Red vs Blue.",
            "Reminder: Hydrate before you die-drate.",
            "Status: Reality rendering at 60 FPS.",
            "Market: BitPixel up 10% on news of higher resolution.",
            "Warning: Low Poly counts detected in your area."
        ];

        this._initContainer();
        this._initTicker();
    }

    static getInstance() {
        if (!AdsManager.instance) {
            AdsManager.instance = new AdsManager();
        }
        return AdsManager.instance;
    }

    // --- Initialization ---

    _initContainer() {
        if (document.getElementById('ad-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'ad-overlay';
        overlay.className = 'fixed inset-0 z-[100] bg-black/90 hidden flex flex-col items-center justify-center backdrop-blur-sm';

        overlay.innerHTML = `
            <div id="ad-content-box" class="relative w-full max-w-4xl h-[80vh] bg-slate-900 border-2 border-fuchsia-500 rounded-lg overflow-hidden flex flex-col transition-colors duration-500 shadow-[0_0_50px_rgba(255,0,255,0.2)]">
                <div class="absolute top-4 right-4 z-20 flex gap-4">
                     <div id="ad-score" class="hidden px-4 py-2 bg-black/50 text-yellow-400 font-bold border border-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                        SCORE: 0/5
                    </div>
                    <button id="ad-close-btn" class="hidden px-4 py-2 bg-red-600/80 text-white rounded hover:bg-red-500 border border-white/20 transition-colors font-bold">
                        <i class="fas fa-times"></i> GIVE UP
                    </button>
                </div>

                <div id="ad-inner-body" class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-indigo-900 to-purple-900 w-full h-full relative overflow-hidden select-none">
                    <!-- Background Pattern -->
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(circle, #ffffff 1px, transparent 1px); background-size: 20px 20px;"></div>

                    <!-- Game Container (Absolute) -->
                    <div id="ad-game-layer" class="absolute inset-0 z-10 hidden overflow-hidden cursor-crosshair flex items-center justify-center">
                        <!-- Targets or Math appear here -->
                    </div>

                    <!-- Intro Content -->
                    <div id="ad-intro-content" class="relative z-10 flex flex-col items-center">
                        <div id="ad-icon-container" class="mb-6 animate-bounce">
                            <!-- Icon Injected Here -->
                        </div>
                        <h2 id="ad-title" class="text-4xl font-bold text-white mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-display tracking-wide">TITLE</h2>
                        <p id="ad-subtitle" class="text-xl text-cyan-300 mb-8 max-w-md drop-shadow font-light">Subtitle text goes here.</p>
                        <button id="ad-action-btn" class="px-8 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-full text-white font-bold shadow-[0_0_20px_rgba(217,70,239,0.5)] border border-white/20 transition-all hover:scale-105 active:scale-95">
                            ACTION
                        </button>
                    </div>

                     <!-- Success/Fail Overlay -->
                    <div id="ad-result-overlay" class="absolute inset-0 z-30 hidden flex flex-col items-center justify-center bg-black/80 backdrop-blur">
                        <h2 id="ad-result-title" class="text-5xl font-bold text-white mb-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">SUCCESS!</h2>
                        <p id="ad-result-msg" class="text-xl text-yellow-300 mb-6">Reward: 50 Coins</p>
                        <button id="ad-claim-btn" class="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-full text-white font-bold shadow-lg transition-all hover:scale-105">
                            CLAIM
                        </button>
                    </div>
                </div>

                <div class="h-1 bg-slate-800 w-full absolute bottom-0 left-0 pointer-events-none">
                    <div id="ad-progress" class="h-full bg-cyan-400 w-0 transition-all duration-100 ease-linear shadow-[0_0_10px_cyan]"></div>
                </div>
            </div>
            <div class="mt-4 text-slate-500 text-xs tracking-widest uppercase">Sponsored Content • Neon Ad Network</div>
        `;
        document.body.appendChild(overlay);

        this.adContainer = overlay;
        this.closeBtn = overlay.querySelector('#ad-close-btn');
        this.scoreEl = overlay.querySelector('#ad-score');
        this.progressBar = overlay.querySelector('#ad-progress');
        this.contentBox = overlay.querySelector('#ad-content-box');
        this.innerBody = overlay.querySelector('#ad-inner-body');
        this.gameLayer = overlay.querySelector('#ad-game-layer');
        this.introContent = overlay.querySelector('#ad-intro-content');
        this.resultOverlay = overlay.querySelector('#ad-result-overlay');
        this.resultTitle = overlay.querySelector('#ad-result-title');
        this.resultMsg = overlay.querySelector('#ad-result-msg');
        this.claimBtn = overlay.querySelector('#ad-claim-btn');

        // Cache dynamic elements
        this.adIconContainer = overlay.querySelector('#ad-icon-container');
        this.adTitle = overlay.querySelector('#ad-title');
        this.adSubtitle = overlay.querySelector('#ad-subtitle');
        this.adActionBtn = overlay.querySelector('#ad-action-btn');

        this.closeBtn.onclick = () => this.closeAd(false); // Give up
        this.claimBtn.onclick = () => this.closeAd(true); // Claim
        this.adActionBtn.onclick = () => this.startMiniGame();
    }

    _initTicker() {
        if (document.getElementById('news-ticker')) return;

        const ticker = document.createElement('div');
        ticker.id = 'news-ticker';
        ticker.className = 'fixed bottom-0 left-0 w-full bg-slate-900/90 border-t border-fuchsia-500/30 text-cyan-400 py-1 px-4 z-[40] font-mono text-xs overflow-hidden hidden pointer-events-none select-none';

        ticker.innerHTML = `
            <div class="flex items-center gap-4">
                <span class="font-bold text-fuchsia-500 whitespace-nowrap">LIVE FEED:</span>
                <div class="relative overflow-hidden w-full h-5">
                     <div id="ticker-content" class="absolute whitespace-nowrap animate-marquee">
                        Welcome to Neon Arcade. Check the store for new items!
                     </div>
                </div>
            </div>
        `;

        if (!document.getElementById('ticker-style')) {
            const style = document.createElement('style');
            style.id = 'ticker-style';
            style.innerHTML = `
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 15s linear infinite;
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(ticker);
        this.tickerEl = ticker;
        this.tickerContent = ticker.querySelector('#ticker-content');

        this.startAmbientCycle();
    }

    // --- Logic ---

    areAdsEnabled() {
        const setting = this.saveSystem.getSetting('adsEnabled');
        return setting !== false; // Default to true
    }

    toggleAds(enabled) {
        this.saveSystem.setSetting('adsEnabled', enabled);
        if (!enabled) {
            this.stopAmbientCycle();
            if (this.tickerEl) this.tickerEl.classList.add('hidden');
        } else {
            this.startAmbientCycle();
            if (this.tickerEl) this.tickerEl.classList.remove('hidden');
        }
    }

    // --- Interstitial Ads ---

    showAd(callback) {
        if (!this.areAdsEnabled()) {
            if (callback) callback();
            return;
        }

        // Pick random template
        this.currentTemplate = this.interstitials[Math.floor(Math.random() * this.interstitials.length)];

        // Determine Game Type
        this.currentGameType = this.currentTemplate.type;
        if (this.currentGameType === 'random') {
             const types = ['target_practice', 'quick_math', 'glitch_scrub'];
             this.currentGameType = types[Math.floor(Math.random() * types.length)];
        }

        // Update UI
        this.innerBody.className = `flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br ${this.currentTemplate.bgGradient} w-full h-full relative overflow-hidden select-none`;

        this.adIconContainer.innerHTML = `<i class="fas ${this.currentTemplate.icon} text-6xl ${this.currentTemplate.iconColor} drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"></i>`;
        this.adTitle.textContent = this.currentTemplate.title;
        this.adSubtitle.textContent = this.currentTemplate.subtitle;
        this.adActionBtn.textContent = this.currentTemplate.buttonText;

        this.onAdComplete = callback;
        this.isActive = true;
        this.adContainer.classList.remove('hidden');

        // Reset State
        this.introContent.classList.remove('hidden');
        this.gameLayer.classList.add('hidden');
        this.gameLayer.innerHTML = ''; // Clear old content
        this.resultOverlay.classList.add('hidden');
        this.closeBtn.classList.add('hidden');
        this.scoreEl.classList.add('hidden');
        this.progressBar.style.width = '0%';
    }

    startMiniGame() {
        this.introContent.classList.add('hidden');
        this.gameLayer.classList.remove('hidden');
        this.closeBtn.classList.remove('hidden');
        this.scoreEl.classList.remove('hidden');

        this.miniGameActive = true;
        this.gameScore = 0;

        if (this.currentGameType === 'target_practice') {
            this.gameTarget = 5;
            this.gameDuration = 10;
            this.spawnInterval = setInterval(() => this.spawnTarget(), 800);
        } else if (this.currentGameType === 'quick_math') {
            this.gameTarget = 3;
            this.gameDuration = 15;
            this.spawnMathProblem();
        } else if (this.currentGameType === 'glitch_scrub') {
            this.gameTarget = 50; // Pixels to scrub
            this.gameDuration = 8;
            this.spawnGlitchField();
        }

        this.timeLeft = this.gameDuration;
        this.scoreEl.textContent = `SCORE: ${this.gameScore}/${this.gameTarget}`;
        this.scoreEl.className = "px-4 py-2 bg-black/50 text-white font-bold border border-white rounded-full";

        this.gameLoop = setInterval(() => this.updateGame(), 100);
    }

    updateGame() {
        if (!this.miniGameActive) return;

        this.timeLeft -= 0.1;
        this.progressBar.style.width = `${((this.gameDuration - this.timeLeft) / this.gameDuration) * 100}%`;

        if (this.timeLeft <= 0) {
            this.endMiniGame(false);
        }
    }

    // --- Target Practice Logic ---

    spawnTarget() {
        if (!this.miniGameActive || this.currentGameType !== 'target_practice') return;

        const target = document.createElement('div');
        const size = 50 + Math.random() * 30;
        const x = Math.random() * (this.gameLayer.clientWidth - size);
        const y = Math.random() * (this.gameLayer.clientHeight - size);

        target.className = "absolute rounded-full cursor-pointer flex items-center justify-center transform transition-transform active:scale-90 animate-pulse shadow-[0_0_15px_currentColor]";
        target.style.width = `${size}px`;
        target.style.height = `${size}px`;
        target.style.left = `${x}px`;
        target.style.top = `${y}px`;
        target.style.backgroundColor = this.currentTemplate.iconColor.replace('text-', 'bg-').replace('400', '500') || '#f0f';
        if(target.style.backgroundColor === '') target.style.backgroundColor = '#d946ef';

        target.innerHTML = `<i class="fas fa-crosshairs text-white text-xl"></i>`;

        target.onmousedown = (e) => {
            e.stopPropagation();
            this.hitTarget(target);
        };

        setTimeout(() => {
            if (target.parentNode) target.remove();
        }, 1500);

        this.gameLayer.appendChild(target);
    }

    hitTarget(el) {
        if (!this.miniGameActive) return;
        el.remove();
        this.incrementScore();
        // Particle
        const particleSystem = ParticleSystem.getInstance();
        if (particleSystem) {
             const rect = el.getBoundingClientRect();
             particleSystem.emit(rect.left+25, rect.top+25, '#fff', 10);
        }
    }

    // --- Quick Math Logic ---

    spawnMathProblem() {
        if (!this.miniGameActive || this.currentGameType !== 'quick_math') return;
        this.gameLayer.innerHTML = ''; // Clear

        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        const ans = a + b;

        // Generate answers (1 correct, 2 wrong)
        let options = [ans];
        while(options.length < 3) {
            let fake = ans + Math.floor(Math.random() * 6) - 3;
            if (fake !== ans && !options.includes(fake) && fake > 0) options.push(fake);
        }
        options.sort(() => Math.random() - 0.5);

        const container = document.createElement('div');
        container.className = "flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300";

        const problem = document.createElement('div');
        problem.className = "text-6xl font-bold text-white drop-shadow-[0_0_10px_cyan]";
        problem.textContent = `${a} + ${b} = ?`;
        container.appendChild(problem);

        const grid = document.createElement('div');
        grid.className = "flex gap-4";

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = "w-24 h-24 rounded-xl bg-slate-800 border-2 border-slate-600 text-3xl font-bold text-white hover:bg-slate-700 hover:border-cyan-400 transition-all";
            btn.textContent = opt;
            btn.onclick = () => {
                if (opt === ans) {
                    this.incrementScore();
                    if(this.miniGameActive) this.spawnMathProblem(); // Next problem
                } else {
                    btn.classList.add('bg-red-900', 'border-red-500');
                    setTimeout(() => this.endMiniGame(false), 200); // Fail
                }
            };
            grid.appendChild(btn);
        });

        container.appendChild(grid);
        this.gameLayer.appendChild(container);
    }

    // --- Glitch Scrub Logic ---
    spawnGlitchField() {
        if (!this.miniGameActive || this.currentGameType !== 'glitch_scrub') return;
        this.gameLayer.innerHTML = '';

        const container = document.createElement('div');
        container.className = 'grid grid-cols-10 grid-rows-10 w-full h-full gap-1 p-8';

        for (let i = 0; i < 100; i++) {
            const cell = document.createElement('div');
            // Randomly decide if this cell is "corrupted" (needs scrubbing)
            const isCorrupted = Math.random() > 0.5;

            if (isCorrupted) {
                cell.className = 'w-full h-full bg-green-900/80 border border-green-500/30 cursor-crosshair hover:bg-transparent transition-colors duration-200';
                cell.dataset.active = 'true';

                cell.onmouseover = () => {
                    if (cell.dataset.active === 'true' && this.miniGameActive) {
                        cell.dataset.active = 'false';
                        cell.className = 'w-full h-full bg-transparent transition-all duration-500';
                        this.incrementScore();
                    }
                };
            } else {
                cell.className = 'w-full h-full bg-transparent';
            }
            container.appendChild(cell);
        }

        this.gameLayer.appendChild(container);
    }

    // --- Score Logic ---

    incrementScore() {
        this.gameScore++;

        // Show progress differently for Scrub
        if (this.currentGameType === 'glitch_scrub') {
             const pct = Math.min(100, (this.gameScore / this.gameTarget) * 100);
             this.scoreEl.textContent = `CLEAN: ${Math.floor(pct)}%`;
        } else {
            this.scoreEl.textContent = `SCORE: ${this.gameScore}/${this.gameTarget}`;
        }

        this.scoreEl.className = "px-4 py-2 bg-black/50 text-green-400 font-bold border border-green-400 rounded-full scale-110 transition-transform";
        setTimeout(() => this.scoreEl.classList.remove('scale-110'), 100);

        if (this.gameScore >= this.gameTarget) {
            this.endMiniGame(true);
        }
    }

    endMiniGame(success) {
        this.miniGameActive = false;
        clearInterval(this.gameLoop);
        clearInterval(this.spawnInterval);
        this.gameLayer.innerHTML = '';

        if (success) {
            this.resultOverlay.classList.remove('hidden');
            this.resultTitle.textContent = "SUCCESS!";
            this.resultTitle.className = "text-5xl font-bold text-green-400 mb-4 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]";
            this.resultMsg.textContent = "Reward: 50 Coins";

            // Give Reward
            this.saveSystem.addCurrency(50);
            if (typeof window.updateHubStats === 'function') window.updateHubStats();

            // Sound
            // Assuming global access or import, but AdsManager already imports SoundManager? No.
            // Let's rely on Particles for now or implicit juice.

        } else {
            this.resultOverlay.classList.remove('hidden');
            this.resultTitle.textContent = "FAILED";
            this.resultTitle.className = "text-5xl font-bold text-red-500 mb-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]";
            this.resultMsg.textContent = "System integrity compromised.";
            this.claimBtn.textContent = "CLOSE";
            this.claimBtn.className = "px-8 py-3 bg-slate-600 hover:bg-slate-500 rounded-full text-white font-bold shadow-lg transition-all";
        }
    }

    closeAd(claimed) {
        this.isActive = false;
        this.miniGameActive = false;
        if (this.gameLoop) clearInterval(this.gameLoop);
        if (this.spawnInterval) clearInterval(this.spawnInterval);

        this.adContainer.classList.add('hidden');
        if (this.onAdComplete) {
            this.onAdComplete();
            this.onAdComplete = null;
        }
    }

    // --- Ambient Ads (Ticker) ---

    startAmbientCycle() {
        if (this.tickerInterval) clearInterval(this.tickerInterval);
        if (!this.areAdsEnabled()) return;

        if (this.tickerEl) this.tickerEl.classList.remove('hidden');
        this.updateTicker();

        this.tickerInterval = setInterval(() => {
            if (!this.areAdsEnabled()) return;
            this.updateTicker();
        }, 15000);
    }

    stopAmbientCycle() {
        if (this.tickerInterval) clearInterval(this.tickerInterval);
    }

    updateTicker() {
        if (!this.tickerContent) return;
        const text = this.ambientAds[Math.floor(Math.random() * this.ambientAds.length)];
        this.tickerContent.textContent = text;
    }
}
