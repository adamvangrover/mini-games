import SaveSystem from './SaveSystem.js';
import SoundManager from './SoundManager.js';
import AdsManager from './AdsManager.js';
import { EMAILS, DOCUMENTS, SLIDES, CHATS, TERMINAL_ADVENTURE, SPOTIFY_PLAYLISTS } from './BossModeContent.js';
import { MarketplaceApp, GrokApp, CloudDriveApp, SpotifyApp } from './BossModeApps.js';
import Security from './Security.js';

export default class BossModeOS {
    constructor() {
        if (BossModeOS.instance) return BossModeOS.instance;
        BossModeOS.instance = this;

        // --- System State ---
        this.isActive = false;
        this.systemState = 'boot'; // 'boot', 'login', 'desktop', 'bsod'
        this.activeApp = null; // 'excel', 'word', 'ppt', 'email', 'chat', 'edge', 'terminal', 'minesweeper', 'spotify', 'marketplace', 'grok', 'cloud'
        this.startMenuOpen = false;
        this.notificationOpen = false;
        this.wifiStrength = 3;

        // --- Managers ---
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.adsManager = AdsManager.getInstance();
        this.overlay = null;

        this.apps = {}; // Persistent app instances

        // --- User Profile ---
        this.user = {
            name: "John Doe",
            role: "Senior Risk Analyst",
            avatar: "JD",
            password: ""
        };

        // --- Wallpapers ---
        this.wallpaperIndex = 0;
        this.wallpapers = [
            'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop', // Blue Gradient
            'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop', // Mountains
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop', // Landscape
            'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop'  // Retro Grid
        ];

        // --- App Data: Excel ---
        this.excelData = {};
        this.selectedCell = null;
        this.snakeGame = null;
        this.flightGame = null;

        // --- App Data: PPT ---
        this.currentSlide = 0;
        this.slides = [...SLIDES];

        // --- App Data: Word ---
        this.docIndex = 0;
        this.docTitle = DOCUMENTS[0].title;
        this.docContent = DOCUMENTS[0].content;
        this.wordStealthMode = false;
        
        // Stealth Typing Sources
        this.stealthSource = 'corporate';
        this.stealthTexts = {
            'corporate': "The localized projections regarding the Q3 overflow indicate a substantial misalignment with the core competencies of the stakeholders. Moving forward, we must leverage our synergy to circle back on the low-hanging fruit. Let's take this offline and touch base EOD. ",
            'bible': "In the beginning God created the heaven and the earth. And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters. And God said, Let there be light: and there was light. ",
            'odyssey': "Tell me, O muse, of that ingenious hero who travelled far and wide after he had sacked the famous town of Troy. Many cities did he visit, and many were the nations with whose manners and customs he was acquainted. ",
            'code': "function optimize(x) { return x * 2; } // TODO: Refactor this mess before production. if (err) throw new Error('Kernel panic'); const matrix = new Float32Array(1024); for(let i=0; i<1024; i++) matrix[i] = Math.random(); ",
            'lorem': "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. "
        };
        this.fakeText = this.stealthTexts['corporate'];
        this.fakeTextIndex = 0;

        // --- App Data: Email ---
        this.emails = [...EMAILS];
        this.selectedEmail = this.emails[0];

        // --- App Data: Chat ---
        this.activeChannel = 'general';
        this.chatHistory = JSON.parse(JSON.stringify(CHATS));

        // --- App Data: Minesweeper ---
        this.minesweeper = { grid: [], state: 'ready', mines: 10, time: 0 };

        // --- App Data: Terminal ---
        this.termHistory = [
            "Microsoft Windows [Version 10.0.19045.3693]",
            "(c) Microsoft Corporation. All rights reserved.",
            "",
            `C:\\Users\\${this.user.name.replace(' ', '')}>`
        ];
        this.termInput = "";
        this.adventure = null;

        // --- Clippy ---
        this.clippyMessages = [
            "It looks like you're pretending to work.",
            "I can make this spreadsheet look 20% more boring.",
            "Your boss is approaching. Look busy!",
            "Don't forget to leverage the synergy.",
            "I noticed you typed '=SNAKE'. Bold strategy.",
            "Did you know 'Alt+B' is the universal symbol for productivity?"
        ];
        this.clippyTimer = null;

        this.init();
        window.BossModeOS = BossModeOS; // Expose global
    }

    init() {
        let existing = document.getElementById('boss-mode-overlay');
        if (existing) existing.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'boss-mode-overlay';
        this.overlay.className = 'hidden fixed inset-0 z-[10000] bg-black font-sans text-xs text-black flex flex-col cursor-default select-none overflow-hidden';
        document.body.appendChild(this.overlay);

        this.bindGlobalEvents();
        this.generateExcelData(); // Pre-generate
    }

    bindGlobalEvents() {
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            
            // Global Panic Key (Double Escape handled in main game, this is internal)
            if (e.key === 'Escape' && this.systemState === 'bsod') {
                this.systemState = 'boot'; // Reboot
                this.render();
                return;
            }

            this.handleKey(e);
        });
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
            this.soundManager.stopAll(); // Stop game music
            
            // If first time, do boot sequence
            if (this.systemState === 'boot') {
                this.runBootSequence();
            } else {
                this.render();
                this.startClippyLoop();
            }
        } else {
            this.overlay.classList.add('hidden');
            // Clean up intervals
            if (this.snakeGame) clearInterval(this.snakeGame.interval);
            if (this.flightGame) clearInterval(this.flightGame.interval);
            if (this.clippyTimer) clearInterval(this.clippyTimer);
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

        // Post-render initialization
        if (this.systemState === 'desktop') {
            if (this.activeApp === 'excel') this.initExcelGrid();
            if (this.activeApp === 'minesweeper') this.renderMinesweeper();
            if (this.activeApp === 'terminal') {
                const termInput = document.getElementById('term-input');
                if(termInput) termInput.focus();
            }
            if (['spotify', 'marketplace', 'grok', 'cloud'].includes(this.activeApp)) {
                const container = document.getElementById(`app-container-${this.activeApp}`);
                if (container) {
                    if (!this.apps[this.activeApp]) {
                        // Lazy init
                        if (this.activeApp === 'spotify') this.apps['spotify'] = new SpotifyApp(container, SPOTIFY_PLAYLISTS);
                        if (this.activeApp === 'marketplace') this.apps['marketplace'] = new MarketplaceApp(container);
                        if (this.activeApp === 'grok') this.apps['grok'] = new GrokApp(container);
                        if (this.activeApp === 'cloud') this.apps['cloud'] = new CloudDriveApp(container);
                    } else {
                        this.apps[this.activeApp].attach(container);
                    }
                }
            }
        }
    }

    // =================================================================================
    //  SYSTEM STATES
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
    }

    renderLogin() {
        const date = new Date();
        this.overlay.innerHTML = `
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
                        <input type="password" placeholder="PIN" class="bg-white/20 backdrop-blur border border-white/30 rounded px-3 py-2 outline-none text-white placeholder-gray-300 focus:bg-white/30 transition-all w-48 text-center" onkeydown="if(event.key==='Enter') BossModeOS.instance.login(this.value)">
                        <button class="bg-white/20 hover:bg-white/30 rounded px-3 border border-white/30 transition-all" onclick="BossModeOS.instance.login(this.previousElementSibling.value)"><i class="fas fa-arrow-right"></i></button>
                        
                        <!-- Sticky Note Hint -->
                        <div class="absolute -right-32 top-0 bg-yellow-200 text-black text-[10px] p-2 rotate-3 shadow-md font-hand w-24">
                            PIN: 1234
                        </div>
                    </div>
                    <div class="text-sm cursor-pointer hover:underline text-gray-300">I forgot my PIN</div>
                </div>

                <div class="absolute bottom-8 right-8 flex gap-4 text-2xl">
                    <i class="fas fa-wifi" title="Internet Access"></i>
                    <i class="fas fa-universal-access" title="Accessibility"></i>
                    <i class="fas fa-power-off cursor-pointer hover:text-red-400 transition-colors" onclick="BossModeOS.instance.toggle(false)"></i>
                </div>
            </div>
        `;
    }

    login(pin) {
        if(pin === '666') {
             this.systemState = 'bsod';
             this.render();
             return;
        }
        if(pin === '4242') {
             this.systemState = 'desktop';
             this.activeApp = 'minesweeper';
             this.render();
             return;
        }
        
        // Any other pin or empty works for now, but strictly 1234 is the "correct" one visually
        this.soundManager.playSound('click');
        this.systemState = 'desktop';
        if(Object.keys(this.excelData).length === 0) this.generateExcelData();
        this.render();
        this.startClippyLoop();
    }

    renderBSOD() {
        this.overlay.innerHTML = `
            <div class="w-full h-full bg-[#0078d7] text-white flex flex-col items-start justify-center p-20 cursor-none select-none font-sans">
                <div class="text-[8rem] mb-4">:(</div>
                <div class="text-3xl mb-8 max-w-4xl">Your PC ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.</div>
                <div class="text-2xl mb-8">20% complete</div>
                
                <div class="flex items-center gap-4 mt-8">
                    <div class="w-24 h-24 bg-white p-1"><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://www.youtube.com/watch?v=dQw4w9WgXcQ" class="w-full h-full"></div>
                    <div class="text-sm">
                        For more information about this issue and possible fixes, visit https://www.windows.com/stopcode<br><br>
                        If you call a support person, give them this info:<br>
                        Stop code: CRITICAL_PROCESS_DIED
                    </div>
                </div>
            </div>
        `;
        this.overlay.onclick = () => { 
            this.systemState = 'boot'; 
            this.render(); 
        };
    }

    // =================================================================================
    //  DESKTOP ENVIRONMENT
    // =================================================================================

    renderDesktop() {
        const appWindow = this.activeApp ? this.getAppWindowHtml() : '';

        this.overlay.innerHTML = `
            <div class="flex-1 relative overflow-hidden bg-cover bg-center flex flex-col transition-[background-image] duration-500" style="background-image: url('${this.wallpapers[this.wallpaperIndex]}')">
                <!-- Desktop Icons -->
                <div class="absolute top-4 left-4 grid grid-cols-1 gap-4 w-20">
                    ${this.createDesktopIcon('Recycle Bin', 'fa-trash-alt', 'text-gray-200')}
                    ${this.createDesktopIcon('Work Stuff', 'fa-folder', 'text-yellow-400')}
                    ${this.createDesktopIcon('Q3 Report', 'fa-file-excel', 'text-green-500', "BossModeOS.instance.launchApp('excel')")}
                    ${this.createDesktopIcon('Meeting Notes', 'fa-file-word', 'text-blue-500', "BossModeOS.instance.launchApp('word')")}
                    ${this.createDesktopIcon('Chrome', 'fa-chrome', 'text-red-500', "BossModeOS.instance.launchApp('edge')")}
                    ${this.createDesktopIcon('Spotify', 'fa-spotify', 'text-green-500', "BossModeOS.instance.launchApp('spotify')")}
                    ${this.createDesktopIcon('Market', 'fa-shopping-cart', 'text-red-500', "BossModeOS.instance.launchApp('marketplace')")}
                    ${this.createDesktopIcon('Grok AI', 'fa-brain', 'text-purple-500', "BossModeOS.instance.launchApp('grok')")}
                    ${this.createDesktopIcon('Cloud', 'fa-cloud', 'text-blue-400', "BossModeOS.instance.launchApp('cloud')")}
                </div>

                ${appWindow}

                ${this.startMenuOpen ? this.getStartMenuHtml() : ''}
                ${this.notificationOpen ? this.getNotificationHtml() : ''}
            </div>

            ${this.renderTaskbar()}
        `;
    }

    createDesktopIcon(name, icon, color, action = null) {
        return `
            <div class="flex flex-col items-center gap-1 group cursor-pointer w-20 text-white drop-shadow-md hover:bg-white/10 rounded p-2 transition-colors" onclick="${action ? action : ''}">
                <i class="fab ${icon} text-3xl ${color} group-hover:scale-110 transition-transform filter drop-shadow-lg"></i>
                <span class="text-[11px] text-center leading-tight line-clamp-2 text-shadow-sm font-medium">${Security.escapeHTML(name)}</span>
            </div>
        `;
    }

    renderTaskbar() {
        const apps = [
            { id: 'excel', icon: 'fa-file-excel', color: 'text-green-600', label: 'Excel' },
            { id: 'ppt', icon: 'fa-file-powerpoint', color: 'text-orange-600', label: 'PowerPoint' },
            { id: 'word', icon: 'fa-file-word', color: 'text-blue-600', label: 'Word' },
            { id: 'email', icon: 'fa-envelope', color: 'text-blue-400', label: 'Outlook' },
            { id: 'chat', icon: 'fa-comments', color: 'text-indigo-600', label: 'Teams' },
            { id: 'edge', icon: 'fa-edge', color: 'text-sky-500', label: 'Edge' },
            { id: 'terminal', icon: 'fa-terminal', color: 'text-gray-500', label: 'Terminal' },
            { id: 'minesweeper', icon: 'fa-bomb', color: 'text-black', label: 'Minesweeper' },
            { id: 'spotify', icon: 'fa-spotify', color: 'text-green-500', label: 'Spotify' },
            { id: 'marketplace', icon: 'fa-shopping-cart', color: 'text-red-500', label: 'Marketplace' },
            { id: 'grok', icon: 'fa-brain', color: 'text-purple-500', label: 'Grok AI' },
            { id: 'cloud', icon: 'fa-cloud', color: 'text-blue-400', label: 'Cloud Drive' }
        ];

        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const date = new Date().toLocaleDateString();

        return `
            <div class="h-10 bg-[#f3f3f3]/90 backdrop-blur-xl border-t border-gray-300 flex items-center px-2 gap-2 z-[10001] select-none shadow-lg shrink-0 justify-between">
                
                <div class="flex items-center gap-1 h-full">
                     <div id="boss-start-btn" class="h-8 w-8 hover:bg-white/50 rounded flex items-center justify-center cursor-pointer transition-colors ${this.startMenuOpen ? 'bg-white/50' : ''}" onclick="BossModeOS.instance.toggleStartMenu()">
                        <i class="fab fa-windows text-blue-500 text-lg"></i>
                    </div>
                    
                    <div class="bg-white border border-gray-300 rounded-sm h-7 flex items-center px-4 w-48 mx-2 text-gray-500 text-xs gap-2">
                        <i class="fas fa-search"></i> <span class="text-gray-400">Search</span>
                    </div>

                    ${apps.map(app => `
                        <div id="boss-switch-${app.id}" class="h-8 w-8 flex items-center justify-center rounded hover:bg-white/60 cursor-pointer transition-all relative group ${this.activeApp === app.id ? 'bg-white border-b-2 border-blue-500' : ''}" onclick="BossModeOS.instance.launchApp('${app.id}')">
                            <i class="fas ${app.icon} ${app.color} text-lg transform group-hover:-translate-y-0.5 transition-transform"></i>
                            <!-- Tooltip -->
                            <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none delay-500">
                                ${app.label}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="flex items-center gap-2 text-[11px] text-gray-700 h-full px-2">
                    <div class="hover:bg-white/50 px-1 py-0.5 rounded cursor-pointer"><i class="fas fa-chevron-up"></i></div>
                    <div class="hover:bg-white/50 px-1 py-0.5 rounded cursor-pointer"><i class="fas fa-wifi"></i></div>
                    <div class="hover:bg-white/50 px-1 py-0.5 rounded cursor-pointer"><i class="fas fa-volume-up"></i></div>
                    <div class="flex flex-col items-end leading-tight cursor-pointer hover:bg-white/50 px-2 py-0.5 rounded h-full justify-center" onclick="BossModeOS.instance.toggleNotification()">
                        <span>${time}</span>
                        <span>${date}</span>
                    </div>
                    <div class="w-1 h-full border-l border-gray-300 ml-1"></div>
                    <div class="w-2 h-full hover:bg-white/50 cursor-pointer" onclick="BossModeOS.instance.toggleNotification()"></div>
                </div>
            </div>
        `;
    }

    // =================================================================================
    //  WINDOW SYSTEM
    // =================================================================================

    launchApp(appId) {
        this.activeApp = appId;
        this.startMenuOpen = false;
        this.soundManager.playSound('click');
        this.render();
    }

    closeWindow() {
        this.activeApp = null;
        this.render();
    }

    getAppWindowHtml() {
        let content = '';
        let title = 'Application';
        let headerColor = 'bg-gray-100 text-black';

        switch(this.activeApp) {
            case 'excel': 
                return this.getExcelContent(); // Has its own header
            case 'word': 
                return this.getWordContent(); // Has its own header
            case 'ppt':
                return this.getPPTContent(); // Has its own header
            case 'email':
                return this.getEmailContent(); // Has its own header
            case 'chat':
                return this.getChatContent(); // Has its own header
            case 'terminal':
                return this.getTerminalContent(); // Has its own header
            case 'edge':
                title = 'Edge - Intranet';
                content = this.getEdgeContent();
                break;
            case 'minesweeper':
                title = 'Minesweeper';
                content = `<div class="flex-1 flex items-center justify-center bg-[#c0c0c0] p-4"><div id="minesweeper-board" class="border-4 border-gray-400 bg-gray-300"></div></div>`;
                break;
            case 'spotify': title = 'Spotify'; content = '<div id="app-container-spotify" class="h-full"></div>'; break;
            case 'marketplace': title = 'Marketplace'; content = '<div id="app-container-marketplace" class="h-full"></div>'; break;
            case 'grok': title = 'Grok AI'; content = '<div id="app-container-grok" class="h-full"></div>'; break;
            case 'cloud': title = 'Cloud Drive'; content = '<div id="app-container-cloud" class="h-full"></div>'; break;
        }

        // Generic Window Wrapper for apps that don't draw their own headers (Edge, Minesweeper)
        return `
            <div class="absolute top-4 left-4 right-4 bottom-16 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-400 animate-pop-in">
                <div class="${headerColor} h-8 flex items-center justify-between px-3 select-none shrink-0 border-b border-gray-200">
                    <div class="flex items-center gap-3">
                        <span class="font-bold text-xs">${title}</span>
                    </div>
                    <div class="flex items-center gap-4 text-xs opacity-80">
                        <i class="fas fa-minus hover:opacity-100 cursor-pointer"></i>
                        <i class="fas fa-window-maximize hover:opacity-100 cursor-pointer"></i>
                        <i class="fas fa-times hover:bg-red-500 hover:text-white p-1 px-2 rounded cursor-pointer transition-colors" onclick="BossModeOS.instance.closeWindow()"></i>
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

    toggleStartMenu() { this.startMenuOpen = !this.startMenuOpen; this.notificationOpen = false; this.render(); }
    toggleNotification() { this.notificationOpen = !this.notificationOpen; this.startMenuOpen = false; this.render(); }

    getStartMenuHtml() {
        return `
            <div class="absolute bottom-11 left-2 w-72 bg-[#f2f2f2]/95 backdrop-blur-xl shadow-2xl rounded-t-lg border border-gray-300 flex flex-col z-50 animate-slide-up origin-bottom-left" style="height: 400px;">
                 <div class="p-4 flex-1">
                      <div class="font-bold text-gray-700 mb-2">Pinned</div>
                      <div class="grid grid-cols-4 gap-2">
                           ${['excel','word','email','ppt'].map(app => `
                               <div class="flex flex-col items-center gap-1 hover:bg-white/50 p-2 rounded cursor-pointer" onclick="BossModeOS.instance.launchApp('${app}')">
                                    <i class="fas fa-file-${app==='email'?'alt':app} text-2xl text-gray-700"></i>
                                    <span class="text-[9px] capitalize">${app}</span>
                               </div>
                           `).join('')}
                      </div>
                      <div class="font-bold text-gray-700 mt-4 mb-2">Recommended</div>
                      <div class="flex flex-col gap-1">
                           <div class="flex items-center gap-3 p-2 hover:bg-white/50 rounded cursor-pointer">
                                <i class="fas fa-file-pdf text-red-600"></i>
                                <div class="flex flex-col">
                                     <span class="font-bold text-gray-800">Q3_Budget_Final.pdf</span>
                                     <span class="text-gray-500 text-[9px]">2h ago</span>
                                </div>
                           </div>
                      </div>
                 </div>
                 <div class="bg-[#e6e6e6] p-3 flex justify-between items-center border-t border-gray-300 rounded-b-lg">
                      <div class="flex items-center gap-2 hover:bg-white/50 p-1 rounded cursor-pointer">
                           <div class="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">JD</div>
                           <span class="font-bold text-gray-700">John Doe</span>
                      </div>
                      <i class="fas fa-power-off hover:bg-white/50 p-2 rounded cursor-pointer text-gray-600" onclick="BossModeOS.instance.toggle(false)"></i>
                 </div>
            </div>
        `;
    }

    getNotificationHtml() {
        return `
            <div class="absolute bottom-11 right-0 w-80 bg-[#f2f2f2]/95 backdrop-blur-xl shadow-2xl border-l border-gray-300 h-full max-h-[600px] flex flex-col z-50 animate-slide-left">
                 <div class="p-3 border-b border-gray-300 flex justify-between items-center">
                      <span class="font-bold text-gray-700">Notifications</span>
                      <span class="text-blue-600 cursor-pointer text-[10px]">Clear all</span>
                 </div>
                 <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                      <div class="bg-white p-2 rounded shadow-sm border border-gray-200">
                           <div class="flex items-center gap-2 mb-1">
                                <i class="fas fa-envelope text-blue-400"></i>
                                <span class="font-bold text-[10px] text-gray-600">Outlook</span>
                                <span class="text-[9px] text-gray-400 ml-auto">Now</span>
                           </div>
                           <div class="font-bold text-gray-800">New Email from HR</div>
                           <div class="text-gray-600">Mandatory Fun Day requires your attention...</div>
                      </div>
                 </div>
                 <div class="bg-[#e6e6e6] p-3 grid grid-cols-4 gap-2 border-t border-gray-300">
                      <div class="bg-white p-2 rounded flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-gray-100" onclick="BossModeOS.instance.cycleWallpaper()">
                           <i class="fas fa-image text-purple-600"></i>
                           <span class="text-[9px]">Wallpaper</span>
                      </div>
                 </div>
            </div>
        `;
    }

    cycleWallpaper() {
        this.wallpaperIndex = (this.wallpaperIndex + 1) % this.wallpapers.length;
        this.render();
    }

    // =================================================================================
    //  APPS
    // =================================================================================

    getExcelContent() {
        // Renders a full window structure for Excel to maintain specific styling
        return `
            <div class="absolute top-4 left-4 right-4 bottom-16 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-400 animate-pop-in">
                <div class="bg-[#217346] text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm relative z-30">
                    <div class="flex items-center gap-4">
                        <i class="fas fa-file-excel"></i>
                        <span class="font-bold text-sm truncate">Financial_Projections.xlsx</span>
                    </div>
                    <div class="flex gap-3 text-white/80">
                         <i class="fas fa-minus cursor-pointer hover:text-white"></i>
                         <i class="fas fa-window-maximize cursor-pointer hover:text-white"></i>
                         <i class="fas fa-times cursor-pointer hover:bg-red-500 px-2 transition-colors" onclick="BossModeOS.instance.closeWindow()"></i>
                    </div>
                </div>

                <div class="bg-[#f3f2f1] border-b border-[#e1dfdd] flex flex-col shadow-sm select-none z-20 relative">
                    <div class="bg-[#f3f2f1] px-2 py-1 flex gap-2 h-14 items-center border-b border-[#c8c6c4]">
                        <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px]" onclick="BossModeOS.instance.generateExcelData()">
                            <i class="fas fa-sync-alt text-green-600 text-xl"></i> <span>Refresh</span>
                        </button>
                        <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px]" onclick="BossModeOS.instance.openChart()">
                            <i class="fas fa-chart-bar text-blue-600 text-xl"></i> <span>Chart</span>
                        </button>
                        <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px]" onclick="BossModeOS.instance.exportToCSV()">
                            <i class="fas fa-file-csv text-green-700 text-xl"></i> <span>CSV</span>
                        </button>
                    </div>
                </div>

                <div class="bg-white border-b border-[#e1dfdd] flex items-center px-2 py-1 gap-2 h-8 shadow-inner z-10">
                    <div id="boss-cell-addr" class="bg-white border border-[#e1dfdd] px-2 w-16 text-center text-gray-600 font-bold text-sm flex items-center justify-center h-6">A1</div>
                    <input id="boss-formula-input" class="bg-white border-none flex-1 px-2 font-mono text-gray-800 outline-none h-full text-sm" value="">
                </div>

                <div class="flex-1 flex overflow-hidden relative bg-[#e1dfdd]">
                     <div id="boss-row-headers" class="w-10 bg-[#f3f2f1] border-r border-[#c8c6c4] flex flex-col text-center text-gray-500 select-none overflow-hidden pt-[24px] text-[11px]"></div>
                     <div class="flex-1 flex flex-col overflow-hidden relative">
                        <div id="boss-col-headers" class="h-6 bg-[#f3f2f1] border-b border-[#c8c6c4] flex text-gray-500 font-bold select-none pr-4 text-[11px]"></div>
                        <div id="boss-grid-scroll" class="flex-1 overflow-auto bg-white relative">
                            <div id="boss-grid" class="grid relative select-none"></div>
                        </div>
                     </div>
                     <div id="clippy-container" class="absolute bottom-4 right-4 cursor-pointer transition-transform hover:scale-105 z-50">
                        <div id="clippy-bubble" class="absolute -top-16 -left-32 w-40 bg-[#ffffe1] border border-black p-2 text-[10px] rounded shadow-lg hidden"></div>
                        <div class="text-4xl animate-bounce" style="animation-duration: 3s;">📎</div>
                     </div>
                </div>

                <div class="bg-[#f3f2f1] border-t border-[#c8c6c4] flex items-center justify-between px-2 py-0.5 text-gray-600 text-[11px] h-6 select-none z-20">
                     <span class="text-[#217346] font-bold">Ready</span>
                     <div class="flex gap-4 items-center">
                        <span>Sum: <span id="boss-sum-display">-</span></span>
                     </div>
                </div>
            </div>
        `;
    }

    getPPTContent() {
        return `
            <div class="absolute top-4 left-4 right-4 bottom-16 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-400 animate-pop-in">
                <div class="bg-[#b7472a] text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm">
                    <div class="flex items-center gap-4">
                        <i class="fas fa-file-powerpoint"></i>
                        <span class="font-bold text-sm">Q3_Synergy_Deck.pptx</span>
                    </div>
                    <div class="flex gap-3 text-white/80"><i class="fas fa-times cursor-pointer hover:bg-red-500 px-2" onclick="BossModeOS.instance.closeWindow()"></i></div>
                </div>
                <div class="bg-[#f3f2f1] px-2 py-1 flex gap-2 h-12 items-center border-b border-[#c8c6c4]">
                     <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px]" onclick="BossModeOS.instance.addSlide()">
                        <i class="fas fa-plus-square text-orange-600 text-lg"></i> <span>New Slide</span>
                     </button>
                     <div class="border-l border-gray-300 h-8 mx-1"></div>
                     <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px]" onclick="BossModeOS.instance.exportToPPT()">
                        <i class="fas fa-file-export text-orange-600 text-lg"></i> <span>Export</span>
                     </button>
                </div>
                <div class="flex-1 flex bg-[#d0cec9] overflow-hidden">
                    <div class="w-48 bg-[#e1dfdd] border-r border-[#c8c6c4] overflow-y-auto flex flex-col gap-4 p-4">
                        ${this.slides.map((slide, i) => `
                            <div class="bg-white aspect-video shadow-md p-2 flex flex-col gap-1 cursor-pointer ${i === this.currentSlide ? 'ring-2 ring-[#b7472a]' : 'hover:ring-1 hover:ring-gray-400'}" onclick="BossModeOS.instance.setSlide(${i})">
                                <div class="h-1 w-8 bg-gray-300 mb-1"></div>
                                <div class="text-[9px] font-bold text-gray-600 truncate">${Security.escapeHTML(slide.title)}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="flex-1 flex items-center justify-center p-8 bg-[#d0cec9]">
                        <div class="bg-white aspect-[16/9] w-full max-w-4xl shadow-2xl flex flex-col p-12 relative">
                            <h1 class="text-4xl font-bold text-gray-800 mb-8 border-b-4 border-[#b7472a] pb-2 outline-none" contenteditable="true" oninput="BossModeOS.instance.updateSlideTitle(this.innerText)">${Security.escapeHTML(this.slides[this.currentSlide].title)}</h1>
                            <ul class="list-disc list-inside text-2xl text-gray-600 space-y-4 outline-none" contenteditable="true" oninput="BossModeOS.instance.updateSlideBullets(this)">
                                ${this.slides[this.currentSlide].bullets.map(b => `<li>${Security.escapeHTML(b)}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getWordContent() {
        return `
            <div class="absolute top-4 left-4 right-4 bottom-16 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-400 animate-pop-in">
                <div class="bg-[#2b579a] text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm">
                    <div class="flex items-center gap-4">
                        <i class="fas fa-file-word"></i>
                        <span class="font-bold text-sm">${Security.escapeHTML(this.docTitle)}</span>
                    </div>
                    <div class="flex gap-3 text-white/80"><i class="fas fa-times cursor-pointer hover:bg-red-500 px-2" onclick="BossModeOS.instance.closeWindow()"></i></div>
                </div>
                <div class="bg-[#f3f2f1] px-2 py-1 flex gap-2 h-14 items-center border-b border-[#c8c6c4]">
                     <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px]" onclick="BossModeOS.instance.cycleDoc()">
                        <i class="fas fa-folder-open text-blue-800 text-xl"></i> <span>Open</span>
                     </button>
                     <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px]" onclick="BossModeOS.instance.exportToDoc()">
                        <i class="fas fa-save text-blue-800 text-xl"></i> <span>Save</span>
                     </button>
                     
                     <div class="border-l border-gray-300 h-8 mx-1"></div>
                     
                     <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px] ${this.wordStealthMode ? 'bg-gray-300 shadow-inner' : ''}" onclick="BossModeOS.instance.toggleWordStealth()">
                        <i class="fas fa-user-secret text-black text-xl"></i> <span>Stealth</span>
                     </button>
                     
                     <div class="flex flex-col gap-0.5 justify-center">
                        <label class="text-[9px] text-gray-500 font-bold">STEALTH SOURCE</label>
                        <select class="text-[10px] border border-gray-300 rounded p-0.5 outline-none" onchange="BossModeOS.instance.setStealthSource(this.value)">
                            <option value="corporate" ${this.stealthSource === 'corporate' ? 'selected' : ''}>Corporate Lingo</option>
                            <option value="bible" ${this.stealthSource === 'bible' ? 'selected' : ''}>The Bible (Genesis)</option>
                            <option value="odyssey" ${this.stealthSource === 'odyssey' ? 'selected' : ''}>The Odyssey</option>
                            <option value="code" ${this.stealthSource === 'code' ? 'selected' : ''}>JavaScript Code</option>
                            <option value="lorem" ${this.stealthSource === 'lorem' ? 'selected' : ''}>Lorem Ipsum</option>
                        </select>
                     </div>
                </div>
                <div class="flex-1 bg-[#d0cec9] overflow-y-auto flex justify-center p-8">
                     <div class="bg-white w-[21cm] min-h-[29.7cm] shadow-2xl p-[2.54cm] text-black font-serif text-sm leading-relaxed outline-none" contenteditable="true" spellcheck="false" id="word-doc-content" oninput="BossModeOS.instance.updateDocContent(this.innerText)">
                        <p class="mb-4 text-center font-bold text-lg underline">INTERNAL MEMORANDUM</p>
                        ${Security.escapeHTML(this.docContent).replace(/\n/g, '<br>')}
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
                    <div class="flex items-center gap-4">
                        <i class="fas fa-envelope"></i>
                        <span class="font-bold text-sm">Outlook - Inbox (${this.emails.length})</span>
                    </div>
                    <div class="flex gap-3 text-white/80"><i class="fas fa-times cursor-pointer hover:bg-red-500 px-2" onclick="BossModeOS.instance.closeWindow()"></i></div>
                </div>
                <div class="flex-1 flex bg-white overflow-hidden">
                    <div class="w-64 bg-[#f0f0f0] border-r border-[#d0d0d0] flex flex-col hidden sm:flex">
                        <div class="p-2 font-bold text-gray-700 text-sm">Favorites</div>
                        <div class="pl-4 py-1 text-xs hover:bg-gray-200 cursor-pointer font-bold">Inbox <span class="text-blue-600 font-bold ml-1">${this.emails.length}</span></div>
                        <div class="pl-4 py-1 text-xs hover:bg-gray-200 cursor-pointer">Sent Items</div>
                    </div>
                    <div class="w-80 border-r border-[#d0d0d0] flex flex-col overflow-y-auto bg-white">
                        ${this.emails.map(email => `
                            <div class="border-b border-gray-200 p-3 cursor-pointer hover:bg-[#cde6f7] ${selected && selected.id === email.id ? 'bg-[#cde6f7] border-l-4 border-l-[#0078d4]' : ''}" onclick="BossModeOS.instance.selectEmail(${email.id})">
                                <div class="flex justify-between items-baseline mb-1">
                                    <span class="font-bold text-sm text-gray-800 truncate">${Security.escapeHTML(email.from)}</span>
                                    <span class="text-[10px] text-gray-500 whitespace-nowrap ml-2">${Security.escapeHTML(email.time)}</span>
                                </div>
                                <div class="text-xs text-[#0078d4] font-semibold mb-1 truncate">${Security.escapeHTML(email.subject)}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="flex-1 flex flex-col bg-white">
                        ${selected ? `
                            <div class="border-b border-gray-200 p-4 bg-[#f8f9fa]">
                                <h2 class="text-xl font-bold text-gray-800 mb-2">${Security.escapeHTML(selected.subject)}</h2>
                                <div class="text-sm font-bold text-gray-700">${Security.escapeHTML(selected.from)}</div>
                            </div>
                            <div class="flex-1 p-6 text-sm text-gray-800 leading-relaxed overflow-y-auto whitespace-pre-wrap font-serif">${Security.escapeHTML(selected.body)}</div>
                            <div class="p-4 border-t border-gray-200 bg-[#f8f9fa] flex gap-2">
                                <button class="bg-[#0078d4] text-white px-4 py-1 rounded text-xs" onclick="BossModeOS.instance.replyEmail()"><i class="fas fa-reply"></i> Reply</button>
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
                    <div class="flex items-center gap-4">
                        <i class="fas fa-comments"></i>
                        <span class="font-bold text-sm">Teams</span>
                    </div>
                    <div class="flex gap-3 text-white/80"><i class="fas fa-times cursor-pointer hover:bg-red-500 px-2" onclick="BossModeOS.instance.closeWindow()"></i></div>
                </div>
                <div class="flex-1 flex bg-[#f5f5f5] overflow-hidden">
                    <div class="w-64 bg-[#f0f0f0] border-r border-[#d0d0d0] flex flex-col">
                        <div class="p-3 font-bold text-xs uppercase tracking-wide opacity-70">Teams</div>
                        <div class="px-2">
                            <div class="p-2 rounded hover:bg-white cursor-pointer ${this.activeChannel === 'general' ? 'bg-white shadow-sm' : ''}" onclick="BossModeOS.instance.switchChannel('general')"># general</div>
                            <div class="p-2 rounded hover:bg-white cursor-pointer ${this.activeChannel === 'random' ? 'bg-white shadow-sm' : ''}" onclick="BossModeOS.instance.switchChannel('random')"># random</div>
                        </div>
                    </div>
                    <div class="flex-1 flex flex-col bg-white">
                        <div class="p-3 border-b border-gray-200 font-bold text-gray-700">#${this.activeChannel}</div>
                        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4" id="chat-msgs">
                            ${msgs.map(m => `
                                <div class="flex gap-3">
                                    <div class="w-8 h-8 rounded bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">${m.user.charAt(0)}</div>
                                    <div>
                                        <div class="flex gap-2 items-baseline">
                                            <span class="font-bold text-sm text-gray-800">${Security.escapeHTML(m.user)}</span>
                                            <span class="text-[10px] text-gray-500">${Security.escapeHTML(m.time)}</span>
                                        </div>
                                        <div class="text-sm text-gray-700">${Security.escapeHTML(m.text)}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="p-4 border-t border-gray-200">
                            <div class="border border-gray-300 rounded p-2 flex gap-2">
                                <input id="chat-input" class="flex-1 outline-none text-sm" placeholder="Type a message..." autocomplete="off">
                                <button class="text-[#464775] p-1" onclick="BossModeOS.instance.sendChat()"><i class="fas fa-paper-plane"></i></button>
                            </div>
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
                    <i class="fas fa-times cursor-pointer hover:bg-red-500 px-2" onclick="BossModeOS.instance.closeWindow()"></i>
                </div>
                <div class="flex-1 bg-black p-2 font-mono text-green-500 text-sm overflow-y-auto cursor-text" onclick="document.getElementById('term-input').focus()">
                    <div id="term-output">
                        ${this.termHistory.map(l => `<div>${Security.escapeHTML(l)}</div>`).join('')}
                    </div>
                    <div class="flex">
                        <span>C:\\Users\\JohnDoe&gt;</span>
                        <input id="term-input" class="bg-transparent border-none outline-none text-green-500 flex-1 ml-1" autocomplete="off" autofocus onkeydown="if(event.key==='Enter') BossModeOS.instance.runTerminalCommand(this.value)">
                    </div>
                </div>
            </div>
        `;
    }

    getEdgeContent() {
        return `
            <div class="flex flex-col h-full bg-white">
                <div class="bg-[#f7f7f7] flex items-center px-2 pt-2 gap-2 border-b">
                    <div class="bg-white px-3 py-1 rounded-t shadow-sm text-xs flex items-center gap-2 w-48 border-t border-l border-r">
                        <i class="fas fa-globe text-blue-500"></i> Corporate Intranet
                    </div>
                </div>
                <div class="bg-white border-b p-2 flex gap-2 items-center">
                    <i class="fas fa-arrow-left text-gray-400"></i>
                    <i class="fas fa-arrow-right text-gray-400"></i>
                    <i class="fas fa-redo text-gray-600"></i>
                    <div class="flex-1 bg-gray-100 rounded-full px-4 py-1 text-xs text-gray-600 flex items-center">
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
                            <div class="bg-white p-6 shadow rounded border-t-4 border-red-500 cursor-pointer" onclick="alert('Access Denied: You do not have clearance.')">
                                <h3 class="font-bold mb-2">Payroll</h3>
                                <p class="text-xs text-gray-600">View your payslips and tax documents.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderMinesweeper() {
        const board = document.getElementById('minesweeper-board');
        if(!board) return;
        
        if(this.minesweeper.grid.length === 0) {
            for(let i=0; i<81; i++) this.minesweeper.grid.push({mine: Math.random() < 0.15, revealed: false, flagged: false});
        }

        board.className = "grid grid-cols-9 gap-1 bg-gray-300 p-1 border-4 border-gray-400";
        board.innerHTML = '';
        
        this.minesweeper.grid.forEach((cell, idx) => {
            const div = document.createElement('div');
            div.className = `w-6 h-6 flex items-center justify-center text-xs font-bold cursor-pointer select-none ${cell.revealed ? 'bg-gray-200 border border-gray-400' : 'bg-gray-300 border-t-2 border-l-2 border-white border-b-2 border-r-2 border-gray-500'}`;
            
            if(cell.revealed) {
                if(cell.mine) { div.textContent = '💣'; div.className += ' bg-red-500'; }
                else {
                   let n = 0;
                   const neighbors = [-10,-9,-8,-1,1,8,9,10];
                   neighbors.forEach(offset => {
                       const t = idx + offset;
                       // Simple bounds check approximation
                       if(t>=0 && t<81 && this.minesweeper.grid[t]?.mine) n++;
                   });
                   if(n>0) {
                       div.textContent = n;
                       const colors = ['blue','green','red','purple','maroon','turquoise','black','gray'];
                       div.style.color = colors[n-1];
                   }
                }
            } else if (cell.flagged) {
                div.textContent = '🚩';
            }

            div.onclick = () => {
                if(cell.flagged || cell.revealed) return;
                cell.revealed = true;
                if(cell.mine) { alert('BOOM!'); this.minesweeper.grid = []; this.render(); }
                else this.renderMinesweeper();
            };
            div.oncontextmenu = (e) => {
                e.preventDefault();
                if(!cell.revealed) cell.flagged = !cell.flagged;
                this.renderMinesweeper();
            }
            board.appendChild(div);
        });
    }

    // =================================================================================
    //  EXCEL LOGIC (Block 2)
    // =================================================================================

    initExcelGrid() {
        const rows = 30;
        const cols = 15;
        const grid = document.getElementById('boss-grid');
        const colHeaders = document.getElementById('boss-col-headers');
        const rowHeaders = document.getElementById('boss-row-headers');

        if(!grid) return;

        grid.style.gridTemplateColumns = `repeat(${cols}, 80px)`;
        grid.style.gridTemplateRows = `repeat(${rows}, 24px)`;

        colHeaders.innerHTML = '';
        rowHeaders.innerHTML = '';

        for (let c=0; c<cols; c++) {
            const char = String.fromCharCode(65 + c);
            const div = document.createElement('div');
            div.className = "flex-1 border-r border-[#c8c6c4] flex items-center justify-center min-w-[80px] bg-[#f3f2f1]";
            div.textContent = char;
            colHeaders.appendChild(div);
        }

        for (let r=1; r<=rows; r++) {
            const div = document.createElement('div');
            div.className = "h-[24px] border-b border-[#c8c6c4] flex items-center justify-center bg-[#f3f2f1]";
            div.textContent = r;
            rowHeaders.appendChild(div);
        }

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
                cell.ondblclick = () => this.editCell(id);
                grid.appendChild(cell);
            }
        }
        this.updateExcelGrid();
        
        // Input Binding
        const input = document.getElementById('boss-formula-input');
        if (input) {
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    this.commitEdit(input.value);
                    input.blur();
                }
            };
        }
    }

    generateExcelData() {
        this.excelData = {};
        const categories = ["Revenue", "COGS", "Gross Margin", "Opex", "R&D", "S&M", "G&A", "EBITDA", "Net Income"];

        this.setCell("A1", "Category", null, true);
        this.setCell("B1", "Q1 '24", null, true);
        this.setCell("C1", "Q2 '24", null, true);
        this.setCell("D1", "Q3 '24", null, true);
        this.setCell("E1", "Q4 '24", null, true);

        let r = 2;
        categories.forEach(cat => {
            this.setCell(`A${r}`, cat, null, true);
            for (let c=0; c<4; c++) {
                const col = String.fromCharCode(66 + c);
                const val = Math.floor(Math.random() * 50000) + 10000;
                this.setCell(`${col}${r}`, val);
            }
            r++;
        });

        this.setCell(`A${r}`, "TOTAL", null, true);
        for (let c=0; c<4; c++) {
            const col = String.fromCharCode(66 + c);
            this.setCell(`${col}${r}`, 0, `=SUM(${col}2:${col}${r-1})`);
        }
        if (this.activeApp === 'excel') this.updateExcelGrid();
    }

    setCell(id, value, formula = null, bold = false) {
        this.excelData[id] = { value, formula, bold };
    }

    updateExcelGrid() {
        for(let i=0; i<2; i++) {
            for (let id in this.excelData) {
                const cell = this.excelData[id];
                if (cell.formula) cell.value = this.evaluateFormula(cell.formula);
            }
        }

        const cells = document.querySelectorAll('[id^="cell-"]');
        cells.forEach(el => {
            const id = el.dataset.id;
            const item = this.excelData[id];
            el.textContent = '';
            el.className = "border-r border-b border-[#e1dfdd] px-1 overflow-hidden whitespace-nowrap text-[11px] hover:bg-gray-50 cursor-cell bg-white relative";

            if (item) {
                el.textContent = typeof item.value === 'number' ? item.value.toLocaleString() : item.value;
                if (item.bold) el.classList.add('font-bold');
            }
            if (this.snakeGame) this.renderSnakeCell(el, id);
            if (this.flightGame) this.renderFlightCell(el, id);
        });
    }

    evaluateFormula(f) {
        if (f.startsWith('=SUM')) {
            try {
                const range = f.match(/\((.*?)\)/)[1];
                const [start, end] = range.split(':');
                const col = start.charAt(0);
                const startRow = parseInt(start.substring(1));
                const endRow = parseInt(end.substring(1));
                let sum = 0;
                for (let i=startRow; i<=endRow; i++) {
                    const key = `${col}${i}`;
                    const val = this.excelData[key]?.value;
                    if (typeof val === 'number') sum += val;
                    else if (typeof val === 'string') sum += parseFloat(val.replace(/,/g,'')) || 0;
                }
                return sum;
            } catch(e) { return "#ERR"; }
        }
        return "#ERR";
    }

    selectCell(id) {
        if (this.selectedCell) {
            const old = document.getElementById(`cell-${this.selectedCell}`);
            if (old) old.classList.remove('outline', 'outline-2', 'outline-[#217346]', 'z-10');
        }
        this.selectedCell = id;
        const el = document.getElementById(`cell-${id}`);
        if (el) el.classList.add('outline', 'outline-2', 'outline-[#217346]', 'z-10');

        document.getElementById('boss-cell-addr').textContent = id;
        const data = this.excelData[id];
        const val = data ? (data.formula || data.value) : '';
        const input = document.getElementById('boss-formula-input');
        if(input) input.value = val;
        
        const sumDisplay = document.getElementById('boss-sum-display');
        if(sumDisplay) sumDisplay.textContent = (data && typeof data.value === 'number') ? data.value.toLocaleString() : '-';
    }

    editCell(id) {
        const input = document.getElementById('boss-formula-input');
        if(input) input.focus();
    }

    commitEdit(val) {
        if (!this.selectedCell) return;
        const upper = val.toString().toUpperCase();

        if (upper === '=SNAKE()') {
            this.startSnakeGame();
            this.setCell(this.selectedCell, "SNAKE ACTIVE");
        } else if (upper === '=FLIGHT()') {
            this.startFlightGame();
            this.setCell(this.selectedCell, "FLIGHT SIM ACTIVE");
        } else if (upper === '=GAME()') {
             this.setCell(this.selectedCell, "Nice try.");
             this.adsManager.createPopup("System Alert", "Gaming detected. Reporting to HR.", "bg-red-900 text-white");
        } else {
             if (val.startsWith('=')) this.setCell(this.selectedCell, 0, val);
             else this.setCell(this.selectedCell, isNaN(val) ? val : parseFloat(val));
        }
        this.updateExcelGrid();
    }

    exportToCSV() {
        let csv = "";
        for (let r=1; r<=30; r++) {
            let row = [];
            for (let c=0; c<15; c++) {
                const char = String.fromCharCode(65 + c);
                const id = `${char}${r}`;
                const cell = this.excelData[id];
                let val = cell ? cell.value : "";
                if (typeof val === 'string' && val.includes(',')) val = `"${val}"`;
                row.push(val);
            }
            if (row.some(x => x)) csv += row.join(",") + "\n";
        }
        this.downloadFile(csv, "Financial_Projections.csv", "text/csv");
    }

    openChart() {
         const canvas = document.createElement('canvas');
         canvas.width = 400; canvas.height = 300;
         const ctx = canvas.getContext('2d');
         ctx.fillStyle = 'white'; ctx.fillRect(0,0,400,300);
         ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
         ctx.beginPath(); ctx.moveTo(40, 260); ctx.lineTo(360, 260); ctx.lineTo(40, 40); ctx.stroke();
         
         const data = [15, 28, 22, 24]; 
         const colors = ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000'];
         let x = 60;
         data.forEach((val, i) => {
             const h = (val / 30) * 220;
             ctx.fillStyle = colors[i];
             ctx.fillRect(x, 260 - h, 50, h);
             ctx.fillStyle = '#333'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
             ctx.fillText(`Q${i+1}`, x + 25, 280);
             x += 80;
         });
         this.adsManager.createPopup("Q3 Revenue", `<img src="${canvas.toDataURL()}" style="width:100%">`, "bg-white text-black");
    }

    // =================================================================================
    //  GAMES LOGIC (Snake, Flight)
    // =================================================================================

    startSnakeGame() {
        if (this.snakeGame) return;
        this.snakeGame = {
            active: true,
            snake: [{c: 5, r: 5}, {c: 4, r: 5}, {c: 3, r: 5}],
            dir: {c: 1, r: 0},
            food: {c: 10, r: 10},
            interval: setInterval(() => this.updateSnake(), 150)
        };
    }

    updateSnake() {
        if (!this.isActive || !this.snakeGame) return;
        const head = {...this.snakeGame.snake[0]};
        head.c += this.snakeGame.dir.c;
        head.r += this.snakeGame.dir.r;
        if (head.c < 0) head.c = 14; if (head.c > 14) head.c = 0;
        if (head.r < 1) head.r = 30; if (head.r > 30) head.r = 1;

        if (this.snakeGame.snake.some(s => s.c === head.c && s.r === head.r)) {
            this.stopSnakeGame(); return;
        }

        this.snakeGame.snake.unshift(head);
        if (head.c === this.snakeGame.food.c && head.r === this.snakeGame.food.r) {
            this.soundManager.playSound('coin');
            this.snakeGame.food = { c: Math.floor(Math.random() * 15), r: Math.floor(Math.random() * 30) + 1 };
        } else {
            this.snakeGame.snake.pop();
        }
        this.updateExcelGrid();
    }

    stopSnakeGame() {
        if (this.snakeGame) {
            clearInterval(this.snakeGame.interval);
            this.snakeGame = null;
            this.soundManager.playSound('game-over');
            alert("SNAKE OVER");
            this.updateExcelGrid();
        }
    }

    renderSnakeCell(el, id) {
        const col = id.charCodeAt(0) - 65;
        const row = parseInt(id.substring(1));
        if (this.snakeGame.snake.some(s => s.c === col && s.r === row)) {
            el.style.backgroundColor = '#217346'; el.style.color = 'transparent';
        }
        if (this.snakeGame.food.c === col && this.snakeGame.food.r === row) el.textContent = '🍎';
    }

    startFlightGame() {
        if (this.flightGame) return;
        this.flightGame = { active: true, playerX: 7, obstacles: [], interval: setInterval(() => this.updateFlight(), 100) };
    }

    updateFlight() {
        if (!this.isActive || !this.flightGame) return;
        if (Math.random() < 0.2) this.flightGame.obstacles.push({x: Math.floor(Math.random() * 15), y: 31});
        this.flightGame.obstacles.forEach(o => o.y--);
        this.flightGame.obstacles = this.flightGame.obstacles.filter(o => o.y >= 0);
        if (this.flightGame.obstacles.some(o => o.x === this.flightGame.playerX && o.y === 2)) {
            this.stopFlightGame(); return;
        }
        this.updateExcelGrid();
    }

    stopFlightGame() {
        if (this.flightGame) {
            clearInterval(this.flightGame.interval);
            this.flightGame = null;
            this.soundManager.playSound('game-over');
            alert("CRASH!");
            this.updateExcelGrid();
        }
    }

    renderFlightCell(el, id) {
        const col = id.charCodeAt(0) - 65;
        const row = parseInt(id.substring(1));
        el.style.backgroundColor = '#87CEEB'; el.style.color = 'transparent';
        if (row === 2 && col === this.flightGame.playerX) {
            el.style.backgroundColor = 'transparent'; el.style.color = 'black'; el.textContent = '✈️';
        }
        if (this.flightGame.obstacles.some(o => o.x === col && o.y === row)) {
            el.style.backgroundColor = 'white'; el.style.borderRadius = '50%';
        }
    }

    // =================================================================================
    //  WORD / PPT / TERMINAL / CHAT / EMAIL
    // =================================================================================

    cycleDoc() {
        this.docIndex = (this.docIndex + 1) % DOCUMENTS.length;
        this.docTitle = DOCUMENTS[this.docIndex].title;
        this.docContent = DOCUMENTS[this.docIndex].content;
        this.render();
    }

    toggleWordStealth() {
        this.wordStealthMode = !this.wordStealthMode;
        this.render();
    }

    setStealthSource(source) {
        this.stealthSource = source;
        this.fakeText = this.stealthTexts[source];
        this.fakeTextIndex = 0;
        this.render();
    }

    updateDocContent(newText) { this.docContent = newText; }
    exportToDoc() { this.downloadFile(this.docContent, this.docTitle, "text/plain"); }

    addSlide() {
        this.slides.push({ title: "New Slide", bullets: ["Add point here"] });
        this.setSlide(this.slides.length - 1);
    }

    setSlide(index) { this.currentSlide = index; this.render(); }
    updateSlideTitle(text) { this.slides[this.currentSlide].title = text; }
    updateSlideBullets(ul) {
        const bullets = [];
        ul.querySelectorAll('li').forEach(li => bullets.push(li.innerText));
        this.slides[this.currentSlide].bullets = bullets;
    }
    exportToPPT() { this.downloadFile(JSON.stringify(this.slides), "Presentation.json", "application/json"); }

    selectEmail(id) { this.selectedEmail = this.emails.find(e => e.id === id); this.render(); }
    replyEmail(forward = false) {
        const prefix = forward ? "FW: " : "Re: ";
        const newBody = forward ? "\n\n-----Original-----\n" + this.selectedEmail.body : "\n\nI'll circle back.\n";
        this.selectedEmail = { id: Date.now(), from: "Me", subject: prefix + this.selectedEmail.subject, time: "Now", body: newBody };
        this.render();
    }

    switchChannel(ch) { this.activeChannel = ch; this.render(); }
    sendChat() {
        const input = document.getElementById('chat-input');
        if (!input || !input.value.trim()) return;
        this.chatHistory[this.activeChannel].push({ user: 'Me', time: 'Now', text: input.value });
        input.value = '';
        this.render();
        setTimeout(() => {
            const r = ["Agreed.", "Let's circle back.", "Synergy.", "Thinking outside the box."];
            this.chatHistory[this.activeChannel].push({ user: 'Manager', time: 'Now', text: r[Math.floor(Math.random()*r.length)] });
            this.render();
        }, 1000);
    }

    runTerminalCommand(cmd) {
        this.termHistory.push(`C:\\Users\\JohnDoe> ${cmd}`);
        document.getElementById('term-input').value = '';
        const c = cmd.trim().toLowerCase();
        
        if (c === 'help') this.termHistory.push("ls, cd, ping, npm install, quest, bsod, exit");
        else if (c === 'ls' || c === 'dir') this.termHistory.push("Directory of C:\\Users\\JohnDoe\n<DIR> Documents\n<DIR> Downloads");
        else if (c === 'bsod') { this.systemState = 'bsod'; this.render(); return; }
        else if (c === 'exit') { this.closeWindow(); return; }
        else if (c === 'quest') this.startAdventure();
        else if (this.adventure) this.handleAdventureCommand(c);
        else this.termHistory.push("Command not found.");
        
        this.render();
        setTimeout(() => {
             const term = document.getElementById('term-input');
             if(term) term.focus(); 
        }, 50);
    }

    startAdventure() {
        this.adventure = { currentRoom: 'start', inventory: [] };
        this.termHistory.push("--- CORPORATE QUEST ---");
        this.printRoom();
    }

    printRoom() {
        const room = TERMINAL_ADVENTURE[this.adventure.currentRoom];
        this.termHistory.push(room.text);
        if(room.items && room.items.length) this.termHistory.push("Items: " + room.items.join(", "));
        this.termHistory.push("Exits: " + Object.keys(room.exits).join(", "));
    }

    handleAdventureCommand(cmd) {
        const parts = cmd.split(' ');
        const act = parts[0];
        const arg = parts[1];
        const room = TERMINAL_ADVENTURE[this.adventure.currentRoom];
        
        if(['n','s','e','w'].includes(act.charAt(0))) {
            let dir = act.charAt(0) === 'n' ? 'north' : act.charAt(0) === 's' ? 'south' : act.charAt(0) === 'e' ? 'east' : 'west';
            if(room.exits[dir]) {
                this.adventure.currentRoom = room.exits[dir];
                this.printRoom();
            } else this.termHistory.push("Can't go that way.");
        } else if (act === 'take' && room.items && room.items.includes(arg)) {
            this.adventure.inventory.push(arg);
            room.items = room.items.filter(i => i!==arg);
            this.termHistory.push("Taken.");
        } else {
             this.termHistory.push("What?");
        }
    }

    // =================================================================================
    //  UTILS
    // =================================================================================

    handleKey(e) {
        if (e.key === 'Escape') return; // Handled externally

        // Snake Input
        if (this.snakeGame && this.activeApp === 'excel') {
            if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const d = this.snakeGame.dir;
                if(e.key==='ArrowUp' && d.r!==1) this.snakeGame.dir={c:0,r:-1};
                if(e.key==='ArrowDown' && d.r!==-1) this.snakeGame.dir={c:0,r:1};
                if(e.key==='ArrowLeft' && d.c!==1) this.snakeGame.dir={c:-1,r:0};
                if(e.key==='ArrowRight' && d.c!==-1) this.snakeGame.dir={c:1,r:0};
            }
        }
        
        // Flight Input
        if (this.flightGame && this.activeApp === 'excel') {
            if(e.key==='ArrowLeft') { this.flightGame.playerX = Math.max(0, this.flightGame.playerX-1); e.preventDefault(); }
            if(e.key==='ArrowRight') { this.flightGame.playerX = Math.min(14, this.flightGame.playerX+1); e.preventDefault(); }
        }

        // Word Stealth
        if (this.activeApp === 'word' && this.wordStealthMode) {
            e.preventDefault();
            if(e.key.length === 1 || e.key === 'Enter') {
                const chunk = this.fakeText.substring(this.fakeTextIndex, this.fakeTextIndex + 3);
                this.fakeTextIndex = (this.fakeTextIndex + 3) % this.fakeText.length;
                this.docContent += chunk;
                this.render();
            }
        }
    }

    startClippyLoop() {
        if (this.clippyTimer) clearInterval(this.clippyTimer);
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

    downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
