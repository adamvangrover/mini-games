import SaveSystem from './SaveSystem.js';
import SoundManager from './SoundManager.js';
import AdsManager from './AdsManager.js';
// Fallback if file missing, we define defaults inside constructor
import { EMAILS, DOCUMENTS, SLIDES, CHATS, TERMINAL_ADVENTURE, BROWSER_DATA } from './BossModeContent.js';

export default class BossMode {
    constructor() {
        // Expose class globally for inline onclick handlers
        window.BossMode = BossMode;

        if (BossMode.instance) return BossMode.instance;
        BossMode.instance = this;

        this.isActive = false;
        // Multi-window state
        this.windows = []; // { id, app, title, x, y, w, h, z, minimized, maximized }
        this.nextWindowId = 1;
        this.zIndexCounter = 100;
        this.activeWindowId = null;

        // UI State
        this.startMenuOpen = false;
        this.notificationOpen = false;
        this.fileMenuOpen = false; // For Excel/Word file menus

        this.overlay = null;
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.adsManager = AdsManager.getInstance();

        // State tracking
        this.wasMuted = false;
        this.wallpaperIndex = 0;
        this.wallpapers = [
            'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop', // Mountains
            'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop', // Blue
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop', // Landscape
            'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop'  // Abstract
        ];

        this.userName = "John Doe";
        this.computerName = "CORP-LAPTOP-042";

        // --- Content Data (Merged with Defaults) ---
        this.emails = (typeof EMAILS !== 'undefined') ? [...EMAILS] : [
            { id: 1, from: "HR", subject: "Mandatory Fun Day", time: "10:30 AM", body: "Attendance is mandatory.", read: false },
            { id: 2, from: "Boss", subject: "Q3 Projections?", time: "09:15 AM", body: "Where are the numbers?", read: true }
        ];
        this.selectedEmail = this.emails[0];

        this.chatHistory = (typeof CHATS !== 'undefined') ? JSON.parse(JSON.stringify(CHATS)) : {
            'general': [{ user: 'Manager', time: '9:00 AM', text: 'Let\'s crush it.' }],
            'random': [{ user: 'Dave', time: '11:00 AM', text: 'Tacos?' }]
        };
        this.activeChannel = 'general';

        this.adventureData = (typeof TERMINAL_ADVENTURE !== 'undefined') ? TERMINAL_ADVENTURE : {
            'start': { text: "You are in a cubicle. Exits: NORTH.", exits: { north: 'breakroom' } },
            'breakroom': { text: "Coffee machine is broken. Exits: SOUTH.", exits: { south: 'start' } }
        };
        this.adventure = null;

        // --- File System (Mock) ---
        this.fileSystem = {
            excel: [
                { name: "Financial_Projections_FY25.xlsx", data: null }, // Null triggers generation
                { name: "Lunch_Orders.xlsx", data: { "A1": {value:"Name", bold:true}, "B1":{value:"Order", bold:true}, "A2":{value:"Me"}, "B2":{value:"Tacos"} } }
            ],
            word: (typeof DOCUMENTS !== 'undefined') ? [...DOCUMENTS] : [
                { title: "Meeting_Minutes.docx", content: "MINUTES OF THE QUARTERLY SYNERGY MEETING\n\nObjective: Circle back on deliverables." },
                { title: "Resignation.docx", content: "To Whom It May Concern,\n\nI hereby resign to become a professional thumb wrestler." }
            ],
            ppt: (typeof SLIDES !== 'undefined') ? [{ title: "Presentation1.pptx", slides: SLIDES }] : [
                { title: "Strategy_Deck.pptx", slides: [{title:"Synergy", bullets:["Leverage","Pivot"]}] }
            ]
        };

        // --- App Contexts ---
        // Excel
        this.currentExcel = this.fileSystem.excel[0];
        this.excelData = {};
        this.selectedCell = null;

        // Word
        this.currentWord = this.fileSystem.word[0];
        this.docContent = this.currentWord.content;
        this.wordStealthMode = false;

        // PPT
        this.currentPPT = this.fileSystem.ppt[0]; // PPT File
        this.currentSlide = 0;
        this.slides = this.currentPPT.slides || []; // Active slides

        // Browser
        this.browserUrl = "http://intranet.corp";
        this.bookmarks = (typeof BROWSER_DATA !== 'undefined') ? BROWSER_DATA.bookmarks : [];

        // Terminal
        this.termHistory = [
            "Microsoft Windows [Version 10.0.19045]",
            "(c) Microsoft Corporation. All rights reserved.",
            "",
            `C:\\Users\\${this.userName.replace(' ', '')}>`
        ];
        this.termInput = "";

        // Games / State
        this.snakeGame = null;
        this.flightGame = null;
        this.isPlayingMusic = false;
        this.currentTrack = "Corporate Lo-Fi Beats";
        this.bsodActive = false;

        this.fakeText = "The localized projections regarding the Q3 overflow indicate a substantial misalignment with the core competencies of the stakeholders. ".split('');
        this.fakeTextPointer = 0;

        // Clippy
        this.clippyMessages = [
            "It looks like you're pretending to work.",
            "I noticed you typed '=GAME'. Bold strategy.",
            "Your boss is approaching. Look busy!",
            "I can make this spreadsheet look 20% more boring."
        ];

        this.init();
    }

    init() {
        let existing = document.getElementById('boss-mode-overlay');
        if (existing) existing.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'boss-mode-overlay';
        this.overlay.className = 'hidden fixed inset-0 z-[10000] bg-white font-sans text-xs text-black flex flex-col cursor-default select-none overflow-hidden';

        // Static Structure for Differential Rendering
        this.overlay.innerHTML = `
            <div id="boss-wallpaper" class="absolute inset-0 bg-cover bg-center transition-[background-image] duration-500" style="z-index: 0;"></div>
            <div id="boss-icons" class="absolute inset-0 p-4 flex flex-col flex-wrap gap-4 content-start z-0" style="width: min-content;"></div>
            <div id="boss-windows-container" class="absolute inset-0 pointer-events-none"></div>
            <div id="boss-bsod-container" class="absolute inset-0 z-[10005] hidden"></div>
            <div id="boss-taskbar-container" class="absolute bottom-0 left-0 right-0 h-10 z-[9999]"></div>
            <div id="boss-startmenu-container" class="absolute bottom-10 left-0 z-[10000]"></div>
            <div id="boss-notification-container" class="absolute bottom-10 right-0 z-[10000]"></div>
        `;

        document.body.appendChild(this.overlay);

        this.bindGlobalEvents();
        // Init default Excel Data
        if(!this.currentExcel.data) this.generateFakeExcelData(this.currentExcel);
        this.excelData = this.currentExcel.data;

        // Drag Handling
        this.dragState = null;
        document.addEventListener('mousemove', (e) => this.handleDragMove(e));
        document.addEventListener('mouseup', () => this.handleDragEnd());
    }

    bindGlobalEvents() {
        document.addEventListener('keydown', (e) => {
            if (this.isActive) this.handleKey(e);
        });
    }

    // --- Window Management ---

    openApp(appId) {
        if (this.bsodActive) return;

        const existing = this.windows.find(w => w.app === appId);
        if (existing) {
            if (existing.minimized) existing.minimized = false;
            this.bringToFront(existing.id);
            this.render();
            return;
        }

        const appConfig = this.getAppConfig(appId);
        const newWindow = {
            id: this.nextWindowId++,
            app: appId,
            title: appConfig.title,
            icon: appConfig.icon,
            x: 50 + (this.windows.length * 20),
            y: 50 + (this.windows.length * 20),
            w: appConfig.w || 800,
            h: appConfig.h || 600,
            z: this.zIndexCounter++,
            minimized: false,
            maximized: false
        };

        this.windows.push(newWindow);
        this.activeWindowId = newWindow.id;
        this.startMenuOpen = false;
        this.render();
    }

    closeWindow(id) {
        this.windows = this.windows.filter(w => w.id !== id);
        this.render();
    }

    minimizeWindow(id) {
        const w = this.windows.find(w => w.id === id);
        if (w) { w.minimized = true; this.render(); }
    }

    maximizeWindow(id) {
        const w = this.windows.find(w => w.id === id);
        if (w) { w.maximized = !w.maximized; this.render(); }
    }

    bringToFront(id) {
        const w = this.windows.find(w => w.id === id);
        if (w) {
            w.z = ++this.zIndexCounter;
            this.activeWindowId = id;
            if(w.minimized) w.minimized = false;
            const el = document.getElementById(`window-${w.id}`);
            if (el) el.style.zIndex = w.z;
            this.renderTaskbar();
        }
    }

    getAppConfig(id) {
        const configs = {
            'excel': { title: `Excel - ${this.currentExcel.name}`, icon: 'fa-file-excel text-green-600', w: 900, h: 600 },
            'word': { title: `Word - ${this.currentWord.title || this.currentWord.name}`, icon: 'fa-file-word text-blue-600', w: 700, h: 800 },
            'ppt': { title: `PowerPoint - ${this.currentPPT.title}`, icon: 'fa-file-powerpoint text-orange-600', w: 900, h: 600 },
            'email': { title: 'Outlook - Inbox', icon: 'fa-envelope text-blue-400', w: 800, h: 600 },
            'chat': { title: 'Teams', icon: 'fa-comments text-indigo-600', w: 700, h: 500 },
            'terminal': { title: 'Command Prompt', icon: 'fa-terminal text-gray-400', w: 600, h: 400 },
            'browser': { title: 'Edge - Internet', icon: 'fa-globe text-blue-500', w: 900, h: 700 },
            'spotify': { title: 'Spotify', icon: 'fa-music text-green-500', w: 400, h: 200 }
        };
        return configs[id] || { title: 'Application', icon: 'fa-window-maximize', w: 600, h: 400 };
    }

    // --- Rendering ---

    render() {
        if (!this.isActive) return;

        if (this.bsodActive) {
            this.renderBSOD();
            return;
        } else {
             const bsod = document.getElementById('boss-bsod-container');
             if(bsod) bsod.classList.add('hidden');
        }

        // Update Wallpaper
        const wp = document.getElementById('boss-wallpaper');
        if(wp) wp.style.backgroundImage = `url('${this.wallpapers[this.wallpaperIndex]}')`;

        this.renderIcons();
        this.syncWindows();
        this.renderTaskbar();
        this.renderStartMenu();
        this.renderNotifications();

        // Global listener for closing menus
        if(this.startMenuOpen || this.notificationOpen || this.fileMenuOpen) {
            document.addEventListener('click', (e) => {
                 if(e.target.closest('#boss-start-btn') ||
                   e.target.closest('#boss-notification-btn') ||
                   e.target.closest('#boss-clock-area') ||
                   e.target.closest('#boss-file-menu-btn')) return;

                if(!e.target.closest('.absolute-menu')) {
                    this.startMenuOpen = false;
                    this.notificationOpen = false;
                    this.fileMenuOpen = false;
                    const fm = document.getElementById('boss-file-menu');
                    if(fm) fm.classList.add('hidden');
                    this.render();
                }
            }, { once: true, capture: true });
        }
    }

    renderIcons() {
        const container = document.getElementById('boss-icons');
        if(!container || container.childElementCount > 0) return;

        const icons = [
            { name: "My PC", icon: "fa-desktop", color: "text-blue-200" },
            { name: "Recycle Bin", icon: "fa-trash-alt", color: "text-gray-400" },
            { name: "Financials", icon: "fa-file-excel", color: "text-green-500", action: 'excel' },
            { name: "Notes", icon: "fa-file-word", color: "text-blue-500", action: 'word' },
            { name: "Secrets.txt", icon: "fa-file-alt", color: "text-white", action: () => alert("Access Denied") }
        ];

        container.innerHTML = icons.map(i => `
            <div class="flex flex-col items-center gap-1 w-20 p-2 hover:bg-white/20 rounded border border-transparent hover:border-white/30 cursor-pointer text-white drop-shadow-md group"
                 ondblclick="${typeof i.action === 'string' ? `BossMode.instance.openApp('${i.action}')` : `(${i.action})()`}">
                <i class="fas ${i.icon} ${i.color} text-3xl group-hover:scale-110 transition-transform filter drop-shadow-lg"></i>
                <span class="text-[10px] bg-black/20 px-1 rounded group-hover:bg-blue-600/50 text-center leading-tight line-clamp-2 shadow-black drop-shadow-sm">${i.name}</span>
            </div>
        `).join('') + `
             <div class="flex flex-col items-center gap-1 w-20 p-2 hover:bg-white/20 rounded border border-transparent hover:border-white/30 cursor-pointer text-white drop-shadow-md group" ondblclick="BossMode.instance.cycleWallpaper()">
                    <i class="fas fa-image text-purple-400 text-3xl group-hover:scale-110 transition-transform"></i>
                    <span class="text-xs text-center leading-tight shadow-black drop-shadow-sm">Wallpaper</span>
            </div>
        `;
    }

    syncWindows() {
        const container = document.getElementById('boss-windows-container');
        if (!container) return;

        // Remove closed
        const currentIds = this.windows.map(w => `window-${w.id}`);
        Array.from(container.children).forEach(el => {
            if (!currentIds.includes(el.id)) el.remove();
        });

        // Add/Update
        this.windows.forEach(w => {
            let el = document.getElementById(`window-${w.id}`);
            if (!el) {
                el = document.createElement('div');
                el.id = `window-${w.id}`;
                el.className = "absolute flex flex-col bg-white shadow-2xl overflow-hidden border border-gray-400 pointer-events-auto transition-shadow";
                el.onmousedown = () => this.bringToFront(w.id);
                // Template
                const cfg = this.getAppConfig(w.app);
                const color = w.app==='excel'?'bg-[#217346]': w.app==='word'?'bg-[#2b579a]': w.app==='ppt'?'bg-[#b7472a]': 'bg-gray-100 border-b border-gray-300';
                const textColor = (w.app==='excel'||w.app==='word'||w.app==='ppt') ? 'text-white' : 'text-gray-700';

                el.innerHTML = `
                    <div class="h-8 ${color} flex items-center justify-between px-2 select-none shrink-0" onmousedown="BossMode.instance.startDrag(event, ${w.id})">
                        <div class="flex items-center gap-2 ${textColor}">
                            <i class="fas ${cfg.icon.split(' ')[0]}"></i>
                            <span class="font-semibold text-xs title-text">${w.title}</span>
                        </div>
                        <div class="flex items-center gap-2 window-controls">
                            <div class="w-6 h-6 flex items-center justify-center hover:bg-white/20 cursor-pointer rounded" onclick="BossMode.instance.minimizeWindow(${w.id})"><i class="fas fa-minus ${textColor} text-[10px]"></i></div>
                            <div class="w-6 h-6 flex items-center justify-center hover:bg-white/20 cursor-pointer rounded" onclick="BossMode.instance.maximizeWindow(${w.id})"><i class="fas fa-square ${textColor} text-[10px]"></i></div>
                            <div class="w-6 h-6 flex items-center justify-center hover:bg-red-500 hover:text-white cursor-pointer rounded transition-colors" onclick="BossMode.instance.closeWindow(${w.id})"><i class="fas fa-times ${textColor} text-[10px]"></i></div>
                        </div>
                    </div>
                    <div class="flex-1 overflow-hidden relative flex flex-col app-content" id="window-content-${w.id}">
                        ${this.getAppContent(w.app)}
                    </div>
                `;
                container.appendChild(el);

                if (w.app === 'excel') requestAnimationFrame(() => this.initExcelGrid(w.id));
                if (w.app === 'terminal') this.renderTerminal(document.getElementById(`window-content-${w.id}`));
            } else {
                 // Update Title
                 const titleEl = el.querySelector('.title-text');
                 if(titleEl && w.title !== titleEl.innerText) titleEl.innerText = w.title;

                 // Terminal Updates
                 if (w.app === 'terminal') {
                     const contentEl = document.getElementById(`window-content-${w.id}`);
                     const lines = contentEl?.querySelectorAll('#term-output > div').length || 0;
                     if(lines !== this.termHistory.length) this.renderTerminal(contentEl);
                 }
                 // Chat Updates
                 if (w.app === 'chat') {
                      const contentEl = document.getElementById(`window-content-${w.id}`);
                      const currentMsgs = (this.chatHistory[this.activeChannel] || []).length;
                      const renderedMsgs = contentEl?.querySelectorAll('.msg-item').length || 0;
                      if(currentMsgs !== renderedMsgs) contentEl.innerHTML = this.getChatContent();
                 }
            }

            el.style.zIndex = w.z;
            el.style.display = w.minimized ? 'none' : 'flex';
            if (w.maximized) {
                el.style.top = '0px'; el.style.left = '0px'; el.style.width = '100%'; el.style.height = 'calc(100% - 40px)'; el.style.borderRadius = '0';
            } else {
                el.style.top = `${w.y}px`; el.style.left = `${w.x}px`; el.style.width = `${w.w}px`; el.style.height = `${w.h}px`; el.style.borderRadius = '8px';
            }
        });
    }

    renderTaskbar() {
        const container = document.getElementById('boss-taskbar-container');
        if(!container) return;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const date = new Date().toLocaleDateString();

        container.innerHTML = `
            <div class="bg-[#1e1e1e]/95 backdrop-blur border-t border-[#333] flex items-center justify-between px-2 shadow-lg h-full text-white">
                 <div class="flex items-center gap-1 h-full">
                      <div class="h-8 px-2 hover:bg-[#333] rounded flex items-center justify-center cursor-pointer gap-2 transition-colors" id="boss-start-btn">
                          <i class="fab fa-windows text-blue-400 text-lg"></i>
                      </div>

                      <div class="bg-white/10 border border-gray-600 rounded-sm h-7 flex items-center px-2 w-48 mx-2 hidden md:flex">
                           <i class="fas fa-search text-gray-400 mr-2 text-[10px]"></i>
                           <span class="text-gray-400 text-[10px] select-none">Type here to search</span>
                      </div>

                      ${this.windows.map(w => `
                          <div class="h-8 w-8 hover:bg-[#333] rounded flex items-center justify-center cursor-pointer transition-all relative group ${this.activeWindowId === w.id && !w.minimized ? 'bg-[#333] border-b-2 border-blue-400' : ''}" onclick="BossMode.instance.toggleWindowMinimize(${w.id})">
                               <i class="fas ${this.getAppConfig(w.app).icon.split(' ')[0]} ${this.getAppConfig(w.app).icon.split(' ')[1]} text-lg"></i>
                               ${!w.minimized ? '<div class="absolute bottom-0 w-3 h-0.5 bg-blue-400 rounded-full"></div>' : ''}
                          </div>
                      `).join('')}
                 </div>

                 <div class="flex items-center gap-3 h-full px-2 text-[10px] text-white">
                      <i class="fas fa-wifi"></i>
                      <i class="fas fa-volume-up cursor-pointer hover:text-blue-300" onclick="BossMode.instance.soundManager.toggleMute()"></i>
                      <div class="flex flex-col items-end leading-tight px-2 hover:bg-[#333] rounded cursor-pointer h-full justify-center" id="boss-clock-area">
                           <span>${time}</span>
                           <span class="text-gray-400 hidden sm:inline">${date}</span>
                      </div>
                      <i class="fas fa-comment-alt cursor-pointer" id="boss-notification-btn"></i>
                 </div>
            </div>
        `;

        const startBtn = document.getElementById('boss-start-btn');
        if (startBtn) startBtn.onclick = () => { this.startMenuOpen = !this.startMenuOpen; this.notificationOpen=false; this.render(); };
        const notifBtn = document.getElementById('boss-notification-btn');
        if (notifBtn) notifBtn.onclick = () => { this.notificationOpen = !this.notificationOpen; this.startMenuOpen=false; this.render(); };
        const clock = document.getElementById('boss-clock-area');
        if(clock) clock.onclick = notifBtn.onclick;
    }

    renderStartMenu() {
        const container = document.getElementById('boss-startmenu-container');
        if(!container) return;
        if(!this.startMenuOpen) { container.innerHTML = ''; return; }

        container.innerHTML = `
            <div class="absolute-menu w-72 bg-[#1e1e1e]/95 backdrop-blur-xl shadow-2xl rounded-t-lg border border-[#333] flex flex-col animate-slide-up origin-bottom-left text-white" style="height: 450px; margin-left: 8px;">
                 <div class="p-4 flex-1">
                      <div class="font-bold text-gray-400 mb-2 text-[10px] uppercase">Pinned</div>
                      <div class="grid grid-cols-4 gap-2">
                           ${['excel','word','ppt','email','browser','chat','terminal','spotify'].map(app => `
                                <div class="flex flex-col items-center gap-1 hover:bg-[#333] p-2 rounded cursor-pointer" onclick="BossMode.instance.openApp('${app}')">
                                    <i class="fas ${this.getAppConfig(app).icon.split(' ')[0]} ${this.getAppConfig(app).icon.split(' ')[1]} text-xl"></i>
                                    <span class="text-[9px] capitalize text-gray-200">${app}</span>
                                </div>
                           `).join('')}
                      </div>
                 </div>
                 <div class="bg-[#252525] p-3 flex justify-between items-center border-t border-[#333] rounded-b-lg">
                      <div class="flex items-center gap-2 hover:bg-[#333] p-1 rounded cursor-pointer">
                           <div class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">JD</div>
                           <span class="font-bold text-xs text-gray-200">${this.userName}</span>
                      </div>
                      <i class="fas fa-power-off hover:text-white text-gray-400 p-2 cursor-pointer" onclick="BossMode.instance.toggle(false)"></i>
                 </div>
            </div>
        `;
    }

    renderNotifications() {
        const container = document.getElementById('boss-notification-container');
        if(!container) return;
        if(!this.notificationOpen) { container.innerHTML = ''; return; }

        container.innerHTML = `
            <div class="absolute-menu w-80 bg-[#1e1e1e]/95 backdrop-blur-xl shadow-2xl border-l border-[#333] h-[calc(100vh-40px)] flex flex-col animate-slide-left text-white">
                 <div class="p-3 border-b border-[#333] flex justify-between items-center">
                      <span class="font-bold text-gray-200">Notifications</span>
                      <span class="text-blue-400 cursor-pointer text-[10px]" onclick="BossMode.instance.notificationOpen=false; BossMode.instance.render()">Clear all</span>
                 </div>
                 <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                      ${this.emails.filter(e => !e.read).map(e => `
                          <div class="bg-[#2d2d2d] p-3 rounded border-l-4 border-blue-500 cursor-pointer" onclick="BossMode.instance.openApp('email')">
                              <div class="font-bold text-xs mb-1 text-gray-200">${e.from}</div>
                              <div class="text-[10px] text-gray-400">${e.subject}</div>
                          </div>
                      `).join('')}
                      <div class="bg-[#2d2d2d] p-3 rounded border-l-4 border-red-500">
                           <div class="font-bold text-xs mb-1 text-gray-200">System</div>
                           <div class="text-[10px] text-gray-400">Updates are ready to install.</div>
                      </div>
                 </div>
                 <div class="p-4 bg-[#252525] grid grid-cols-4 gap-2 text-center text-[10px] border-t border-[#333]">
                    <div class="bg-[#333] p-2 rounded cursor-pointer hover:bg-[#444]" onclick="BossMode.instance.cycleWallpaper()"><i class="fas fa-image block text-lg mb-1"></i>Wall</div>
                    <div class="bg-blue-600 p-2 rounded cursor-pointer"><i class="fas fa-wifi block text-lg mb-1"></i>Wifi</div>
                    <div class="bg-[#333] p-2 rounded cursor-pointer hover:bg-[#444]"><i class="fas fa-bluetooth block text-lg mb-1"></i>BT</div>
                    <div class="bg-[#333] p-2 rounded cursor-pointer hover:bg-[#444]"><i class="fas fa-moon block text-lg mb-1"></i>Focus</div>
                 </div>
            </div>
        `;
    }

    renderBSOD() {
        const container = document.getElementById('boss-bsod-container');
        if(!container) return;
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="w-full h-full bg-[#0078d7] text-white flex flex-col items-center justify-center p-20 cursor-none select-none font-sans pointer-events-auto" onclick="BossMode.instance.bsodActive=false; BossMode.instance.render()">
                <div class="text-[10rem] mb-4">:(</div>
                <div class="text-2xl mb-8 max-w-4xl">Your PC ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.</div>
                <div class="text-xl mb-12">20% complete</div>
                <div class="text-sm opacity-70">Stop Code: CRITICAL_PROCESS_DIED</div>
            </div>
        `;
    }

    // --- Content Generators ---

    getAppContent(appId) {
        switch(appId) {
            case 'excel': return this.getExcelContent();
            case 'word': return this.getWordContent();
            case 'ppt': return this.getPPTContent();
            case 'email': return this.getEmailContent();
            case 'chat': return this.getChatContent();
            case 'browser': return this.getBrowserContent();
            case 'spotify': return this.getMusicContent();
            case 'terminal': return `<div id="term-output" class="p-2 text-gray-300 font-mono text-xs"></div>`; // Handled by specific render
            default: return `<div class="p-4">Loading...</div>`;
        }
    }

    getExcelContent() {
        return `
            <div class="flex flex-col h-full text-black">
                <div class="bg-[#f3f2f1] px-2 py-2 flex gap-4 border-b border-[#e1dfdd] text-[11px] items-center shrink-0">
                    <span class="bg-[#2b579a] text-white px-3 py-1 rounded-sm cursor-pointer hover:bg-[#1e3e6e]" id="boss-file-menu-btn" onclick="BossMode.instance.toggleFileMenu(event)">File</span>
                    <button class="flex items-center hover:bg-gray-200 p-1 rounded gap-1" onclick="BossMode.instance.generateFakeExcelData(BossMode.instance.currentExcel); BossMode.instance.loadExcelData(BossMode.instance.currentExcel)"><i class="fas fa-sync text-green-600"></i> Refresh</button>
                    <button class="flex items-center hover:bg-gray-200 p-1 rounded gap-1" onclick="BossMode.instance.openChart()"><i class="fas fa-chart-bar text-blue-600"></i> Chart</button>
                </div>
                <!-- File Menu Dropdown -->
                <div id="boss-file-menu" class="hidden absolute top-10 left-2 w-48 bg-white shadow-xl border border-[#c8c6c4] z-[100] flex flex-col py-1 text-black font-sans text-sm absolute-menu">
                    <div class="px-4 py-2 hover:bg-[#f3f2f1] cursor-pointer font-bold border-b border-[#e1dfdd]">Recent</div>
                    <div class="px-4 py-2 hover:bg-[#e1dfdd] cursor-pointer" onclick="BossMode.instance.showOpenDialog('excel')">Open...</div>
                    <div class="px-4 py-2 hover:bg-[#e1dfdd] cursor-pointer" onclick="BossMode.instance.exportToCSV()">Save Copy As...</div>
                    <div class="border-t border-[#e1dfdd] my-1"></div>
                    <div class="px-4 py-2 hover:bg-red-100 text-red-600 cursor-pointer" onclick="BossMode.instance.closeWindow(BossMode.instance.activeWindowId)">Exit</div>
                </div>

                <div class="flex items-center gap-2 p-1 border-b border-[#e1dfdd] bg-white shrink-0">
                    <div class="bg-white border border-gray-300 w-10 text-center text-xs font-bold text-gray-600" id="boss-cell-addr">${this.selectedCell||''}</div>
                    <div class="flex-1 border border-gray-300 flex items-center px-2">
                        <input id="boss-formula-input" class="w-full text-xs outline-none font-mono h-6" value="">
                    </div>
                </div>
                <div class="flex-1 overflow-auto bg-[#e1dfdd] relative" id="boss-grid-container">
                    <div id="boss-grid" class="grid bg-[#c8c6c4] gap-[1px]"></div>
                </div>
                 <div class="bg-[#217346] text-white text-[10px] px-2 flex justify-between items-center h-5 shrink-0">
                    <span>Ready</span>
                    <span>Sheet1</span>
                </div>
            </div>
        `;
    }

    getWordContent() {
        return `
            <div class="flex flex-col h-full bg-[#f3f2f1] text-black">
                <div class="bg-white p-2 border-b border-[#e1dfdd] flex gap-2 shrink-0">
                    <button class="hover:bg-gray-100 p-1 rounded font-bold w-6">B</button>
                    <button class="hover:bg-gray-100 p-1 rounded italic w-6">I</button>
                    <button class="hover:bg-gray-100 p-1 rounded underline w-6">U</button>
                    <div class="border-l border-gray-300 mx-1"></div>
                    <button class="hover:bg-gray-100 p-1 rounded text-xs flex items-center gap-1" onclick="BossMode.instance.toggleWordStealth()"><i class="fas fa-user-secret ${this.wordStealthMode ? 'text-red-500' : 'text-gray-500'}"></i> Stealth</button>
                    <button class="hover:bg-gray-100 p-1 rounded text-xs flex items-center gap-1" onclick="BossMode.instance.showOpenDialog('word')"><i class="fas fa-folder-open text-yellow-500"></i> Open</button>
                    <button class="hover:bg-gray-100 p-1 rounded text-xs flex items-center gap-1" onclick="BossMode.instance.exportToDoc()"><i class="fas fa-save text-blue-600"></i> Save</button>
                </div>
                <div class="flex-1 overflow-y-auto p-4 flex justify-center bg-[#e1dfdd]">
                    <div class="bg-white w-[21cm] min-h-[29.7cm] shadow-xl p-[2cm] text-black font-serif text-sm leading-relaxed outline-none" contenteditable="true" spellcheck="false" id="word-doc-content" oninput="BossMode.instance.docContent = this.innerText">
                        <p class="text-center font-bold text-lg mb-4 underline">${this.currentWord.title || this.currentWord.name}</p>
                        ${this.docContent.replace(/\n/g, '<br>')}
                    </div>
                </div>
            </div>
        `;
    }

    getMusicContent() {
        return `
            <div class="h-full bg-[#121212] text-white flex flex-col items-center justify-center">
                <i class="fas fa-music text-6xl text-green-500 mb-4 animate-pulse"></i>
                <div class="text-xl font-bold">${this.currentTrack}</div>
                <div class="text-gray-400 text-xs">Lo-Fi Corporate Beats</div>
                <div class="flex gap-6 mt-6 text-2xl">
                    <i class="fas fa-backward cursor-pointer hover:text-green-500"></i>
                    <i class="fas ${this.isPlayingMusic?'fa-pause':'fa-play'} cursor-pointer hover:text-green-500" onclick="BossMode.instance.toggleMusic()"></i>
                    <i class="fas fa-forward cursor-pointer hover:text-green-500"></i>
                </div>
                <div class="w-64 h-1 bg-gray-700 mt-6 rounded-full overflow-hidden">
                    <div class="h-full bg-green-500 w-1/3"></div>
                </div>
            </div>
        `;
    }

    getBrowserContent() {
        return `
             <div class="flex flex-col h-full bg-[#f7f7f7] text-black">
                <div class="h-8 bg-[#f7f7f7] flex items-center px-2 gap-2 border-b border-gray-300">
                     <i class="fas fa-arrow-left text-gray-400 cursor-pointer"></i>
                     <i class="fas fa-arrow-right text-gray-400 cursor-pointer"></i>
                     <i class="fas fa-redo text-gray-600 cursor-pointer text-xs"></i>
                     <div class="flex-1 bg-white border border-gray-300 rounded-full h-6 flex items-center px-3 text-xs text-gray-700">
                        <i class="fas fa-lock text-green-600 mr-2 text-[10px]"></i>
                        ${this.browserUrl}
                     </div>
                </div>
                <div class="h-6 bg-white border-b border-gray-200 flex items-center px-2 gap-4 text-[10px] text-gray-600">
                    ${this.bookmarks.map(b => `
                        <div class="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-1 rounded" onclick="BossMode.instance.browseTo('${b.url}')">
                            <i class="fas ${b.icon}"></i> ${b.title}
                        </div>
                    `).join('')}
                </div>
                <div class="flex-1 bg-white overflow-y-auto p-8 relative">
                    ${this.renderBrowserPage()}
                </div>
            </div>
        `;
    }

    // ... Reuse Chat/PPT/Email/Terminal generators ...
    getPPTContent() {
        return `
             <div class="h-full flex text-black">
                <div class="w-40 bg-gray-100 border-r border-[#c8c6c4] overflow-y-auto flex flex-col gap-2 p-2">
                    ${this.slides.map((slide, i) => `
                        <div class="bg-white aspect-video shadow-sm p-1 flex flex-col gap-1 cursor-pointer ${i === this.currentSlide ? 'ring-2 ring-[#b7472a]' : ''}" onclick="BossMode.instance.setSlide(${i})">
                            <div class="h-1 w-4 bg-gray-300"></div>
                            <div class="text-[8px] text-gray-500 truncate">${slide.title}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="flex-1 flex items-center justify-center p-8 bg-[#d0cec9]">
                    <div class="bg-white aspect-[16/9] w-full max-w-2xl shadow-xl flex flex-col p-8 relative">
                        <h1 class="text-3xl font-bold text-gray-800 mb-4 border-b-2 border-[#b7472a] pb-2">${this.slides[this.currentSlide].title}</h1>
                        <ul class="list-disc list-inside text-xl text-gray-600 space-y-2">
                            ${this.slides[this.currentSlide].bullets.map(b => `<li>${b}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    getChatContent() {
         return `
            <div class="h-full flex text-black">
                <div class="w-48 bg-gray-100 border-r border-[#c8c6c4] flex flex-col p-2">
                    <div class="font-bold text-xs uppercase text-gray-500 mb-2">Channels</div>
                    ${Object.keys(this.chatHistory).map(c => `
                        <div class="px-3 py-1 cursor-pointer text-sm ${this.activeChannel===c ? 'font-bold bg-white rounded shadow-sm' : ''}" onclick="BossMode.instance.switchChannel('${c}')"># ${c}</div>
                    `).join('')}
                </div>
                <div class="flex-1 flex flex-col bg-white">
                    <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3" id="chat-msgs">
                         ${(this.chatHistory[this.activeChannel] || []).map(m => `
                             <div class="msg-item"><span class="font-bold text-xs text-indigo-700">${m.user}: </span><span class="text-xs text-gray-800">${m.text}</span></div>
                         `).join('')}
                    </div>
                    <div class="p-2 border-t border-gray-200">
                        <input id="chat-input" class="w-full border p-1 rounded text-sm" placeholder="Type a message..." onkeydown="if(event.key==='Enter') BossMode.instance.sendChat()">
                    </div>
                </div>
            </div>
        `;
    }

    getEmailContent() {
         return `
            <div class="h-full flex text-black">
                <div class="w-64 border-r border-[#d0d0d0] flex flex-col overflow-y-auto bg-white">
                    ${this.emails.map(email => `
                        <div class="border-b border-gray-200 p-2 cursor-pointer hover:bg-[#cde6f7] ${this.selectedEmail && this.selectedEmail.id === email.id ? 'bg-[#cde6f7] border-l-4 border-l-[#0078d4]' : ''}" onclick="BossMode.instance.selectEmail(${email.id})">
                            <div class="flex justify-between items-baseline mb-1">
                                <span class="font-bold text-xs text-gray-800 truncate">${email.from}</span>
                                <span class="text-[9px] text-gray-500 whitespace-nowrap ml-1">${email.time}</span>
                            </div>
                            <div class="text-xs text-[#0078d4] font-semibold mb-1 truncate">${email.subject}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="flex-1 flex flex-col bg-white p-4">
                    ${this.selectedEmail ? `
                        <h2 class="text-lg font-bold text-gray-800 mb-1">${this.selectedEmail.subject}</h2>
                        <div class="text-xs text-gray-600 border-b border-gray-200 pb-2 mb-2">From: <b>${this.selectedEmail.from}</b></div>
                        <div class="flex-1 text-sm text-gray-800 leading-relaxed overflow-y-auto whitespace-pre-wrap font-serif">
                            ${this.selectedEmail.body}
                        </div>
                    ` : ''}
                </div>
            </div>
         `;
    }

    // --- Logic & Helpers ---

    renderTerminal(container) {
        if(!container) return;
        container.innerHTML = `
            <div class="flex flex-col h-full bg-black text-gray-300 font-mono text-xs p-2 overflow-y-auto" onclick="document.getElementById('term-input').focus()">
                <div id="term-output">
                    ${this.termHistory.map(l => `<div>${l}</div>`).join('')}
                </div>
                <div class="flex">
                    <span>C:\\Users\\${this.userName.replace(' ', '')}&gt;</span>
                    <input id="term-input" class="bg-transparent border-none outline-none text-gray-300 flex-1 ml-2" autocomplete="off" autofocus>
                </div>
            </div>
        `;
        const input = container.querySelector('#term-input');
        if(input) input.addEventListener('keydown', (e) => { if(e.key === 'Enter') this.runTerminalCommand(input.value); });
    }

    initExcelGrid(windowId) {
        // Need to target grid inside specific window
        const winContent = document.getElementById(`window-content-${windowId}`);
        const grid = winContent ? winContent.querySelector('#boss-grid') : document.getElementById('boss-grid');

        if (!grid || grid.childElementCount > 0) return;

        const cols = 15;
        const rows = 30;
        grid.style.gridTemplateColumns = `40px repeat(${cols}, 80px)`;

        // Headers
        const create = (t,c,cl) => { const el = document.createElement(t); el.className=cl+" text-[10px] flex items-center justify-center h-6"; el.textContent=c; return el; };

        grid.appendChild(create('div','','bg-gray-100 border-r border-b border-gray-300'));
        for(let i=0;i<cols;i++) grid.appendChild(create('div',String.fromCharCode(65+i),'bg-gray-100 border-r border-b border-gray-300 font-bold'));

        const fragment = document.createDocumentFragment();
        for(let r=1;r<=rows;r++) {
            fragment.appendChild(create('div',r,'bg-gray-100 border-r border-b border-gray-300'));
            for(let c=0;c<cols;c++) {
                const id = `${String.fromCharCode(65+c)}${r}`;
                const cell = document.createElement('div');
                cell.className = "bg-white border-r border-b border-gray-200 text-xs px-1 overflow-hidden whitespace-nowrap cursor-cell hover:border-green-500 hover:border hover:z-10 h-6";
                cell.id = `cell-${id}`;
                cell.onclick = () => this.selectCell(id);
                // We need to attach double click listener to input in specific window
                cell.ondblclick = () => {
                    const inp = winContent.querySelector('#boss-formula-input');
                    if(inp) inp.focus();
                };
                fragment.appendChild(cell);
            }
        }
        grid.appendChild(fragment);
        this.updateExcelGrid();

        const input = winContent?.querySelector('#boss-formula-input');
        if(input) input.onkeydown = (e) => { if(e.key === 'Enter') { this.commitEdit(input.value); input.blur(); } };
    }

    updateExcelGrid() {
        if(!this.excelData) return;
        // This updates ALL active Excel grids (simulated shared state)
        for (let id in this.excelData) {
            const els = document.querySelectorAll(`[id="cell-${id}"]`);
            els.forEach(el => {
                const d = this.excelData[id];
                el.textContent = d.value || d.v || '';
                if(d.bold || d.b) el.style.fontWeight = 'bold';
            });
        }
        // Render Snake/Flight overlays
        if(this.snakeGame) {
             this.snakeGame.snake.forEach(s => {
                const id = `${String.fromCharCode(65+s.c)}${s.r}`;
                const els = document.querySelectorAll(`[id="cell-${id}"]`);
                els.forEach(el => { el.style.backgroundColor='#217346'; el.style.color='transparent'; });
             });
             const f = this.snakeGame.food;
             const fels = document.querySelectorAll(`[id="cell-${String.fromCharCode(65+f.c)}${f.r}"]`);
             fels.forEach(el => el.textContent='🍎');
        }
    }

    // --- Actions ---

    toggleFileMenu(e) {
        if(e) e.stopPropagation();
        this.fileMenuOpen = !this.fileMenuOpen;
        const menu = document.querySelector('#boss-file-menu');
        // This querySelector might target wrong window if multiple excels open.
        // For now we assume active window or loop.
        // A better approach is to toggle class on all menus or specific ID
        const menus = document.querySelectorAll('#boss-file-menu');
        menus.forEach(m => {
            if(this.fileMenuOpen) m.classList.remove('hidden');
            else m.classList.add('hidden');
        });
    }

    showOpenDialog(type) {
        this.fileMenuOpen = false;
        let files = [];
        if (type === 'excel') files = this.fileSystem.excel;
        else if (type === 'word') files = this.fileSystem.word;
        else if (type === 'ppt') files = this.fileSystem.ppt;

        const modal = document.createElement('div');
        modal.className = "fixed inset-0 bg-black/50 z-[10010] flex items-center justify-center font-sans text-black";
        modal.innerHTML = `
            <div class="bg-white rounded shadow-2xl w-96 border border-gray-400">
                <div class="bg-gray-100 px-4 py-2 border-b border-gray-300 font-bold flex justify-between items-center">
                    <span>Open File</span><i class="fas fa-times cursor-pointer hover:text-red-500" id="open-dlg-close"></i>
                </div>
                <div class="p-2 max-h-64 overflow-y-auto">
                    ${files.map((f, i) => `<div class="flex items-center gap-3 p-2 hover:bg-blue-100 cursor-pointer border-b border-gray-100" id="file-item-${i}"><i class="fas fa-file text-gray-500"></i><span class="text-sm">${f.name || f.title}</span></div>`).join('')}
                </div>
            </div>`;
        document.body.appendChild(modal);
        document.getElementById('open-dlg-close').onclick = () => modal.remove();

        files.forEach((f, i) => {
            document.getElementById(`file-item-${i}`).onclick = () => {
                if (type === 'excel') this.loadExcelData(f);
                else if (type === 'word') { this.currentWord = f; this.docContent = f.content; }
                else if (type === 'ppt') { this.currentPPT = f; this.currentSlide = 0; this.slides = f.slides; }
                this.render();
                modal.remove();
            };
        });
    }

    loadExcelData(fileObj) {
        this.currentExcel = fileObj;
        if (!fileObj.data) this.generateFakeExcelData(fileObj);
        this.excelData = fileObj.data;
        // Re-init grid content (clear and rebuild) is easiest, or just update
        // Since updateExcelGrid only updates text, we might need to clear styles.
        // For simplicity:
        this.render();
        // Since render() syncWindows doesn't replace innerHTML if exists, we need to force it or clear cells
        // Let's manually trigger grid update
        setTimeout(() => {
             const grids = document.querySelectorAll('#boss-grid');
             grids.forEach(g => {
                  Array.from(g.children).forEach(c => {
                       if(c.id.startsWith('cell-')) {
                            c.textContent = '';
                            c.style.backgroundColor = 'white';
                            c.style.color = 'black';
                            c.style.fontWeight = 'normal';
                       }
                  });
             });
             this.updateExcelGrid();
        }, 50);
    }

    generateFakeExcelData(fileObj) {
        fileObj.data = {};
        const cats = ["Revenue","Cost","Profit","Tax"];
        let r=2;
        cats.forEach(c => {
            fileObj.data[`A${r}`] = {value:c, bold:true};
            fileObj.data[`B${r}`] = {value: Math.floor(Math.random()*1000)};
            r++;
        });
    }

    // --- Inputs ---
    handleKey(e) {
        if(e.key === 'Escape') this.toggle(false);
        if(e.key === '`') { this.bsodActive = true; this.render(); return; } // Panic

        if (this.activeWindowId) {
             const w = this.windows.find(w => w.id === this.activeWindowId);
             if (w && w.app === 'word' && this.wordStealthMode) {
                  e.preventDefault();
                  if(e.key.length === 1) {
                        const chunk = this.fakeText[this.fakeTextPointer % this.fakeText.length];
                        this.fakeTextPointer++;
                        this.docContent += chunk;
                        // Directly update DOM
                        const docs = document.querySelectorAll('#word-doc-content');
                        docs.forEach(d => d.innerText = this.docContent);
                  }
                  return;
             }

             if (w && w.app === 'excel' && this.snakeGame) {
                 if(e.key==='ArrowUp') this.snakeGame.dir = {c:0,r:-1};
                 if(e.key==='ArrowDown') this.snakeGame.dir = {c:0,r:1};
                 if(e.key==='ArrowLeft') this.snakeGame.dir = {c:-1,r:0};
                 if(e.key==='ArrowRight') this.snakeGame.dir = {c:1,r:0};
             }
        }
    }

    // --- Drag Handlers (Copied) ---
    startDrag(e, id) {
        if(e.target.closest('.window-controls')) return;
        const w = this.windows.find(w => w.id === id);
        if(w && !w.maximized) {
            this.bringToFront(id);
            this.dragState = { id, startX: e.clientX, startY: e.clientY, initX: w.x, initY: w.y };
            e.preventDefault();
        }
    }
    handleDragMove(e) {
        if (!this.dragState) return;
        const w = this.windows.find(win => win.id === this.dragState.id);
        if (w) {
            w.x = this.dragState.initX + (e.clientX - this.dragState.startX);
            w.y = this.dragState.initY + (e.clientY - this.dragState.startY);
            const el = document.getElementById(`window-${w.id}`);
            if(el) { el.style.left = `${w.x}px`; el.style.top = `${w.y}px`; }
        }
    }
    handleDragEnd() { this.dragState = null; }

    toggleWindowMinimize(id) {
        const w = this.windows.find(w => w.id === id);
        if(w) {
             if(w.minimized) { w.minimized=false; this.bringToFront(id); }
             else if(this.activeWindowId===id) w.minimized=true;
             else this.bringToFront(id);
             this.render();
        }
    }

    // --- Other Methods (Copy from previous implementation logic) ---
    // (We include minimal logic for snake/flight start/stop and excel commit)
    commitEdit(val) {
        if(!this.selectedCell) return;
        if(val.toUpperCase() === '=SNAKE()') { this.startSnake(); return; }
        if(val.toUpperCase() === '=FLIGHT()') { this.startFlight(); return; }
        this.excelData[this.selectedCell] = {value: val};
        this.updateExcelGrid();
    }
    startSnake() {
        if(this.snakeGame) return;
        this.snakeGame = { snake: [{c:5,r:5}], dir: {c:1,r:0}, food: {c:10,r:10}, interval: setInterval(()=>this.tickSnake(), 200) };
    }
    tickSnake() {
        if(!this.snakeGame) return;
        const h = {...this.snakeGame.snake[0]}; h.c+=this.snakeGame.dir.c; h.r+=this.snakeGame.dir.r;
        if(h.c<0) h.c=14; if(h.c>14) h.c=0; if(h.r<1) h.r=30; if(h.r>30) h.r=1;
        this.snakeGame.snake.unshift(h);
        if(h.c===this.snakeGame.food.c && h.r===this.snakeGame.food.r) this.snakeGame.food={c:Math.floor(Math.random()*15),r:Math.floor(Math.random()*29)+1};
        else this.snakeGame.snake.pop();
        this.updateExcelGrid();
    }
    startFlight() {
        if(this.flightGame) return;
        this.flightGame = { playerX:7, obstacles:[], interval: setInterval(()=>this.tickFlight(), 100) };
    }
    tickFlight() {
        if(!this.flightGame) return;
        if(Math.random()<0.1) this.flightGame.obstacles.push({x:Math.floor(Math.random()*15),y:30});
        this.flightGame.obstacles.forEach(o=>o.y--);
        this.flightGame.obstacles = this.flightGame.obstacles.filter(o=>o.y>0);
        this.updateExcelGrid();
    }

    toggleMusic() { this.isPlayingMusic = !this.isPlayingMusic; this.render(); }
    toggleWordStealth() { this.wordStealthMode = !this.wordStealthMode; this.render(); }
    cycleWallpaper() { this.wallpaperIndex = (this.wallpaperIndex + 1) % this.wallpapers.length; this.render(); }
    browseTo(url) { this.browserUrl = url; this.render(); }
    setSlide(i) { this.currentSlide = i; this.render(); }
    selectEmail(id) { this.selectedEmail = this.emails.find(e => e.id === id); if(this.selectedEmail) this.selectedEmail.read = true; this.render(); }
    switchChannel(c) { this.activeChannel = c; this.render(); }
    sendChat() {
        const el = document.querySelector('#window-content-'+this.activeWindowId+' input');
        const val = el ? el.value : '';
        if(val) {
             if(!this.chatHistory[this.activeChannel]) this.chatHistory[this.activeChannel] = [];
             this.chatHistory[this.activeChannel].push({user:'Me', text:val});
             this.render();
        }
    }
    openChart() { this.adsManager.createPopup("Q3 Analysis", "<div style='height:100px; background:linear-gradient(to top, blue, white);'></div>", "bg-white text-black"); }
    renderBrowserPage() {
         if(this.browserUrl.includes('intranet')) return `<h1 class="text-2xl text-blue-600 font-bold">Intranet</h1><p>Welcome, ${this.userName}.</p>`;
         return `<h1>404</h1>`;
    }
    selectCell(id) {
         if(this.selectedCell) {
              const els = document.querySelectorAll(`[id="cell-${this.selectedCell}"]`);
              els.forEach(e => e.classList.remove('border-2','border-green-600','z-10'));
         }
         this.selectedCell = id;
         const els = document.querySelectorAll(`[id="cell-${id}"]`);
         els.forEach(e => e.classList.add('border-2','border-green-600','z-10'));
         const inp = document.querySelector('#window-content-'+this.activeWindowId+' #boss-formula-input');
         const addr = document.querySelector('#window-content-'+this.activeWindowId+' #boss-cell-addr');
         if(addr) addr.textContent = id;
         if(inp && this.excelData[id]) inp.value = this.excelData[id].value || '';
    }

    toggle(forceState = null) {
        const nextState = forceState !== null ? forceState : !this.isActive;
        if (nextState === this.isActive) return;
        this.isActive = nextState;
        if (this.isActive) {
            this.overlay.classList.remove('hidden');
            this.render();
            if (!this.soundManager.muted) { this.wasMuted = false; this.soundManager.toggleMute(); }
        } else {
            this.overlay.classList.add('hidden');
            if (this.wasMuted === false && this.soundManager.muted) this.soundManager.toggleMute();
            if (this.snakeGame) clearInterval(this.snakeGame.interval);
            if (this.flightGame) clearInterval(this.flightGame.interval);
            this.snakeGame = null; this.flightGame = null;
        }
    }
}
