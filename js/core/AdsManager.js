import SaveSystem from './SaveSystem.js';
import SoundManager from './SoundManager.js';
import ParticleSystem from './ParticleSystem.js';

export default class AdsManager {
    constructor() {
        this.isActive = false;
        this.adContainer = null;
        this.onAdComplete = null;
        this.saveSystem = SaveSystem.getInstance();
        this.tickerActive = false;
        this.tickerInterval = null;

        // --- Ad Content Library ---
        // Type: 'INTERSTITIAL' (Full screen) or 'AMBIENT' (Ticker/Notification)

        this.interstitials = [
            {
                title: "Support Neon Arcade!",
                subtitle: "Check out our new games in the store!",
                icon: "fa-star",
                iconColor: "text-yellow-400",
                buttonText: "ADS... (Simulated)",
                bgGradient: "from-indigo-900 to-purple-900"
            },
            {
                title: "Glitch Cola",
                subtitle: "It tastes like static! Now with 50% more pixels.",
                icon: "fa-wine-bottle",
                iconColor: "text-fuchsia-400",
                buttonText: "Drink Up",
                bgGradient: "from-fuchsia-900 to-pink-900"
            },
            {
                title: "Download RAM",
                subtitle: "Is your PC slow? Download more RAM instantly! (Not a scam)",
                icon: "fa-memory",
                iconColor: "text-blue-400",
                buttonText: "Download Now",
                bgGradient: "from-blue-900 to-cyan-900"
            },
            {
                title: "Cyber-Insurance",
                subtitle: "Protect your save file from corruption today.",
                icon: "fa-shield-virus",
                iconColor: "text-green-400",
                buttonText: "Get Covered",
                bgGradient: "from-green-900 to-emerald-900"
            },
            {
                title: "Hot Single Algorithms",
                subtitle: "Meet local sorting algorithms near you.",
                icon: "fa-heart",
                iconColor: "text-red-400",
                buttonText: "Match Now",
                bgGradient: "from-red-900 to-rose-900"
            },
            {
                title: "Void Travel",
                subtitle: "Visit the Null Pointer Exception. It's empty this time of year.",
                icon: "fa-plane-departure",
                iconColor: "text-purple-400",
                buttonText: "Book Trip",
                bgGradient: "from-purple-900 to-indigo-900"
            },
            {
                title: "Space Burger",
                subtitle: "Made from real alien cows. Probably.",
                icon: "fa-hamburger",
                iconColor: "text-yellow-400",
                buttonText: "Eat Now",
                bgGradient: "from-yellow-900 to-orange-900"
            },
            {
                title: "Retro Shades",
                subtitle: "So you can't see the bugs.",
                icon: "fa-glasses",
                iconColor: "text-cyan-400",
                buttonText: "Wear Them",
                bgGradient: "from-cyan-900 to-blue-900"
            },
            {
                title: "Infinite Loop Tours",
                subtitle: "Experience the same moment forever! Experience the same...",
                icon: "fa-infinity",
                iconColor: "text-red-400",
                buttonText: "Join Loop",
                bgGradient: "from-red-900 to-orange-900"
            },
            {
                title: "Buy Crypto!",
                subtitle: "Invest in 'NeonCoin'. It definitely exists. (Not really)",
                icon: "fa-coins",
                iconColor: "text-yellow-300",
                buttonText: "HODL",
                bgGradient: "from-yellow-900 to-orange-900"
            },
             {
                title: "Loading Happiness...",
                subtitle: "Please wait while we dispense dopamine.",
                icon: "fa-smile-beam",
                iconColor: "text-yellow-200",
                buttonText: "Wait for it...",
                bgGradient: "from-fuchsia-900 to-purple-900"
            },
            {
                title: "You Are The Product",
                subtitle: "If this service is free, you know what that means.",
                icon: "fa-user-tag",
                iconColor: "text-red-400",
                buttonText: "Accept Fate",
                bgGradient: "from-gray-900 to-black"
            },
            {
                title: "Synthesize!",
                subtitle: "Why be organic when you can be chrome?",
                icon: "fa-robot",
                iconColor: "text-cyan-400",
                buttonText: "Upgrade",
                bgGradient: "from-cyan-900 to-blue-900"
            }
        ];

        this.ambientAds = [
            "Glitch Cola: Taste the Static.",
            "Weather Update: 99% chance of Acid Rain in Sector 7.",
            "Don't forget to blink. It keeps the eyes moist.",
            "Sponsored by the Committee for Recursive Acronyms.",
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
        overlay.className = 'fixed inset-0 z-[100] bg-black hidden flex flex-col items-center justify-center';

        overlay.innerHTML = `
            <div id="ad-content-box" class="relative w-full max-w-4xl h-full max-h-[80vh] bg-slate-900 border-2 border-fuchsia-500 rounded-lg overflow-hidden flex flex-col transition-colors duration-500 shadow-[0_0_50px_rgba(255,0,255,0.2)]">
                <!-- Close/Timer -->
                <div class="absolute top-2 right-2 z-20">
                    <div id="ad-timer" class="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center font-bold border border-white backdrop-blur">5</div>
                    <button id="ad-close-btn" class="hidden px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 border border-slate-600 transition-colors">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>

                <!-- Main Content Area -->
                <div id="ad-inner-body" class="flex-1 flex flex-col items-center justify-center relative overflow-hidden w-full h-full">
                    <!-- Standard Ad Elements -->
                    <div id="ad-standard-wrapper" class="flex flex-col items-center text-center p-8 relative z-10">
                         <div id="ad-icon-container" class="mb-6 animate-bounce"></div>
                         <h2 id="ad-title" class="text-4xl font-bold text-white mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-display tracking-wide">TITLE</h2>
                         <p id="ad-subtitle" class="text-xl text-cyan-300 mb-8 max-w-md drop-shadow font-light">Subtitle text goes here.</p>
                         <button id="ad-action-btn" class="px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full text-white font-bold shadow-lg border border-white/20 transition-all hover:scale-105 active:scale-95">ACTION</button>
                    </div>

                    <!-- Mini-Game Area (Hidden by default) -->
                    <div id="ad-minigame-wrapper" class="absolute inset-0 z-10 hidden bg-slate-900">
                        <!-- Canvas or DOM elements for minigame go here -->
                    </div>
                </div>

                <div class="h-1 bg-slate-800 w-full absolute bottom-0 left-0 z-20">
                    <div id="ad-progress" class="h-full bg-cyan-400 w-0 transition-all duration-100 ease-linear shadow-[0_0_10px_cyan]"></div>
                </div>
            </div>
            <div class="mt-4 text-slate-500 text-xs tracking-widest uppercase">Sponsored Content • Neon Ad Network</div>
        `;
        document.body.appendChild(overlay);

        this.adContainer = overlay;
        this.timerEl = overlay.querySelector('#ad-timer');
        this.closeBtn = overlay.querySelector('#ad-close-btn');
        this.progressBar = overlay.querySelector('#ad-progress');
        this.contentBox = overlay.querySelector('#ad-content-box');
        this.innerBody = overlay.querySelector('#ad-inner-body');

        // Wrappers
        this.standardWrapper = overlay.querySelector('#ad-standard-wrapper');
        this.minigameWrapper = overlay.querySelector('#ad-minigame-wrapper');

        // Cache dynamic elements
        this.adIconContainer = overlay.querySelector('#ad-icon-container');
        this.adTitle = overlay.querySelector('#ad-title');
        this.adSubtitle = overlay.querySelector('#ad-subtitle');
        this.adActionBtn = overlay.querySelector('#ad-action-btn');

        this.closeBtn.onclick = () => this.closeAd();
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

        // Random chance for interactive ad (30%)
        if (Math.random() < 0.3) {
            this.showInteractiveAd(callback);
            return;
        }

        // Standard Ad
        const template = this.interstitials[Math.floor(Math.random() * this.interstitials.length)];

        // UI Setup
        this.standardWrapper.classList.remove('hidden');
        this.minigameWrapper.classList.add('hidden');
        this.minigameWrapper.innerHTML = ''; // Clean up

        this.innerBody.className = `flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br ${template.bgGradient} w-full h-full relative overflow-hidden`;

        this.adIconContainer.innerHTML = `<i class="fas ${template.icon} text-6xl ${template.iconColor} drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"></i>`;
        this.adTitle.textContent = template.title;
        this.adSubtitle.textContent = template.subtitle;
        this.adActionBtn.textContent = template.buttonText;

        this.onAdComplete = callback;
        this.isActive = true;
        this.adContainer.classList.remove('hidden');

        // Reset State - ensuring timer is visible for standard ads (Regression fix)
        this.timerEl.classList.remove('hidden');
        this.closeBtn.classList.add('hidden');
        this.progressBar.style.width = '0%';

        let timeLeft = 5;
        this.timerEl.textContent = timeLeft;

        const interval = setInterval(() => {
            if (!this.isActive) {
                clearInterval(interval);
                return;
            }

            timeLeft--;
            this.timerEl.textContent = timeLeft;
            this.progressBar.style.width = `${((5 - timeLeft) / 5) * 100}%`;

            if (timeLeft <= 0) {
                clearInterval(interval);
                this.timerEl.classList.add('hidden');
                this.closeBtn.classList.remove('hidden');
            }
        }, 1000);
    }

    showInteractiveAd(callback) {
        this.onAdComplete = callback;
        this.isActive = true;
        this.adContainer.classList.remove('hidden');

        // Hide standard UI, Show MiniGame UI
        this.standardWrapper.classList.add('hidden');
        this.minigameWrapper.classList.remove('hidden');
        this.innerBody.className = "flex-1 flex flex-col w-full h-full relative overflow-hidden bg-slate-900"; // Reset bg

        // Hide normal timer/close for now (controlled by minigame)
        this.timerEl.classList.add('hidden');
        this.closeBtn.classList.add('hidden');
        this.progressBar.style.width = '0%';

        // Failsafe Timer (15s) - Prevents getting stuck
        setTimeout(() => {
            if (this.isActive && this.closeBtn.classList.contains('hidden')) {
                this.closeBtn.classList.remove('hidden');
            }
        }, 15000);

        // Pick Game
        const games = ['glitchScrub', 'targetPractice'];
        const game = games[Math.floor(Math.random() * games.length)];

        if (game === 'glitchScrub') {
            this._runGlitchScrub(() => this._finishInteractiveAd());
        } else {
            this._runTargetPractice(() => this._finishInteractiveAd());
        }
    }

    _finishInteractiveAd() {
        // Show reward/close
        this.closeBtn.classList.remove('hidden');

        // Reward
        this.saveSystem.addCurrency(20);
        SoundManager.getInstance().playSound('powerup');

        // Show brief success msg
        const success = document.createElement('div');
        success.className = 'absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-50 animate-fade-in';
        success.innerHTML = `
            <div class="text-4xl text-green-400 font-bold mb-2">AD CLEARED!</div>
            <div class="text-xl text-white">+20 Coins</div>
        `;
        this.minigameWrapper.appendChild(success);

        // Auto close after 1.5s
        setTimeout(() => {
            this.closeAd();
        }, 1500);
    }

    // --- Mini-Game: Glitch Scrub ---
    _runGlitchScrub(onWin) {
        this.minigameWrapper.innerHTML = `
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                 <div class="text-center opacity-50">
                    <i class="fas fa-eraser text-6xl text-cyan-400 mb-4 animate-pulse"></i>
                    <h2 class="text-2xl font-bold text-white">SCRUB THE GLITCH!</h2>
                    <p class="text-sm text-gray-400">Move mouse to clean screen</p>
                 </div>
            </div>
            <canvas id="scrub-canvas" class="absolute inset-0 cursor-crosshair z-10"></canvas>
        `;

        const canvas = this.minigameWrapper.querySelector('#scrub-canvas');
        const ctx = canvas.getContext('2d');
        const rect = this.minigameWrapper.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Fill with "Glitch" noise
        ctx.fillStyle = '#1e1b4b'; // Deep blue base
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw static
        for (let i = 0; i < 5000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#ff00ff' : '#00ffff';
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const s = Math.random() * 5 + 2;
            ctx.fillRect(x, y, s, s);
        }

        // Logic
        let scrubAmount = 0;
        const targetScrub = 200; // Arbitrary units of movement

        const handleMove = (e) => {
            if (!this.isActive) return;
            const r = canvas.getBoundingClientRect();
            // Handle both mouse and touch
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const x = clientX - r.left;
            const y = clientY - r.top;

            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(x, y, 40, 0, Math.PI * 2);
            ctx.fill();

            // Spawn particles
            if (Math.random() > 0.5) {
                ParticleSystem.getInstance().emit(clientX, clientY, '#00ffff', 2);
            }

            scrubAmount++;
            const pct = Math.min(100, (scrubAmount / targetScrub) * 100);
            this.progressBar.style.width = `${pct}%`;

            if (scrubAmount >= targetScrub) {
                // Win
                canvas.removeEventListener('mousemove', handleMove);
                canvas.removeEventListener('touchmove', handleMove);
                onWin();
            }
        };

        canvas.addEventListener('mousemove', handleMove);
        canvas.addEventListener('touchmove', handleMove);
    }

    // --- Mini-Game: Target Practice ---
    _runTargetPractice(onWin) {
        this.minigameWrapper.innerHTML = `
             <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                 <h2 class="text-2xl font-bold text-white mb-2 shadow-black drop-shadow-md">DESTROY TARGETS!</h2>
                 <div class="text-cyan-400 font-mono text-xl"><span id="tp-count">5</span> REMAINING</div>
            </div>
            <div id="tp-play-area" class="absolute inset-0 z-10 overflow-hidden cursor-crosshair"></div>
        `;

        const area = this.minigameWrapper.querySelector('#tp-play-area');
        const countEl = this.minigameWrapper.querySelector('#tp-count');
        let targetsLeft = 5;

        const spawnTarget = () => {
            if (!this.isActive || targetsLeft <= 0) return;

            const t = document.createElement('div');
            t.className = 'absolute w-16 h-16 rounded-full bg-red-500 border-4 border-white shadow-[0_0_15px_red] flex items-center justify-center text-white cursor-pointer animate-pulse active:scale-95 transition-transform hover:scale-110';
            t.innerHTML = '<i class="fas fa-bullseye"></i>';

            // Random Pos
            const maxX = area.clientWidth - 80;
            const maxY = area.clientHeight - 80;
            t.style.left = `${Math.random() * maxX}px`;
            t.style.top = `${Math.random() * maxY}px`;

            const hitTarget = (e) => {
                e.stopPropagation(); // prevent drag issues
                e.preventDefault(); // Prevent double firing on some touch devices
                SoundManager.getInstance().playSound('shoot');

                // Particles
                const rect = t.getBoundingClientRect();
                ParticleSystem.getInstance().emit(rect.left + 32, rect.top + 32, '#ff0000', 10);

                t.remove();
                targetsLeft--;
                countEl.textContent = targetsLeft;

                if (targetsLeft <= 0) {
                    onWin();
                } else {
                    spawnTarget(); // Spawn next
                }
            };

            // Use pointerdown to handle both mouse and touch efficiently
            t.onpointerdown = hitTarget;

            area.appendChild(t);
        };

        // Start chain
        spawnTarget();
    }

    closeAd() {
        this.isActive = false;
        this.adContainer.classList.add('hidden');
        this.minigameWrapper.innerHTML = ''; // Clean up listeners implicitly
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

    // --- Popup System (Immersive Ads) ---
    createPopup(title, content, bgColor = "bg-slate-800") {
        const popup = document.createElement('div');
        const x = Math.random() * (window.innerWidth - 300);
        const y = Math.random() * (window.innerHeight - 200);

        popup.className = `fixed z-[200] w-80 rounded-lg shadow-2xl border border-white/20 overflow-hidden flex flex-col animate-bounce`;
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;

        popup.innerHTML = `
            <div class="h-8 ${bgColor} border-b border-white/10 flex items-center justify-between px-3 cursor-move">
                <span class="text-white font-bold text-xs truncate">${title}</span>
                <button class="text-white/50 hover:text-white transition-colors close-btn">&times;</button>
            </div>
            <div class="bg-black/90 p-4 text-white text-sm">
                ${content}
            </div>
        `;

        document.body.appendChild(popup);

        // Basic Drag Logic
        const header = popup.querySelector('div');
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        header.onmousedown = (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = popup.offsetLeft;
            initialTop = popup.offsetTop;
            popup.style.zIndex = 201; // Bring to front
        };

        window.onmousemove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            popup.style.left = `${initialLeft + dx}px`;
            popup.style.top = `${initialTop + dy}px`;
        };

        window.onmouseup = () => { isDragging = false; };
        popup.querySelector('.close-btn').onclick = () => popup.remove();
        setTimeout(() => popup.remove(), 10000);
    }
}
