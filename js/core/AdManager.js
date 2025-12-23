import SaveSystem from './SaveSystem.js';

export default class AdManager {
    constructor() {
        this.active = false;
        this.overlay = null;
        this.saveSystem = SaveSystem.getInstance();
    }

    /**
     * Shows a full-screen interstitial ad.
     * @param {Function} onComplete - Callback when the ad is closed.
     */
    showInterstitial(onComplete) {
        // Check if ads are enabled
        const settings = this.saveSystem.getSettings();
        if (settings && settings.adsEnabled === false) {
            if (onComplete) onComplete();
            return;
        }

        if (this.active) return;
        this.active = true;

        // Create DOM Overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'ad-overlay';
        this.overlay.className = 'fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center text-white font-sans';

        // Fun and Funny Ad Content
        const ads = [
            { title: "Glitch Cola", desc: "It tastes like static! Now with 50% more pixels.", color: "text-fuchsia-400" },
            { title: "Download RAM", desc: "Is your PC slow? Download more RAM instantly! (Not a scam)", color: "text-blue-400" },
            { title: "Cyber-Insurance", desc: "Protect your save file from corruption today.", color: "text-green-400" },
            { title: "Hot Single Algorithms", desc: "Meet local sorting algorithms near you.", color: "text-pink-400" },
            { title: "Void Travel", desc: "Visit the Null Pointer Exception. It's empty this time of year.", color: "text-purple-400" },
            { title: "Space Burger", desc: "Made from real alien cows. Probably.", color: "text-yellow-400" },
            { title: "Retro Shades", desc: "So you can't see the bugs.", color: "text-cyan-400" },
            { title: "Infinite Loop Tours", desc: "Experience the same moment forever! Experience the same...", color: "text-red-400" }
        ];
        const ad = ads[Math.floor(Math.random() * ads.length)];

        this.overlay.innerHTML = `
            <div class="absolute top-4 right-4 text-gray-500 text-sm">ADVERTISEMENT</div>
            <div class="flex flex-col items-center justify-center h-full w-full bg-slate-900/95 backdrop-blur">
                <div class="text-4xl font-bold mb-4 animate-bounce ${ad.color}">${ad.title}</div>
                <div class="bg-gray-800 p-8 rounded-xl border-2 border-slate-600 max-w-md text-center shadow-2xl relative overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                    <p class="mb-6 text-xl text-gray-300 font-medium relative z-10">"${ad.desc}"</p>
                    <div class="w-full bg-gray-700 h-2 rounded-full overflow-hidden mb-4 relative z-10">
                         <div id="ad-progress" class="h-full bg-yellow-400 w-full transition-all duration-100 ease-linear"></div>
                    </div>
                    <div id="ad-timer" class="text-sm text-gray-400 font-mono relative z-10">Closing in 3s...</div>
                </div>
                <button id="ad-skip-btn" class="mt-8 px-6 py-2 border border-gray-600 rounded text-gray-500 cursor-not-allowed opacity-50 transition-all" disabled>
                    Skip Ad
                </button>
            </div>
        `;

        document.body.appendChild(this.overlay);

        // Timer Logic
        let duration = 3000; // 3 seconds
        const startTime = Date.now();

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, duration - elapsed);

            const progress = (remaining / duration) * 100;
            const progressEl = document.getElementById('ad-progress');
            if (progressEl) progressEl.style.width = `${progress}%`;

            const timerEl = document.getElementById('ad-timer');
            if (timerEl) timerEl.textContent = `Closing in ${(remaining / 1000).toFixed(1)}s...`;

            if (remaining <= 0) {
                clearInterval(interval);
                this.closeAd(onComplete);
            }
        }, 100);
    }

    closeAd(callback) {
        if (this.overlay) {
            this.overlay.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            setTimeout(() => {
                if (this.overlay && this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                }
                this.overlay = null;
                this.active = false;
                if (callback) callback();
            }, 500);
        } else {
             this.active = false;
             if (callback) callback();
        }
    }
}
