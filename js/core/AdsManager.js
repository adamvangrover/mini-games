import SaveSystem from './SaveSystem.js';

export default class AdsManager {
    constructor() {
        this.isActive = false;
        this.adContainer = null;
        this.onAdComplete = null;
        this.saveSystem = SaveSystem.getInstance();

        // Ad Templates
        this.adTemplates = [
            {
                title: "Support Neon Arcade!",
                subtitle: "Check out our new games in the store!",
                icon: "fa-star",
                iconColor: "text-yellow-400",
                buttonText: "ADS... (Simulated)",
                bgGradient: "from-indigo-900 to-purple-900"
            },
            {
                title: "Hydration Check!",
                subtitle: "Have you drank water today? Stay hydrated, gamer.",
                icon: "fa-tint",
                iconColor: "text-cyan-400",
                buttonText: "Gulp Gulp...",
                bgGradient: "from-blue-900 to-cyan-900"
            },
            {
                title: "Touch Grass?",
                subtitle: "Just kidding. Keep playing.",
                icon: "fa-tree",
                iconColor: "text-green-400",
                buttonText: "Touching Pixels instead",
                bgGradient: "from-green-900 to-emerald-900"
            },
            {
                title: "404: Ad Not Found",
                subtitle: "We couldn't find a real ad, so enjoy this placeholder.",
                icon: "fa-bug",
                iconColor: "text-red-400",
                buttonText: "Debugging...",
                bgGradient: "from-gray-900 to-slate-900"
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
                title: "Hot Single Pixels",
                subtitle: "In your area! Waiting to be rendered.",
                icon: "fa-square",
                iconColor: "text-pink-400",
                buttonText: "Render Now",
                bgGradient: "from-pink-900 to-rose-900"
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

        this._initContainer();
    }

    static getInstance() {
        if (!AdsManager.instance) {
            AdsManager.instance = new AdsManager();
        }
        return AdsManager.instance;
    }

    _initContainer() {
        if (document.getElementById('ad-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'ad-overlay';
        overlay.className = 'fixed inset-0 z-[100] bg-black hidden flex flex-col items-center justify-center';
        // Base structure, content injected dynamically
        overlay.innerHTML = `
            <div id="ad-content-box" class="relative w-full max-w-4xl h-full max-h-[80vh] bg-slate-900 border-2 border-fuchsia-500 rounded-lg overflow-hidden flex flex-col transition-colors duration-500">
                <div class="absolute top-2 right-2 z-10">
                    <div id="ad-timer" class="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center font-bold border border-white">5</div>
                    <button id="ad-close-btn" class="hidden px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 border border-slate-600">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>

                <div id="ad-inner-body" class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-indigo-900 to-purple-900 w-full h-full">
                    <!-- Dynamic Content -->
                </div>

                <div class="h-1 bg-slate-800 w-full absolute bottom-0 left-0">
                    <div id="ad-progress" class="h-full bg-cyan-400 w-0 transition-all duration-100 ease-linear"></div>
                </div>
            </div>
            <div class="mt-4 text-slate-500 text-sm">Advertisement</div>
        `;
        document.body.appendChild(overlay);

        this.adContainer = overlay;
        this.timerEl = overlay.querySelector('#ad-timer');
        this.closeBtn = overlay.querySelector('#ad-close-btn');
        this.progressBar = overlay.querySelector('#ad-progress');
        this.contentBox = overlay.querySelector('#ad-content-box');
        this.innerBody = overlay.querySelector('#ad-inner-body');

        this.closeBtn.onclick = () => this.closeAd();
    }

    areAdsEnabled() {
        const setting = this.saveSystem.getSetting('adsEnabled');
        return setting !== false; // Default to true if undefined
    }

    toggleAds(enabled) {
        this.saveSystem.setSetting('adsEnabled', enabled);
    }

    showAd(callback) {
        if (!this.areAdsEnabled()) {
            // Ads disabled, skip immediately
            if (callback) callback();
            return;
        }

        // Pick random template
        const template = this.adTemplates[Math.floor(Math.random() * this.adTemplates.length)];

        // Update UI
        this.innerBody.className = `flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br ${template.bgGradient} w-full h-full`;
        this.innerBody.innerHTML = `
            <div class="mb-6 animate-bounce">
                <i class="fas ${template.icon} text-6xl ${template.iconColor} drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"></i>
            </div>
            <h2 class="text-3xl font-bold text-white mb-4 drop-shadow-md">${template.title}</h2>
            <p class="text-xl text-cyan-300 mb-8 max-w-md">${template.subtitle}</p>
            <div class="animate-pulse px-6 py-3 bg-white/10 backdrop-blur rounded-full text-white font-bold shadow-lg border border-white/20">
                ${template.buttonText}
            </div>
        `;

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
}
