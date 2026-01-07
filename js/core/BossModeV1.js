import SaveSystem from './SaveSystem.js';
import SoundManager from './SoundManager.js';
import AdsManager from './AdsManager.js';
import { EMAILS, DOCUMENTS, SLIDES, CHATS, TERMINAL_ADVENTURE } from './BossModeContent.js';

export default class BossModeV1 {
    constructor(container) {
        this.container = container;
        this.isActive = true;
        this.systemState = 'boot';

        this.windows = [];
        this.nextWindowId = 1;
        this.zIndexCounter = 100;
        this.activeWindowId = null;
        this.dragState = null;

        this.startMenuOpen = false;
        this.notificationOpen = false;
        this.wallpaperIndex = 0;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.adsManager = AdsManager.getInstance();
        this.overlay = null;

        this.user = {
            name: "John Doe",
            role: "Senior Risk Analyst",
            avatar: "JD",
            password: "123"
        };

        this.wallpapers = [
            'https://images.unsplash.com/photo-1642427749670-f20e2e76ed8c?q=80&w=2000&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop'
        ];

        this.fileSystem = {
            excel: [
                { name: "Financial_Projections_FY25.xlsx", data: null },
                { name: "Lunch_Orders.xlsx", data: { "A1": {v:"Name", b:true}, "B1":{v:"Order", b:true}, "A2":{v:"Me"}, "B2":{v:"Tacos"} } }
            ],
            word: (typeof DOCUMENTS !== 'undefined') ? [...DOCUMENTS] : [
                { title: "Meeting_Minutes.docx", content: "Action items: Circle back on deliverables." }
            ],
            ppt: (typeof SLIDES !== 'undefined') ? [{ title: "Strategy.pptx", slides: SLIDES }] : [
                { title: "Strategy_Deck.pptx", slides: [{title:"Synergy", bullets:["Leverage","Pivot"]}] }
            ]
        };

        this.excelData = {};
        this.currentWord = this.fileSystem.word[0];
        this.wordStealthMode = false;
        this.fakeText = "The localized projections regarding the Q3 overflow indicate a substantial misalignment with the core competencies of the stakeholders. ".split('');
        this.fakeTextPointer = 0;

        this.snakeGame = null;
        this.flightGame = null;

        this.termHistory = ["Microsoft Windows [Version 10.0.19045]", "(c) Microsoft Corporation.", ""];

        this.init();
    }

    init() {
        this.container.innerHTML = '';
        this.container.className = 'absolute inset-0 z-[10000] bg-black font-sans text-xs text-black flex flex-col cursor-default select-none overflow-hidden';

        this.overlay = this.container;

        // Static DOM Structure
        this.overlay.innerHTML = `
            <div id="os-boot-layer" class="absolute inset-0 z-[10020] bg-black hidden text-gray-300 font-mono p-10"></div>
            <div id="os-login-layer" class="absolute inset-0 z-[10010] hidden bg-cover bg-center"></div>

            <div id="os-desktop-layer" class="absolute inset-0 flex flex-col hidden">
                <div id="boss-wallpaper" class="absolute inset-0 bg-cover bg-center transition-[background-image] duration-500 z-0"></div>
                <div id="boss-icons" class="absolute inset-0 p-4 flex flex-col flex-wrap gap-4 content-start z-0 w-fit"></div>
                <div id="boss-windows-container" class="absolute inset-0 pointer-events-none z-10 overflow-hidden"></div>
                <div id="boss-startmenu-container" class="absolute bottom-10 left-0 z-[9999]"></div>
                <div id="boss-notification-container" class="absolute bottom-10 right-0 z-[9999]"></div>
                <div id="boss-taskbar-container" class="absolute bottom-0 left-0 right-0 h-10 z-[10000]"></div>
            </div>
        `;

        if (this.systemState === 'boot') {
            this.runBootSequence();
        } else {
            this.renderDesktop();
        }

        if(!this.fileSystem.excel[0].data) this.generateFakeExcelData(this.fileSystem.excel[0]);
    }

    runBootSequence() {
        const bootLayer = this.overlay.querySelector('#os-boot-layer');
        bootLayer.classList.remove('hidden');
        bootLayer.innerHTML = `
            <div class="mb-4">AMIBIOS (C) 2022 American Megatrends, Inc.</div>
            <div>CPU: Intel(R) Core(TM) i9-12900K CPU @ 3.20GHz</div>
            <div>128GB RAM OK</div>
            <div class="mt-10">Initializing ADAM Architecture...</div>
            <div class="mt-2 text-green-500">Loading Secure Modules...</div>
            <div class="animate-pulse mt-4">_</div>
        `;
        setTimeout(() => {
            bootLayer.classList.add('hidden');
            this.systemState = 'login';
            this.renderLogin();
        }, 2000);
    }

    renderLogin() {
        const loginLayer = this.overlay.querySelector('#os-login-layer');
        loginLayer.classList.remove('hidden');
        loginLayer.style.backgroundImage = `url('${this.wallpapers[this.wallpaperIndex]}')`;
        loginLayer.innerHTML = `
            <div class="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <div class="w-32 h-32 rounded-full bg-gray-200 border-4 border-white/20 flex items-center justify-center mb-6 shadow-2xl">
                    <span class="text-4xl text-gray-500 font-bold">JD</span>
                </div>
                <div class="text-3xl font-bold mb-6">${this.user.name}</div>
                <div class="flex gap-2">
                    <input type="password" placeholder="PIN" class="bg-white/20 border border-white/30 rounded px-4 py-2 text-center text-white placeholder-gray-300 outline-none w-48 backdrop-blur" onkeydown="if(event.key==='Enter') BossMode.instance.currentGuest.login()">
                    <button class="bg-white/20 hover:bg-white/40 border border-white/30 rounded px-4 transition-all" onclick="BossMode.instance.currentGuest.login()"><i class="fas fa-arrow-right"></i></button>
                </div>
            </div>
        `;
    }

    login() {
        this.soundManager.playSound('click');
        this.systemState = 'desktop';
        this.overlay.querySelector('#os-login-layer').classList.add('hidden');
        this.overlay.querySelector('#os-desktop-layer').classList.remove('hidden');
        this.renderDesktop();
    }

    renderDesktop() {
        this.overlay.querySelector('#os-desktop-layer').classList.remove('hidden');
        this.overlay.querySelector('#boss-wallpaper').style.backgroundImage = `url('${this.wallpapers[this.wallpaperIndex]}')`;
        this.renderIcons();
        this.renderTaskbar();
    }

    renderIcons() {
        const container = this.overlay.querySelector('#boss-icons');
        container.innerHTML = `
            <div class="flex flex-col items-center gap-1 w-20 p-2 hover:bg-white/10 rounded cursor-pointer group" onclick="BossMode.instance.currentGuest.openApp('excel')">
                <i class="fas fa-file-excel text-green-500 text-3xl group-hover:scale-110 transition-transform drop-shadow-md"></i>
                <span class="text-[10px] text-white text-center bg-black/20 rounded px-1 leading-tight shadow-sm">Q3 Report</span>
            </div>
        `;
    }

    renderTaskbar() {
        const container = this.overlay.querySelector('#boss-taskbar-container');
        container.innerHTML = `
            <div class="h-10 bg-[#0f172a]/90 backdrop-blur border-t border-gray-700 flex items-center px-2 gap-2 shadow-lg text-white">
                <div class="h-8 w-8 hover:bg-white/10 rounded flex items-center justify-center cursor-pointer">
                    <i class="fab fa-windows text-blue-500 text-lg"></i>
                </div>
                <div class="h-6 w-[1px] bg-gray-600 mx-1"></div>
                <div class="ml-auto flex items-center gap-3 text-[10px] px-2">
                    <span>${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
            </div>
        `;
    }

    openApp(appId) {
        // Simplified window opening for V1 integration
        const win = document.createElement('div');
        win.className = "os-window absolute bg-white shadow-2xl rounded overflow-hidden border border-gray-600";
        win.style.width = "600px"; win.style.height = "400px"; win.style.left = "50px"; win.style.top = "50px";
        win.innerHTML = `<div class="bg-gray-800 h-8 flex items-center justify-between px-2 text-white"><span class="font-bold text-xs">App</span><i class="fas fa-times cursor-pointer" onclick="this.closest('.os-window').remove()"></i></div><div class="flex-1 bg-white p-4">Content Loaded</div>`;
        this.overlay.querySelector('#boss-windows-container').appendChild(win);
    }

    generateFakeExcelData(f) {
        f.data = {};
        f.data['A1'] = {value: "Data", bold: true};
    }
}
