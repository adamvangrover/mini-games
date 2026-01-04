import SaveSystem from './SaveSystem.js';
import SoundManager from './SoundManager.js';
import AdsManager from './AdsManager.js';
// Fallback if file missing, we define defaults inside constructor
import { EMAILS, DOCUMENTS, SLIDES, CHATS, TERMINAL_ADVENTURE } from './BossModeContent.js'; 

export default class BossMode {
    constructor() {
        if (BossMode.instance) return BossMode.instance;
        BossMode.instance = this;
        window.BossMode = BossMode; // Expose for inline handlers

        // --- Core System State ---
        this.isActive = false;
        this.systemState = 'boot'; // 'boot', 'login', 'desktop', 'bsod'
        
        // --- Window Management ---
        this.windows = []; // Array of active window objects
        this.nextWindowId = 1;
        this.zIndexCounter = 100;
        this.activeWindowId = null;
        this.dragState = null;

        // --- UI State ---
        this.startMenuOpen = false;
        this.notificationOpen = false;
        this.wallpaperIndex = 0;
        
        // --- Managers ---
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.adsManager = AdsManager.getInstance();
        this.overlay = null;

        // --- User Profile ---
        this.user = {
            name: "John Doe",
            role: "Senior Risk Analyst",
            avatar: "JD",
            password: "123"
        };

        // --- Content & Data ---
        this.wallpapers = [
            'https://images.unsplash.com/photo-1642427749670-f20e2e76ed8c?q=80&w=2000&auto=format&fit=crop', // Dark Grid
            'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop', // Mountains
            'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop', // Blue
            'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop'   // Retro
        ];

        // File System
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

        // App States
        this.excelData = {}; 
        this.currentWord = this.fileSystem.word[0];
        this.wordStealthMode = false;
        this.fakeText = "The localized projections regarding the Q3 overflow indicate a substantial misalignment with the core competencies of the stakeholders. ".split('');
        this.fakeTextPointer = 0;
        
        // Games
        this.snakeGame = null;
        this.flightGame = null;

        // Terminal
        this.termHistory = ["Microsoft Windows [Version 10.0.19045]", "(c) Microsoft Corporation.", ""];

        this.init();
    }

    init() {
        let existing = document.getElementById('boss-mode-overlay');
        if (existing) existing.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'boss-mode-overlay';
        this.overlay.className = 'hidden fixed inset-0 z-[10000] bg-black font-sans text-xs text-black flex flex-col cursor-default select-none overflow-hidden';
        
        // Inject Templates & Styles
        this.injectStyles();
        this.injectTemplates();
        
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

            <div id="boss-bsod-container" class="absolute inset-0 z-[10050] hidden bg-[#0078d7]"></div>
        `;

        document.body.appendChild(this.overlay);

        // Event Listeners
        this.bindGlobalEvents();
        document.addEventListener('mousemove', (e) => this.handleDragMove(e));
        document.addEventListener('mouseup', () => this.handleDragEnd());

        // Pre-load Data
        if(!this.fileSystem.excel[0].data) this.generateFakeExcelData(this.fileSystem.excel[0]);
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .os-window { position: absolute; background: #fff; border: 1px solid #444; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; flex-direction: column; border-radius: 6px; overflow: hidden; animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); pointer-events: auto; }
            .os-window.active { border-color: #00f0ff; box-shadow: 0 0 20px rgba(0, 240, 255, 0.15); }
            .window-bar { padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; cursor: default; user-select: none; }
            .window-content { flex-grow: 1; position: relative; overflow: hidden; background: #fff; }
            .glass-panel { background: rgba(10, 15, 30, 0.8); border: 1px solid rgba(255, 255, 255, 0.05); }
            .dock-item:hover { transform: translateY(-5px) scale(1.1); transition: all 0.2s; }
            .app-dot { width: 4px; height: 4px; background: #00f0ff; border-radius: 50%; position: absolute; bottom: -6px; opacity: 0; }
            .app-dot.running { opacity: 1; }
            @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            /* Scrollbars */
            .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
            .custom-scroll::-webkit-scrollbar-track { background: #020617; }
            .custom-scroll::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        `;
        document.head.appendChild(style);
    }

    injectTemplates() {
        const div = document.createElement('div');
        div.style.display = 'none';
        div.innerHTML = `
            <template id="tpl-mission">
                <div class="p-4 h-full flex flex-col gap-4 text-gray-300 bg-[#020408] font-mono">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="glass-panel p-4 rounded bg-blue-900/10 border-blue-500/30">
                            <h3 class="text-blue-400 font-bold mb-2 flex items-center gap-2">SYSTEM STATUS</h3>
                            <div class="space-y-1 text-[10px]">
                                <div class="flex justify-between"><span>CORE_KERNEL</span><span class="text-green-400">ONLINE</span></div>
                                <div class="flex justify-between"><span>DCF_ENGINE</span><span class="text-green-400">READY</span></div>
                            </div>
                        </div>
                        <div class="glass-panel p-4 rounded bg-purple-900/10 border-purple-500/30">
                            <h3 class="text-purple-400 font-bold mb-2">ACTIVE AGENTS</h3>
                            <div class="space-y-1 text-[10px]">
                                <div class="flex justify-between"><span>RISK_BOT</span><span class="text-green-400">MONITORING</span></div>
                                <div class="flex justify-between"><span>MARKET_SCAN</span><span class="text-blue-400">ACTIVE</span></div>
                            </div>
                        </div>
                    </div>
                    <div class="glass-panel flex-grow p-2 rounded relative font-mono text-[10px] text-green-500 overflow-y-auto" id="system-log">
                        <div>>> SYSTEM INITIALIZED...</div>
                    </div>
                </div>
            </template>
            
            <template id="tpl-dcf">
                <div class="h-full flex flex-col p-4 bg-[#0f172a] text-gray-300 font-mono text-xs overflow-hidden">
                     <div class="flex justify-between mb-4 border-b border-gray-700 pb-2">
                        <div class="text-cyan-400 font-bold">DCF VALUATION MODULE v2.0</div>
                        <div class="flex gap-2">
                            <button class="btn-calc bg-cyan-700 hover:bg-cyan-600 px-2 py-1 rounded text-white text-[10px]">RECALC</button>
                        </div>
                    </div>
                    <div class="grid grid-cols-12 gap-4 flex-grow overflow-hidden">
                        <div class="col-span-4 space-y-2 border-r border-gray-700 pr-2 overflow-y-auto custom-scroll">
                            <div class="text-gray-500 font-bold">ASSUMPTIONS</div>
                            <div class="flex justify-between items-center"><label>Growth %</label><input type="number" class="inp-growth bg-gray-900 border border-gray-600 w-12 text-right text-green-400" value="5.0"></div>
                            <div class="flex justify-between items-center"><label>WACC %</label><input type="number" class="inp-wacc bg-gray-900 border border-gray-600 w-12 text-right text-yellow-400" value="8.5"></div>
                            <div class="flex justify-between items-center"><label>Tax %</label><input type="number" class="inp-tax bg-gray-900 border border-gray-600 w-12 text-right" value="21.0"></div>
                        </div>
                        <div class="col-span-8 flex flex-col gap-4">
                            <div class="flex-1 bg-black/40 rounded p-2 overflow-auto font-mono text-[10px]">
                                <table class="w-full text-right dcf-table"></table>
                            </div>
                            <div class="p-3 bg-gray-800 rounded flex justify-between items-center">
                                <span>IMPLIED EQUITY VALUE</span>
                                <span class="text-xl font-bold text-green-400 val-equity">$0M</span>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        `;
        document.body.appendChild(div);
    }

    bindGlobalEvents() {
        document.addEventListener('keydown', (e) => {
            if (this.isActive) this.handleKey(e);
        });
    }

    // =================================================================================
    //  CORE STATE MACHINE (Toggle / Boot / Login / Desktop)
    // =================================================================================

    toggle(forceState = null) {
        const nextState = forceState !== null ? forceState : !this.isActive;
        if (nextState === this.isActive) return;
        this.isActive = nextState;

        if (this.isActive) {
            this.overlay.classList.remove('hidden');
            
            // If just toggling on, check state
            if (this.systemState === 'boot') {
                this.runBootSequence();
            } else if (this.systemState === 'login') {
                this.renderLogin();
            } else {
                this.renderDesktop();
            }
            
            // Auto mute real world audio
            if (!this.soundManager.muted) this.soundManager.toggleMute();
            
        } else {
            this.overlay.classList.add('hidden');
            // Stop Loops
            if (this.snakeGame) clearInterval(this.snakeGame.interval);
            if (this.flightGame) clearInterval(this.flightGame.interval);
        }
    }

    runBootSequence() {
        const bootLayer = document.getElementById('os-boot-layer');
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
        }, 2500);
    }

    renderLogin() {
        const loginLayer = document.getElementById('os-login-layer');
        loginLayer.classList.remove('hidden');
        loginLayer.style.backgroundImage = `url('${this.wallpapers[this.wallpaperIndex]}')`;
        loginLayer.innerHTML = `
            <div class="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <div class="w-32 h-32 rounded-full bg-gray-200 border-4 border-white/20 flex items-center justify-center mb-6 shadow-2xl">
                    <span class="text-4xl text-gray-500 font-bold">JD</span>
                </div>
                <div class="text-3xl font-bold mb-6">${this.user.name}</div>
                <div class="flex gap-2">
                    <input type="password" placeholder="PIN" class="bg-white/20 border border-white/30 rounded px-4 py-2 text-center text-white placeholder-gray-300 outline-none w-48 backdrop-blur" onkeydown="if(event.key==='Enter') BossMode.instance.login()">
                    <button class="bg-white/20 hover:bg-white/40 border border-white/30 rounded px-4 transition-all" onclick="BossMode.instance.login()"><i class="fas fa-arrow-right"></i></button>
                </div>
            </div>
            <div class="absolute bottom-8 right-8 flex gap-4 text-white text-2xl">
                <i class="fas fa-wifi"></i>
                <i class="fas fa-power-off cursor-pointer hover:text-red-400" onclick="BossMode.instance.toggle(false)"></i>
            </div>
        `;
    }

    login() {
        this.soundManager.playSound('click');
        this.systemState = 'desktop';
        document.getElementById('os-login-layer').classList.add('hidden');
        document.getElementById('os-desktop-layer').classList.remove('hidden');
        this.renderDesktop();
        // Auto-launch Mission Control
        setTimeout(() => this.openApp('mission'), 500);
    }

    renderDesktop() {
        const desk = document.getElementById('os-desktop-layer');
        desk.classList.remove('hidden');
        
        // Update Wallpaper
        document.getElementById('boss-wallpaper').style.backgroundImage = `url('${this.wallpapers[this.wallpaperIndex]}')`;
        
        this.renderIcons();
        this.renderTaskbar();
        // Windows are rendered dynamically via WindowManager, not full re-render
    }

    renderIcons() {
        const container = document.getElementById('boss-icons');
        if(container.childElementCount > 0) return; // Don't redraw

        const icons = [
            { name: "My PC", icon: "fa-desktop", color: "text-blue-300" },
            { name: "Recycle Bin", icon: "fa-trash-alt", color: "text-gray-400" },
            { name: "Q3 Report", icon: "fa-file-excel", color: "text-green-500", action: "excel" },
            { name: "DCF Model", icon: "fa-chart-line", color: "text-cyan-400", action: "dcf" },
            { name: "Market Radar", icon: "fa-satellite-dish", color: "text-purple-400", action: "market" },
            { name: "Secrets.txt", icon: "fa-file-alt", color: "text-white", action: () => alert("Access Denied") }
        ];

        container.innerHTML = icons.map(i => `
            <div class="flex flex-col items-center gap-1 w-20 p-2 hover:bg-white/10 rounded cursor-pointer group" 
                 ondblclick="${typeof i.action === 'string' ? `BossMode.instance.openApp('${i.action}')` : `(${i.action})()`}">
                <i class="fas ${i.icon} ${i.color} text-3xl group-hover:scale-110 transition-transform drop-shadow-md"></i>
                <span class="text-[10px] text-white text-center bg-black/20 rounded px-1 leading-tight shadow-sm">${i.name}</span>
            </div>
        `).join('');
    }

    renderTaskbar() {
        const container = document.getElementById('boss-taskbar-container');
        // Re-render taskbar to update active states
        const apps = [
            { id: 'mission', icon: 'fa-microchip', color: 'text-blue-400' },
            { id: 'excel', icon: 'fa-file-excel', color: 'text-green-500' },
            { id: 'word', icon: 'fa-file-word', color: 'text-blue-500' },
            { id: 'ppt', icon: 'fa-file-powerpoint', color: 'text-orange-500' },
            { id: 'dcf', icon: 'fa-chart-line', color: 'text-cyan-400' },
            { id: 'terminal', icon: 'fa-terminal', color: 'text-gray-400' }
        ];

        const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

        container.innerHTML = `
            <div class="h-10 bg-[#0f172a]/90 backdrop-blur border-t border-gray-700 flex items-center px-2 gap-2 shadow-lg text-white">
                <div class="h-8 w-8 hover:bg-white/10 rounded flex items-center justify-center cursor-pointer" onclick="BossMode.instance.toggleStartMenu()">
                    <i class="fab fa-windows text-blue-500 text-lg"></i>
                </div>
                <div class="h-6 w-[1px] bg-gray-600 mx-1"></div>
                ${apps.map(app => `
                    <div class="h-8 w-8 flex items-center justify-center rounded hover:bg-white/10 cursor-pointer relative group ${this.windows.find(w=>w.app===app.id) ? 'bg-white/5' : ''}" onclick="BossMode.instance.openApp('${app.id}')">
                        <i class="fas ${app.icon} ${app.color} text-lg group-hover:-translate-y-0.5 transition-transform"></i>
                        ${this.windows.find(w=>w.app===app.id) ? '<div class="absolute bottom-0 w-1 h-1 bg-white rounded-full"></div>' : ''}
                    </div>
                `).join('')}
                <div class="ml-auto flex items-center gap-3 text-[10px] px-2">
                    <i class="fas fa-wifi"></i>
                    <div class="flex flex-col items-end leading-tight">
                        <span>${time}</span>
                    </div>
                    <i class="fas fa-comment-alt cursor-pointer" onclick="BossMode.instance.toggleNotification()"></i>
                </div>
            </div>
        `;
    }

    // =================================================================================
    //  WINDOW MANAGER
    // =================================================================================

    getAppConfig(id) {
        const map = {
            'excel': { title: 'Excel - Financials.xlsx', w: 900, h: 600, color: 'bg-[#217346]', icon: 'fa-file-excel' },
            'word': { title: 'Word - Report.docx', w: 700, h: 800, color: 'bg-[#2b579a]', icon: 'fa-file-word' },
            'ppt': { title: 'PowerPoint - Deck.pptx', w: 900, h: 600, color: 'bg-[#b7472a]', icon: 'fa-file-powerpoint' },
            'terminal': { title: 'Command Prompt', w: 600, h: 400, color: 'bg-[#0c0c0c]', icon: 'fa-terminal' },
            'dcf': { title: 'DCF Valuator Pro', w: 800, h: 600, color: 'bg-[#0f172a]', icon: 'fa-chart-line' },
            'mission': { title: 'Mission Control', w: 600, h: 400, color: 'bg-[#1e293b]', icon: 'fa-microchip' },
            'market': { title: 'Market Radar', w: 500, h: 350, color: 'bg-[#0f172a]', icon: 'fa-satellite-dish' }
        };
        return map[id] || { title: 'App', w: 600, h: 400, color: 'bg-gray-800', icon: 'fa-window-maximize' };
    }

    openApp(appId) {
        // Bring to front if open
        const existing = this.windows.find(w => w.app === appId);
        if (existing) {
            this.bringToFront(existing.id);
            return;
        }

        const cfg = this.getAppConfig(appId);
        const win = {
            id: this.nextWindowId++,
            app: appId,
            title: cfg.title,
            x: 50 + (this.windows.length * 30),
            y: 50 + (this.windows.length * 30),
            w: cfg.w,
            h: cfg.h,
            z: ++this.zIndexCounter,
            minimized: false
        };
        this.windows.push(win);
        this.createWindowDOM(win, cfg);
        this.renderTaskbar(); // Update dots
    }

    createWindowDOM(win, cfg) {
        const el = document.createElement('div');
        el.id = `win-${win.id}`;
        el.className = "os-window absolute flex flex-col bg-white shadow-2xl rounded overflow-hidden border border-gray-600 animate-pop-in";
        el.style.width = `${win.w}px`;
        el.style.height = `${win.h}px`;
        el.style.left = `${win.x}px`;
        el.style.top = `${win.y}px`;
        el.style.zIndex = win.z;

        // Header
        const header = `
            <div class="${cfg.color} h-8 flex items-center justify-between px-2 select-none shrink-0 text-white cursor-default window-bar" onmousedown="BossMode.instance.startDrag(event, ${win.id})">
                <div class="flex items-center gap-2">
                    <i class="fas ${cfg.icon}"></i>
                    <span class="font-bold text-xs">${win.title}</span>
                </div>
                <div class="flex gap-2 window-controls">
                    <i class="fas fa-minus hover:bg-white/20 p-1 rounded cursor-pointer" onclick="BossMode.instance.minimizeWindow(${win.id})"></i>
                    <i class="fas fa-times hover:bg-red-500 p-1 rounded cursor-pointer px-2" onclick="BossMode.instance.closeWindow(${win.id})"></i>
                </div>
            </div>
            <div id="win-content-${win.id}" class="flex-1 relative overflow-hidden bg-white"></div>
        `;
        el.innerHTML = header;
        document.getElementById('boss-windows-container').appendChild(el);
        
        el.onmousedown = () => this.bringToFront(win.id);

        // Render Content
        const contentArea = document.getElementById(`win-content-${win.id}`);
        if(win.app === 'excel') this.renderExcel(contentArea);
        if(win.app === 'word') this.renderWord(contentArea);
        if(win.app === 'ppt') this.renderPPT(contentArea);
        if(win.app === 'terminal') this.renderTerminal(contentArea);
        if(win.app === 'dcf') new DCFApp(contentArea); // Use Class for complex logic
        if(win.app === 'mission') {
            const tpl = document.getElementById('tpl-mission');
            if(tpl) contentArea.appendChild(tpl.content.cloneNode(true));
        }
    }

    closeWindow(id) {
        const el = document.getElementById(`win-${id}`);
        if(el) el.remove();
        this.windows = this.windows.filter(w => w.id !== id);
        this.renderTaskbar();
    }

    minimizeWindow(id) {
        const el = document.getElementById(`win-${id}`);
        if(el) el.style.display = 'none';
        const w = this.windows.find(w => w.id === id);
        if(w) w.minimized = true;
        this.renderTaskbar();
    }

    bringToFront(id) {
        const w = this.windows.find(w => w.id === id);
        if(w) {
            w.z = ++this.zIndexCounter;
            w.minimized = false;
            const el = document.getElementById(`win-${w.id}`);
            if(el) {
                el.style.zIndex = w.z;
                el.style.display = 'flex';
            }
        }
    }

    // --- Drag Logic ---
    startDrag(e, id) {
        if(e.target.closest('.window-controls')) return;
        this.bringToFront(id);
        const w = this.windows.find(x => x.id === id);
        this.dragState = { id, startX: e.clientX, startY: e.clientY, initX: w.x, initY: w.y };
        const overlay = document.createElement('div'); // Capture mouse events iframe style
        overlay.id = 'drag-overlay';
        overlay.style.position = 'fixed'; overlay.style.inset = '0'; overlay.style.zIndex = '99999'; overlay.style.cursor = 'move';
        document.body.appendChild(overlay);
    }

    handleDragMove(e) {
        if(!this.dragState) return;
        const w = this.windows.find(x => x.id === this.dragState.id);
        const dx = e.clientX - this.dragState.startX;
        const dy = e.clientY - this.dragState.startY;
        w.x = this.dragState.initX + dx;
        w.y = this.dragState.initY + dy;
        const el = document.getElementById(`win-${w.id}`);
        if(el) { el.style.left = `${w.x}px`; el.style.top = `${w.y}px`; }
    }

    handleDragEnd() {
        this.dragState = null;
        const ov = document.getElementById('drag-overlay');
        if(ov) ov.remove();
    }

    // =================================================================================
    //  APP RENDERERS
    // =================================================================================

    renderExcel(container) {
        container.innerHTML = `
            <div class="flex flex-col h-full text-black">
                <div class="bg-[#f3f2f1] px-2 py-1 flex gap-2 border-b border-[#e1dfdd] text-[11px] items-center shrink-0">
                    <button class="flex items-center hover:bg-gray-200 p-1 rounded gap-1" onclick="BossMode.instance.generateFakeExcelData(BossMode.instance.currentExcel); BossMode.instance.loadExcelData(BossMode.instance.currentExcel)"><i class="fas fa-sync text-green-600"></i> Refresh</button>
                </div>
                <div class="flex items-center gap-2 p-1 border-b border-[#e1dfdd] bg-white shrink-0">
                    <div class="bg-white border border-gray-300 w-10 text-center text-xs font-bold text-gray-600" id="boss-cell-addr">A1</div>
                    <div class="flex-1 border border-gray-300 flex items-center px-2"><input id="boss-formula-input" class="w-full text-xs outline-none font-mono h-6" value=""></div>
                </div>
                <div class="flex-1 overflow-auto bg-[#e1dfdd] relative" id="boss-grid-container">
                    <div id="boss-grid" class="grid bg-[#c8c6c4] gap-[1px]"></div>
                </div>
                <div id="clippy-container" class="absolute bottom-8 right-8 cursor-pointer hover:scale-110 transition-transform">
                    <div id="clippy-bubble" class="absolute -top-16 -left-32 w-40 bg-[#ffffe1] border border-black p-2 text-[10px] rounded shadow-lg hidden"></div>
                    <div class="text-4xl">📎</div>
                </div>
            </div>
        `;
        setTimeout(() => this.initExcelGrid(container), 0);
    }
    
    initExcelGrid(container) {
        const grid = container.querySelector('#boss-grid');
        if (!grid) return;
        const cols = 15; const rows = 30;
        grid.style.gridTemplateColumns = `40px repeat(${cols}, 80px)`;
        
        // Render Grid
        const create = (t,c,cl) => { const el = document.createElement(t); el.className=cl+" text-[10px] flex items-center justify-center h-6"; el.textContent=c; return el; };
        grid.appendChild(create('div','','bg-gray-100'));
        for(let i=0;i<cols;i++) grid.appendChild(create('div',String.fromCharCode(65+i),'bg-gray-100 font-bold'));

        for(let r=1;r<=rows;r++) {
            grid.appendChild(create('div',r,'bg-gray-100 text-gray-500'));
            for(let c=0;c<cols;c++) {
                const id = `${String.fromCharCode(65+c)}${r}`;
                const cell = document.createElement('div');
                cell.className = "bg-white px-1 text-xs overflow-hidden cursor-cell hover:border-green-500 hover:border hover:z-10 h-6";
                cell.id = `cell-${id}`;
                cell.onclick = () => this.selectCell(id);
                grid.appendChild(cell);
            }
        }
        this.updateExcelGrid();
    }
    
    updateExcelGrid() {
        if(!this.excelData) return;
        for (let id in this.excelData) {
            // Need to update ALL excel windows or just active. For simplicity, assume one data source.
            const els = document.querySelectorAll(`[id="cell-${id}"]`);
            els.forEach(el => {
                const d = this.excelData[id];
                el.textContent = d.value || d.v || '';
                el.style.fontWeight = (d.bold || d.b) ? 'bold' : 'normal';
            });
        }
        // Snake Render Logic (Shared state)
        if(this.snakeGame) {
             this.snakeGame.snake.forEach(s => {
                 const id = `${String.fromCharCode(65+s.c)}${s.r}`;
                 document.querySelectorAll(`[id="cell-${id}"]`).forEach(el => { el.style.backgroundColor = '#217346'; el.style.color='transparent'; });
             });
             const f = this.snakeGame.food;
             document.querySelectorAll(`[id="cell-${String.fromCharCode(65+f.c)}${f.r}"]`).forEach(el => el.textContent='🍎');
        }
    }
    
    // --- Helper for Excel Input ---
    selectCell(id) {
        this.selectedCell = id;
        // In a real multi-window app, we'd find the active window's input. 
        // For this demo, we assume the user is interacting with the frontmost Excel.
        const activeWin = document.getElementById(`window-content-${this.activeWindowId}`);
        if(activeWin) {
            const inp = activeWin.querySelector('#boss-formula-input');
            const addr = activeWin.querySelector('#boss-cell-addr');
            if(addr) addr.textContent = id;
            if(inp) inp.value = this.excelData[id]?.value || '';
            // Highlight logic omitted for brevity in merge
        }
    }
    
    // --- Word, PPT, Terminal Renderers (Simplified) ---
    renderWord(c) { c.innerHTML = `<div class="h-full bg-[#f3f2f1] flex flex-col"><div class="bg-white p-2 border-b flex gap-2"><button class="hover:bg-gray-100 p-1 font-bold w-6">B</button><button class="hover:bg-gray-100 p-1 italic w-6">I</button><div class="border-l mx-2"></div><button class="hover:bg-gray-100 p-1 text-xs" onclick="BossMode.instance.toggleWordStealth()"><i class="fas fa-user-secret"></i> Stealth</button></div><div class="flex-1 overflow-y-auto p-8 flex justify-center"><div class="bg-white w-[21cm] min-h-[29.7cm] shadow-xl p-[2cm] text-black font-serif text-sm outline-none" contenteditable="true" id="word-doc-content"><p class="text-center font-bold text-lg mb-4 underline">${this.currentWord.title}</p>${this.currentWord.content.replace(/\n/g,'<br>')}</div></div></div>`; }
    renderPPT(c) { c.innerHTML = `<div class="h-full flex bg-[#d0cec9]"><div class="w-40 bg-gray-100 border-r p-2 overflow-y-auto">${this.currentPPT.slides.map((s,i)=>`<div class="bg-white aspect-video shadow mb-2 p-1 text-[8px] cursor-pointer" onclick="BossMode.instance.currentSlide=${i};BossMode.instance.renderPPT(this.parentElement.parentElement)">Slide ${i+1}</div>`).join('')}</div><div class="flex-1 flex items-center justify-center"><div class="bg-white aspect-[16/9] w-3/4 shadow-xl p-8"><h1 class="text-3xl font-bold mb-4">${this.currentPPT.slides[this.currentSlide].title}</h1><ul>${this.currentPPT.slides[this.currentSlide].bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div></div></div>`; }
    renderTerminal(c) { 
        c.innerHTML = `<div class="bg-black text-gray-300 font-mono text-sm h-full p-2 overflow-y-auto" onclick="this.querySelector('input').focus()"><div id="term-output">${this.termHistory.map(l=>`<div>${l}</div>`).join('')}</div><div class="flex"><span>C:\\Users\\${this.userName.replace(' ','')}></span><input class="bg-transparent border-none outline-none text-gray-300 flex-1 ml-2" autofocus onkeydown="if(event.key==='Enter') BossMode.instance.runTerminalCommand(this.value)"></div></div>`; 
    }

    // --- Logic Handlers ---
    runTerminalCommand(cmd) {
        this.termHistory.push(`C:\\Users\\${this.userName.replace(' ','')}> ${cmd}`);
        // ... (Include logic from previous step: help, ls, matrix, etc.)
        if(cmd === 'matrix') { /* Matrix logic */ }
        // Force update of terminal window(s)
        const wins = document.querySelectorAll('.os-window');
        wins.forEach(w => { if(w.innerHTML.includes('Terminal')) this.renderTerminal(w.querySelector('.window-content')); });
    }

    handleKey(e) {
        if(e.key === '`') { this.openApp('excel'); return; } // Panic Key
        // Stealth Typing in Word
        if (this.wordStealthMode) {
             e.preventDefault();
             if(e.key.length === 1) {
                 const chunk = this.fakeText[this.fakeTextPointer % this.fakeText.length];
                 this.fakeTextPointer++;
                 const docs = document.querySelectorAll('#word-doc-content');
                 docs.forEach(d => d.innerHTML += chunk);
             }
        }
        // Snake Controls
        if (this.snakeGame) {
             const k = e.key; const d = this.snakeGame.dir;
             if(k==='ArrowUp' && d.r!==1) this.snakeGame.dir={c:0,r:-1};
             if(k==='ArrowDown' && d.r!==-1) this.snakeGame.dir={c:0,r:1};
             if(k==='ArrowLeft' && d.c!==1) this.snakeGame.dir={c:-1,r:0};
             if(k==='ArrowRight' && d.c!==-1) this.snakeGame.dir={c:1,r:0};
        }
    }

    // --- State Toggles ---
    toggleWordStealth() { this.wordStealthMode = !this.wordStealthMode; }
    toggleStartMenu() { this.startMenuOpen = !this.startMenuOpen; this.notificationOpen = false; this.render(); }
    toggleNotification() { this.notificationOpen = !this.notificationOpen; this.startMenuOpen = false; this.render(); }
    
    // --- Data Gen ---
    generateFakeExcelData(f) {
        f.data = {};
        const cats = ["Revenue","Cost","Profit","Tax"];
        let r=2;
        cats.forEach(c => {
            f.data[`A${r}`] = {value:c, bold:true};
            f.data[`B${r}`] = {value: Math.floor(Math.random()*1000)};
            r++;
        });
    }
}

/**
 * Helper Class for DCF Logic (Separated for cleanliness)
 */
class DCFApp {
    constructor(root) {
        this.root = root;
        const tpl = document.getElementById('tpl-dcf');
        if(tpl) root.appendChild(tpl.content.cloneNode(true));
        
        // Bind logic
        const calcBtn = root.querySelector('.btn-calc');
        if(calcBtn) calcBtn.onclick = () => this.calculate();
        this.calculate(); // Initial run
    }
    
    calculate() {
        const growth = parseFloat(this.root.querySelector('.inp-growth')?.value || 5);
        const wacc = parseFloat(this.root.querySelector('.inp-wacc')?.value || 8.5);
        // Simple projection logic
        let rev = 1000;
        let html = `<tr class="text-gray-500"><th>Year</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr><tr><td class="text-left text-gray-400">Revenue</td>`;
        for(let i=1; i<=5; i++) {
            rev = rev * (1 + growth/100);
            html += `<td>${Math.round(rev)}</td>`;
        }
        html += `</tr>`;
        this.root.querySelector('.dcf-table').innerHTML = html;
        this.root.querySelector('.val-equity').innerText = `$${Math.round(rev * 4)}M`; // Dummy mult
    }
}
