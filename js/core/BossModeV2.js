import SaveSystem from './SaveSystem.js';
import SoundManager from './SoundManager.js';
import AdsManager from './AdsManager.js';
import { EMAILS, DOCUMENTS, SLIDES, CHATS, TERMINAL_ADVENTURE } from './BossModeContent.js';

export default class BossModeV2 {
    constructor(container) {
        this.container = container;
        this.isActive = true;
        this.systemState = 'boot';
        this.activeApp = null;
        this.startMenuOpen = false;
        this.notificationOpen = false;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.adsManager = AdsManager.getInstance();

        this.user = {
            name: "John Doe",
            role: "Senior Risk Analyst",
            avatar: "JD",
            password: ""
        };

        this.wallpaperIndex = 0;
        this.wallpapers = [
            'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop'
        ];

        this.excelData = {};
        this.selectedCell = null;
        this.snakeGame = null;
        this.flightGame = null;

        this.termHistory = [
            "Microsoft Windows [Version 10.0.19045.3693]",
            "(c) Microsoft Corporation. All rights reserved.",
            "",
            `C:\\Users\\${this.user.name.replace(' ', '')}>`
        ];
        this.termInput = "";

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
        this.container.innerHTML = `
            <div class="w-full h-full bg-black text-gray-300 font-mono p-10 text-sm flex flex-col justify-start">
                <div class="mb-4">AMIBIOS (C) 2022 American Megatrends, Inc.</div>
                <div>ASUS ACPI BIOS Revision 1002</div>
                <div>CPU: Intel(R) Core(TM) i9-12900K CPU @ 3.20GHz</div>
                <div> Speed: 3.20 GHz</div>
                <div class="mb-4">Press DEL to run Setup</div>
                <div>Initializing USB Controllers .. Done.</div>
                <div>128GB RAM OK</div>
                <div class="mt-10">Loading Operating System ...</div>
                <div class="animate-pulse mt-2">_</div>
            </div>
        `;
        setTimeout(() => {
            this.systemState = 'login';
            this.render();
        }, 3000);
    }

    render() {
        if (this.systemState === 'login') {
            this.renderLogin();
        } else if (this.systemState === 'desktop') {
            this.renderDesktop();
        }
    }

    renderLogin() {
        const date = new Date();
        this.container.innerHTML = `
            <div class="w-full h-full bg-cover bg-center flex flex-col items-center justify-center text-white relative" style="background-image: url('${this.wallpapers[this.wallpaperIndex]}'); box-shadow: inset 0 0 0 2000px rgba(0,0,0,0.3);">
                <div class="absolute top-1/4 flex flex-col items-center animate-slide-up">
                    <div class="text-6xl font-thin mb-2">${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    <div class="text-lg font-medium">${date.toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'})}</div>
                </div>

                <div class="flex flex-col items-center gap-4 mt-20 animate-fade-in delay-500">
                    <div class="w-24 h-24 rounded-full bg-gray-200 border-4 border-white/20 flex items-center justify-center overflow-hidden shadow-2xl">
                        <i class="fas fa-user text-4xl text-gray-500"></i>
                    </div>
                    <div class="text-2xl font-bold">${this.user.name}</div>

                    <div class="flex gap-2 relative">
                        <input type="password" placeholder="PIN" class="bg-white/20 backdrop-blur border border-white/30 rounded px-3 py-2 outline-none text-white placeholder-gray-300 focus:bg-white/30 transition-all w-48 text-center" onkeydown="if(event.key==='Enter') BossMode.instance.currentGuest.login(this.value)">
                        <button class="bg-white/20 hover:bg-white/30 rounded px-3 border border-white/30 transition-all" onclick="BossMode.instance.currentGuest.login(this.previousElementSibling.value)"><i class="fas fa-arrow-right"></i></button>

                        <!-- Sticky Note Hint -->
                        <div class="absolute -right-32 top-0 bg-yellow-200 text-black text-[10px] p-2 rotate-3 shadow-md font-hand w-24">
                            PIN: 1234
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    login(pin) {
        this.soundManager.playSound('click');
        this.systemState = 'desktop';
        this.render();
    }

    renderDesktop() {
        this.container.innerHTML = `
            <div class="flex-1 relative overflow-hidden bg-cover bg-center flex flex-col transition-[background-image] duration-500" style="background-image: url('${this.wallpapers[this.wallpaperIndex]}')">
                <div class="absolute top-4 left-4 grid grid-cols-1 gap-4 w-20">
                    <div class="flex flex-col items-center gap-1 group cursor-pointer w-20 text-white drop-shadow-md hover:bg-white/10 rounded p-2 transition-colors">
                        <i class="fas fa-trash-alt text-3xl text-gray-200 group-hover:scale-110 transition-transform filter drop-shadow-lg"></i>
                        <span class="text-[11px] text-center leading-tight line-clamp-2 text-shadow-sm font-medium">Recycle Bin</span>
                    </div>
                </div>
            </div>
            <div class="h-10 bg-[#f3f3f3]/90 backdrop-blur-xl border-t border-gray-300 flex items-center px-2 gap-2 z-[10001] select-none shadow-lg shrink-0 justify-between">
                <div class="flex items-center gap-1 h-full">
                     <div class="h-8 w-8 hover:bg-white/50 rounded flex items-center justify-center cursor-pointer transition-colors">
                        <i class="fab fa-windows text-blue-500 text-lg"></i>
                    </div>
                </div>
            </div>
        `;
    }
}
