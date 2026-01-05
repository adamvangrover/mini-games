import SaveSystem from './SaveSystem.js';
import SoundManager from './SoundManager.js';
import AdsManager from './AdsManager.js';
import { EMAILS, DOCUMENTS, SLIDES, CHATS, TERMINAL_ADVENTURE } from './BossModeContent.js';

export default class BossMode {
    constructor() {
        // Singleton pattern
        if (BossMode.instance) return BossMode.instance;
        BossMode.instance = this;

        // --- System State ---
        this.isActive = false;
        this.systemState = 'boot'; // 'boot', 'login', 'desktop', 'bsod'
        this.activeApp = 'excel'; // 'excel', 'word', 'ppt', 'outlook', 'teams', 'terminal'
        this.skin = 'windows'; // 'windows', 'mac', 'ubuntu', 'android'
        this.startMenuOpen = false;
        this.notificationOpen = false;
        this.contextMenuOpen = false;
        this.contextMenuPos = { x: 0, y: 0 };

        // --- Managers ---
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.adsManager = AdsManager.getInstance();
        this.overlay = null;

        // --- User Profile ---
        this.user = {
            name: "John Doe",
            role: "Senior Risk Analyst",
            initials: "JD",
            password: "password123"
        };

        // --- Desktop State ---
        this.wallpaperIndex = 0;
        this.wallpapers = [
            'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop', // Mountains
            'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop', // Blue Gradient
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop', // Landscape
            'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop'   // Retro Grid
        ];

        // --- Excel State (Advanced) ---
        this.excelData = {};
        this.selectedCell = null;
        this.excelMode = 'standard'; // 'standard', 'dcf', 'vba', 'tracker'
        this.vbaCodeBuffer = "Sub CalculateSynergy()\n    Dim i As Integer\n    For i = 1 To 100\n        Cells(i, 1).Value = 'Optimized'\n    Next i\nEnd Sub";
        this.trackerLog = []; 
        this.snakeGame = null;
        this.flightGame = null;

        // --- Word State (Stealth & Ipsum) ---
        this.wordStealthMode = false; // "Magic Type" mode
        this.wordContent = DOCUMENTS && DOCUMENTS[0] ? DOCUMENTS[0].content : "Loading confidential data...";
        this.fakeTextBuffer = "The localized projections regarding the Q3 overflow indicate a substantial misalignment with the core competencies of the stakeholders. Moving forward, we must leverage our synergy to circle back on the low-hanging fruit. ";
        this.fakeTextPointer = 0;

        // --- PPT State ---
        this.currentSlide = 0;
        this.slides = SLIDES && SLIDES.length ? SLIDES : [{title: "Q3 Overview", bullets: ["Profit up", "Morale down"]}];

        // --- Outlook State ---
        this.emails = [...EMAILS];
        this.selectedEmail = this.emails[0];

        // --- Teams/Chat State ---
        this.activeChannel = 'general';
        this.chatHistory = CHATS ? JSON.parse(JSON.stringify(CHATS)) : { 'general': [] };
        this.chatInput = "";

        // --- Terminal State ---
        this.termHistory = [
            "Microsoft Windows [Version 10.0.19045.3693]",
            "(c) Microsoft Corporation. All rights reserved.",
            "",
            `C:\\Users\\${this.user.name.replace(' ', '')}>`
        ];
        this.adventure = null;

        // --- Clippy ---
        this.clippyTimer = null;
        this.clippyMessages = [
            "It looks like you're pretending to work.",
            "I can make this spreadsheet look 20% more boring.",
            "Your boss is approaching. Look busy!",
            "Don't forget to leverage the synergy.",
            "I noticed you typed '=SNAKE'. Bold strategy.",
            "Would you like to generate a random excuse?"
        ];

        // Expose globally
        window.BossMode = BossMode;
        this.init();
    }

    init() {
        let existing = document.getElementById('boss-mode-overlay');
        if (existing) existing.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'boss-mode-overlay';
        this.overlay.className = 'hidden fixed inset-0 z-[10000] bg-black font-sans text-xs text-black flex flex-col cursor-default select-none overflow-hidden';
        document.body.appendChild(this.overlay);

        this.bindGlobalEvents();
    }

    bindGlobalEvents() {
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;

            // Global Escape from BSOD
            if (e.key === 'Escape' && this.systemState === 'bsod') {
                this.systemState = 'boot'; 
                this.render();
                return;
            }

            this.handleKey(e);
        });

        // Context Menu for Skin Switching
        document.addEventListener('contextmenu', (e) => {
            if (!this.isActive || this.systemState !== 'desktop') return;
            e.preventDefault();
            this.contextMenuOpen = true;
            this.contextMenuPos = { x: e.clientX, y: e.clientY };
            this.render();
        });

        document.addEventListener('click', (e) => {
            if (this.contextMenuOpen) {
                this.contextMenuOpen = false;
                this.render();
            }
        });
    }

    changeSkin(skin) {
        this.skin = skin;
        this.contextMenuOpen = false;
        // Set wallpaper based on skin
        if (skin === 'mac') this.wallpaperIndex = 0; // Mountains (Mac-like)
        if (skin === 'ubuntu') this.wallpaperIndex = 1; // Purple/Orange gradient
        if (skin === 'windows') this.wallpaperIndex = 2; // Landscape
        if (skin === 'android') this.wallpaperIndex = 3; // Abstract
        this.render();
    }

    // =================================================================================
    //  CORE RENDER LOOP
    // =================================================================================

    toggle(forceState = null) {
        const nextState = forceState !== null ? forceState : !this.isActive;
        if (nextState === this.isActive) return;
        this.isActive = nextState;

        if (this.isActive) {
            this.overlay.classList.remove('hidden');
            this.soundManager.stopAll(); 
            
            if (this.systemState === 'boot') {
                this.runBootSequence();
            } else {
                this.render();
            }
        } else {
            this.overlay.classList.add('hidden');
            this.stopGames();
        }
    }

    render() {
        if (!this.isActive) return;
        this.overlay.innerHTML = '';

        switch(this.systemState) {
            case 'boot': this.renderBoot(); break;
            case 'login': this.renderLogin(); break;
            case 'desktop': this.renderDesktop(); break;
            case 'bsod': this.renderBSOD(); break;
        }
    }

    // =================================================================================
    //  SYSTEM STATES
    // =================================================================================

    runBootSequence() {
        this.renderBoot();
        setTimeout(() => {
            this.systemState = 'login';
            this.render();
        }, 2000); // Fast boot
    }

    renderBoot() {
        this.overlay.innerHTML = `
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
        this.overlay.innerHTML = `
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
                        <input id="boss-login-input" type="password" placeholder="PIN" class="bg-white/20 backdrop-blur border border-white/30 rounded px-3 py-2 outline-none text-white placeholder-gray-300 focus:bg-white/30 transition-all w-48 text-center" onkeydown="if(event.key==='Enter') BossMode.instance.login()">
                        <button id="boss-login-btn" class="bg-white/20 hover:bg-white/30 rounded px-3 border border-white/30 transition-all" onclick="BossMode.instance.login()"><i class="fas fa-arrow-right"></i></button>
                    </div>
                </div>
                <div class="absolute bottom-8 right-8 flex gap-4 text-2xl">
                    <i class="fas fa-power-off cursor-pointer hover:text-red-400" onclick="BossMode.instance.toggle(false)"></i>
                </div>
            </div>
        `;
        setTimeout(() => {
            const input = document.getElementById('boss-login-input');
            if(input) input.focus();
        }, 100);
    }

    login() {
        this.soundManager.playSound('click');
        this.systemState = 'desktop';
        this.generateExcelData(); // Init DCF/Basic data
        this.render();
        this.startClippyLoop();
    }

    renderBSOD() {
        this.overlay.innerHTML = `
            <div class="w-full h-full bg-[#0078d7] text-white flex flex-col items-start justify-center p-20 cursor-none select-none font-sans">
                <div class="text-[8rem] mb-4">:(</div>
                <div class="text-3xl mb-8 max-w-4xl">Your PC ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.</div>
                <div class="text-2xl mb-8">100% complete</div>
                <div class="text-sm">Stop code: CRITICAL_PROCESS_DIED</div>
                <div class="mt-8 text-xs text-white/50">Press ESC to force reboot</div>
            </div>
        `;
    }

    // =================================================================================
    //  DESKTOP ENVIRONMENT
    // =================================================================================

    renderDesktop() {
        if (this.skin === 'mac') this.renderDesktopMac();
        else if (this.skin === 'ubuntu') this.renderDesktopUbuntu();
        else if (this.skin === 'android') this.renderDesktopAndroid();
        else this.renderDesktopWindows();
        
        // Render Context Menu if open
        if (this.contextMenuOpen) {
            const menu = document.createElement('div');
            menu.className = "absolute bg-white text-black shadow-xl border border-gray-300 rounded py-1 z-[10010] text-xs w-32";
            menu.style.left = `${this.contextMenuPos.x}px`;
            menu.style.top = `${this.contextMenuPos.y}px`;
            menu.innerHTML = `
                <div class="px-3 py-2 hover:bg-gray-100 cursor-pointer font-bold border-b text-gray-500">System Theme</div>
                <div class="px-3 py-2 hover:bg-blue-100 cursor-pointer" onclick="BossMode.instance.changeSkin('windows')">Windows 11</div>
                <div class="px-3 py-2 hover:bg-blue-100 cursor-pointer" onclick="BossMode.instance.changeSkin('mac')">macOS</div>
                <div class="px-3 py-2 hover:bg-blue-100 cursor-pointer" onclick="BossMode.instance.changeSkin('ubuntu')">Ubuntu</div>
                <div class="px-3 py-2 hover:bg-blue-100 cursor-pointer" onclick="BossMode.instance.changeSkin('android')">Android Tablet</div>
            `;
            this.overlay.appendChild(menu);
        }

        if (this.activeApp === 'excel') this.initExcelGrid();
        if (this.activeApp === 'terminal') {
             setTimeout(() => {
                 const termInput = document.getElementById('term-input');
                 if(termInput) termInput.focus();
             }, 100);
        }
    }

    getAppContent() {
        switch(this.activeApp) {
            case 'excel': return this.getExcelContent();
            case 'word': return this.getWordContent();
            case 'ppt': return this.getPPTContent();
            case 'outlook': return this.getOutlookContent();
            case 'teams': return this.getTeamsContent();
            case 'terminal': return this.getTerminalContent();
            default: return '';
        }
    }

    renderDesktopWindows() {
        const appContent = this.getAppContent();
        const date = new Date();
        const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const dateStr = date.toLocaleDateString();

        this.overlay.innerHTML = `
            <div class="flex-1 relative overflow-hidden bg-cover bg-center flex flex-col" style="background-image: url('${this.wallpapers[this.wallpaperIndex]}')">
                <div class="absolute top-4 left-4 grid grid-cols-1 gap-4 w-20" id="desktop-icons">
                    ${this.createDesktopIcon('Recycle Bin', 'fa-trash-alt', 'text-gray-200')}
                    ${this.createDesktopIcon('Financials', 'fa-file-excel', 'text-green-500', "BossMode.instance.launchApp('excel')")}
                    ${this.createDesktopIcon('Legal Docs', 'fa-file-word', 'text-blue-500', "BossMode.instance.launchApp('word')")}
                    ${this.createDesktopIcon('Pitch Deck', 'fa-file-powerpoint', 'text-orange-500', "BossMode.instance.launchApp('ppt')")}
                </div>

                <div id="boss-app-window" class="absolute inset-0 top-6 left-6 right-6 bottom-16 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-500 animate-pop-in backdrop-blur-sm">
                   ${appContent}
                </div>

                ${this.startMenuOpen ? this.getStartMenuHtml() : ''}
                ${this.notificationOpen ? this.getNotificationHtml() : ''}
            </div>

            <div class="h-10 bg-[#f3f3f3]/95 border-t border-gray-400 flex items-center px-2 justify-between z-[10001]">
                <div class="flex items-center gap-1">
                    <div id="boss-start-btn" class="w-8 h-8 flex items-center justify-center hover:bg-white/50 rounded cursor-pointer" onclick="BossMode.instance.toggleStartMenu()">
                        <i class="fab fa-windows text-blue-500 text-lg"></i>
                    </div>
                    <div class="h-6 w-48 bg-white border border-gray-300 rounded ml-2 flex items-center px-2 text-xs text-gray-500">
                        <i class="fas fa-search mr-2"></i> Type here to search
                    </div>
                    ${this.renderTaskbarIcon('excel', 'fa-file-excel', 'text-green-600')}
                    ${this.renderTaskbarIcon('word', 'fa-file-word', 'text-blue-600')}
                    ${this.renderTaskbarIcon('ppt', 'fa-file-powerpoint', 'text-orange-600')}
                    ${this.renderTaskbarIcon('outlook', 'fa-envelope', 'text-blue-400')}
                    ${this.renderTaskbarIcon('teams', 'fa-comments', 'text-indigo-600')}
                    ${this.renderTaskbarIcon('terminal', 'fa-terminal', 'text-gray-600')}
                </div>
                <div id="boss-notification-btn" class="flex items-center gap-3 text-xs px-2" onclick="BossMode.instance.toggleNotification()">
                    <i class="fas fa-wifi"></i>
                    <i class="fas fa-volume-up"></i>
                    <div class="text-right leading-tight cursor-pointer">
                        <div>${timeStr}</div>
                        <div>${dateStr}</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderDesktopMac() {
        const appContent = this.getAppContent();
        const date = new Date();
        const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        this.overlay.innerHTML = `
            <div class="flex-1 relative overflow-hidden bg-cover bg-center flex flex-col font-sans" style="background-image: url('${this.wallpapers[this.wallpaperIndex]}')">
                <!-- Top Bar -->
                <div class="h-6 bg-white/20 backdrop-blur-md flex items-center justify-between px-4 text-white text-xs z-[10001] shadow-sm">
                    <div class="flex items-center gap-4 font-bold">
                        <i class="fab fa-apple text-sm"></i>
                        <span class="font-bold">Finder</span>
                        <span class="font-normal">File</span>
                        <span class="font-normal">Edit</span>
                        <span class="font-normal">View</span>
                        <span class="font-normal">Go</span>
                        <span class="font-normal">Window</span>
                        <span class="font-normal">Help</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <i class="fas fa-battery-full"></i>
                        <i class="fas fa-wifi"></i>
                        <i class="fas fa-search"></i>
                        <i class="fas fa-sliders-h"></i>
                        <span>${timeStr}</span>
                    </div>
                </div>

                <div class="absolute top-10 right-4 grid grid-cols-1 gap-6 w-20 justify-items-center text-white text-shadow-md">
                     ${this.createDesktopIcon('Macintosh HD', 'fa-hdd', 'text-gray-200')}
                     ${this.createDesktopIcon('Work', 'fa-folder', 'text-blue-400')}
                </div>

                <div id="boss-app-window" class="absolute inset-20 top-12 bottom-24 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-400 animate-pop-in">
                   ${appContent}
                </div>
                
                <!-- Dock -->
                <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-white/20 backdrop-blur-xl border border-white/20 rounded-2xl p-2 flex items-end gap-2 shadow-2xl z-[10001]">
                    ${this.renderDockIcon('finder', 'fa-smile', 'text-blue-500')}
                    ${this.renderDockIcon('excel', 'fa-file-excel', 'text-green-500')}
                    ${this.renderDockIcon('word', 'fa-file-word', 'text-blue-500')}
                    ${this.renderDockIcon('ppt', 'fa-file-powerpoint', 'text-orange-500')}
                    ${this.renderDockIcon('outlook', 'fa-envelope', 'text-blue-400')}
                    ${this.renderDockIcon('terminal', 'fa-terminal', 'text-gray-800')}
                    <div class="w-[1px] h-8 bg-white/30 mx-1"></div>
                    ${this.renderDockIcon('trash', 'fa-trash', 'text-gray-400')}
                </div>
            </div>
        `;
    }

    renderDockIcon(appId, icon, color) {
        const action = appId === 'trash' || appId === 'finder' ? '' : `BossMode.instance.launchApp('${appId}')`;
        const active = this.activeApp === appId ? 'mb-2' : ''; // Simple bounce
        return `
            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg hover:scale-125 transition-all cursor-pointer ${active}" onclick="${action}">
                 <i class="fas ${icon} ${color} text-2xl"></i>
            </div>
        `;
    }

    renderDesktopUbuntu() {
        const appContent = this.getAppContent();
        const date = new Date();
        const timeStr = date.toLocaleDateString([], {weekday: 'short', hour: '2-digit', minute:'2-digit'});

        this.overlay.innerHTML = `
            <div class="flex-1 relative overflow-hidden bg-cover bg-center flex flex-col font-ubuntu" style="background-image: url('${this.wallpapers[this.wallpaperIndex]}')">
                <!-- Top Bar -->
                <div class="h-7 bg-[#1c1c1c] flex items-center justify-between px-3 text-white text-xs z-[10001] shadow-sm">
                    <div class="font-bold cursor-pointer hover:bg-white/10 px-2 rounded">Activities</div>
                    <div class="absolute left-1/2 transform -translate-x-1/2 font-bold cursor-pointer hover:bg-white/10 px-2 rounded">${timeStr}</div>
                    <div class="flex items-center gap-3">
                        <i class="fas fa-network-wired"></i>
                        <i class="fas fa-volume-up"></i>
                        <i class="fas fa-power-off"></i>
                        <i class="fas fa-caret-down"></i>
                    </div>
                </div>

                <!-- Side Dock -->
                <div class="absolute left-0 top-7 bottom-0 w-14 bg-[#1c1c1c]/90 flex flex-col items-center py-2 gap-2 z-[10001]">
                    ${this.renderDockIcon('excel', 'fa-file-excel', 'text-green-500')}
                    ${this.renderDockIcon('word', 'fa-file-word', 'text-blue-500')}
                    ${this.renderDockIcon('ppt', 'fa-file-powerpoint', 'text-orange-500')}
                    ${this.renderDockIcon('terminal', 'fa-terminal', 'text-gray-300')}
                    <div class="mt-auto mb-2 w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 cursor-pointer">
                        <i class="fas fa-th text-white text-lg"></i>
                    </div>
                </div>

                <div id="boss-app-window" class="absolute inset-0 top-12 left-20 right-8 bottom-8 bg-white rounded-t-lg shadow-2xl flex flex-col overflow-hidden border border-gray-600 animate-pop-in">
                   ${appContent}
                </div>
            </div>
        `;
    }

    renderDesktopAndroid() {
        // Tablet Mode
        const appContent = this.getAppContent();
        const date = new Date();
        const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        this.overlay.innerHTML = `
            <div class="flex-1 relative overflow-hidden bg-cover bg-center flex flex-col font-sans" style="background-image: url('${this.wallpapers[this.wallpaperIndex]}')">
                <!-- Status Bar -->
                <div class="h-6 flex items-center justify-between px-4 text-white text-xs z-[10001] bg-black/20 backdrop-blur-sm">
                    <div class="font-bold">${timeStr}</div>
                    <div class="flex items-center gap-2">
                        <i class="fas fa-wifi"></i>
                        <i class="fas fa-signal"></i>
                        <i class="fas fa-battery-three-quarters"></i>
                    </div>
                </div>

                <!-- App Grid (Desktop) -->
                <div class="absolute inset-0 p-8 grid grid-cols-6 grid-rows-4 gap-8 pointer-events-none z-0">
                    <div class="pointer-events-auto flex flex-col items-center gap-1" onclick="BossMode.instance.launchApp('excel')">
                        <div class="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center shadow"><i class="fas fa-file-excel text-green-600 text-2xl"></i></div>
                        <span class="text-white text-[10px] shadow-black drop-shadow-md">Sheets</span>
                    </div>
                     <div class="pointer-events-auto flex flex-col items-center gap-1" onclick="BossMode.instance.launchApp('word')">
                        <div class="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center shadow"><i class="fas fa-file-word text-blue-600 text-2xl"></i></div>
                        <span class="text-white text-[10px] shadow-black drop-shadow-md">Docs</span>
                    </div>
                </div>

                <!-- Window (Floating Tablet App) -->
                <div id="boss-app-window" class="absolute inset-8 top-12 bottom-16 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-300 animate-slide-up">
                   ${appContent}
                </div>

                <!-- Nav Bar -->
                <div class="absolute bottom-0 w-full h-12 flex items-center justify-center gap-12 text-white/80 z-[10002] bg-black/10 backdrop-blur">
                    <i class="fas fa-chevron-left text-xl cursor-pointer hover:text-white"></i>
                    <i class="fas fa-circle text-lg cursor-pointer hover:text-white" onclick="BossMode.instance.launchApp('home')"></i>
                    <i class="fas fa-square text-lg cursor-pointer hover:text-white"></i>
                </div>
            </div>
        `;
    }

    createDesktopIcon(name, icon, color, action = "") {
        return `
            <div id="icon-${name.replace(/\s+/g,'-')}" class="flex flex-col items-center gap-1 group cursor-pointer text-white hover:bg-white/10 p-2 rounded" onclick="${action}">
                <i class="fas ${icon} text-3xl ${color} drop-shadow-md"></i>
                <span class="text-[11px] text-center text-shadow-sm leading-tight">${name}</span>
            </div>
        `;
    }

    renderTaskbarIcon(appId, icon, color) {
        const active = this.activeApp === appId ? 'bg-white border-b-2 border-blue-500' : '';
        return `
            <div id="boss-app-${appId}" class="w-8 h-8 flex items-center justify-center rounded hover:bg-white/50 cursor-pointer ${active}" onclick="BossMode.instance.launchApp('${appId}')">
                <i class="fas ${icon} ${color} text-lg"></i>
            </div>
        `;
    }

    launchApp(app) {
        this.activeApp = app;
        this.startMenuOpen = false;
        this.render();
    }

    toggleStartMenu() {
        this.startMenuOpen = !this.startMenuOpen;
        this.notificationOpen = false;
        this.render();
    }
    
    toggleNotification() {
        this.notificationOpen = !this.notificationOpen;
        this.startMenuOpen = false;
        this.render();
    }

    // =================================================================================
    //  APP: EXCEL (The Hub)
    // =================================================================================

    getWindowHeader(title, icon, bgClass, textClass = "text-white") {
        if (this.skin === 'mac') {
            return `
                <div class="h-8 bg-[#e8e8e8] border-b border-gray-300 flex items-center justify-between px-3 shrink-0 rounded-t-lg">
                    <div class="flex gap-2">
                        <div class="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e] cursor-pointer hover:opacity-80" onclick="BossMode.instance.toggle(false)"></div>
                        <div class="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d89e24]"></div>
                        <div class="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]"></div>
                    </div>
                    <div class="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <i class="fas ${icon}"></i> ${title}
                    </div>
                    <div class="w-10"></div> <!-- Spacer for center alignment -->
                </div>
            `;
        } else if (this.skin === 'ubuntu') {
            return `
                <div class="h-8 bg-[#2c2c2c] text-[#f2f2f2] flex items-center justify-between px-3 shrink-0 rounded-t-lg">
                     <div class="text-xs font-bold flex items-center gap-2">
                        <i class="fas ${icon}"></i> ${title}
                    </div>
                    <div class="flex gap-2">
                         <div class="w-4 h-4 rounded-full bg-[#e95420] flex items-center justify-center text-[8px] cursor-pointer hover:bg-[#d84615]" onclick="BossMode.instance.toggle(false)"><i class="fas fa-times"></i></div>
                    </div>
                </div>
            `;
        } else if (this.skin === 'android') {
             return `
                <div class="${bgClass} ${textClass} flex items-center justify-between px-4 h-10 shrink-0 shadow-md">
                     <div class="flex items-center gap-3">
                         <i class="fas fa-arrow-left text-lg"></i>
                         <span class="font-medium text-sm">${title}</span>
                     </div>
                     <div class="flex gap-4">
                        <i class="fas fa-search"></i>
                        <i class="fas fa-ellipsis-v"></i>
                     </div>
                </div>
             `;
        } else {
            // Windows (Default)
            return `
                <div class="${bgClass} ${textClass} flex items-center justify-between px-3 h-8 shrink-0">
                    <div class="flex items-center gap-4 text-xs">
                        <i class="fas ${icon}"></i>
                        <span class="font-bold">${title}</span>
                    </div>
                    <div class="flex gap-4 text-xs">
                        <span class="cursor-pointer hover:bg-white/20 px-2 py-1">${this.user.name}</span>
                        <i class="fas fa-window-minimize py-1"></i>
                        <i class="fas fa-window-maximize py-1"></i>
                        <i class="fas fa-times cursor-pointer hover:bg-red-500 px-2 py-1" onclick="BossMode.instance.toggle(false)"></i>
                    </div>
                </div>
            `;
        }
    }

    getExcelContent() {
        return `
            ${this.getWindowHeader("Financial_Model_FY26_DCF.xlsx - Excel", "fa-file-excel", "bg-[#217346]")}
            
            <div class="bg-[#f3f2f1] border-b border-gray-300 flex flex-col shrink-0">
                <div class="flex gap-4 px-3 py-1 text-[11px] text-gray-700">
                    <span class="hover:underline cursor-pointer">File</span>
                    <span class="font-bold border-b-2 border-[#217346] cursor-pointer">Home</span>
                    <span class="hover:underline cursor-pointer">Insert</span>
                    <span class="hover:underline cursor-pointer" onclick="BossMode.instance.toggleDCFMode()">Financials</span>
                    <span class="hover:underline cursor-pointer" onclick="BossMode.instance.toggleVBAMode()">Developer</span>
                    <span class="hover:underline cursor-pointer" onclick="BossMode.instance.toggleTrackerMode()">Review</span>
                </div>
                <div class="h-16 flex items-center px-2 gap-2 border-t border-white">
                    <div class="flex flex-col items-center p-1 hover:bg-gray-200 rounded cursor-pointer" onclick="BossMode.instance.generateExcelData()">
                        <i class="fas fa-sync text-green-600 text-lg"></i>
                        <span class="text-[9px]">Reset Data</span>
                    </div>
                    <div class="w-[1px] h-10 bg-gray-300"></div>
                    <div class="flex flex-col items-center p-1 hover:bg-gray-200 rounded cursor-pointer" onclick="BossMode.instance.exportFile('csv')">
                        <i class="fas fa-file-csv text-green-700 text-lg"></i>
                        <span class="text-[9px]">Export CSV</span>
                    </div>
                     <div class="flex flex-col items-center p-1 hover:bg-gray-200 rounded cursor-pointer" onclick="BossMode.instance.runMacro()">
                        <i class="fas fa-code text-blue-700 text-lg"></i>
                        <span class="text-[9px]">Run Macro</span>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-2 px-2 py-1 bg-white border-b border-gray-300 shrink-0">
                <div id="boss-cell-addr" class="w-10 text-center font-bold text-xs text-gray-600">A1</div>
                <div class="w-[1px] h-4 bg-gray-300"></div>
                <i class="fas fa-function text-gray-400 text-xs"></i>
                <input id="boss-formula-input" class="flex-1 outline-none text-xs font-mono" placeholder="Fx">
            </div>

            <div class="flex-1 overflow-hidden relative bg-[#e1dfdd]" id="boss-excel-body">
                ${this.excelMode === 'vba' ? this.getVBAContent() : '<div id="boss-grid" class="grid bg-gray-300 gap-[1px] overflow-auto h-full pb-8"></div>'}
                
                ${this.excelMode === 'tracker' ? this.getTrackerOverlay() : ''}
                
                <div id="clippy-container" class="absolute bottom-8 right-8 z-50 cursor-pointer animate-bounce hover:scale-110 transition-transform">
                    <div id="clippy-bubble" class="absolute -top-16 -left-32 w-40 bg-[#ffffe1] border border-black p-2 text-[10px] rounded shadow-lg hidden text-black border border-black"></div>
                    <div class="text-4xl">📎</div>
                </div>
            </div>

            <div class="h-6 bg-[#217346] text-white flex items-center justify-between px-2 text-[10px] shrink-0">
                <span>Ready ${this.excelMode === 'dcf' ? '| DCF Model Loaded' : ''}</span>
                <span>Average: <span id="boss-avg">-</span> | Sum: <span id="boss-sum">-</span></span>
            </div>
        `;
    }

    getVBAContent() {
        return `
            <div class="w-full h-full bg-[#f0f0f0] flex flex-col p-2">
                <div class="bg-white border border-gray-400 flex-1 p-4 font-mono text-sm text-blue-800 shadow-inner overflow-auto" contenteditable="true" spellcheck="false" id="vba-editor">
                    ${this.vbaCodeBuffer.replace(/\n/g, '<br>')}
                </div>
                <div class="mt-2 flex justify-end gap-2">
                    <button class="px-3 py-1 bg-gray-300 rounded text-xs hover:bg-gray-400" onclick="BossMode.instance.compileVBA()">Compile</button>
                    <button class="px-3 py-1 bg-gray-300 rounded text-xs hover:bg-gray-400" onclick="BossMode.instance.toggleVBAMode()">Close</button>
                </div>
            </div>
        `;
    }

    getTrackerOverlay() {
        return `
            <div class="absolute top-2 right-2 w-64 bg-yellow-50 border border-yellow-400 p-2 shadow-lg text-[10px] font-mono h-[300px] overflow-auto opacity-90">
                <div class="font-bold border-b border-yellow-300 mb-1">ACTIVITY TRACKER (REC)</div>
                <div id="tracker-feed" class="flex flex-col gap-1 text-gray-700">
                    ${this.trackerLog.map(l => `<div>> ${l}</div>`).join('')}
                </div>
            </div>
        `;
    }

    initExcelGrid() {
        if (this.excelMode === 'vba') return; // Don't render grid in VBA mode

        const grid = document.getElementById('boss-grid');
        if (!grid) return;
        const cols = 15;
        const rows = 40;
        grid.style.gridTemplateColumns = `40px repeat(${cols}, 80px)`;
        
        // Headers
        grid.innerHTML = `<div class="bg-[#f3f2f1] flex items-center justify-center sticky top-0 left-0 z-20 border-b border-gray-400"></div>`;
        for(let i=0; i<cols; i++) grid.innerHTML += `<div class="bg-[#f3f2f1] text-center font-bold text-[10px] border-b border-gray-400 flex items-center justify-center sticky top-0 z-10">${String.fromCharCode(65+i)}</div>`;

        for(let r=1; r<=rows; r++) {
            grid.innerHTML += `<div class="bg-[#f3f2f1] text-center text-[10px] border-r border-gray-400 flex items-center justify-center sticky left-0 z-10">${r}</div>`;
            for(let c=0; c<cols; c++) {
                const id = `${String.fromCharCode(65+c)}${r}`;
                const cell = document.createElement('div');
                cell.className = "bg-white px-1 text-[11px] overflow-hidden whitespace-nowrap cursor-cell border-r border-b border-gray-200 h-6 focus:border-2 focus:border-green-600 focus:z-30 outline-none";
                cell.id = `cell-${id}`;
                cell.dataset.id = id;
                cell.onclick = () => this.selectCell(id);
                cell.ondblclick = () => { document.getElementById('boss-formula-input').focus(); };
                grid.appendChild(cell);
            }
        }
        if(Object.keys(this.excelData).length === 0) this.generateExcelData();
        this.updateExcelGrid();

        // Bind Input
        const input = document.getElementById('boss-formula-input');
        if(input) {
            input.onkeydown = (e) => {
                if(e.key === 'Enter') { this.commitEdit(input.value); input.blur(); }
            };
        }
    }

    generateExcelData() {
        this.excelData = {};
        if (this.excelMode === 'dcf') {
            this.generateDCFModel();
        } else {
            // Standard Random Data
            const categories = ["Revenue","COGS","Gross Margin","Opex","EBITDA","Net Income"];
            let r=2;
            this.excelData['A1'] = {value: "FY 2024 Projections", bold: true};
            categories.forEach(c => {
                this.excelData[`A${r}`] = {value:c, bold:true};
                for(let i=0; i<6; i++) {
                    const col = String.fromCharCode(66+i);
                    this.excelData[`${col}${r}`] = {value: Math.floor(Math.random()*50000)+10000, type: 'currency'};
                }
                r++;
            });
        }
        this.updateExcelGrid();
    }

    generateDCFModel() {
        this.excelData = {};
        let r=1;
        this.excelData[`A${r}`] = {value: "Discounted Cash Flow Analysis", bold: true, size: 'lg'};
        r+=2;
        
        const years = [2025, 2026, 2027, 2028, 2029];
        this.excelData[`A${r}`] = {value: "Metric", bold: true};
        years.forEach((y, i) => this.excelData[`${String.fromCharCode(66+i)}${r}`] = {value: y, bold: true});
        r++;

        const rows = ["EBIT", "Tax Rate (21%)", "NOPAT", "Depreciation", "CapEx", "Change in NWC", "Free Cash Flow"];
        rows.forEach(row => {
            this.excelData[`A${r}`] = {value: row};
            for(let i=0; i<5; i++) {
                const val = Math.floor(Math.random() * 8000) + 2000;
                this.excelData[`${String.fromCharCode(66+i)}${r}`] = {value: val};
            }
            r++;
        });

        r+=2;
        this.excelData[`A${r}`] = {value: "WACC", bold: true};
        this.excelData[`B${r}`] = {value: "8.5%"};
        r++;
        this.excelData[`A${r}`] = {value: "Terminal Value", bold: true};
        this.excelData[`B${r}`] = {value: 145000};
    }

    updateExcelGrid() {
        for(let id in this.excelData) {
            const el = document.getElementById(`cell-${id}`);
            if(el) {
                const d = this.excelData[id];
                el.textContent = d.value;
                if(d.bold) el.style.fontWeight = 'bold';
                // Reset styles
                el.style.backgroundColor = 'white';
                el.style.color = 'black';
            }
        }
        // Snake Overlay
        if(this.snakeGame) {
            this.snakeGame.snake.forEach(s => {
                const el = document.getElementById(`cell-${String.fromCharCode(65+s.c)}${s.r}`);
                if(el) { el.style.backgroundColor = '#217346'; el.style.color = 'transparent'; }
            });
            const f = this.snakeGame.food;
            const fel = document.getElementById(`cell-${String.fromCharCode(65+f.c)}${f.r}`);
            if(fel) fel.textContent = '🍎';
        }
        // Flight Sim Overlay
        if(this.flightGame) {
             this.renderFlightGame();
        }
    }

    selectCell(id) {
        if(this.selectedCell) {
            const old = document.getElementById(`cell-${this.selectedCell}`);
            if(old) old.classList.remove('border-2', 'border-green-600', 'z-30');
        }
        this.selectedCell = id;
        const el = document.getElementById(`cell-${id}`);
        if(el) el.classList.add('border-2', 'border-green-600', 'z-30');
        
        document.getElementById('boss-cell-addr').textContent = id;
        const val = this.excelData[id] ? this.excelData[id].value : '';
        document.getElementById('boss-formula-input').value = val;
    }

    commitEdit(val) {
        if(!this.selectedCell) return;
        
        const upVal = val.toString().toUpperCase();

        // --- Easter Eggs & Games ---
        if(upVal === '=SNAKE') { this.startSnake(); return; }
        if(upVal === '=FLIGHT') { this.startFlight(); return; }
        if(upVal === '=BSOD') { this.systemState = 'bsod'; this.render(); return; }
        if(upVal === '=LOREM') { this.excelData[this.selectedCell] = {value: "Lorem ipsum dolor sit amet..."}; this.updateExcelGrid(); return; }
        
        this.excelData[this.selectedCell] = { value: val };
        
        if (this.excelMode === 'tracker') {
            this.trackerLog.unshift(`[${new Date().toLocaleTimeString()}] Cell ${this.selectedCell} updated to "${val}"`);
            this.render(); // Re-render to update tracker overlay
        } else {
            this.updateExcelGrid();
        }
    }

    // --- Excel Modes ---
    toggleDCFMode() { this.excelMode = 'dcf'; this.generateExcelData(); this.render(); }
    toggleVBAMode() { this.excelMode = this.excelMode === 'vba' ? 'standard' : 'vba'; this.render(); }
    toggleTrackerMode() { this.excelMode = this.excelMode === 'tracker' ? 'standard' : 'tracker'; this.render(); }

    compileVBA() {
        const editor = document.getElementById('vba-editor');
        this.vbaCodeBuffer = editor.innerText;
        alert("Compile Error: Module not found (Error 404). Just kidding, macro saved.");
        this.toggleVBAMode();
    }

    runMacro() {
        alert("Running 'CalculateSynergy'...\nAnalysis Complete: 150% Efficiency Gain.");
    }

    // =================================================================================
    //  GAMES (Snake & Flight)
    // =================================================================================

    stopGames() {
        if (this.snakeGame) { clearInterval(this.snakeGame.interval); this.snakeGame = null; }
        if (this.flightGame) { clearInterval(this.flightGame.interval); this.flightGame = null; }
    }

    startSnake() {
        this.stopGames();
        this.snakeGame = {
            snake: [{c:5,r:5},{c:4,r:5}],
            dir: {c:1,r:0},
            food: {c:10,r:10},
            interval: setInterval(()=>this.tickSnake(), 150)
        };
        document.getElementById('boss-formula-input').blur();
    }

    tickSnake() {
        if (!this.snakeGame) return;
        const head = {...this.snakeGame.snake[0]};
        head.c += this.snakeGame.dir.c;
        head.r += this.snakeGame.dir.r;
        
        // Wrap logic
        if(head.c<0) head.c=14; if(head.c>14) head.c=0;
        if(head.r<1) head.r=40; if(head.r>40) head.r=1;

        this.snakeGame.snake.unshift(head);
        if(head.c === this.snakeGame.food.c && head.r === this.snakeGame.food.r) {
            this.snakeGame.food = {c:Math.floor(Math.random()*15), r:Math.floor(Math.random()*39)+1};
            this.soundManager.playSound('coin');
        } else {
            this.snakeGame.snake.pop();
        }
        this.updateExcelGrid();
    }

    startFlight() {
        this.stopGames();
        this.flightGame = {
            playerX: 7,
            obstacles: [], // {x, y}
            score: 0,
            interval: setInterval(() => this.tickFlight(), 100)
        };
        document.getElementById('boss-formula-input').blur();
    }

    tickFlight() {
        if (!this.flightGame) return;
        // Spawn
        if (Math.random() < 0.2) this.flightGame.obstacles.push({x: Math.floor(Math.random()*15), y: 40});
        
        // Move
        this.flightGame.obstacles.forEach(o => o.y--);
        this.flightGame.obstacles = this.flightGame.obstacles.filter(o => o.y > 0);
        
        // Collision (Player is at y=2)
        if (this.flightGame.obstacles.some(o => o.x === this.flightGame.playerX && o.y === 2)) {
            this.stopGames();
            alert("CRASH! Analysis Failed.");
        }
        this.updateExcelGrid();
    }

    renderFlightGame() {
        // Render sky
        const playerX = this.flightGame.playerX;
        const playerY = 2; // Fixed row for player
        
        // Player
        const pEl = document.getElementById(`cell-${String.fromCharCode(65+playerX)}${playerY}`);
        if(pEl) { pEl.textContent = '✈️'; pEl.style.backgroundColor = 'skyblue'; }

        // Obstacles
        this.flightGame.obstacles.forEach(o => {
            const el = document.getElementById(`cell-${String.fromCharCode(65+o.x)}${o.y}`);
            if(el) { el.style.backgroundColor = 'gray'; el.textContent = '☁️'; }
        });
    }

    // =================================================================================
    //  APP: WORD (Stealth)
    // =================================================================================

    getWordContent() {
        return `
            ${this.getWindowHeader("Memo_Q3_Confidential.docx", "fa-file-word", "bg-[#2b579a]")}
            
            <div class="bg-[#f3f2f1] border-b border-gray-300 p-2 flex gap-2 text-xs">
                <button class="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100" onclick="BossMode.instance.exportFile('txt')">Save</button>
                <button class="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100" onclick="BossMode.instance.exportToPDF()">Export PDF</button>
                <div class="w-[1px] bg-gray-400 h-4 self-center"></div>
                <button class="px-2 py-1 font-bold bg-white border border-gray-300 rounded">B</button>
                <button class="px-2 py-1 italic bg-white border border-gray-300 rounded">I</button>
                <button class="px-2 py-1 underline bg-white border border-gray-300 rounded">U</button>
                <div class="ml-auto flex items-center gap-2">
                    <span class="text-gray-500">Modes:</span>
                    <button id="btn-stealth-mode" class="px-2 py-1 ${this.wordStealthMode ? 'bg-blue-200 border-blue-400' : 'bg-white border-gray-300'} border rounded flex items-center gap-1" onclick="BossMode.instance.toggleWordStealth()">
                        <i class="fas fa-magic"></i> Auto-Type
                    </button>
                    <button class="px-2 py-1 bg-white border-gray-300 border rounded flex items-center gap-1" onclick="BossMode.instance.insertLorem()">
                        <i class="fas fa-paragraph"></i> Ipsum
                    </button>
                </div>
            </div>
            <div class="flex-1 bg-[#dcdcdc] overflow-y-auto flex justify-center p-8" onclick="document.getElementById('word-editor').focus()">
                <div id="word-editor" class="bg-white w-[21cm] min-h-[29.7cm] shadow-xl p-[2.5cm] outline-none text-sm font-serif leading-relaxed" contenteditable="true" spellcheck="false" oninput="BossMode.instance.wordContent = this.innerHTML.replace('<p class=&quot;text-center font-bold text-xl mb-8&quot;>CONFIDENTIAL MEMORANDUM</p>', '')">
                    <p class="text-center font-bold text-xl mb-8">CONFIDENTIAL MEMORANDUM</p>
                    ${this.wordContent}
                </div>
            </div>
        `;
    }

    toggleWordStealth() {
        this.wordStealthMode = !this.wordStealthMode;
        this.render();
    }

    insertLorem() {
        const lorem = "Proactively visualize customer directed convergence without revolutionary ROI. Intrinsicly negotiate highly efficient scenarios before highly efficient architectures. ";
        this.wordContent += lorem;
        this.render();
    }

    // =================================================================================
    //  APP: TEAMS (Social)
    // =================================================================================

    getTeamsContent() {
        // Teams has a custom UI that fills the window, but we wrap it for consistency if needed.
        // For Windows it usually has a purple header.
        const header = this.skin === 'windows' || this.skin === 'android' ? '' : this.getWindowHeader("Microsoft Teams", "fa-comments", "bg-[#464775]");
        
        return `
            ${header}
            <div class="flex flex-1 h-full bg-white text-xs overflow-hidden">
                <div class="w-16 bg-[#33344a] flex flex-col items-center py-4 gap-4 text-gray-400 text-xl">
                    <i class="fas fa-bell hover:text-white cursor-pointer"></i>
                    <i class="fas fa-comment-dots text-white cursor-pointer"></i>
                    <i class="fas fa-users hover:text-white cursor-pointer"></i>
                    <i class="fas fa-calendar-alt hover:text-white cursor-pointer"></i>
                </div>
                <div class="w-48 bg-[#f0f0f0] border-r border-gray-300 flex flex-col">
                    <div class="p-4 font-bold text-gray-700">Teams</div>
                    <div class="px-2">
                        <div class="p-2 bg-white rounded shadow-sm font-bold flex items-center gap-2 cursor-pointer"># general</div>
                        <div class="p-2 hover:bg-white rounded flex items-center gap-2 cursor-pointer text-gray-600"># random</div>
                        <div class="p-2 hover:bg-white rounded flex items-center gap-2 cursor-pointer text-gray-600"># memes</div>
                    </div>
                </div>
                <div class="flex-1 flex flex-col">
                    <div class="h-10 border-b border-gray-300 flex items-center px-4 font-bold text-gray-700 justify-between">
                        <span># General</span>
                        <div class="flex -space-x-2">
                            <div class="w-6 h-6 rounded-full bg-blue-500 border border-white"></div>
                            <div class="w-6 h-6 rounded-full bg-red-500 border border-white"></div>
                        </div>
                    </div>
                    <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-white" id="teams-chat-area">
                        ${this.chatHistory[this.activeChannel].map(m => `
                            <div class="flex gap-3">
                                <div class="w-8 h-8 rounded bg-purple-600 flex items-center justify-center text-white font-bold">${m.user.charAt(0)}</div>
                                <div>
                                    <div class="font-bold text-gray-800">${m.user} <span class="text-gray-400 font-normal ml-2">${m.time}</span></div>
                                    <div class="text-gray-600">${m.text}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="p-4 bg-gray-50 border-t border-gray-200">
                        <div class="border border-gray-300 rounded bg-white p-2 flex gap-2">
                            <input class="flex-1 outline-none" placeholder="Type a new message" id="teams-input" onkeydown="if(event.key==='Enter') BossMode.instance.sendChat()">
                            <i class="fas fa-smile text-gray-400 cursor-pointer"></i>
                            <i class="fas fa-paper-plane text-indigo-600 cursor-pointer" onclick="BossMode.instance.sendChat()"></i>
                        </div>
                        <div class="flex gap-2 mt-2 text-gray-500">
                            <i class="fas fa-image cursor-pointer hover:text-gray-700" onclick="BossMode.instance.sendImage()"></i>
                            <i class="fas fa-paperclip cursor-pointer hover:text-gray-700"></i>
                            <i class="fas fa-video cursor-pointer hover:text-gray-700"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    sendChat() {
        const input = document.getElementById('teams-input');
        if (!input || !input.value) return;
        const msg = { user: "Me", time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), text: input.value };
        this.chatHistory[this.activeChannel].push(msg);
        input.value = '';
        this.render();
        
        // Auto Reply
        setTimeout(() => {
            const replies = ["Agreed.", "Let's circle back on that.", "Synergy!", "Can you create a Jira ticket?", "Please fix, thx."];
            this.chatHistory[this.activeChannel].push({
                user: "Manager", 
                time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), 
                text: replies[Math.floor(Math.random()*replies.length)]
            });
            this.render();
        }, 1500);
    }

    sendImage() {
        const memes = ["https://i.imgflip.com/1ur9b0.jpg", "https://i.imgflip.com/26am.jpg"]; // Distracted BF, etc.
        const url = memes[Math.floor(Math.random()*memes.length)];
        this.chatHistory[this.activeChannel].push({
            user: "Me", 
            time: "Now", 
            text: `<img src="${url}" class="w-32 h-auto rounded border">`
        });
        this.render();
    }

    // =================================================================================
    //  Other Content
    // =================================================================================

    getPPTContent() {
         return `
            ${this.getWindowHeader("Presentation1.pptx", "fa-file-powerpoint", "bg-[#c43e1c]")}
            
            <div class="bg-[#f3f2f1] border-b border-gray-300 p-2 flex gap-2 text-xs">
                <button class="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100" onclick="BossMode.instance.exportToPDF()">Export PDF</button>
                <button class="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100" onclick="BossMode.instance.currentSlide=0; BossMode.instance.render()">Restart</button>
            </div>

            <div class="flex-1 flex h-full overflow-hidden">
                <div class="w-48 bg-gray-100 border-r overflow-y-auto shrink-0">
                    ${this.slides.map((s, i) => `
                        <div class="p-4 border-b hover:bg-gray-200 cursor-pointer ${i === this.currentSlide ? 'bg-orange-100 border-l-4 border-orange-500' : ''}" onclick="BossMode.instance.currentSlide=${i}; BossMode.instance.render()">
                            <div class="text-[9px] font-bold truncate">${s.title}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="flex-1 bg-gray-200 flex items-center justify-center p-8 overflow-auto">
                    <div class="bg-white w-full aspect-video shadow-lg p-10 flex flex-col relative">
                        <h1 class="text-3xl font-bold mb-6 text-gray-800 border-b pb-2">${this.slides[this.currentSlide].title}</h1>
                        <ul class="list-disc list-inside space-y-2 text-lg text-gray-700">
                            ${this.slides[this.currentSlide].bullets.map(b => `<li>${b}</li>`).join('')}
                        </ul>
                        <div class="absolute bottom-4 right-4 text-gray-400 text-sm">Confidential</div>
                    </div>
                </div>
            </div>`;
    }

    getOutlookContent() {
         return `
            ${this.getWindowHeader("Inbox - outlook@corp.com", "fa-envelope", "bg-[#0078d4]")}
            <div class="flex-1 flex h-full overflow-hidden">
                <div class="w-64 border-r bg-white flex flex-col shrink-0">
                    <div class="p-2 border-b bg-gray-50 font-bold text-gray-600">Inbox (${this.emails.length})</div>
                    <div class="flex-1 overflow-y-auto">
                        ${this.emails.map(e => `
                            <div class="p-3 border-b hover:bg-blue-50 cursor-pointer ${this.selectedEmail && this.selectedEmail.id === e.id ? 'bg-blue-100 border-l-4 border-blue-500' : ''}" onclick="BossMode.instance.selectedEmail = BossMode.instance.emails.find(x => x.id === ${e.id}); BossMode.instance.render()">
                                <div class="flex justify-between">
                                    <div class="font-bold text-xs truncate w-24">${e.from}</div>
                                    <div class="text-[9px] text-gray-500">${e.time}</div>
                                </div>
                                <div class="text-[10px] truncate font-medium text-blue-800">${e.subject}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="flex-1 p-8 bg-white overflow-y-auto">
                    ${this.selectedEmail ? `
                        <h1 class="text-xl font-bold mb-2">${this.selectedEmail.subject}</h1>
                        <div class="flex items-center gap-2 mb-6 border-b pb-4">
                             <div class="text-xs"><span class="font-bold block">${this.selectedEmail.from}</span></div>
                        </div>
                        <p class="text-sm whitespace-pre-wrap font-serif leading-relaxed">${this.selectedEmail.body}</p>
                    ` : 'Select an email'}
                </div>
            </div>`;
    }

    getTerminalContent() {
        return `
            <div class="flex flex-col h-full bg-black text-gray-300 font-mono text-sm p-2 overflow-y-auto" onclick="document.getElementById('term-input').focus()">
                <div id="term-output">
                    ${this.termHistory.map(l => `<div>${l}</div>`).join('')}
                </div>
                <div class="flex">
                    <span>C:\\Users\\${this.user.name.replace(' ', '')}&gt;</span>
                    <input id="term-input" class="bg-transparent border-none outline-none text-gray-300 flex-1 ml-2" autocomplete="off" autofocus onkeydown="if(event.key==='Enter') BossMode.instance.runTerminalCommand(this.value)">
                </div>
            </div>
        `;
    }

    runTerminalCommand(cmd) {
        this.termHistory.push(`C:\\Users\\${this.user.name.replace(' ', '')}> ${cmd}`);
        document.getElementById('term-input').value = "";
        
        const c = cmd.toLowerCase();
        if (c === 'help') this.termHistory.push("ls, dir, ping, quest, matrix, exit");
        else if (c === 'quest') { this.adventure = { room: 'start' }; this.termHistory.push("--- CORP QUEST ---", TERMINAL_ADVENTURE.start.text); }
        else if (this.adventure) this.handleAdventure(c);
        else if (c === 'matrix') this.termHistory.push("Wake up, Neo...");
        else this.termHistory.push("Bad command or file name");
        this.render();
    }
    
    handleAdventure(cmd) {
        // Simple mock implementation reusing logic from previous step
         this.termHistory.push("You wander aimlessly.");
    }

    // =================================================================================
    //  UTILITIES & EXPORT
    // =================================================================================

    handleKey(e) {
        // Snake / Flight Control
        if (this.activeApp === 'excel' && (this.snakeGame || this.flightGame)) {
            const k = e.key;
            if(this.snakeGame) {
                if(k==='ArrowUp' && this.snakeGame.dir.r!==1) this.snakeGame.dir={c:0,r:-1};
                if(k==='ArrowDown' && this.snakeGame.dir.r!==-1) this.snakeGame.dir={c:0,r:1};
                if(k==='ArrowLeft' && this.snakeGame.dir.c!==1) this.snakeGame.dir={c:-1,r:0};
                if(k==='ArrowRight' && this.snakeGame.dir.c!==-1) this.snakeGame.dir={c:1,r:0};
            }
            if(this.flightGame) {
                if(k==='ArrowLeft') this.flightGame.playerX = Math.max(0, this.flightGame.playerX-1);
                if(k==='ArrowRight') this.flightGame.playerX = Math.min(14, this.flightGame.playerX+1);
            }
            e.preventDefault();
            return;
        }

        // Word Stealth Auto-Type
        if (this.activeApp === 'word' && this.wordStealthMode) {
            e.preventDefault();
            const chunk = this.fakeTextBuffer.substring(this.fakeTextPointer, this.fakeTextPointer + 5);
            this.fakeTextPointer = (this.fakeTextPointer + 5) % this.fakeTextBuffer.length;
            const editor = document.getElementById('word-editor');
            if (editor) {
                editor.innerText += chunk;
                editor.scrollTop = editor.scrollHeight;
            }
        }
    }

    exportFile(type) {
        let content = "";
        let filename = "download";
        if (this.activeApp === 'excel' && type === 'csv') {
            filename = "financials.csv";
            content = "Col A,Col B,Col C\n1,2,3"; 
        } else if (this.activeApp === 'word') {
            filename = "memo.txt";
            content = document.getElementById('word-editor').innerText;
        }

        this.adsManager.createPopup("System Info", "File downloaded to secure drive.", "bg-blue-600 text-white");
    }

    exportToPDF() {
        this.adsManager.createPopup("Printing...", "Exporting document to PDF. Please wait...", "bg-red-600 text-white");
        setTimeout(() => {
            this.adsManager.createPopup("System Info", "PDF saved successfully.", "bg-blue-600 text-white");
        }, 1500);
    }

    startClippyLoop() {
        if (this.clippyTimer) clearInterval(this.clippyTimer);
        this.clippyTimer = setInterval(() => {
            if (this.activeApp === 'excel' && Math.random() > 0.8) {
                const bubble = document.getElementById('clippy-bubble');
                if (bubble) {
                    bubble.textContent = this.clippyMessages[Math.floor(Math.random() * this.clippyMessages.length)];
                    bubble.classList.remove('hidden');
                    setTimeout(() => bubble.classList.add('hidden'), 4000);
                }
            }
        }, 15000);
    }
    
    getStartMenuHtml() {
        return `
            <div id="boss-start-menu" class="absolute bottom-12 left-2 w-72 bg-[#1e1e1e]/95 backdrop-blur text-white rounded-lg shadow-2xl border border-[#333] flex flex-col z-[10002] animate-slide-up origin-bottom-left">
                <div class="p-4 border-b border-[#333]">
                    <div class="text-[10px] font-bold text-gray-400 mb-2 uppercase">Pinned</div>
                    <div class="grid grid-cols-4 gap-2">
                        ${['excel','word','ppt','outlook','teams','terminal'].map(app => `
                            <div class="flex flex-col items-center p-2 hover:bg-[#333] rounded cursor-pointer" onclick="BossMode.instance.launchApp('${app}')">
                                <i class="fas fa-${app === 'excel' ? 'file-excel' : app === 'word' ? 'file-word' : app === 'ppt' ? 'file-powerpoint' : app === 'outlook' ? 'envelope' : app === 'teams' ? 'comments' : 'terminal'} text-xl mb-1 text-gray-200"></i>
                                <span class="text-[9px] capitalize">${app}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="p-3 bg-[#252525] flex justify-between items-center rounded-b-lg">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center font-bold">JD</div>
                        <div class="text-xs font-bold">${this.user.name}</div>
                    </div>
                    <i class="fas fa-power-off text-gray-400 hover:text-white cursor-pointer p-2" onclick="BossMode.instance.toggle(false)"></i>
                </div>
            </div>
        `;
    }

    getNotificationHtml() { 
        return `
             <div id="boss-notification-panel" class="absolute bottom-12 right-0 w-80 h-[500px] bg-[#1e1e1e]/95 backdrop-blur border-l border-[#333] shadow-2xl text-white flex flex-col z-[10002] animate-slide-left">
                <div class="p-4 border-b border-[#333] flex justify-between items-center">
                    <span class="font-bold">Notifications</span>
                    <span class="text-[10px] text-blue-400 cursor-pointer">Clear all</span>
                </div>
                <div class="p-4 flex-1 overflow-y-auto flex flex-col gap-3">
                    <div class="bg-[#2d2d2d] p-3 rounded border-l-4 border-blue-500 cursor-pointer">
                        <div class="font-bold text-xs mb-1">HR</div>
                        <div class="text-[10px] text-gray-400">Mandatory Synergy Meeting</div>
                    </div>
                </div>
             </div>
        `; 
    }
}
