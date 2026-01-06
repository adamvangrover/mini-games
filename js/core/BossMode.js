import SaveSystem from './SaveSystem.js';
import SoundManager from './SoundManager.js';
import AdsManager from './AdsManager.js';
// Fallback if file missing, we define defaults inside constructor
import { EMAILS, DOCUMENTS, SLIDES, CHATS, TERMINAL_ADVENTURE, SPOTIFY_PLAYLISTS, ERA_CONTENT } from './BossModeContent.js';
// Dynamic imports for Apps
import { MarketplaceApp, GrokApp } from './BossModeApps.js';

export default class BossMode {
    constructor() {
        if (BossMode.instance) return BossMode.instance;
        BossMode.instance = this;
        window.BossMode = BossMode; // Expose for inline handlers

        // --- Core System State ---
        this.isActive = false;
        this.systemState = 'boot'; // 'boot', 'login', 'desktop', 'bsod'
        this.currentOS = 'modern'; // 'modern', 'legacy', 'hacker', 'mac', 'linux', 'win98', 'win2000', 'xp', 'y2k', 'grok'
        this.skin = 'windows'; // 'windows', 'mac', 'ubuntu', 'android'
        
        // --- Window Management ---
        this.windows = []; // Array of active window objects
        this.nextWindowId = 1;
        this.zIndexCounter = 100;
        this.activeWindowId = null;
        this.dragState = null;

        // --- UI State ---
        this.startMenuOpen = false;
        this.notificationOpen = false;
        this.contextMenuOpen = false;
        this.contextMenuPos = { x: 0, y: 0 };
        this.wallpaperIndex = 0;
        
        // --- Managers ---
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.adsManager = AdsManager.getInstance();
        this.overlay = null;
        this.legacyOS = null;

        // --- User Profile ---
        this.user = {
            name: "John Doe",
            role: "Senior Risk Analyst",
            avatar: "JD",
            password: "123"
        };

        // --- Content & Data ---
        this.wallpapers = [
            'https://images.unsplash.com/photo-1642427749670-f20e2e76ed8c?q=80&w=2000&auto=format&fit=crop', // Dark Grid (Windows)
            'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop', // Mountains (Mac)
            'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop', // Blue (Ubuntu)
            'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop'   // Retro (Android)
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
        this.fakeTextPointer = 0;

        // Chat App State
        this.chatMessages = [
            { sender: 'The Boss', text: 'Where are those Q3 reports?', time: '09:00', avatar: 'B' },
            { sender: 'HR', text: 'Reminder: Mandatory fun event at 5pm.', time: '09:15', avatar: 'HR' },
            { sender: 'IT Support', text: 'Did you try turning it off and on again?', time: '10:30', avatar: 'IT' }
        ];
        
        // Games
        this.snakeGame = null;
        this.flightGame = null;
        this.minesweeper = { grid: [], state: 'ready', mines: 10, time: 0 };
        this.adventure = null;

        // Excel Modes
        this.excelMode = 'standard'; // 'standard', 'dcf', 'vba', 'tracker'
        this.vbaCodeBuffer = "Sub CalculateSynergy()\n    Dim i As Integer\n    For i = 1 To 100\n        Cells(i, 1).Value = 'Optimized'\n    Next i\nEnd Sub";
        this.trackerLog = [];

        // Terminal
        this.termHistory = ["Microsoft Windows [Version 10.0.19045]", "(c) Microsoft Corporation.", ""];

        // Spotify
        this.spotifyPlaylists = SPOTIFY_PLAYLISTS || [];
        this.currentPlaylist = this.spotifyPlaylists[0];
        this.isPlayingSpotify = false;

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
                
                <!-- Desktop Icons Container (Content injected by JS based on Skin) -->
                <div id="boss-desktop-icons" class="absolute inset-0 z-0 w-full h-full pointer-events-none"></div>

                <div id="boss-windows-container" class="absolute inset-0 pointer-events-none z-10 overflow-hidden"></div>
                
                <!-- OS Specific UI Elements (Docks, Taskbars, Start Menus) -->
                <div id="boss-os-ui" class="absolute inset-0 pointer-events-none z-[9999]"></div>
            </div>

            <!-- Legacy OS Container -->
            <div id="os-legacy-container" class="absolute inset-0 z-[10005] hidden bg-teal-800"></div>

            <!-- Hacker OS Container -->
            <div id="os-hacker-container" class="absolute inset-0 z-[10006] hidden bg-black font-mono text-green-500 p-4 overflow-hidden"></div>

            <div id="boss-bsod-container" class="absolute inset-0 z-[10050] hidden bg-[#0078d7] cursor-none flex flex-col items-start justify-center p-20 text-white font-mono"></div>
        `;

        document.body.appendChild(this.overlay);

        // Event Listeners
        this.bindGlobalEvents();
        document.addEventListener('mousemove', (e) => this.handleDragMove(e));
        document.addEventListener('mouseup', () => this.handleDragEnd());

        // Context Menu
        this.overlay.addEventListener('contextmenu', (e) => {
            if (this.isActive && this.systemState === 'desktop' && e.target === document.getElementById('boss-wallpaper')) {
                e.preventDefault();
                this.showContextMenu(e.clientX, e.clientY);
            }
        });
        document.addEventListener('click', () => this.hideContextMenu());

        // Check Persistence
        if (localStorage.getItem('boss_mode_loggedin') === 'true') {
            this.systemState = 'desktop';
            const savedOS = localStorage.getItem('boss_mode_os') || 'modern';
            this.currentOS = savedOS;
            this.skin = localStorage.getItem('boss_mode_skin') || 'windows';
        }

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
            .image-pixelated { image-rendering: pixelated; }
            @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            /* Scrollbars */
            .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
            .custom-scroll::-webkit-scrollbar-track { background: #020617; }
            .custom-scroll::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
            /* Hacker OS */
            .hacker-text { text-shadow: 0 0 5px #0f0; }
            .blink { animation: blink 1s step-end infinite; }
            @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
            /* BSOD */
            .bsod-text { font-family: 'Courier New', Courier, monospace; }
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
                if (['legacy', 'win98', 'win2000', 'xp', 'mac', 'linux', 'y2k'].includes(this.currentOS)) {
                    if (!this.legacyOS) this.startLegacyOS();
                } else if (this.currentOS === 'hacker') {
                    this.renderHackerOS();
                } else {
                    document.getElementById('os-desktop-layer').classList.remove('hidden');
                    this.renderDesktop();
                }
            }
            
            // Auto mute real world audio
            if (!this.soundManager.muted) this.soundManager.toggleMute();
            
        } else {
            this.overlay.classList.add('hidden');
            // Stop Loops
            if (this.snakeGame) clearInterval(this.snakeGame.interval);
            if (this.flightGame) clearInterval(this.flightGame.interval);
            if (this.matrixInterval) clearInterval(this.matrixInterval);
            if (this.legacyOS && this.legacyOS.isPlayingMusic) this.legacyOS.toggleMusic();
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

        // Theme Integration
        const theme = this.saveSystem.getEquippedItem('theme') || 'blue';
        const ringColor = theme === 'pink' ? 'border-pink-500' : (theme === 'gold' ? 'border-yellow-500' : 'border-white/20');

        // Available OS Options (Unlocked check is inside selectOS, but we should visualize it)
        const osOptions = [
             { id: 'modern', icon: 'fab fa-windows', label: 'Modern' },
             { id: 'legacy', icon: 'fab fa-windows', label: 'Win95' },
             { id: 'win98', icon: 'fab fa-windows', label: 'Win98' },
             { id: 'xp', icon: 'fab fa-windows', label: 'WinXP' },
             { id: 'mac', icon: 'fab fa-apple', label: 'Mac OS' },
             { id: 'linux', icon: 'fab fa-linux', label: 'Linux' },
             { id: 'hacker', icon: 'fas fa-terminal', label: 'Hacker' }
        ];

        loginLayer.innerHTML = `
            <div class="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <div class="w-32 h-32 rounded-full bg-gray-200 border-4 ${ringColor} flex items-center justify-center mb-6 shadow-2xl">
                    <span class="text-4xl text-gray-500 font-bold">${this.user.avatar}</span>
                </div>
                <div class="text-3xl font-bold mb-6">${this.user.name}</div>
                <div class="flex gap-2">
                    <input id="boss-login-input" type="password" placeholder="PIN" class="bg-white/20 border border-white/30 rounded px-4 py-2 text-center text-white placeholder-gray-300 outline-none w-48 backdrop-blur" onkeydown="if(event.key==='Enter') BossMode.instance.login()">
                    <button id="boss-login-submit" class="bg-white/20 hover:bg-white/40 border border-white/30 rounded px-4 transition-all" onclick="BossMode.instance.login()"><i class="fas fa-arrow-right"></i></button>
                </div>

                 <!-- Skin Selector for Modern OS -->
                <div class="mt-8 flex gap-4 bg-black/30 p-2 rounded-lg backdrop-blur-md">
                     <div class="flex flex-col items-center cursor-pointer hover:text-blue-300 opacity-70 hover:opacity-100 ${this.skin==='windows'?'text-blue-400 opacity-100 font-bold':''}" onclick="BossMode.instance.changeSkin('windows')"><i class="fab fa-windows text-2xl"></i><span class="text-[9px]">Windows</span></div>
                     <div class="flex flex-col items-center cursor-pointer hover:text-gray-300 opacity-70 hover:opacity-100 ${this.skin==='mac'?'text-white opacity-100 font-bold':''}" onclick="BossMode.instance.changeSkin('mac')"><i class="fab fa-apple text-2xl"></i><span class="text-[9px]">macOS</span></div>
                     <div class="flex flex-col items-center cursor-pointer hover:text-orange-300 opacity-70 hover:opacity-100 ${this.skin==='ubuntu'?'text-orange-500 opacity-100 font-bold':''}" onclick="BossMode.instance.changeSkin('ubuntu')"><i class="fab fa-ubuntu text-2xl"></i><span class="text-[9px]">Ubuntu</span></div>
                     <div class="flex flex-col items-center cursor-pointer hover:text-green-300 opacity-70 hover:opacity-100 ${this.skin==='android'?'text-green-400 opacity-100 font-bold':''}" onclick="BossMode.instance.changeSkin('android')"><i class="fab fa-android text-2xl"></i><span class="text-[9px]">Android</span></div>
                </div>

            </div>
            <div class="absolute bottom-8 right-8 flex gap-4 text-white text-2xl">
                <i class="fas fa-wifi"></i>
                <i class="fas fa-power-off cursor-pointer hover:text-red-400" onclick="BossMode.instance.toggle(false)"></i>
            </div>
            <!-- OS Selector -->
            <div class="absolute bottom-8 left-8 text-white/50 text-xs font-mono bg-black/50 p-2 rounded w-[600px] overflow-x-auto">
                <div class="flex gap-4">
                    ${osOptions.map(opt => `
                        <div class="cursor-pointer hover:text-white flex flex-col items-center gap-1 min-w-[50px] ${this.currentOS===opt.id?'text-white font-bold':''}" onclick="BossMode.instance.selectOS('${opt.id}')">
                            <i class="${opt.icon} text-xl"></i>${opt.label}
                        </div>
                    `).join('')}
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

        // Persistence
        localStorage.setItem('boss_mode_loggedin', 'true');
        localStorage.setItem('boss_mode_os', this.currentOS);
        localStorage.setItem('boss_mode_skin', this.skin);

        document.getElementById('os-login-layer').classList.add('hidden');

        if (['legacy', 'win98', 'win2000', 'xp', 'mac', 'linux', 'y2k'].includes(this.currentOS)) {
            this.startLegacyOS();
        } else if (this.currentOS === 'hacker') {
            this.renderHackerOS();
        } else {
            // Modern
            document.getElementById('os-desktop-layer').classList.remove('hidden');
            this.renderDesktop();
            setTimeout(() => this.openApp('mission'), 500);
        }
    }

    selectOS(os) {
        // Validation Logic
        const checkUnlock = (itemId, settingId) => {
            return this.saveSystem.getEquippedItem('os_license') === itemId || this.saveSystem.isItemUnlocked(itemId) || this.saveSystem.isItemUnlocked(settingId);
        };

        if (os === 'legacy' && !checkUnlock('legacy', 'os_legacy')) return this.toastLocked('Win95 License');
        if (os === 'win98' && !checkUnlock('win98', 'os_win98')) return this.toastLocked('Win98 Upgrade');
        if (os === 'xp' && !checkUnlock('xp', 'os_xp')) return this.toastLocked('WinXP License');
        if (os === 'mac' && !checkUnlock('mac', 'os_mac')) return this.toastLocked('Mac OS License');
        if (os === 'linux' && !checkUnlock('linux', 'os_linux')) return this.toastLocked('Linux Distro');
        if (os === 'hacker' && !checkUnlock('terminal', 'os_terminal')) return this.toastLocked('Terminal License');

        this.currentOS = os;
        this.renderLogin();
    }

    changeSkin(skin) {
        if(skin === 'mac' && !this.saveSystem.isItemUnlocked('os_mac')) { window.miniGameHub.showToast("License Required (Pear OS)."); return; }
        if(skin === 'ubuntu' && !this.saveSystem.isItemUnlocked('os_ubuntu')) { window.miniGameHub.showToast("License Required (Ubuntu Distro)."); return; }
        if(skin === 'android' && !this.saveSystem.isItemUnlocked('os_android')) { window.miniGameHub.showToast("License Required (Droid Tablet)."); return; }

        this.skin = skin;
        this.wallpaperIndex = skin === 'windows' ? 0 : skin === 'mac' ? 1 : skin === 'ubuntu' ? 2 : 3;

        // Re-render Login to show selected state
        this.renderLogin();
    }

    startLegacyOS() {
        const container = document.getElementById('os-legacy-container');
        container.classList.remove('hidden');
        import('./BossModeLegacy.js').then(module => {
            if (!this.legacyOS) {
                 this.legacyOS = new module.default(container, { skin: this.currentOS });
            } else {
                 // Re-init with new skin if changed
                 if (this.legacyOS.skin !== this.currentOS) {
                     this.legacyOS.destroy();
                     this.legacyOS = new module.default(container, { skin: this.currentOS });
                 } else {
                     this.legacyOS.render();
                 }
            }
        });
    }

    renderHackerOS() {
        const container = document.getElementById('os-hacker-container');
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="h-full flex flex-col font-mono text-green-500 text-sm z-10 relative">
                <div class="flex-1 overflow-y-auto p-4" id="hacker-output">
                    <div>> CONNECTED TO MAINFRAME [${new Date().toISOString()}]</div>
                    <div>> AUTH: ROOT ACCESS GRANTED</div>
                    <br>
                    <div>Type 'help' for available commands.</div>
                    <div class="text-green-800">----------------------------------------</div>
                </div>
                <div class="border-t border-green-800 p-2 flex">
                    <span class="mr-2">></span>
                    <input id="hacker-input" class="bg-transparent border-none outline-none text-green-400 flex-1" autofocus onkeydown="if(event.key==='Enter') BossMode.instance.runHackerCommand(this.value)">
                </div>
            </div>
            <div id="matrix-bg" class="absolute inset-0 z-0 opacity-20 pointer-events-none"></div>
            <div class="absolute top-2 right-2 text-green-800 text-[10px] z-20">UNSECURE CONNECTION</div>
            <div class="absolute bottom-2 right-2 text-red-500 cursor-pointer hover:text-red-400 border border-red-500 px-2 z-20" onclick="BossMode.instance.toggle(false)">[EXIT]</div>
        `;
        document.getElementById('hacker-input').focus();
    }

    runHackerCommand(cmd) {
        const output = document.getElementById('hacker-output');
        const input = document.getElementById('hacker-input');
        input.value = '';

        const append = (txt, color='text-green-500') => {
            const div = document.createElement('div');
            div.className = color;
            div.textContent = txt;
            output.appendChild(div);
            output.scrollTop = output.scrollHeight;
        };

        append(`> ${cmd}`, 'text-white');

        switch(cmd.toLowerCase().trim()) {
            case 'help':
                append("COMMANDS: help, clear, ls, scan, decrypt, matrix, bsod, exit");
                break;
            case 'clear':
                output.innerHTML = '';
                break;
            case 'ls':
                append("DRIVE C: [ENCRYPTED]");
                append("DRIVE D: /secrets/plans.txt");
                append("DRIVE E: /music/mix.mp3");
                break;
            case 'scan':
                append("SCANNING NETWORK...");
                setTimeout(() => append("FOUND 3 VULNERABILITIES."), 1000);
                setTimeout(() => append("[1] PORT 8080 OPEN"), 1500);
                setTimeout(() => append("[2] SQL INJECTION POSSIBLE"), 2000);
                break;
            case 'decrypt':
                append("DECRYPTING...", "blink");
                setTimeout(() => append("ACCESS DENIED. NEED KEY."), 2000);
                break;
            case 'exit':
                this.toggle(false);
                break;
            case 'matrix':
                 append("INITIATING MATRIX PROTOCOL...");
                 this.startMatrixEffect();
                 break;
            case 'bsod':
                 this.triggerBSOD();
                 break;
            default:
                append(`UNKNOWN COMMAND: ${cmd}`, 'text-red-500');
        }
    }

    startMatrixEffect() {
        const bg = document.getElementById('matrix-bg');
        if (!bg) return;

        // Remove existing canvas if any
        bg.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        bg.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        const chars = "0101010101アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops = Array(Math.floor(columns)).fill(1);

        if (this.matrixInterval) clearInterval(this.matrixInterval);

        this.matrixInterval = setInterval(() => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0f0';
            ctx.font = fontSize + 'px monospace';

            for (let i = 0; i < drops.length; i++) {
                const text = chars.charAt(Math.floor(Math.random() * chars.length));
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        }, 33);
    }

    triggerBSOD() {
        const bsod = document.getElementById('boss-bsod-container');
        if (!bsod) return;

        this.soundManager.playSound('glitch');

        bsod.classList.remove('hidden');
        bsod.innerHTML = `
            <div class="bsod-text text-8xl mb-10">:(</div>
            <div class="bsod-text text-2xl mb-8">Your PC ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.</div>
            <div class="bsod-text text-xl mb-4">20% complete</div>
            <div class="mt-8 flex gap-4 items-center">
                <div class="bg-white p-2"><img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=NEVER_GONNA_GIVE_YOU_UP" width="80" height="80"></div>
                <div class="text-sm">
                    For more information about this issue and possible fixes, visit https://www.windows.com/stopcode
                    <br><br>
                    If you call a support person, give them this info:
                    <br>
                    Stop code: CRITICAL_PROCESS_DIED
                </div>
            </div>
            <div class="mt-10 text-xs opacity-50">Press ESC to Reboot</div>
        `;

        // Hide other layers
        document.getElementById('os-desktop-layer').classList.add('hidden');
        document.getElementById('os-hacker-container').classList.add('hidden');
        document.getElementById('os-legacy-container').classList.add('hidden');

        // Auto Reboot
        setTimeout(() => {
            bsod.classList.add('hidden');
            this.systemState = 'boot';
            this.runBootSequence();
        }, 8000);
    }

    logout() {
        this.soundManager.playSound('click');
        localStorage.removeItem('boss_mode_loggedin');
        this.systemState = 'login';

        // Hide desktops
        document.getElementById('os-desktop-layer').classList.add('hidden');
        document.getElementById('os-legacy-container').classList.add('hidden');
        document.getElementById('os-hacker-container').classList.add('hidden');

        if(this.legacyOS) {
             this.legacyOS.destroy();
             this.legacyOS = null;
        }

        // Stop any running effects
        if (this.matrixInterval) clearInterval(this.matrixInterval);

        this.renderLogin();
    }

    renderDesktop() {
        const desk = document.getElementById('os-desktop-layer');
        desk.classList.remove('hidden');
        
        // Update Wallpaper
        document.getElementById('boss-wallpaper').style.backgroundImage = `url('${this.wallpapers[this.wallpaperIndex]}')`;
        
        // Skin Logic
        if (this.skin === 'windows') this.renderDesktopWindows();
        else if (this.skin === 'mac') this.renderDesktopMac();
        else if (this.skin === 'ubuntu') this.renderDesktopUbuntu();
        else if (this.skin === 'android') this.renderDesktopAndroid();
    }

    // ---------------- SKIN RENDERERS ----------------

    renderDesktopWindows() {
        const icons = document.getElementById('boss-desktop-icons');
        icons.innerHTML = `
            <div class="p-4 flex flex-col flex-wrap gap-4 content-start w-fit pointer-events-auto">
                ${this.createIconHTML("My PC", "fa-desktop", "text-blue-300", "alert('My PC')")}
                ${this.createIconHTML("Recycle Bin", "fa-trash-alt", "text-gray-400")}
                ${this.createIconHTML("Q3 Report", "fa-file-excel", "text-green-500", "BossMode.instance.openApp('excel')")}
                ${this.createIconHTML("Edge", "fab fa-edge", "text-blue-400", "BossMode.instance.openApp('browser')")}
                ${this.createIconHTML("Minesweeper", "fa-bomb", "text-red-500", "BossMode.instance.openApp('minesweeper')")}
            </div>
        `;

        const ui = document.getElementById('boss-os-ui');
        ui.innerHTML = `<div id="boss-taskbar-container" class="absolute bottom-0 left-0 right-0 h-10 pointer-events-auto"></div>
                        <div id="boss-startmenu-container" class="absolute bottom-10 left-0 pointer-events-auto"></div>
                        <div id="boss-notification-container" class="absolute bottom-10 right-0 pointer-events-auto"></div>`;
        this.renderTaskbarWindows();
    }

    renderDesktopMac() {
         const icons = document.getElementById('boss-desktop-icons');
         icons.innerHTML = `
             <div class="absolute top-10 right-4 flex flex-col gap-6 pointer-events-auto text-white">
                 ${this.createIconHTML("Macintosh HD", "fa-hdd", "text-gray-300", null, true)}
                 ${this.createIconHTML("Work", "fa-folder", "text-blue-400", null, true)}
             </div>
         `;

         const ui = document.getElementById('boss-os-ui');
         const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

         ui.innerHTML = `
             <!-- Top Bar -->
             <div class="absolute top-0 left-0 right-0 h-7 bg-white/20 backdrop-blur-md flex items-center justify-between px-4 text-white text-xs pointer-events-auto shadow-sm">
                 <div class="flex items-center gap-4 font-bold">
                     <i class="fab fa-apple text-sm"></i>
                     <span class="font-bold">Finder</span>
                     <span class="font-normal">File</span>
                     <span class="font-normal">Edit</span>
                     <span class="font-normal">View</span>
                     <span class="font-normal">Go</span>
                 </div>
                 <div class="flex items-center gap-3">
                     <i class="fas fa-battery-full"></i>
                     <i class="fas fa-wifi"></i>
                     <i class="fas fa-search"></i>
                     <span>${time}</span>
                 </div>
             </div>

             <!-- Dock -->
             <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-white/20 backdrop-blur-xl border border-white/20 rounded-2xl p-2 flex items-end gap-2 shadow-2xl pointer-events-auto">
                  ${this.createDockIcon('finder', 'fa-smile', 'text-blue-500')}
                  ${this.createDockIcon('excel', 'fa-file-excel', 'text-green-500', "BossMode.instance.openApp('excel')")}
                  ${this.createDockIcon('word', 'fa-file-word', 'text-blue-500', "BossMode.instance.openApp('word')")}
                  ${this.createDockIcon('browser', 'fab fa-safari', 'text-blue-400', "BossMode.instance.openApp('browser')")}
                  ${this.createDockIcon('terminal', 'fa-terminal', 'text-gray-800', "BossMode.instance.openApp('terminal')")}
                  <div class="w-[1px] h-8 bg-white/30 mx-1"></div>
                  ${this.createDockIcon('trash', 'fa-trash', 'text-gray-400')}
             </div>
         `;
    }

    renderDesktopUbuntu() {
        const icons = document.getElementById('boss-desktop-icons');
        icons.innerHTML = ''; // Ubuntu usually clean desktop

        const ui = document.getElementById('boss-os-ui');
        const time = new Date().toLocaleDateString([], {weekday: 'short', hour: '2-digit', minute:'2-digit'});

        ui.innerHTML = `
            <!-- Top Bar -->
            <div class="absolute top-0 left-0 right-0 h-7 bg-[#1c1c1c] text-white flex items-center justify-between px-3 text-xs pointer-events-auto shadow-sm">
                 <div class="font-bold cursor-pointer hover:bg-white/10 px-2 rounded">Activities</div>
                 <div class="absolute left-1/2 transform -translate-x-1/2 font-bold cursor-pointer hover:bg-white/10 px-2 rounded">${time}</div>
                 <div class="flex items-center gap-3">
                     <i class="fas fa-network-wired"></i>
                     <i class="fas fa-volume-up"></i>
                     <i class="fas fa-power-off"></i>
                 </div>
            </div>

             <!-- Side Dock -->
            <div class="absolute left-0 top-7 bottom-0 w-14 bg-[#1c1c1c]/90 flex flex-col items-center py-2 gap-2 pointer-events-auto z-[10001]">
                 ${this.createDockIcon('excel', 'fa-file-excel', 'text-green-500', "BossMode.instance.openApp('excel')", 'ubuntu')}
                 ${this.createDockIcon('word', 'fa-file-word', 'text-blue-500', "BossMode.instance.openApp('word')", 'ubuntu')}
                 ${this.createDockIcon('browser', 'fab fa-firefox', 'text-orange-500', "BossMode.instance.openApp('browser')", 'ubuntu')}
                 ${this.createDockIcon('terminal', 'fa-terminal', 'text-gray-300', "BossMode.instance.openApp('terminal')", 'ubuntu')}
                 <div class="mt-auto mb-2 w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 cursor-pointer">
                    <i class="fas fa-th text-white text-lg"></i>
                </div>
            </div>
        `;
    }

    renderDesktopAndroid() {
        const icons = document.getElementById('boss-desktop-icons');
        icons.innerHTML = `
             <div class="absolute inset-0 p-8 grid grid-cols-6 grid-rows-4 gap-8 pointer-events-none">
                ${this.createTabletIcon("Sheets", "fa-file-excel", "bg-green-100 text-green-600", "BossMode.instance.openApp('excel')")}
                ${this.createTabletIcon("Docs", "fa-file-word", "bg-blue-100 text-blue-600", "BossMode.instance.openApp('word')")}
                ${this.createTabletIcon("Chrome", "fab fa-chrome", "bg-white text-red-500", "BossMode.instance.openApp('browser')")}
                ${this.createTabletIcon("Spotify", "fab fa-spotify", "bg-black text-green-500", "BossMode.instance.openApp('spotify')")}
             </div>
        `;

        const ui = document.getElementById('boss-os-ui');
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        ui.innerHTML = `
             <div class="absolute top-0 left-0 right-0 h-6 flex items-center justify-between px-4 text-white text-xs bg-black/20 backdrop-blur-sm pointer-events-auto">
                 <div class="font-bold">${time}</div>
                 <div class="flex items-center gap-2"><i class="fas fa-wifi"></i><i class="fas fa-battery-three-quarters"></i></div>
             </div>

             <div class="absolute bottom-0 w-full h-12 flex items-center justify-center gap-12 text-white/80 bg-black/10 backdrop-blur pointer-events-auto">
                 <i class="fas fa-chevron-left text-xl cursor-pointer hover:text-white" onclick="BossMode.instance.closeWindow(BossMode.instance.activeWindowId)"></i>
                 <i class="fas fa-circle text-lg cursor-pointer hover:text-white" onclick="BossMode.instance.minimizeWindow(BossMode.instance.activeWindowId)"></i>
                 <i class="fas fa-square text-lg cursor-pointer hover:text-white"></i>
             </div>
        `;
    }

    createIconHTML(name, icon, color, action, dropShadow = false) {
        return `
            <div class="flex flex-col items-center gap-1 w-20 p-2 hover:bg-white/10 rounded cursor-pointer group pointer-events-auto"
                 ondblclick="${action || ''}">
                <i class="fas ${icon} ${color} text-3xl group-hover:scale-110 transition-transform ${dropShadow ? 'drop-shadow-md' : ''}"></i>
                <span class="text-[10px] text-white text-center ${dropShadow ? 'text-shadow-sm' : 'bg-black/20 rounded px-1'} leading-tight">${name}</span>
            </div>
        `;
    }

    createDockIcon(id, icon, color, action, style = 'mac') {
        const rounded = style === 'ubuntu' ? 'rounded-md' : 'rounded-xl';
        return `
            <div class="w-10 h-10 ${style==='ubuntu'?'bg-transparent hover:bg-white/10':'bg-white hover:scale-110 shadow-lg'} ${rounded} flex items-center justify-center transition-all cursor-pointer" onclick="${action||''}">
                 <i class="fas ${icon} ${color} text-2xl"></i>
            </div>
        `;
    }

    createTabletIcon(name, icon, bgClass, action) {
        return `
            <div class="pointer-events-auto flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition-transform" onclick="${action}">
                <div class="w-16 h-16 ${bgClass} rounded-2xl flex items-center justify-center shadow-lg"><i class="fas ${icon} text-3xl"></i></div>
                <span class="text-white text-xs font-medium shadow-black drop-shadow-md">${name}</span>
            </div>
        `;
    }

    renderTaskbarWindows() {
        const container = document.getElementById('boss-taskbar-container');
        if(!container) return;

        const apps = [
            { id: 'mission', icon: 'fa-microchip', color: 'text-blue-400' },
            { id: 'excel', icon: 'fa-file-excel', color: 'text-green-500' },
            { id: 'word', icon: 'fa-file-word', color: 'text-blue-500' },
            { id: 'browser', icon: 'fab fa-edge', color: 'text-blue-400' },
            { id: 'ppt', icon: 'fa-file-powerpoint', color: 'text-orange-500' },
            { id: 'teams', icon: 'fa-users', color: 'text-indigo-500' },
            { id: 'spotify', icon: 'fa-spotify', color: 'text-green-400' },
            { id: 'terminal', icon: 'fa-terminal', color: 'text-gray-400' }
            { id: 'dcf', icon: 'fa-chart-line', color: 'text-cyan-400' },
            { id: 'terminal', icon: 'fa-terminal', color: 'text-gray-400' },
            { id: 'marketplace', icon: 'fa-shopping-bag', color: 'text-red-500' },
            { id: 'grok', icon: 'fa-brain', color: 'text-purple-500' }
        ];

        const theme = this.saveSystem.getEquippedItem('theme') || 'blue';
        const barColor = theme === 'pink' ? 'bg-pink-900/90 border-pink-700' : (theme === 'gold' ? 'bg-yellow-900/90 border-yellow-700' : 'bg-[#0f172a]/90 border-gray-700');
        const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

        container.innerHTML = `
            <div class="h-10 ${barColor} backdrop-blur border-t flex items-center px-2 gap-2 shadow-lg text-white">
                <div id="boss-start-btn" class="h-8 w-8 hover:bg-white/10 rounded flex items-center justify-center cursor-pointer" onclick="BossMode.instance.toggleStartMenu()">
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
        // Base config
        const map = {
            'excel': { title: 'Excel - Financials.xlsx', w: 900, h: 600, color: 'bg-[#217346]', icon: 'fa-file-excel' },
            'word': { title: 'Word - Report.docx', w: 700, h: 800, color: 'bg-[#2b579a]', icon: 'fa-file-word' },
            'ppt': { title: 'PowerPoint - Deck.pptx', w: 900, h: 600, color: 'bg-[#b7472a]', icon: 'fa-file-powerpoint' },
            'terminal': { title: 'Command Prompt', w: 600, h: 400, color: 'bg-[#0c0c0c]', icon: 'fa-terminal' },
            'spotify': { title: 'Spotify Premium', w: 800, h: 500, color: 'bg-[#121212]', icon: 'fa-spotify' },
            'browser': { title: 'Edge Browser', w: 1000, h: 700, color: 'bg-gray-100 text-black', icon: 'fab fa-edge' },
            'minesweeper': { title: 'Minesweeper', w: 300, h: 350, color: 'bg-gray-200 text-black', icon: 'fa-bomb' },
            'mission': { title: 'Mission Control', w: 600, h: 400, color: 'bg-[#1e293b]', icon: 'fa-microchip' },
            'teams': { title: 'Teams - Chat', w: 700, h: 500, color: 'bg-[#4f46e5]', icon: 'fa-users' }
            'market': { title: 'Market Radar', w: 500, h: 350, color: 'bg-[#0f172a]', icon: 'fa-satellite-dish' },
            'teams': { title: 'Teams - Chat', w: 700, h: 500, color: 'bg-[#4f46e5]', icon: 'fa-users' },
            'marketplace': { title: 'Spicy Marketplace', w: 400, h: 600, color: 'bg-black', icon: 'fa-shopping-bag' },
            'grok': { title: 'Grok xAI v1.0', w: 500, h: 400, color: 'bg-gray-800', icon: 'fa-brain' }
        };
        const cfg = map[id] || { title: 'App', w: 600, h: 400, color: 'bg-gray-800', icon: 'fa-window-maximize' };

        // Skin Overrides for Window Header Color
        if (this.skin === 'mac') cfg.headerHTML = this.getMacHeader(cfg.title);
        else if (this.skin === 'ubuntu') cfg.headerHTML = this.getUbuntuHeader(cfg.title);
        else if (this.skin === 'android') cfg.headerHTML = this.getAndroidHeader(cfg.title);
        else cfg.headerHTML = this.getWindowsHeader(cfg.title, cfg.icon, cfg.color);

        return cfg;
    }

    getWindowsHeader(title, icon, colorClass) {
        // Ensure bg color works if it's text-black
        const isLight = colorClass.includes('text-black');
        return `
            <div class="${colorClass} h-8 flex items-center justify-between px-2 select-none shrink-0 ${isLight ? 'text-black border-b border-gray-300' : 'text-white'} cursor-default window-bar">
                <div class="flex items-center gap-2">
                    <i class="fas ${icon}"></i>
                    <span class="font-bold text-xs">${title}</span>
                </div>
                <div class="flex gap-2 window-controls">
                    <i class="fas fa-minus hover:bg-white/20 p-1 rounded cursor-pointer btn-min"></i>
                    <i class="fas fa-times hover:bg-red-500 p-1 rounded cursor-pointer px-2 btn-close"></i>
                </div>
            </div>
        `;
    }

    getMacHeader(title) {
        return `
            <div class="bg-[#e8e8e8] h-8 flex items-center justify-between px-3 select-none shrink-0 border-b border-gray-300 window-bar">
                 <div class="flex gap-2 window-controls">
                    <div class="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e] cursor-pointer btn-close"></div>
                    <div class="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d89e24] cursor-pointer btn-min"></div>
                    <div class="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29] cursor-pointer"></div>
                </div>
                <span class="font-bold text-xs text-gray-600">${title}</span>
                <div class="w-10"></div>
            </div>
        `;
    }

    getUbuntuHeader(title) {
        return `
            <div class="bg-[#2c2c2c] text-[#f2f2f2] h-8 flex items-center justify-between px-3 select-none shrink-0 window-bar">
                 <span class="font-bold text-xs">${title}</span>
                 <div class="flex gap-2 window-controls">
                     <div class="w-4 h-4 rounded-full bg-[#e95420] flex items-center justify-center text-[8px] cursor-pointer btn-close"><i class="fas fa-times"></i></div>
                 </div>
            </div>
        `;
    }

    getAndroidHeader(title) {
         return `
            <div class="bg-white text-black h-10 flex items-center justify-between px-4 select-none shrink-0 border-b shadow-sm window-bar">
                 <div class="flex items-center gap-3">
                     <i class="fas fa-arrow-left text-lg btn-close cursor-pointer"></i>
                     <span class="font-medium text-sm">${title}</span>
                 </div>
                 <div class="flex gap-4">
                    <i class="fas fa-search"></i>
                    <i class="fas fa-ellipsis-v"></i>
                 </div>
            </div>
         `;
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

        // Center for Android/Mac if single app focus style desired, but keeping multi-window for all for now
        if (this.skin === 'android') { win.x = 20; win.y = 40; win.w = window.innerWidth - 40; win.h = window.innerHeight - 100; }

        this.windows.push(win);
        this.createWindowDOM(win, cfg);
        if(this.skin === 'windows') this.renderTaskbarWindows();
    }

    createWindowDOM(win, cfg) {
        const el = document.createElement('div');
        el.id = `win-${win.id}`;
        el.className = "os-window absolute flex flex-col bg-white shadow-2xl rounded overflow-hidden border border-gray-600 animate-pop-in";
        if(this.skin === 'mac') el.style.borderRadius = '8px';

        el.style.width = `${win.w}px`;
        el.style.height = `${win.h}px`;
        el.style.left = `${win.x}px`;
        el.style.top = `${win.y}px`;
        el.style.zIndex = win.z;

        el.innerHTML = cfg.headerHTML + `<div id="win-content-${win.id}" class="flex-1 relative overflow-hidden bg-white"></div>`;
        document.getElementById('boss-windows-container').appendChild(el);
        
        // Bind Header Events
        const bar = el.querySelector('.window-bar');
        bar.onmousedown = (e) => this.startDrag(e, win.id);
        el.onmousedown = () => this.bringToFront(win.id);

        el.querySelector('.btn-close').onclick = () => this.closeWindow(win.id);
        const minBtn = el.querySelector('.btn-min');
        if(minBtn) minBtn.onclick = () => this.minimizeWindow(win.id);

        // Render Content
        const contentArea = document.getElementById(`win-content-${win.id}`);
        if(win.app === 'excel') this.renderExcel(contentArea);
        if(win.app === 'word') this.renderWord(contentArea);
        if(win.app === 'ppt') this.renderPPT(contentArea);
        if(win.app === 'terminal') this.renderTerminal(contentArea);
        if(win.app === 'spotify') this.renderSpotify(contentArea);
        if(win.app === 'teams') this.renderTeams(contentArea);
        if(win.app === 'dcf') new DCFApp(contentArea);
        if(win.app === 'dcf') new DCFApp(contentArea); // Use Class for complex logic
        if(win.app === 'marketplace') new MarketplaceApp(contentArea);
        if(win.app === 'grok') new GrokApp(contentArea);
        if(win.app === 'mission') {
            const tpl = document.getElementById('tpl-mission');
            if(tpl) contentArea.appendChild(tpl.content.cloneNode(true));
        }
        if(win.app === 'browser') this.renderBrowser(contentArea);
        if(win.app === 'minesweeper') this.renderMinesweeper(contentArea);
    }

    closeWindow(id) {
        const el = document.getElementById(`win-${id}`);
        if(el) el.remove();
        this.windows = this.windows.filter(w => w.id !== id);
        if(this.skin === 'windows') this.renderTaskbarWindows();
    }

    minimizeWindow(id) {
        const el = document.getElementById(`win-${id}`);
        if(el) el.style.display = 'none';
        const w = this.windows.find(w => w.id === id);
        if(w) w.minimized = true;
        if(this.skin === 'windows') this.renderTaskbarWindows();
    }

    bringToFront(id) {
        this.activeWindowId = id;
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
        if(e.target.closest('.window-controls') || e.target.closest('.btn-close')) return;
        this.bringToFront(id);
        const w = this.windows.find(x => x.id === id);
        this.dragState = { id, startX: e.clientX, startY: e.clientY, initX: w.x, initY: w.y };
        const overlay = document.createElement('div');
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
            <div class="flex flex-col h-full text-black font-sans text-xs">
                 <div class="bg-[#f3f2f1] px-2 py-1 flex gap-2 border-b border-[#e1dfdd] text-[11px] items-center shrink-0">
                    <span class="font-bold border-b-2 border-green-600 px-1">Home</span>
                    <span class="hover:bg-gray-200 px-1 rounded cursor-pointer" onclick="BossMode.instance.toggleDCFMode()">DCF Model</span>
                    <span class="hover:bg-gray-200 px-1 rounded cursor-pointer" onclick="BossMode.instance.toggleVBAMode()">VBA</span>
                    <span class="hover:bg-gray-200 px-1 rounded cursor-pointer" onclick="BossMode.instance.toggleTrackerMode()">Tracker</span>
                </div>
                <div class="bg-[#f3f2f1] px-2 py-1 flex gap-2 border-b border-[#e1dfdd] text-[11px] items-center shrink-0">
                    <button class="flex items-center hover:bg-gray-200 p-1 rounded gap-1" onclick="BossMode.instance.generateFakeExcelData(BossMode.instance.currentExcel); BossMode.instance.initExcelGrid(this.closest('.window-content').querySelector('#boss-grid'))"><i class="fas fa-sync text-green-600"></i> Reset</button>
                    <button class="flex items-center hover:bg-gray-200 p-1 rounded gap-1" onclick="BossMode.instance.triggerBSOD()"><i class="fas fa-bomb text-red-600"></i> Crash</button>
                </div>
                <div class="flex items-center gap-2 p-1 border-b border-[#e1dfdd] bg-white shrink-0">
                    <div class="bg-white border border-gray-300 w-10 text-center text-xs font-bold text-gray-600" id="boss-cell-addr">A1</div>
                    <div class="flex-1 border border-gray-300 flex items-center px-2"><input id="boss-formula-input" class="w-full text-xs outline-none font-mono h-6" value="" onkeydown="if(event.key==='Enter') BossMode.instance.applyFormula(this.value)"></div>
                </div>
                <div class="flex-1 overflow-hidden relative bg-[#e1dfdd] flex flex-col">
                    ${this.excelMode === 'vba' ? this.getVBAContent() : '<div id="boss-grid" class="grid bg-[#c8c6c4] gap-[1px] overflow-auto flex-1"></div>'}
                    ${this.excelMode === 'tracker' ? this.getTrackerOverlay() : ''}
                </div>
                <div id="clippy-container" class="absolute bottom-8 right-8 cursor-pointer hover:scale-110 transition-transform" onclick="BossMode.instance.clippyInteract()">
                    <div id="clippy-bubble" class="absolute -top-16 -left-32 w-40 bg-[#ffffe1] border border-black p-2 text-[10px] rounded shadow-lg hidden"></div>
                    <div class="text-4xl">📎</div>
                </div>
            </div>
        `;
        if(this.excelMode !== 'vba') setTimeout(() => this.initExcelGrid(container.querySelector('#boss-grid')), 0);
    }

    getVBAContent() {
        return `
            <div class="w-full h-full bg-[#f0f0f0] flex flex-col p-2">
                <div class="bg-white border border-gray-400 flex-1 p-4 font-mono text-sm text-blue-800 shadow-inner overflow-auto" contenteditable="true" spellcheck="false" id="vba-editor">
                    ${this.vbaCodeBuffer.replace(/\n/g, '<br>')}
                </div>
                <div class="mt-2 flex justify-end gap-2">
                    <button class="px-3 py-1 bg-gray-300 rounded text-xs hover:bg-gray-400" onclick="BossMode.instance.compileVBA()">Compile</button>
                </div>
            </div>
        `;
    }

    getTrackerOverlay() {
        return `
            <div class="absolute top-2 right-2 w-64 bg-yellow-50 border border-yellow-400 p-2 shadow-lg text-[10px] font-mono h-[300px] overflow-auto opacity-90">
                <div class="font-bold border-b border-yellow-300 mb-1">ACTIVITY TRACKER</div>
                <div id="tracker-feed" class="flex flex-col gap-1 text-gray-700">
                    ${this.trackerLog.map(l => `<div>> ${l}</div>`).join('')}
                </div>
            </div>
        `;
    }
    
    toggleDCFMode() { this.excelMode = 'dcf'; this.generateDCFData(); this.refreshActiveExcel(); }
    toggleVBAMode() { this.excelMode = this.excelMode === 'vba' ? 'standard' : 'vba'; this.refreshActiveExcel(); }
    toggleTrackerMode() { this.excelMode = this.excelMode === 'tracker' ? 'standard' : 'tracker'; this.refreshActiveExcel(); }

    refreshActiveExcel() {
        // Find active excel window and re-render
        const w = this.windows.find(x => x.app === 'excel');
        if(w) {
            const container = document.getElementById(`win-content-${w.id}`);
            this.renderExcel(container);
        }
    }

    compileVBA() {
        const editor = document.getElementById('vba-editor');
        if(editor) this.vbaCodeBuffer = editor.innerText;
        alert("Macro compiled successfully.");
    }

    initExcelGrid(grid) {
        if (!grid) return;
        const cols = 15; const rows = 30;
        grid.style.gridTemplateColumns = `40px repeat(${cols}, 80px)`;
        
        // Render Headers
        const create = (t,c,cl) => { const el = document.createElement(t); el.className=cl+" text-[10px] flex items-center justify-center h-6"; el.textContent=c; return el; };
        grid.appendChild(create('div','','bg-gray-100'));
        for(let i=0;i<cols;i++) grid.appendChild(create('div',String.fromCharCode(65+i),'bg-gray-100 font-bold'));

        for(let r=1;r<=rows;r++) {
            grid.appendChild(create('div',r,'bg-gray-100 text-gray-500'));
            for(let c=0;c<cols;c++) {
                const id = `${String.fromCharCode(65+c)}${r}`;
                const cell = document.createElement('div');
                cell.className = "bg-white px-1 text-xs overflow-hidden cursor-cell hover:border-green-500 hover:border hover:z-10 h-6 border-r border-b border-gray-200";
                cell.id = `cell-${id}`;
                cell.onclick = () => this.selectCell(id);
                grid.appendChild(cell);
            }
        }
        this.updateExcelGrid();
    }
    
    updateExcelGrid() {
        if(!this.excelData) return;

        // Batch update visible cells for performance
        // In a real app we'd map data to DOM efficiently. Here we query all.
        for (let id in this.excelData) {
            const els = document.querySelectorAll(`[id="cell-${id}"]`);
            els.forEach(el => {
                const d = this.excelData[id];
                el.textContent = d.value || d.v || '';
                el.style.fontWeight = (d.bold || d.b) ? 'bold' : 'normal';

                // Clear special styles
                el.style.backgroundColor = 'white';
                el.style.color = 'black';
            });
        }

        // Game Overlays
        if(this.snakeGame) this.renderSnakeOverlay();
        if(this.flightGame) this.renderFlightOverlay();
        if(this.minesweeper.state === 'running' && this.activeApp === 'excel') {
             // Minesweeper logic usually runs in its own app now, but if embedded:
        }
    }
    
    selectCell(id) {
        this.selectedCell = id;
        const inp = document.querySelector('#boss-formula-input');
        const addr = document.querySelector('#boss-cell-addr');
        if(addr) addr.textContent = id;
        if(inp) inp.value = this.excelData[id]?.value || '';
    }

    applyFormula(val) {
        if (val.toUpperCase() === '=SNAKE') { this.startSnake(); return; }
        if (val.toUpperCase() === '=FLIGHT') { this.startFlight(); return; }
        if (val.toUpperCase() === '=BSOD') { this.triggerBSOD(); return; }

        if(this.selectedCell) {
            this.excelData[this.selectedCell] = { value: val };
            if(this.excelMode === 'tracker') {
                this.trackerLog.unshift(`[${new Date().toLocaleTimeString()}] ${this.selectedCell} = ${val}`);
                this.refreshActiveExcel();
            } else {
                this.updateExcelGrid();
            }
        }
    }

    // --- Games Logic ---
    startSnake() {
        this.snakeGame = { snake: [{c:5,r:5}, {c:4,r:5}, {c:3,r:5}], dir: {c:1, r:0}, food: {c:10, r:10}, score: 0, interval: setInterval(() => this.updateSnake(), 150) };
        this.showClippy("I see you're playing a game. Don't tell HR.");
    }

    updateSnake() {
        if (!this.snakeGame) return;
        const head = { ...this.snakeGame.snake[0] };
        head.c += this.snakeGame.dir.c;
        head.r += this.snakeGame.dir.r;

        // Collision checks... (simplified)
        if (head.c < 0 || head.c >= 15 || head.r < 1 || head.r > 30) { this.endSnake(); return; }

        this.snakeGame.snake.unshift(head);
        if (head.c === this.snakeGame.food.c && head.r === this.snakeGame.food.r) {
            this.snakeGame.score++;
            this.snakeGame.food = { c: Math.floor(Math.random() * 15), r: Math.floor(Math.random() * 29) + 1 };
        } else {
            this.snakeGame.snake.pop();
        }
        this.updateExcelGrid();
    }
    
    endSnake() { clearInterval(this.snakeGame.interval); this.snakeGame = null; alert("GAME OVER"); this.updateExcelGrid(); }

    renderSnakeOverlay() {
         this.snakeGame.snake.forEach(s => {
             const els = document.querySelectorAll(`[id="cell-${String.fromCharCode(65+s.c)}${s.r}"]`);
             els.forEach(el => { el.style.backgroundColor = '#217346'; el.style.color='transparent'; });
         });
         const f = this.snakeGame.food;
         const fels = document.querySelectorAll(`[id="cell-${String.fromCharCode(65+f.c)}${f.r}"]`);
         fels.forEach(el => { el.textContent='🍎'; el.style.backgroundColor = 'white'; });
    }

    startFlight() {
        this.flightGame = { playerX: 7, obstacles: [], score: 0, interval: setInterval(() => this.updateFlight(), 100) };
    }

    updateFlight() {
        if (!this.flightGame) return;
        if (Math.random() < 0.2) this.flightGame.obstacles.push({x: Math.floor(Math.random() * 15), y: 30});
        this.flightGame.obstacles.forEach(o => o.y--);
        this.flightGame.obstacles = this.flightGame.obstacles.filter(o => o.y >= 0);

        if (this.flightGame.obstacles.some(o => o.x === this.flightGame.playerX && o.y === 2)) {
             clearInterval(this.flightGame.interval);
             this.flightGame = null;
             alert("CRASH!");
        }
        this.updateExcelGrid();
    }

    renderFlightOverlay() {
        const pX = this.flightGame.playerX;
        document.querySelectorAll(`[id="cell-${String.fromCharCode(65+pX)}2"]`).forEach(el => {
             el.textContent = '✈️'; el.style.backgroundColor = 'skyblue';
        });
        this.flightGame.obstacles.forEach(o => {
            document.querySelectorAll(`[id="cell-${String.fromCharCode(65+o.x)}${o.y}"]`).forEach(el => {
                 el.textContent = '☁️'; el.style.backgroundColor = '#ccc';
            });
        });
    }

    // --- Word App ---
    renderWord(c) {
        c.innerHTML = `
            <div class="h-full bg-[#f3f2f1] flex flex-col text-black">
                <div class="bg-white p-2 border-b flex gap-2 items-center text-xs">
                    <button class="hover:bg-gray-100 p-1 font-bold w-6 border rounded">B</button>
                    <button class="hover:bg-gray-100 p-1 italic w-6 border rounded">I</button>
                    <div class="border-l mx-2 h-4"></div>
                    <button class="hover:bg-gray-100 p-1 px-2 border rounded ${this.wordStealthMode?'bg-blue-100':''}" onclick="BossMode.instance.toggleWordStealth()"><i class="fas fa-user-secret"></i> Stealth</button>
                    <select class="border rounded p-1" onchange="BossMode.instance.setStealthSource(this.value)">
                        <option value="corporate">Corporate</option>
                        <option value="bible">Bible</option>
                        <option value="odyssey">Odyssey</option>
                        <option value="code">Code</option>
                        <option value="lorem">Lorem Ipsum</option>
                    </select>
                </div>
                <div class="flex-1 overflow-y-auto p-8 flex justify-center bg-[#e0e0e0]">
                    <div class="bg-white w-[21cm] min-h-[29.7cm] shadow-xl p-[2cm] font-serif text-sm outline-none" contenteditable="true" id="word-doc-content">${this.currentWord.content}</div>
                </div>
            </div>`;
    }

    toggleWordStealth() { this.wordStealthMode = !this.wordStealthMode; this.refreshActiveWord(); }
    setStealthSource(val) { this.stealthSource = val; this.fakeText = this.stealthTexts[val]; this.fakeTextPointer = 0; }
    refreshActiveWord() {
        const w = this.windows.find(x => x.app === 'word');
        if(w) this.renderWord(document.getElementById(`win-content-${w.id}`));
    }

    // --- Browser App ---
    renderBrowser(c) {
        c.innerHTML = `
            <div class="flex flex-col h-full bg-white text-black text-xs font-sans">
                <div class="bg-gray-100 p-2 flex items-center gap-2 border-b">
                    <i class="fas fa-arrow-left text-gray-400"></i>
                    <i class="fas fa-arrow-right text-gray-400"></i>
                    <i class="fas fa-redo text-gray-600"></i>
                    <div class="flex-1 bg-white border rounded-full px-3 py-1 text-gray-600 flex items-center">
                        <i class="fas fa-lock text-green-500 mr-2"></i> https://intranet.corp/portal
                    </div>
                </div>
                <div class="flex-1 bg-gray-50 p-8 overflow-y-auto">
                    <h1 class="text-2xl font-light text-blue-800 mb-6">Corporate Portal</h1>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-white p-4 shadow border-t-4 border-blue-500">
                            <h3 class="font-bold mb-2">Announcements</h3>
                            <p class="text-gray-600">Friday is Hawaiian Shirt Day. Participation is mandatory.</p>
                        </div>
                        <div class="bg-white p-4 shadow border-t-4 border-green-500">
                            <h3 class="font-bold mb-2">Stock Price</h3>
                            <div class="text-xl font-bold text-green-600">▲ 142.05</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Minesweeper App ---
    renderMinesweeper(c) {
        c.innerHTML = `<div class="flex-1 flex flex-col items-center justify-center bg-[#c0c0c0] border-t-2 border-white border-l-2 border-white border-r-2 border-gray-500 border-b-2 border-gray-500 p-1">
             <div class="mb-2 bg-black text-red-600 font-mono text-xl px-2 border-2 border-gray-500 inset-shadow">010</div>
             <div id="ms-grid" class="grid grid-cols-9 gap-[1px] bg-gray-400 border-4 border-gray-400"></div>
        </div>`;
        setTimeout(() => this.initMinesweeper(c.querySelector('#ms-grid')), 0);
    }

    initMinesweeper(grid) {
        if(this.minesweeper.grid.length === 0) {
            for(let i=0; i<81; i++) this.minesweeper.grid.push({mine: Math.random() < 0.15, revealed: false, flagged: false});
        }
        grid.innerHTML = '';
        this.minesweeper.grid.forEach((cell, i) => {
            const div = document.createElement('div');
            div.className = `w-6 h-6 flex items-center justify-center text-xs font-bold select-none cursor-default ${cell.revealed ? 'bg-gray-200 border border-gray-400' : 'bg-[#c0c0c0] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-gray-500'}`;
            if(cell.revealed) {
                if(cell.mine) { div.textContent = '💣'; div.className += ' bg-red-500'; }
                else {
                    // count neighbors
                    let n = 0;
                    // ... neighbor logic
                    if(Math.random() > 0.8) div.textContent = 1; // dummy logic for now
                }
            }
            div.onclick = () => { cell.revealed = true; this.refreshActiveApp('minesweeper'); };
            grid.appendChild(div);
        });
    }

    refreshActiveApp(id) {
        const w = this.windows.find(x => x.app === id);
        if(w) {
             // For simple apps, full re-render is okay
             if(id==='minesweeper') this.renderMinesweeper(document.getElementById(`win-content-${w.id}`));
        }
    }

    // --- Other Renderers (PPT, Terminal, etc) ---
    renderPPT(c) { c.innerHTML = `<div class="h-full flex bg-[#d0cec9] text-black"><div class="w-40 bg-gray-100 border-r p-2 overflow-y-auto">${this.fileSystem.ppt[0].slides.map((s,i)=>`<div class="bg-white aspect-video shadow mb-2 p-1 text-[8px] cursor-pointer" onclick="BossMode.instance.currentSlide=${i};BossMode.instance.refreshActiveApp('ppt')">Slide ${i+1}</div>`).join('') || ''}</div><div class="flex-1 flex items-center justify-center"><div class="bg-white aspect-[16/9] w-3/4 shadow-xl p-8"><h1 class="text-3xl font-bold mb-4">${this.fileSystem.ppt[0].slides[this.currentSlide || 0]?.title || 'Slide'}</h1><ul>${this.fileSystem.ppt[0].slides[this.currentSlide || 0]?.bullets.map(b=>`<li>${b}</li>`).join('') || ''}</ul></div></div></div>`; }
    renderTerminal(c) {
        c.innerHTML = `<div class="bg-black text-gray-300 font-mono text-sm h-full p-2 overflow-y-auto" onclick="this.querySelector('input').focus()"><div id="term-output">${this.termHistory.map(l=>`<div>${l}</div>`).join('')}</div><div class="flex"><span>C:\\Users\\${this.user.name.replace(' ','')}></span><input class="bg-transparent border-none outline-none text-gray-300 flex-1 ml-2" autofocus onkeydown="if(event.key==='Enter') BossMode.instance.runTerminalCommand(this.value)"></div></div>`;
    }
    renderTeams(c) { c.innerHTML = `<div class="h-full flex bg-[#f0f0f0] text-gray-800"><div class="p-4">Teams Chat Mockup</div></div>`; }
    renderSpotify(c) { c.innerHTML = `<div class="h-full bg-[#121212] text-white flex items-center justify-center">Spotify Mockup</div>`; }

    toggleStartMenu() {
        const container = document.getElementById('boss-startmenu-container');
        this.startMenuOpen = !this.startMenuOpen;
        this.notificationOpen = false;

        const theme = this.saveSystem.getEquippedItem('theme') || 'blue';
        const menuColor = theme === 'pink' ? 'bg-pink-900/95 border-pink-700' : (theme === 'gold' ? 'bg-yellow-900/95 border-yellow-700' : 'bg-[#0f172a]/95 border-gray-700');
        const headerColor = theme === 'pink' ? 'from-pink-900 to-rose-900' : (theme === 'gold' ? 'from-yellow-800 to-amber-900' : 'from-blue-900 to-slate-900');

        if (this.startMenuOpen) {
            container.innerHTML = `
                <div class="w-64 ${menuColor} backdrop-blur border rounded-t-lg shadow-2xl flex flex-col overflow-hidden text-gray-300 pointer-events-auto">
                     <div class="p-4 bg-gradient-to-r ${headerColor} border-b border-gray-700 flex items-center gap-3">
                          <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">JD</div>
                          <div class="font-bold text-white">${this.user.name}</div>
                     </div>
                     <div class="p-2 flex flex-col gap-1">
                          <button class="flex items-center gap-3 p-2 hover:bg-white/10 rounded text-left transition-colors" onclick="BossMode.instance.openApp('excel')"><i class="fas fa-file-excel text-green-500 w-5 text-center"></i> Excel</button>
                          <button class="flex items-center gap-3 p-2 hover:bg-white/10 rounded text-left transition-colors" onclick="BossMode.instance.openApp('word')"><i class="fas fa-file-word text-blue-500 w-5 text-center"></i> Word</button>
                          <button class="flex items-center gap-3 p-2 hover:bg-white/10 rounded text-left transition-colors" onclick="BossMode.instance.openApp('browser')"><i class="fab fa-edge text-blue-400 w-5 text-center"></i> Browser</button>
                          <button class="flex items-center gap-3 p-2 hover:bg-white/10 rounded text-left transition-colors" onclick="BossMode.instance.openApp('spotify')"><i class="fas fa-spotify text-green-500 w-5 text-center"></i> Spotify</button>
                          <div class="border-t border-gray-700 my-1"></div>
                          <button class="flex items-center gap-3 p-2 hover:bg-white/10 rounded text-left transition-colors" onclick="BossMode.instance.logout()"><i class="fas fa-sign-out-alt text-red-400 w-5 text-center"></i> Log Out</button>
                          <button class="flex items-center gap-3 p-2 hover:bg-white/10 rounded text-left transition-colors" onclick="BossMode.instance.toggle(false)"><i class="fas fa-power-off text-gray-400 w-5 text-center"></i> Shut Down</button>
                     </div>
                </div>
            `;
        } else {
            container.innerHTML = '';
        }
    }

    toggleNotification() { this.notificationOpen = !this.notificationOpen; this.startMenuOpen = false; this.renderTaskbarWindows(); } // Refresh to update clock/icons if needed

    // --- Helpers ---
    handleKey(e) {
        if(e.key === '`') { this.openApp('excel'); return; } // Panic Key

        // Snake / Flight Input
        if (this.activeApp === 'excel' && (this.snakeGame || this.flightGame)) {
             const k = e.key;
             if(this.snakeGame) {
                 const d = this.snakeGame.dir;
                 if(k==='ArrowUp' && d.r!==1) this.snakeGame.dir={c:0,r:-1};
                 if(k==='ArrowDown' && d.r!==-1) this.snakeGame.dir={c:0,r:1};
                 if(k==='ArrowLeft' && d.c!==1) this.snakeGame.dir={c:-1,r:0};
                 if(k==='ArrowRight' && d.c!==-1) this.snakeGame.dir={c:1,r:0};
             }
             if(this.flightGame) {
                 if(k==='ArrowLeft') this.flightGame.playerX = Math.max(0, this.flightGame.playerX-1);
                 if(k==='ArrowRight') this.flightGame.playerX = Math.min(14, this.flightGame.playerX+1);
             }
        }

        // Stealth Typing in Word
        if (this.wordStealthMode) {
             e.preventDefault();
             if(e.key.length === 1) {
                 const chunk = this.fakeText[this.fakeTextPointer % this.fakeText.length];
                 this.fakeTextPointer++;
                 const docs = document.querySelectorAll('#word-doc-content');
                 docs.forEach(d => { d.innerHTML += chunk; d.scrollTop=d.scrollHeight; });
             }
        }
    }

    runTerminalCommand(cmd) {
        this.termHistory.push(`C:\\Users\\${this.user.name.replace(' ','')}> ${cmd}`);
        if (cmd === 'bsod') { this.triggerBSOD(); return; }
        if (cmd === 'quest') { this.termHistory.push("Starting Quest..."); this.adventure = { room: 'start' }; }
        else if (this.adventure) { this.termHistory.push("You are in a maze of cubicles."); }
        else { this.termHistory.push("Command not found."); }

        // Refresh visible terminals
        this.windows.filter(w=>w.app==='terminal').forEach(w => {
             const c = document.getElementById(`win-content-${w.id}`);
             this.renderTerminal(c);
        });
    }

    showContextMenu(x, y) {
        this.contextMenuOpen = true;
        this.contextMenuPos = { x, y };
        // Ideally render a div, here we just used the main render loop in previous version.
        // Let's inject it directly.
        let menu = document.getElementById('boss-context-menu');
        if(!menu) {
             menu = document.createElement('div');
             menu.id = 'boss-context-menu';
             menu.className = "absolute bg-white text-black shadow-xl border border-gray-300 rounded py-1 z-[10010] text-xs w-32 cursor-default";
             document.body.appendChild(menu); // Append to body so it floats over everything
        }
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.display = 'block';
        menu.innerHTML = `
            <div class="px-3 py-2 hover:bg-gray-100 cursor-pointer font-bold border-b text-gray-500">System Theme</div>
            <div class="px-3 py-2 hover:bg-blue-100 cursor-pointer" onclick="BossMode.instance.changeSkin('windows')">Windows</div>
            <div class="px-3 py-2 hover:bg-blue-100 cursor-pointer" onclick="BossMode.instance.changeSkin('mac')">macOS</div>
            <div class="px-3 py-2 hover:bg-blue-100 cursor-pointer" onclick="BossMode.instance.changeSkin('ubuntu')">Ubuntu</div>
            <div class="px-3 py-2 hover:bg-blue-100 cursor-pointer" onclick="BossMode.instance.changeSkin('android')">Android</div>
        `;
    }

    hideContextMenu() {
        this.contextMenuOpen = false;
        const menu = document.getElementById('boss-context-menu');
        if(menu) menu.style.display = 'none';
    }

    clippyInteract() { this.showClippy("I see you're clicking randomly. Excellent work ethic."); }
    showClippy(msg) {
        const bubble = document.getElementById('clippy-bubble');
        if (bubble) {
            bubble.textContent = msg;
            bubble.classList.remove('hidden');
            setTimeout(() => bubble.classList.add('hidden'), 4000);
        }
    }
    
    generateFakeExcelData(f) {
         if(!f) return;
         f.data = {};
         // Generate logic here
         f.data['A1'] = {value:'Test', b:true};
    }

    generateDCFData() {
        this.excelData = { 'A1': {value:'DCF Model', b:true} };
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
        let rev = 1000;
        let html = `<tr class="text-gray-500"><th>Year</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr><tr><td class="text-left text-gray-400">Revenue</td>`;
        for(let i=1; i<=5; i++) {
            rev = rev * (1 + growth/100);
            html += `<td>${Math.round(rev)}</td>`;
        }
        html += `</tr>`;
        this.root.querySelector('.dcf-table').innerHTML = html;
        this.root.querySelector('.val-equity').innerText = `$${Math.round(rev * 4)}M`;
    }
}
