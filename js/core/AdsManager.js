import SaveSystem from './SaveSystem.js';

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
        overlay.className = 'fixed inset-0 z-[100] bg-black hidden flex flex-col items-center justify-center';

        overlay.innerHTML = `
            <div id="ad-content-box" class="relative w-full max-w-4xl h-full max-h-[80vh] bg-slate-900 border-2 border-fuchsia-500 rounded-lg overflow-hidden flex flex-col transition-colors duration-500 shadow-[0_0_50px_rgba(255,0,255,0.2)]">
                <div class="absolute top-2 right-2 z-10">
                    <div id="ad-timer" class="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center font-bold border border-white backdrop-blur">5</div>
                    <button id="ad-close-btn" class="hidden px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 border border-slate-600 transition-colors">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>

                <div id="ad-inner-body" class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-indigo-900 to-purple-900 w-full h-full relative overflow-hidden">
                    <!-- Background Pattern -->
                    <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle, #ffffff 1px, transparent 1px); background-size: 20px 20px;"></div>

                    <!-- Content -->
                    <div class="relative z-10 flex flex-col items-center">
                        <div id="ad-icon-container" class="mb-6 animate-bounce">
                            <!-- Icon Injected Here -->
                        </div>
                        <h2 id="ad-title" class="text-4xl font-bold text-white mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-display tracking-wide">TITLE</h2>
                        <p id="ad-subtitle" class="text-xl text-cyan-300 mb-8 max-w-md drop-shadow font-light">Subtitle text goes here.</p>
                        <button id="ad-action-btn" class="px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full text-white font-bold shadow-lg border border-white/20 transition-all hover:scale-105 active:scale-95">
                            ACTION
                        </button>
                    </div>
                </div>

                <div class="h-1 bg-slate-800 w-full absolute bottom-0 left-0">
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
        // Placed at bottom, visible but not intrusive.
        // pointer-events-none so it doesn't block clicks (unless we want it to be interactive later)
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

        // Add CSS animation for marquee if not in style.css
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

        // Start Ambient Cycle
        this.startAmbientCycle();
    }

    // --- Logic ---

    areAdsEnabled() {
        const setting = this.saveSystem.getSetting('adsEnabled');
        return setting !== false; // Default to true if undefined
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
        const template = this.interstitials[Math.floor(Math.random() * this.interstitials.length)];

        // Update UI
        this.innerBody.className = `flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br ${template.bgGradient} w-full h-full relative overflow-hidden`;

        this.adIconContainer.innerHTML = `<i class="fas ${template.icon} text-6xl ${template.iconColor} drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"></i>`;
        this.adTitle.textContent = template.title;
        this.adSubtitle.textContent = template.subtitle;
        this.adActionBtn.textContent = template.buttonText;

        this.onAdComplete = callback;
        this.isActive = true;
        this.adContainer.classList.remove('hidden');

        // Reset State
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

    closeAd() {
        this.isActive = false;
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

        // Show ticker
        if (this.tickerEl) this.tickerEl.classList.remove('hidden');

        // Initial update
        this.updateTicker();

        // Rotate every 15s (matching animation approx)
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

        // Reset animation logic to prevent jumpiness
        // We can just update text, CSS animation loops continuously.
        // Or better: fade out/in? For now, just swap text.
        // To make it sync with scroll, we'd need JS animation.
        // Let's rely on CSS loop and just change text. It might change mid-scroll but that's "glitchy" and cool.

        this.tickerContent.textContent = text;
    }
}
