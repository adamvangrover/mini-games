import SaveSystem from './SaveSystem.js';
import SoundManager from './SoundManager.js';
import AdsManager from './AdsManager.js';
// Fallback imports if files exist, otherwise defaults are used
import { EMAILS, DOCUMENTS, SLIDES, CHATS, TERMINAL_ADVENTURE } from './BossModeContent.js';

export default class BossMode {
    constructor() {
        // Expose globally for inline HTML onclick events
        if (window.BossMode) return window.BossMode;
        window.BossMode = this;
        BossMode.instance = this;

        // --- System State ---
        this.isActive = false;
        this.systemState = 'boot'; // boot, login, desktop, bsod
        this.activeApp = null;
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
            initials: "JD",
            password: ""
        };

        // --- Assets ---
        this.wallpapers = [
            'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop', // Mountains
            'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop', // Blue Gradient
            'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop', // Retro Grid
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop'  // Landscape
        ];

        // --- Application Data ---
        
        // Excel
        this.excelData = {};
        this.selectedCell = null;
        this.isEditingCell = false;
        this.snakeGame = null;
        this.flightGame = null;

        // Word (Stealth Mode)
        this.docIndex = 0;
        this.wordStealthMode = false;
        this.fakeText = "The localized projections regarding the Q3 overflow indicate a substantial misalignment with the core competencies of the stakeholders. Moving forward, we must leverage our synergy to circle back on the low-hanging fruit to maximize quarterly EBITDA. ".split('');
        this.fakeTextPointer = 0;
        this.documents = (typeof DOCUMENTS !== 'undefined') ? DOCUMENTS : [
            { title: "Meeting_Minutes_Q3.docx", content: "Action items: Circle back, Touch base, Pivot." },
            { title: "Resignation_Draft.docx", content: "To whom it may concern..." }
        ];
        this.docContent = this.documents[0].content;

        // PPT
        this.currentSlide = 0;
        this.slides = (typeof SLIDES !== 'undefined') ? [...SLIDES] : [{title: "Synergy 2025", bullets: ["Leverage AI", "Reduce Headcount", "Profit"]}];

        // Email & Chat
        this.emails = (typeof EMAILS !== 'undefined') ? [...EMAILS] : [
            { id: 1, from: "HR", subject: "Mandatory Fun Day", time: "10:30 AM", body: "Attendance is mandatory.", read: false },
            { id: 2, from: "Boss", subject: "Q3 Projections?", time: "09:15 AM", body: "Where are the numbers?", read: true }
        ];
        this.selectedEmail = this.emails[0];
        this.activeChannel = 'general';
        this.chatHistory = (typeof CHATS !== 'undefined') ? JSON.parse(JSON.stringify(CHATS)) : { 'general': [{user:'Boss', time:'9:00', text:'Get to work.'}] };

        // Terminal
        this.termHistory = [
            "Microsoft Windows [Version 10.0.19045]",
            "(c) Microsoft Corporation. All rights reserved.",
            "",
            `C:\\Users\\${this.user.name.replace(' ', '')}>`
        ];
        this.adventureData = (typeof TERMINAL_ADVENTURE !== 'undefined') ? TERMINAL_ADVENTURE : {
            'start': { text: "You are in a cubicle. Exits: NORTH.", exits: {north:'breakroom'} },
            'breakroom': { text: "The coffee is burnt.", exits: {south:'start'} }
        };
        this.adventure = null;

        // Minesweeper & Music
        this.minesweeper = { grid: [], state: 'ready', mines: 10 };
        this.isPlayingMusic = false;
        this.currentTrack = "Corporate Lo-Fi Beats";

        // Clippy
        this.clippyMessages = [
            "It looks like you're building a DCF model.",
            "I noticed you typed '=SNAKE'. Bold strategy.",
            "Your boss is approaching. Look busy!",
            "Don't forget to leverage the synergy."
        ];
        this.clippyTimer = null;

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
        this.generateExcelData(); // Pre-load fake data
    }

    bindGlobalEvents() {
        document.addEventListener('keydown', (e) => {
            // Panic Key: F9 or Ctrl+B
            if (e.key === 'F9' || (e.ctrlKey && e.key === 'b')) {
                this.toggle();
            }

            if (!this.isActive) return;

            // Internal System Key Handling
            if (e.key === 'Escape') {
                if (this.systemState === 'bsod') {
                    this.systemState = 'boot'; // Reboot
                    this.render();
                } else {
                    this.closeWindow(); // Close active window
                }
            }

            this.handleKey(e);
        });
    }

    // =================================================================================
    //  CORE STATE MANAGEMENT
    // =================================================================================

    toggle(forceState = null) {
        const nextState = forceState !== null ? forceState : !this.isActive;
        if (nextState === this.isActive) return;
        this.isActive = nextState;

        if (this.isActive) {
            this.overlay.classList.remove('hidden');
            this.soundManager.stopAll(); // Silence game audio
            
            if (this.systemState === 'boot') {
                this.runBootSequence();
            } else {
                this.render();
                this.startClippyLoop();
            }
        } else {
            this.overlay.classList.add('hidden');
            this.cleanupIntervals();
        }
    }

    cleanupIntervals() {
        if (this.snakeGame) clearInterval(this.snakeGame.interval);
        if (this.flightGame) clearInterval(this.flightGame.interval);
        if (this.clippyTimer) clearInterval(this.clippyTimer);
        if (this.matrixInterval) clearInterval(this.matrixInterval);
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

        // Post-render hooks
        if (this.systemState === 'desktop') {
            if (this.activeApp === 'excel') this.initExcelGrid();
            if (this.activeApp === 'minesweeper') this.renderMinesweeper();
            if (this.activeApp === 'terminal') {
                const termInput = document.getElementById('term-input');
                if(termInput) termInput.focus();
            }
        }
    }

    // =================================================================================
    //  SYSTEM SCREENS (BOOT / LOGIN / BSOD)
    // =================================================================================

    runBootSequence() {
        this.renderBoot();
        setTimeout(() => {
            if(this.isActive) {
                this.systemState = 'login';
                this.render();
            }
        }, 3000);
    }

    renderBoot() {
        this.overlay.innerHTML = `
            <div class="w-full h-full bg-black text-gray-300 font-mono p-10 text-sm flex flex-col justify-start">
                <div class="mb-4">AMIBIOS (C) 2024 American Megatrends, Inc.</div>
                <div>ASUS ACPI BIOS Revision 1002</div>
                <div>CPU: Intel(R) Core(TM) i9-12900K CPU @ 3.20GHz</div>
                <div>Speed: 3.20 GHz</div>
                <div class="mb-4">Press DEL to run Setup</div>
                <div>Initializing USB Controllers .. Done.</div>
                <div>128GB RAM OK</div>
                <div class="mt-10">Loading Corporate OS (Safe Mode)...</div>
                <div class="animate-pulse mt-2">_</div>
            </div>
        `;
    }

    renderLogin() {
        const date = new Date();
        this.overlay.innerHTML = `
            <div class="w-full h-full bg-cover bg-center flex flex-col items-center justify-center text-white relative" style="background-image: url('${this.wallpapers[this.wallpaperIndex]}'); box-shadow: inset 0 0 0 2000px rgba(0,0,0,0.3);">
                <div class="absolute top-1/4 flex flex-col items-center animate-slide-up">
                    <div class="text-6xl font-thin mb-2">${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    <div class="text-lg font-medium">${date.toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'})}</div>
                </div>
                
                <div class="flex flex-col items-center gap-4 mt-20 animate-fade-in delay-500 backdrop-blur-sm bg-black/20 p-8 rounded-xl border border-white/10">
                    <div class="w-24 h-24 rounded-full bg-gray-200 border-4 border-white/20 flex items-center justify-center overflow-hidden shadow-2xl">
                        <span class="text-3xl text-gray-600 font-bold">${this.user.initials}</span>
                    </div>
                    <div class="text-2xl font-bold">${this.user.name}</div>
                    <div class="flex gap-2">
                        <button class="bg-white/20 hover:bg-white/30 rounded px-8 py-2 border border-white/30 transition-all font-bold backdrop-blur-md" onclick="BossMode.instance.login()">Sign In</button>
                    </div>
                    <div class="text-sm cursor-pointer hover:underline text-gray-300">Forgot PIN?</div>
                </div>

                <div class="absolute bottom-8 right-8 flex gap-4 text-2xl">
                    <i class="fas fa-wifi"></i>
                    <i class="fas fa-power-off cursor-pointer hover:text-red-400" onclick="BossMode.instance.toggle(false)"></i>
                </div>
            </div>
        `;
    }

    login() {
        this.soundManager.playSound('click');
        this.systemState = 'desktop';
        this.render();
        this.startClippyLoop();
    }

    renderBSOD() {
        this.overlay.innerHTML = `
            <div class="w-full h-full bg-[#0078d7] text-white flex flex-col items-center justify-center p-20 cursor-none select-none font-sans">
                <div class="text-[8rem] mb-4">:(</div>
                <div class="text-2xl mb-8 max-w-4xl text-center">Your PC ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.</div>
                <div class="text-xl mb-12">20% complete</div>
                <div class="flex items-center gap-4 bg-white/10 p-4 rounded">
                    <div class="w-24 h-24 bg-white p-1"><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://www.youtube.com/watch?v=dQw4w9WgXcQ" class="w-full h-full"></div>
                    <div class="text-xs">
                        Stop code: CRITICAL_PROCESS_DIED<br>
                        What failed: work.sys
                    </div>
                </div>
            </div>
        `;
        this.overlay.onclick = () => { this.systemState = 'boot'; this.render(); };
    }

    // =================================================================================
    //  DESKTOP ENVIRONMENT
    // =================================================================================

    renderDesktop() {
        this.overlay.innerHTML = `
            <div class="flex-1 relative overflow-hidden bg-cover bg-center flex flex-col transition-[background-image] duration-500" style="background-image: url('${this.wallpapers[this.wallpaperIndex]}')">
                
                <div class="absolute top-4 left-4 grid grid-cols-1 gap-4 w-20" id="desktop-icons">
                    ${this.createDesktopIcon('Recycle Bin', 'fa-trash-alt', 'text-gray-200')}
                    ${this.createDesktopIcon('Quarterly_Report', 'fa-file-excel', 'text-green-500', "BossMode.instance.launchApp('excel')")}
                    ${this.createDesktopIcon('Meeting_Notes', 'fa-file-word', 'text-blue-500', "BossMode.instance.launchApp('word')")}
                    ${this.createDesktopIcon('Intranet', 'fa-globe', 'text-blue-300', "BossMode.instance.launchApp('edge')")}
                    ${this.createDesktopIcon('Confidential', 'fa-folder', 'text-yellow-400', "alert('Access Denied')")}
                </div>

                ${this.activeApp ? this.getAppWindowHtml() : ''}

                ${this.startMenuOpen ? this.getStartMenuHtml() : ''}
                ${this.notificationOpen ? this.getNotificationHtml() : ''}
            </div>

            ${this.renderTaskbar()}
        `;
    }

    createDesktopIcon(name, icon, color, action = null) {
        return `
            <div class="flex flex-col items-center gap-1 group cursor-pointer w-20 text-white drop-shadow-md hover:bg-white/10 rounded p-2 transition-colors" onclick="${action ? action : ''}">
                <i class="fas ${icon} text-3xl ${color} group-hover:scale-110 transition-transform filter drop-shadow-lg"></i>
                <span class="text-[11px] text-center leading-tight line-clamp-2 text-shadow-sm font-medium bg-black/20 rounded px-1">${name}</span>
            </div>
        `;
    }

    renderTaskbar() {
        const apps = [
            { id: 'excel', icon: 'fa-file-excel', color: 'text-green-500', label: 'Excel' },
            { id: 'word', icon: 'fa-file-word', color: 'text-blue-500', label: 'Word' },
            { id: 'ppt', icon: 'fa-file-powerpoint', color: 'text-orange-500', label: 'PowerPoint' },
            { id: 'email', icon: 'fa-envelope', color: 'text-blue-300', label: 'Outlook' },
            { id: 'chat', icon: 'fa-comments', color: 'text-indigo-400', label: 'Teams' },
            { id: 'spotify', icon: 'fa-spotify', color: 'text-green-400', label: 'Spotify' },
            { id: 'terminal', icon: 'fa-terminal', color: 'text-gray-400', label: 'Terminal' },
            { id: 'minesweeper', icon: 'fa-bomb', color: 'text-red-400', label: 'Minesweeper' }
        ];

        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const date = new Date().toLocaleDateString();

        return `
            <div class="h-12 bg-[#1e1e1e]/90 backdrop-blur-md border-t border-[#333] flex items-center justify-between px-2 z-[10001] select-none shadow-lg shrink-0 text-white">
                <div class="flex items-center gap-1 h-full">
                     <div class="h-10 w-10 hover:bg-white/10 rounded flex items-center justify-center cursor-pointer transition-colors ${this.startMenuOpen ? 'bg-white/10' : ''}" onclick="BossMode.instance.toggleStartMenu()">
                        <i class="fab fa-windows text-blue-400 text-xl"></i>
                    </div>
                    
                    <div class="bg-white/10 rounded-sm h-8 flex items-center px-4 w-48 mx-2 text-gray-400 text-xs gap-2 hidden md:flex border border-gray-600">
                        <i class="fas fa-search"></i> <span>Search</span>
                    </div>

                    ${apps.map(app => `
                        <div class="h-10 w-10 flex items-center justify-center rounded hover:bg-white/10 cursor-pointer transition-all relative group ${this.activeApp === app.id ? 'bg-white/10 border-b-2 border-blue-400' : ''}" onclick="BossMode.instance.launchApp('${app.id}')">
                            <i class="fas ${app.icon} ${app.color} text-xl transform group-hover:-translate-y-0.5 transition-transform"></i>
                            <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none delay-500 border border-gray-600 shadow-lg">
                                ${app.label}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="flex items-center gap-3 text-[11px] text-gray-300 h-full px-2">
                    <i class="fas fa-chevron-up hover:bg-white/10 p-1 rounded"></i>
                    <i class="fas fa-wifi hover:bg-white/10 p-1 rounded"></i>
                    <i class="fas fa-volume-up hover:bg-white/10 p-1 rounded cursor-pointer" onclick="BossMode.instance.soundManager.toggleMute()"></i>
                    <div class="flex flex-col items-end leading-tight cursor-pointer hover:bg-white/10 px-2 py-1 rounded" onclick="BossMode.instance.toggleNotification()">
                        <span>${time}</span>
                        <span>${date}</span>
                    </div>
                    <div class="w-1 h-8 border-l border-gray-600 mx-1"></div>
                    <i class="fas fa-comment-alt hover:bg-white/10 p-2 rounded cursor-pointer" onclick="BossMode.instance.toggleNotification()"></i>
                </div>
            </div>
        `;
    }

    // =================================================================================
    //  WINDOW MANAGEMENT
    // =================================================================================

    launchApp(appId) {
        this.activeApp = appId;
        this.startMenuOpen = false;
        this.soundManager.playSound('click');
        this.render();
    }

    closeWindow() {
        this.activeApp = null;
        this.cleanupIntervals();
        this.render();
    }

    getAppWindowHtml() {
        let content = '';
        let title = 'Application';
        let headerClass = 'bg-gray-100 text-black';
        let icon = 'fa-window-maximize';

        // Delegate to specific content generators
        switch(this.activeApp) {
            case 'excel': return this.getExcelContent();
            case 'word': return this.getWordContent();
            case 'ppt': return this.getPPTContent();
            case 'email': return this.getEmailContent();
            case 'chat': return this.getChatContent();
            case 'terminal': return this.getTerminalContent();
            case 'edge':
                title = 'Edge - Intranet';
                content = this.getEdgeContent();
                break;
            case 'minesweeper':
                title = 'Minesweeper';
                content = `<div class="flex-1 flex items-center justify-center bg-[#c0c0c0] p-4"><div id="minesweeper-board" class="border-4 border-gray-400 bg-gray-300"></div></div>`;
                break;
            case 'spotify':
                title = 'Spotify';
                headerClass = 'bg-[#121212] text-white';
                content = this.getSpotifyContent();
                break;
        }

        // Generic wrapper for apps without custom headers
        return `
            <div class="absolute top-4 left-4 right-4 bottom-16 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-500 animate-pop-in">
                <div class="${headerClass} h-8 flex items-center justify-between px-3 select-none shrink-0 border-b border-gray-300">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-xs">${title}</span>
                    </div>
                    <div class="flex items-center gap-3 text-xs opacity-70">
                        <i class="fas fa-minus hover:opacity-100 cursor-pointer"></i>
                        <i class="fas fa-window-maximize hover:opacity-100 cursor-pointer"></i>
                        <i class="fas fa-times hover:bg-red-500 hover:text-white p-1 px-2 rounded cursor-pointer transition-colors" onclick="BossMode.instance.closeWindow()"></i>
                    </div>
                </div>
                <div class="flex-1 overflow-hidden flex flex-col relative bg-white">
                    ${content}
                </div>
            </div>
        `;
    }

    // =================================================================================
    //  START MENU & NOTIFICATIONS
    // =================================================================================

    getStartMenuHtml() {
        return `
            <div class="absolute bottom-14 left-2 w-72 bg-[#1e1e1e]/95 backdrop-blur-xl text-white rounded-lg shadow-2xl border border-[#333] flex flex-col z-[10002] animate-slide-up origin-bottom-left">
                <div class="p-4 border-b border-[#333]">
                    <div class="text-[10px] font-bold text-gray-400 mb-2 uppercase">Pinned</div>
                    <div class="grid grid-cols-4 gap-2">
                        ${['excel','word','ppt','email','chat','edge','terminal','minesweeper'].map(app => `
                            <div class="flex flex-col items-center p-2 hover:bg-[#333] rounded cursor-pointer" onclick="BossMode.instance.launchApp('${app}')">
                                <i class="fas fa-${app==='edge'?'globe':(app==='email'?'envelope':(app==='chat'?'comments':(app==='ppt'?'file-powerpoint':(app==='excel'?'file-excel':(app==='word'?'file-word':(app==='minesweeper'?'bomb':'terminal'))))))} text-xl mb-1 text-gray-200"></i>
                                <span class="text-[9px] capitalize">${app}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="text-[10px] font-bold text-gray-400 mt-4 mb-2 uppercase">Recommended</div>
                    <div class="flex items-center gap-3 p-2 hover:bg-[#333] rounded cursor-pointer">
                        <i class="fas fa-file-pdf text-red-500 text-lg"></i>
                        <div class="flex flex-col">
                            <span class="text-xs font-bold">Q3_Budget_Final.pdf</span>
                            <span class="text-[9px] text-gray-400">2h ago</span>
                        </div>
                    </div>
                </div>
                <div class="p-3 bg-[#252525] flex justify-between items-center rounded-b-lg">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">${this.user.initials}</div>
                        <div class="text-xs font-bold">${this.user.name}</div>
                    </div>
                    <i class="fas fa-power-off text-gray-400 hover:text-white cursor-pointer p-2" onclick="BossMode.instance.toggle(false)"></i>
                </div>
            </div>
        `;
    }

    getNotificationHtml() {
        return `
            <div class="absolute bottom-14 right-2 w-80 h-[500px] bg-[#1e1e1e]/95 backdrop-blur-xl border border-[#333] shadow-2xl text-white rounded-lg flex flex-col z-[10002] animate-slide-left">
                <div class="p-4 border-b border-[#333] flex justify-between items-center">
                    <span class="font-bold">Notifications</span>
                    <span class="text-[10px] text-blue-400 cursor-pointer" onclick="BossMode.instance.toggleNotification()">Close</span>
                </div>
                <div class="p-4 flex-1 overflow-y-auto flex flex-col gap-3">
                    ${this.emails.slice(0,3).map(e => `
                        <div class="bg-[#2d2d2d] p-3 rounded border-l-4 border-blue-500 cursor-pointer hover:bg-[#3d3d3d]" onclick="BossMode.instance.launchApp('email')">
                            <div class="font-bold text-xs mb-1 flex justify-between"><span>${e.from}</span> <span class="text-gray-500 text-[9px]">${e.time}</span></div>
                            <div class="text-[10px] text-gray-400 truncate">${e.subject}</div>
                        </div>
                    `).join('')}
                    <div class="bg-[#2d2d2d] p-3 rounded border-l-4 border-yellow-500">
                        <div class="font-bold text-xs mb-1">System</div>
                        <div class="text-[10px] text-gray-400">Updates are ready to install. Restart required.</div>
                    </div>
                </div>
                <div class="p-4 bg-[#252525] grid grid-cols-4 gap-2 text-center text-[10px] rounded-b-lg">
                    <div class="bg-[#333] p-2 rounded cursor-pointer hover:bg-[#444]" onclick="BossMode.instance.cycleWallpaper()"><i class="fas fa-image block text-lg mb-1"></i>Wall</div>
                    <div class="bg-blue-600 p-2 rounded cursor-pointer"><i class="fas fa-wifi block text-lg mb-1"></i>Wifi</div>
                    <div class="bg-[#333] p-2 rounded cursor-pointer hover:bg-[#444]"><i class="fas fa-moon block text-lg mb-1"></i>Focus</div>
                    <div class="bg-[#333] p-2 rounded cursor-pointer hover:bg-[#444]" onclick="BossMode.instance.launchApp('bsod')"><i class="fas fa-bomb block text-lg mb-1"></i>Crash</div>
                </div>
            </div>
        `;
    }

    cycleWallpaper() {
        this.wallpaperIndex = (this.wallpaperIndex + 1) % this.wallpapers.length;
        this.render();
    }

    // =================================================================================
    //  APP CONTENT GENERATORS
    // =================================================================================

    getExcelContent() {
        return `
            <div class="absolute top-4 left-4 right-4 bottom-16 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-400 animate-pop-in">
                <div class="bg-[#217346] text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm relative z-30">
                    <div class="flex items-center gap-4"><i class="fas fa-file-excel"></i> <span class="font-bold text-sm">Financial_Model_FY25.xlsx</span></div>
                    <div class="flex gap-3"><i class="fas fa-times cursor-pointer hover:bg-red-500 px-2" onclick="BossMode.instance.closeWindow()"></i></div>
                </div>
                <div class="bg-[#f3f2f1] px-2 py-1 flex gap-2 h-14 items-center border-b border-[#c8c6c4]">
                    <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px]" onclick="BossMode.instance.generateExcelData()"><i class="fas fa-sync text-green-600 text-lg"></i> Reset</button>
                    <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px] bg-green-50 border border-green-200" onclick="BossMode.instance.generateDCF()"><i class="fas fa-money-bill-wave text-green-800 text-lg"></i> DCF Model</button>
                    <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px]" onclick="BossMode.instance.openChart()"><i class="fas fa-chart-bar text-blue-600 text-lg"></i> Chart</button>
                    <div class="border-l border-gray-300 h-8 mx-1"></div>
                    <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px]" onclick="BossMode.instance.exportToCSV()"><i class="fas fa-file-csv text-green-700 text-lg"></i> Export</button>
                </div>
                <div class="bg-white border-b border-[#e1dfdd] flex items-center px-2 py-1 gap-2 h-8 shadow-inner z-10">
                    <div id="boss-cell-addr" class="bg-white border border-[#e1dfdd] px-2 w-16 text-center text-gray-600 font-bold text-sm flex items-center justify-center h-6">A1</div>
                    <input id="boss-formula-input" class="bg-white border-none flex-1 px-2 font-mono text-gray-800 outline-none h-full text-sm">
                </div>
                <div class="flex-1 flex overflow-hidden relative bg-[#e1dfdd]">
                    <div id="boss-row-headers" class="w-10 bg-[#f3f2f1] border-r border-[#c8c6c4] flex flex-col text-center text-gray-500 pt-[24px] text-[11px]"></div>
                    <div class="flex-1 flex flex-col overflow-hidden relative">
                        <div id="boss-col-headers" class="h-6 bg-[#f3f2f1] border-b border-[#c8c6c4] flex text-gray-500 font-bold pr-4 text-[11px]"></div>
                        <div class="flex-1 overflow-auto bg-white relative"><div id="boss-grid" class="grid relative select-none"></div></div>
                    </div>
                    <div id="clippy-container" class="absolute bottom-4 right-4 cursor-pointer hover:scale-105 z-50 transition-transform">
                        <div id="clippy-bubble" class="absolute -top-20 -left-32 w-40 bg-[#ffffe1] border border-black p-2 text-[10px] rounded shadow-lg hidden"></div>
                        <div class="text-4xl animate-bounce" style="animation-duration: 3s;">📎</div>
                    </div>
                </div>
                <div class="bg-[#f3f2f1] border-t border-[#c8c6c4] flex items-center justify-between px-2 py-0.5 text-gray-600 text-[11px] h-6">
                    <span class="text-[#217346] font-bold">Ready</span>
                    <span>Average: <span id="boss-sum-display">-</span></span>
                </div>
            </div>
        `;
    }

    getWordContent() {
        return `
            <div class="absolute top-4 left-4 right-4 bottom-16 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-400 animate-pop-in">
                <div class="bg-[#2b579a] text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm">
                    <div class="flex items-center gap-4"><i class="fas fa-file-word"></i> <span class="font-bold text-sm">${this.documents[this.docIndex].title}</span></div>
                    <div class="flex gap-3"><i class="fas fa-times cursor-pointer hover:bg-red-500 px-2" onclick="BossMode.instance.closeWindow()"></i></div>
                </div>
                <div class="bg-[#f3f2f1] px-2 py-1 flex gap-2 h-10 items-center border-b border-[#c8c6c4]">
                    <button class="hover:bg-gray-200 p-1 px-2 rounded text-xs flex gap-1" onclick="BossMode.instance.cycleDoc()"><i class="fas fa-folder-open text-yellow-600"></i> Open</button>
                    <button class="hover:bg-gray-200 p-1 px-2 rounded text-xs flex gap-1" onclick="BossMode.instance.exportToDoc()"><i class="fas fa-save text-blue-600"></i> Save</button>
                    <div class="border-l border-gray-300 h-6 mx-1"></div>
                    <button class="hover:bg-gray-200 p-1 px-2 rounded text-xs flex gap-1 ${this.wordStealthMode ? 'bg-red-100 text-red-600 font-bold' : ''}" onclick="BossMode.instance.toggleWordStealth()"><i class="fas fa-user-secret"></i> Stealth Mode</button>
                </div>
                <div class="flex-1 bg-[#e4e4e4] overflow-y-auto flex justify-center p-8">
                    <div class="bg-white w-[21cm] min-h-[29.7cm] shadow-xl p-[2.54cm] text-black font-serif text-sm leading-relaxed outline-none" contenteditable="true" spellcheck="false" id="word-doc-content" oninput="BossMode.instance.docContent=this.innerText">
                        <p class="mb-4 text-center font-bold text-lg underline uppercase tracking-widest">${this.documents[this.docIndex].title.replace('.docx','')}</p>
                        ${this.docContent.replace(/\n/g, '<br>')}
                    </div>
                </div>
            </div>
        `;
    }

    getPPTContent() {
        return `
            <div class="absolute top-4 left-4 right-4 bottom-16 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-400 animate-pop-in">
                <div class="bg-[#b7472a] text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm">
                    <div class="flex items-center gap-4"><i class="fas fa-file-powerpoint"></i> <span class="font-bold text-sm">Presentation1.pptx</span></div>
                    <div class="flex gap-3"><i class="fas fa-times cursor-pointer hover:bg-red-500 px-2" onclick="BossMode.instance.closeWindow()"></i></div>
                </div>
                <div class="flex-1 flex bg-[#d0cec9] overflow-hidden">
                    <div class="w-48 bg-[#e1dfdd] border-r border-[#c8c6c4] overflow-y-auto flex flex-col gap-4 p-4">
                        ${this.slides.map((slide, i) => `
                            <div class="bg-white aspect-video shadow-md p-2 flex flex-col gap-1 cursor-pointer ${i === this.currentSlide ? 'ring-2 ring-[#b7472a]' : ''}" onclick="BossMode.instance.setSlide(${i})">
                                <div class="h-1 w-8 bg-gray-300 mb-1"></div>
                                <div class="text-[9px] font-bold text-gray-600 truncate">${slide.title}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="flex-1 flex items-center justify-center p-8 bg-[#d0cec9]">
                        <div class="bg-white aspect-[16/9] w-full max-w-4xl shadow-2xl flex flex-col p-12 relative">
                            <h1 class="text-4xl font-bold text-gray-800 mb-8 border-b-4 border-[#b7472a] pb-2 outline-none" contenteditable="true">${this.slides[this.currentSlide].title}</h1>
                            <ul class="list-disc list-inside text-2xl text-gray-600 space-y-4 outline-none" contenteditable="true">
                                ${this.slides[this.currentSlide].bullets.map(b => `<li>${b}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getEmailContent() {
        const selected = this.selectedEmail;
        return `
            <div class="absolute top-4 left-4 right-4 bottom-16 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-400 animate-pop-in">
                <div class="bg-[#0078d4] text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm">
                    <div class="flex items-center gap-4"><i class="fas fa-envelope"></i> <span class="font-bold text-sm">Inbox - ${this.user.name}</span></div>
                    <div class="flex gap-3"><i class="fas fa-times cursor-pointer hover:bg-red-500 px-2" onclick="BossMode.instance.closeWindow()"></i></div>
                </div>
                <div class="flex-1 flex bg-white overflow-hidden">
                    <div class="w-72 border-r border-[#d0d0d0] flex flex-col overflow-y-auto bg-white">
                        ${this.emails.map(email => `
                            <div class="border-b border-gray-200 p-3 cursor-pointer hover:bg-[#cde6f7] ${selected && selected.id === email.id ? 'bg-[#cde6f7] border-l-4 border-l-[#0078d4]' : ''}" onclick="BossMode.instance.selectEmail(${email.id})">
                                <div class="flex justify-between items-baseline mb-1">
                                    <span class="font-bold text-sm text-gray-800 truncate">${email.from}</span>
                                    <span class="text-[10px] text-gray-500 whitespace-nowrap ml-2">${email.time}</span>
                                </div>
                                <div class="text-xs text-[#0078d4] font-semibold mb-1 truncate">${email.subject}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="flex-1 flex flex-col bg-white">
                        ${selected ? `
                            <div class="border-b border-gray-200 p-4 bg-[#f8f9fa]">
                                <h2 class="text-xl font-bold text-gray-800 mb-2">${selected.subject}</h2>
                                <div class="text-sm font-bold text-gray-700">From: ${selected.from}</div>
                            </div>
                            <div class="flex-1 p-6 text-sm text-gray-800 leading-relaxed overflow-y-auto whitespace-pre-wrap font-serif">${selected.body}</div>
                            <div class="p-4 border-t border-gray-200 bg-[#f8f9fa] flex gap-2">
                                <button class="bg-[#0078d4] text-white px-4 py-1 rounded text-xs hover:bg-[#005a9e]" onclick="BossMode.instance.replyEmail()"><i class="fas fa-reply"></i> Reply</button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    getChatContent() {
        const msgs = this.chatHistory[this.activeChannel] || [];
        return `
            <div class="absolute top-4 left-4 right-4 bottom-16 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-400 animate-pop-in">
                <div class="bg-[#464775] text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm">
                    <div class="flex items-center gap-4"><i class="fas fa-comments"></i> <span class="font-bold text-sm">Teams</span></div>
                    <div class="flex gap-3"><i class="fas fa-times cursor-pointer hover:bg-red-500 px-2" onclick="BossMode.instance.closeWindow()"></i></div>
                </div>
                <div class="flex-1 flex bg-[#f5f5f5] overflow-hidden">
                    <div class="w-64 bg-[#f0f0f0] border-r border-[#d0d0d0] flex flex-col p-2">
                        <div class="p-2 rounded hover:bg-white cursor-pointer ${this.activeChannel === 'general' ? 'bg-white shadow-sm' : ''}" onclick="BossMode.instance.switchChannel('general')"># general</div>
                        <div class="p-2 rounded hover:bg-white cursor-pointer ${this.activeChannel === 'random' ? 'bg-white shadow-sm' : ''}" onclick="BossMode.instance.switchChannel('random')"># random</div>
                    </div>
                    <div class="flex-1 flex flex-col bg-white">
                        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4" id="chat-msgs">
                            ${msgs.map(m => `
                                <div class="flex gap-3">
                                    <div class="w-8 h-8 rounded bg-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">${m.user.charAt(0)}</div>
                                    <div>
                                        <div class="flex gap-2 items-baseline">
                                            <span class="font-bold text-sm text-gray-800">${m.user}</span>
                                            <span class="text-[10px] text-gray-500">${m.time}</span>
                                        </div>
                                        <div class="text-sm text-gray-700">${m.text}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="p-4 border-t border-gray-200">
                            <input id="chat-input" class="w-full border border-gray-300 rounded p-2 outline-none text-sm" placeholder="Type a message..." autocomplete="off" onkeydown="if(event.key==='Enter') BossMode.instance.sendChat()">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getTerminalContent() {
        return `
            <div class="absolute top-4 left-4 right-4 bottom-16 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-400 animate-pop-in">
                <div class="bg-gray-900 text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm">
                    <span class="font-bold text-sm">Administrator: Command Prompt</span>
                    <i class="fas fa-times cursor-pointer hover:bg-red-500 px-2" onclick="BossMode.instance.closeWindow()"></i>
                </div>
                <div class="flex-1 bg-black p-2 font-mono text-green-500 text-sm overflow-y-auto cursor-text" onclick="document.getElementById('term-input').focus()">
                    <div id="term-output">
                        ${this.termHistory.map(l => `<div>${l.replace(/</g, "&lt;")}</div>`).join('')}
                    </div>
                    <div class="flex">
                        <span>C:\\Users\\${this.user.name.replace(' ', '')}&gt;</span>
                        <input id="term-input" class="bg-transparent border-none outline-none text-green-500 flex-1 ml-1" autocomplete="off" autofocus onkeydown="if(event.key==='Enter') BossMode.instance.runTerminalCommand(this.value)">
                    </div>
                </div>
            </div>
        `;
    }

    getEdgeContent() {
        return `
            <div class="flex flex-col h-full bg-white">
                <div class="bg-gray-100 p-2 border-b flex gap-2 items-center">
                    <i class="fas fa-arrow-left text-gray-400"></i>
                    <i class="fas fa-arrow-right text-gray-400"></i>
                    <i class="fas fa-redo text-gray-600"></i>
                    <div class="flex-1 bg-white border border-gray-300 rounded-full px-4 py-1 text-xs text-gray-600 flex items-center">
                        <i class="fas fa-lock text-green-500 mr-2"></i> https://intranet.corp/portal
                    </div>
                </div>
                <div class="flex-1 bg-gray-50 p-10 flex flex-col items-center overflow-y-auto">
                    <div class="w-full max-w-4xl">
                        <h1 class="text-3xl font-light mb-8 text-blue-800">Company Portal</h1>
                        <div class="grid grid-cols-3 gap-6">
                            <div class="bg-white p-6 shadow rounded border-t-4 border-blue-500">
                                <h3 class="font-bold mb-2">Announcements</h3>
                                <p class="text-xs text-gray-600">The refrigerator clean-out is scheduled for Friday. Unlabeled items will be incinerated.</p>
                            </div>
                            <div class="bg-white p-6 shadow rounded border-t-4 border-green-500">
                                <h3 class="font-bold mb-2">Stock Price</h3>
                                <div class="text-2xl font-bold text-green-600">▲ 142.05 USD</div>
                            </div>
                            <div class="bg-white p-6 shadow rounded border-t-4 border-red-500 cursor-pointer" onclick="alert('Access Denied: Clearance Level Low')">
                                <h3 class="font-bold mb-2">Payroll</h3>
                                <p class="text-xs text-gray-600">View payslips (Restricted).</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getSpotifyContent() {
        return `
            <div class="flex flex-col h-full items-center justify-center text-white">
                <i class="fab fa-spotify text-6xl text-green-500 mb-6"></i>
                <div class="text-2xl font-bold mb-2">${this.currentTrack}</div>
                <div class="text-gray-400 mb-8">Boss Mode Playlist</div>
                <div class="flex gap-6 text-3xl">
                    <i class="fas fa-backward cursor-pointer hover:text-green-500"></i>
                    <i class="fas ${this.isPlayingMusic ? 'fa-pause' : 'fa-play'} cursor-pointer hover:text-green-500" onclick="BossMode.instance.toggleMusic()"></i>
                    <i class="fas fa-forward cursor-pointer hover:text-green-500"></i>
                </div>
            </div>
        `;
    }

    // =================================================================================
    //  EXCEL LOGIC (Grid, Formulas, Games, DCF)
    // =================================================================================

    initExcelGrid() {
        const grid = document.getElementById('boss-grid');
        if (!grid) return;
        
        const cols = 15;
        const rows = 30;
        
        // Setup Headers
        const colHeaders = document.getElementById('boss-col-headers');
        const rowHeaders = document.getElementById('boss-row-headers');
        
        if (colHeaders && rowHeaders) {
            colHeaders.innerHTML = ''; rowHeaders.innerHTML = '';
            for(let c=0; c<cols; c++) {
                const d = document.createElement('div');
                d.className = "flex-1 border-r border-[#c8c6c4] flex items-center justify-center min-w-[80px]";
                d.textContent = String.fromCharCode(65+c);
                colHeaders.appendChild(d);
            }
            for(let r=1; r<=rows; r++) {
                const d = document.createElement('div');
                d.className = "h-[24px] border-b border-[#c8c6c4] flex items-center justify-center";
                d.textContent = r;
                rowHeaders.appendChild(d);
            }
        }

        // Setup Grid
        grid.style.gridTemplateColumns = `repeat(${cols}, 80px)`;
        grid.style.gridTemplateRows = `repeat(${rows}, 24px)`;
        grid.innerHTML = '';

        for (let r=1; r<=rows; r++) {
            for (let c=0; c<cols; c++) {
                const char = String.fromCharCode(65 + c);
                const id = `${char}${r}`;
                const cell = document.createElement('div');
                cell.id = `cell-${id}`;
                cell.dataset.id = id;
                cell.className = "border-r border-b border-[#e1dfdd] px-1 overflow-hidden whitespace-nowrap text-[11px] hover:bg-gray-50 cursor-cell bg-white relative";
                cell.onclick = () => this.selectCell(id);
                cell.ondblclick = () => document.getElementById('boss-formula-input').focus();
                grid.appendChild(cell);
            }
        }

        // Input binding
        const input = document.getElementById('boss-formula-input');
        if(input) {
            input.onkeydown = (e) => {
                if(e.key === 'Enter') { this.commitEdit(input.value); input.blur(); }
            };
        }

        this.updateExcelGrid();
    }

    generateExcelData() {
        this.excelData = {};
        this.setCell("A1", "Financial Projections", null, true);
        this.setCell("A2", "Revenue", null, true); this.setCell("B2", 15000);
        this.setCell("A3", "Costs", null, true); this.setCell("B3", 8000);
        this.setCell("A4", "Profit", null, true); this.setCell("B4", 0, "=B2-B3", true);
        if(this.activeApp === 'excel') this.updateExcelGrid();
    }

    generateDCF() {
        this.excelData = {};
        const fmt = (n) => n.toLocaleString(undefined, {minimumFractionDigits:1, maximumFractionDigits:1});
        
        // Header
        this.setCell("A1", "Discounted Cash Flow Model", null, true, "14px");
        [2023,2024,2025,2026,2027].forEach((y,i) => this.setCell(`${String.fromCharCode(67+i)}2`, y, null, true));
        
        // Assumptions
        this.setCell("A4", "Revenue Growth", null, true); this.setCell("C4", "5.0%", null, false, null, "text-blue-600");
        this.setCell("A5", "WACC", null, true); this.setCell("C5", "8.5%", null, false, null, "text-blue-600");

        // Logic
        let rev = 1000;
        for(let i=0; i<5; i++) {
            const c = String.fromCharCode(67+i);
            rev = rev * 1.05;
            this.setCell(`${c}7`, fmt(rev)); // Revenue Row
            this.setCell(`${c}8`, fmt(rev*0.2)); // FCF Row
        }
        this.setCell("A7", "Revenue");
        this.setCell("A8", "Unlevered FCF");
        this.setCell("A10", "Enterprise Value", null, true);
        this.setCell("C10", "$4,250.5", null, true, null, "bg-yellow-50 border-t border-double border-black");

        this.updateExcelGrid();
        this.soundManager.playSound('click');
    }

    setCell(id, value, formula = null, bold = false, fontSize = null, classes = '') {
        this.excelData[id] = { value, formula, bold, fontSize, classes };
    }

    updateExcelGrid() {
        // Calculate formulas (simple pass)
        for(let id in this.excelData) {
            const cell = this.excelData[id];
            if(cell.formula && cell.formula.startsWith('=')) {
                // Very basic parser logic for demo
                if(cell.formula.includes('-')) {
                    const parts = cell.formula.substring(1).split('-');
                    const v1 = this.excelData[parts[0]]?.value || 0;
                    const v2 = this.excelData[parts[1]]?.value || 0;
                    cell.value = v1 - v2;
                }
            }
        }

        // Render
        const cells = document.querySelectorAll('[id^="cell-"]');
        cells.forEach(el => {
            const id = el.dataset.id;
            const data = this.excelData[id];
            
            // Reset Style
            el.textContent = '';
            el.className = "border-r border-b border-[#e1dfdd] px-1 overflow-hidden whitespace-nowrap text-[11px] hover:bg-gray-50 cursor-cell bg-white relative";
            el.style = "";

            if(data) {
                el.textContent = data.value;
                if(data.bold) el.classList.add('font-bold');
                if(data.fontSize) el.style.fontSize = data.fontSize;
                if(data.classes) data.classes.split(' ').forEach(c => el.classList.add(c));
            }

            // Game Overlays
            if(this.snakeGame) this.renderSnakeCell(el, id);
            if(this.flightGame) this.renderFlightCell(el, id);
        });
    }

    selectCell(id) {
        if(this.selectedCell) {
            const old = document.getElementById(`cell-${this.selectedCell}`);
            if(old) old.classList.remove('outline', 'outline-2', 'outline-[#217346]', 'z-10');
        }
        this.selectedCell = id;
        const el = document.getElementById(`cell-${id}`);
        if(el) el.classList.add('outline', 'outline-2', 'outline-[#217346]', 'z-10');
        
        document.getElementById('boss-cell-addr').textContent = id;
        const d = this.excelData[id];
        document.getElementById('boss-formula-input').value = d ? (d.formula || d.value) : '';
    }

    commitEdit(val) {
        if(!this.selectedCell) return;
        const upper = val.toUpperCase();
        if(upper === '=SNAKE()') { this.startSnakeGame(); return; }
        if(upper === '=FLIGHT()') { this.startFlightGame(); return; }
        this.setCell(this.selectedCell, val);
        this.updateExcelGrid();
    }

    openChart() {
        const canvas = document.createElement('canvas');
        canvas.width = 400; canvas.height = 300;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white'; ctx.fillRect(0,0,400,300);
        ctx.fillStyle = '#4472c4';
        ctx.fillRect(50, 250, 50, -100); ctx.fillRect(150, 250, 50, -150); ctx.fillRect(250, 250, 50, -200);
        this.adsManager.createPopup("Q3 Analysis", `<img src="${canvas.toDataURL()}" class="w-full">`, "bg-white");
    }

    exportToCSV() {
        this.downloadFile("Category,Q1,Q2\nRev,100,200", "Data.csv", "text/csv");
    }

    // =================================================================================
    //  GAMES LOGIC (SNAKE, FLIGHT, MINESWEEPER, ADVENTURE)
    // =================================================================================

    // Snake
    startSnakeGame() {
        if(this.snakeGame) return;
        this.snakeGame = { snake: [{c:5,r:5}], dir: {c:1,r:0}, food: {c:10,r:10}, interval: setInterval(()=>this.tickSnake(), 150) };
    }
    tickSnake() {
        if(!this.snakeGame) return;
        const h = {...this.snakeGame.snake[0]};
        h.c += this.snakeGame.dir.c; h.r += this.snakeGame.dir.r;
        if(h.c<0) h.c=14; if(h.c>14) h.c=0; if(h.r<1) h.r=30; if(h.r>30) h.r=1;
        this.snakeGame.snake.unshift(h);
        if(h.c===this.snakeGame.food.c && h.r===this.snakeGame.food.r) {
            this.soundManager.playSound('coin');
            this.snakeGame.food={c:Math.floor(Math.random()*15), r:Math.floor(Math.random()*30)+1};
        } else this.snakeGame.snake.pop();
        this.updateExcelGrid();
    }
    renderSnakeCell(el, id) {
        const c=id.charCodeAt(0)-65, r=parseInt(id.substring(1));
        if(this.snakeGame.snake.some(s=>s.c===c && s.r===r)) { el.style.backgroundColor='#217346'; el.style.color='transparent'; }
        if(this.snakeGame.food.c===c && this.snakeGame.food.r===r) el.textContent='🍎';
    }

    // Flight
    startFlightGame() {
        if(this.flightGame) return;
        this.flightGame = { x: 7, obs: [], interval: setInterval(()=>this.tickFlight(), 100) };
    }
    tickFlight() {
        if(!this.flightGame) return;
        if(Math.random()<0.1) this.flightGame.obs.push({x:Math.floor(Math.random()*15), y:30});
        this.flightGame.obs.forEach(o=>o.y--);
        this.flightGame.obs = this.flightGame.obs.filter(o=>o.y>0);
        this.updateExcelGrid();
    }
    renderFlightCell(el, id) {
        const c=id.charCodeAt(0)-65, r=parseInt(id.substring(1));
        el.style.backgroundColor='#87CEEB'; el.style.color='transparent';
        if(r===2 && c===this.flightGame.x) { el.style.backgroundColor='transparent'; el.style.color='black'; el.textContent='✈️'; }
        if(this.flightGame.obs.some(o=>o.x===c && o.y===r)) { el.style.backgroundColor='white'; el.style.borderRadius='50%'; }
    }

    // Minesweeper
    renderMinesweeper() {
        const board = document.getElementById('minesweeper-board');
        if(!board) return;
        if(this.minesweeper.grid.length===0) {
            for(let i=0;i<81;i++) this.minesweeper.grid.push({mine:Math.random()<0.15, rev:false});
        }
        board.className = "grid grid-cols-9 gap-1 bg-gray-300 p-1 border-4 border-gray-400";
        board.innerHTML = '';
        this.minesweeper.grid.forEach((cell, i) => {
            const d = document.createElement('div');
            d.className = `w-6 h-6 flex items-center justify-center text-xs font-bold cursor-pointer select-none ${cell.rev?'bg-gray-200 border border-gray-400':'bg-gray-300 border-2 border-gray-100'}`;
            if(cell.rev) {
                if(cell.mine) { d.textContent='💣'; d.className+=' bg-red-500'; }
            }
            d.onclick = () => { cell.rev=true; this.renderMinesweeper(); };
            board.appendChild(d);
        });
    }

    // Adventure (Terminal)
    runTerminalCommand(cmd) {
        this.termHistory.push(`C:\\Users\\JohnDoe> ${cmd}`);
        document.getElementById('term-input').value = '';
        const c = cmd.trim().toLowerCase();
        
        if (c === 'help') this.termHistory.push("ls, cd, ping, quest, matrix, exit");
        else if (c === 'quest') this.startAdventure();
        else if (c === 'matrix') this.startMatrixEffect();
        else if (c === 'exit') this.closeWindow();
        else if (this.adventure) this.handleAdventureCommand(c);
        else this.termHistory.push("Command not found.");
        
        this.render();
        setTimeout(() => { const term=document.getElementById('term-input'); if(term)term.focus(); }, 50);
    }

    startAdventure() {
        this.adventure = { currentRoom: 'start' };
        this.termHistory.push("--- CORP QUEST ---");
        this.termHistory.push(this.adventureData.start.text);
    }

    handleAdventureCommand(cmd) {
        const room = this.adventureData[this.adventure.currentRoom];
        if(cmd === 'n' && room.exits.north) {
            this.adventure.currentRoom = room.exits.north;
            this.termHistory.push(this.adventureData[this.adventure.currentRoom].text);
        } else if (cmd === 's' && room.exits.south) {
            this.adventure.currentRoom = room.exits.south;
            this.termHistory.push(this.adventureData[this.adventure.currentRoom].text);
        } else {
            this.termHistory.push("Can't go that way.");
        }
    }

    startMatrixEffect() {
        this.matrixInterval = setInterval(() => {
            this.termHistory.push(Math.random().toString(36).substring(2));
            if(this.termHistory.length > 20) this.termHistory.shift();
            this.render();
        }, 50);
        setTimeout(() => clearInterval(this.matrixInterval), 3000);
    }

    // =================================================================================
    //  UTILS & HELPERS
    // =================================================================================

    handleKey(e) {
        // Snake / Flight Controls
        if(this.activeApp === 'excel') {
            if(this.snakeGame) {
                const k=e.key;
                if(k==='ArrowUp') this.snakeGame.dir={c:0,r:-1};
                if(k==='ArrowDown') this.snakeGame.dir={c:0,r:1};
                if(k==='ArrowLeft') this.snakeGame.dir={c:-1,r:0};
                if(k==='ArrowRight') this.snakeGame.dir={c:1,r:0};
            }
            if(this.flightGame) {
                if(e.key==='ArrowLeft') this.flightGame.x = Math.max(0,this.flightGame.x-1);
                if(e.key==='ArrowRight') this.flightGame.x = Math.min(14,this.flightGame.x+1);
            }
        }
        // Stealth Typing
        if(this.activeApp === 'word' && this.wordStealthMode) {
            e.preventDefault();
            if(e.key.length===1 || e.key==='Enter') {
                this.docContent += this.fakeText[this.fakeTextPointer++ % this.fakeText.length];
                this.render();
            }
        }
    }

    startClippyLoop() {
        this.cleanupIntervals();
        this.clippyTimer = setInterval(() => {
            if (this.activeApp === 'excel' && Math.random() > 0.7) {
                const bubble = document.getElementById('clippy-bubble');
                if (bubble) {
                    bubble.textContent = this.clippyMessages[Math.floor(Math.random() * this.clippyMessages.length)];
                    bubble.classList.remove('hidden');
                    setTimeout(() => bubble.classList.add('hidden'), 4000);
                }
            }
        }, 15000);
    }

    toggleWordStealth() {
        this.wordStealthMode = !this.wordStealthMode;
        this.render();
    }

    cycleDoc() {
        this.docIndex = (this.docIndex + 1) % this.documents.length;
        this.docContent = this.documents[this.docIndex].content;
        this.render();
    }

    setSlide(i) { this.currentSlide = i; this.render(); }
    selectEmail(id) { this.selectedEmail = this.emails.find(e => e.id === id); this.render(); }
    replyEmail() { alert("Reply sent."); }
    switchChannel(c) { this.activeChannel = c; this.render(); }
    sendChat() {
        const inp = document.getElementById('chat-input');
        if(inp && inp.value) {
            this.chatHistory[this.activeChannel].push({user:'Me', time:'Now', text:inp.value});
            this.render();
        }
    }
    toggleMusic() { this.isPlayingMusic = !this.isPlayingMusic; this.render(); }

    downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
}
