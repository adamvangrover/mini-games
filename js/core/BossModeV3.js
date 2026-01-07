import SaveSystem from './SaveSystem.js';
import SoundManager from './SoundManager.js';
import AdsManager from './AdsManager.js';
import { EMAILS, DOCUMENTS, SLIDES, CHATS, TERMINAL_ADVENTURE } from './BossModeContent.js';

export default class BossModeV3 {
    constructor(container) {
        this.container = container;
        this.isActive = true;
        this.systemState = 'boot';
        this.activeApp = 'excel';
        this.startMenuOpen = false;
        this.notificationOpen = false;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.adsManager = AdsManager.getInstance();

        this.user = {
            name: "John Doe",
            role: "Senior Risk Analyst",
            initials: "JD",
            password: "password123"
        };

        this.wallpaperIndex = 0;
        this.wallpapers = [
            'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop'
        ];

        this.init();
    }

    init() {
        this.container.innerHTML = '';
        this.container.className = 'absolute inset-0 z-[10000] bg-black font-sans text-xs text-black flex flex-col cursor-default select-none overflow-hidden';

        if (this.systemState === 'boot') {
            this.runBootSequence();
        } else {
            this.render();
        }
    }

    runBootSequence() {
        this.renderBoot();
        setTimeout(() => {
            this.systemState = 'login';
            this.render();
        }, 2000);
    }

    renderBoot() {
        this.container.innerHTML = `
            <div id="boss-boot-screen" class="w-full h-full bg-black text-gray-300 font-mono p-10 text-sm flex flex-col justify-start">
                <div class="mb-4">AMIBIOS (C) 2024 American Megatrends, Inc.</div>
                <div>ASUS ACPI BIOS Revision 1204</div>
                <div>CPU: Intel(R) Core(TM) i9-14900K CPU @ 6.00GHz</div>
                <div> Speed: 6.00 GHz</div>
                <div>Initializing USB Controllers .. Done.</div>
                <div>128GB RAM OK</div>
                <div class="mt-10">Loading Corporate OS (Secure Boot)...</div>
                <div class="animate-pulse mt-2">_</div>
            </div>
        `;
    }

    renderLogin() {
        const date = new Date();
        this.container.innerHTML = `
            <div id="boss-login-screen" class="w-full h-full bg-cover bg-center flex flex-col items-center justify-center text-white relative" style="background-image: url('${this.wallpapers[this.wallpaperIndex]}'); box-shadow: inset 0 0 0 2000px rgba(0,0,0,0.3);">
                <div class="absolute top-1/4 flex flex-col items-center animate-slide-up">
                    <div class="text-6xl font-thin mb-2">${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    <div class="text-lg font-medium">${date.toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'})}</div>
                </div>

                <div class="flex flex-col items-center gap-4 mt-20 animate-fade-in delay-500">
                    <div class="w-24 h-24 rounded-full bg-gray-200 border-4 border-white/20 flex items-center justify-center overflow-hidden shadow-2xl">
                        <span class="text-3xl font-bold text-gray-600">${this.user.initials}</span>
                    </div>
                    <div class="text-2xl font-bold">${this.user.name}</div>

                    <div class="flex gap-2">
                        <input id="boss-login-input" type="password" placeholder="PIN" class="bg-white/20 backdrop-blur border border-white/30 rounded px-3 py-2 outline-none text-white placeholder-gray-300 focus:bg-white/30 transition-all w-48 text-center" onkeydown="if(event.key==='Enter') BossMode.instance.currentGuest.login()">
                        <button id="boss-login-btn" class="bg-white/20 hover:bg-white/30 rounded px-3 border border-white/30 transition-all" onclick="BossMode.instance.currentGuest.login()"><i class="fas fa-arrow-right"></i></button>
                    </div>
                </div>
            </div>
        `;
    }

    login() {
        this.soundManager.playSound('click');
        this.systemState = 'desktop';
        this.render();
    }

    render() {
        if (this.systemState === 'boot') return this.renderBoot();
        if (this.systemState === 'login') return this.renderLogin();

        this.container.innerHTML = `
            <div class="flex-1 relative overflow-hidden bg-cover bg-center flex flex-col" style="background-image: url('${this.wallpapers[this.wallpaperIndex]}')">
                <div class="absolute top-4 left-4 grid grid-cols-1 gap-4 w-20" id="desktop-icons">
                    <div class="flex flex-col items-center gap-1 group cursor-pointer text-white hover:bg-white/10 p-2 rounded">
                        <i class="fas fa-trash-alt text-3xl text-gray-200 drop-shadow-md"></i>
                        <span class="text-[11px] text-center text-shadow-sm leading-tight">Recycle Bin</span>
                    </div>
                </div>
                <div class="absolute inset-0 top-6 left-6 right-6 bottom-16 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-500 animate-pop-in backdrop-blur-sm">
                   <div class="p-10 text-center">V3 Enhanced Desktop Loaded</div>
                </div>
            </div>
            <div class="h-10 bg-[#f3f3f3]/95 border-t border-gray-400 flex items-center px-2 justify-between z-[10001]">
                <div class="flex items-center gap-1">
                    <div id="boss-start-btn" class="w-8 h-8 flex items-center justify-center hover:bg-white/50 rounded cursor-pointer">
                        <i class="fab fa-windows text-blue-500 text-lg"></i>
                    </div>
                </div>
            </div>
        `;
    }
}
