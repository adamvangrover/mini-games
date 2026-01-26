import SaveSystem from './SaveSystem.js';
import SoundManager from './SoundManager.js';
import AdsManager from './AdsManager.js';
// Fallback imports if files exist, otherwise defaults are used
import { EMAILS, DOCUMENTS, SLIDES, CHATS, TERMINAL_ADVENTURE, BROWSER_DATA, ERA_CONTENT } from './BossModeContent.js';
// Game Imports
import { MinesweeperApp, Wolf3DApp, NotepadApp } from './BossModeGames.js';

// Helper to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * BossModeLegacy: Adapted from boss_mode_v0.js to work within the unified BossMode framework.
 * This class renders various Legacy OS interfaces (Win95, 98, 2000, XP, Mac, Linux).
 */
export default class BossModeLegacy {
    constructor(container, config = {}) {
        this.container = container;
        this.config = config; // { skin: 'win95' | 'win98' | 'mac' | 'linux', etc }
        this.skin = config.skin || 'legacy'; // Default to Win95

        // --- System State ---
        this.activeApp = null;
        this.startMenuOpen = false;
        this.notificationOpen = false;
        this.wallpaperIndex = 0;

        // --- Managers ---
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.adsManager = AdsManager.getInstance();

        // --- User Profile ---
        this.user = {
            name: "John Doe",
            role: "Senior Risk Analyst",
            initials: "JD"
        };

        // --- Skin Configs ---
        this.skinConfigs = {
            'legacy': { name: 'Windows 95', barPos: 'bottom', startBtn: 'Start', logo: 'fab fa-windows', barColor: 'bg-[#c0c0c0]', winColor: 'bg-[#c0c0c0]', titleColor: 'bg-[#000080]', font: 'font-sans' },
            'win98': { name: 'Windows 98', barPos: 'bottom', startBtn: 'Start', logo: 'fab fa-windows', barColor: 'bg-[#c0c0c0]', winColor: 'bg-[#d4d0c8]', titleColor: 'bg-gradient-to-r from-[#000080] to-[#1084d0]', font: 'font-sans' },
            'win2000': { name: 'Windows 2000', barPos: 'bottom', startBtn: 'Start', logo: 'fab fa-windows', barColor: 'bg-[#d4d0c8]', winColor: 'bg-[#d4d0c8]', titleColor: 'bg-gradient-to-r from-[#000080] to-[#1084d0]', font: 'font-sans' },
            'xp': { name: 'Windows XP', barPos: 'bottom', startBtn: 'Start', logo: 'fab fa-windows', barColor: 'bg-blue-600 border-t-4 border-orange-400', winColor: 'bg-[#ece9d8]', titleColor: 'bg-gradient-to-r from-blue-700 to-blue-500 rounded-t-lg', font: 'font-sans' },
            'mac': { name: 'Mac OS 9', barPos: 'top', startBtn: 'Finder', logo: 'fab fa-apple', barColor: 'bg-gray-200 border-b border-gray-400', winColor: 'bg-gray-100', titleColor: 'bg-gray-300 text-black border-b', font: 'font-serif' },
            'linux': { name: 'GNOME 2', barPos: 'top-bottom', startBtn: 'Applications', logo: 'fab fa-linux', barColor: 'bg-gray-800 text-white', winColor: 'bg-gray-200', titleColor: 'bg-gray-700', font: 'font-sans' },
            'y2k': { name: 'Y2K Glitch', barPos: 'bottom', startBtn: 'ERROR', logo: 'fas fa-bug', barColor: 'bg-red-900', winColor: 'bg-black text-green-500 border-red-500', titleColor: 'bg-red-700 animate-pulse', font: 'font-mono' }
        };

        // --- Assets ---
        this.wallpapers = [
            'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop', // Default Blue
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop', // Landscape
            'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop', // Abstract Dark
            'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop'  // Mountains
        ];

        // Inject Era Specific Wallpapers
        if (ERA_CONTENT) {
            if (this.skin === 'legacy') this.wallpapers = [...this.wallpapers, ...ERA_CONTENT['90s'].wallpapers];
            if (this.skin === 'win98') this.wallpapers = [...this.wallpapers, ...ERA_CONTENT['90s'].wallpapers];
            if (this.skin === 'xp') this.wallpapers = [...this.wallpapers, ...ERA_CONTENT['00s'].wallpapers];
        }

        // --- Application Data ---

        // Excel
        this.excelData = {};
        this.selectedCell = null;
        this.snakeGame = null;
        this.flightGame = null;

        // Word (Stealth Mode)
        this.docIndex = 0;
        this.wordStealthMode = false;
        this.fakeText = "The localized projections regarding the Q3 overflow indicate a substantial misalignment with the core competencies of the stakeholders. Moving forward, we must leverage our synergy to circle back on the low-hanging fruit to maximize quarterly EBITDA. ".split('');
        this.fakeTextPointer = 0;
        this.documents = (typeof DOCUMENTS !== 'undefined') ? DOCUMENTS : [];
        this.docContent = this.documents[0]?.content || "Confidential";

        // PPT
        this.currentSlide = 0;
        this.slides = (typeof SLIDES !== 'undefined') ? [...SLIDES] : [{title: "Synergy", bullets: ["Profit"]}];

        // Email & Chat
        this.emails = (typeof EMAILS !== 'undefined') ? [...EMAILS] : [];
        this.selectedEmail = this.emails[0];
        this.activeChannel = 'general';
        this.chatHistory = (typeof CHATS !== 'undefined') ? JSON.parse(JSON.stringify(CHATS)) : {};

        // Terminal
        this.termHistory = [
            `Microsoft ${this.skinConfigs[this.skin]?.name || 'Windows'} [Version 4.10.1998]`,
            "(c) Corporation. All rights reserved.",
            "",
            `C:\\Users\\${this.user.name.replace(' ', '')}>`
        ];
        this.adventure = null;

        // Spotify
        this.currentTrack = "Nothing Playing";
        this.isPlayingMusic = false;

        // Games
        this.minesweeperInstance = null;
        this.wolf3dInstance = null;
        this.notepadInstance = null;

        // Bind key handler
        this.handleKeyBound = this.handleKey.bind(this);
        document.addEventListener('keydown', this.handleKeyBound);

        this.init();
    }

    init() {
        this.generateExcelData(); // Pre-load fake data
        this.render();
        this.startClippyLoop();
    }

    destroy() {
        document.removeEventListener('keydown', this.handleKeyBound);
        this.cleanupIntervals();
        this.container.innerHTML = '';
        if(this.wolf3dInstance) this.wolf3dInstance.destroy();
    }

    cleanupIntervals() {
        if (this.snakeGame) clearInterval(this.snakeGame.interval);
        if (this.flightGame) clearInterval(this.flightGame.interval);
        if (this.clippyTimer) clearInterval(this.clippyTimer);
        if (this.matrixInterval) clearInterval(this.matrixInterval);
    }

    render() {
        const style = this.skinConfigs[this.skin] || this.skinConfigs['legacy'];

        // Layout logic
        const hasTopBar = style.barPos.includes('top');
        const hasBottomBar = style.barPos.includes('bottom');

        // Icons Layout (Mac puts them right, Win puts them left)
        const iconAlign = this.skin === 'mac' ? 'right-4 items-end' : 'left-4 items-start';

        this.container.innerHTML = `
            <div class="absolute inset-0 flex flex-col ${style.font} text-xs text-black cursor-default select-none overflow-hidden">

                ${hasTopBar ? this.renderTopBar(style) : ''}

                <div class="flex-1 relative overflow-hidden bg-cover bg-center flex flex-col transition-[background-image] duration-500" style="background-image: url('${this.wallpapers[this.wallpaperIndex]}')">

                    <div class="absolute top-4 ${iconAlign} flex flex-col gap-4 w-20" id="desktop-icons">
                        ${this.createDesktopIcon('Recycle Bin', 'fa-trash-alt', 'text-gray-200')}
                        ${this.createDesktopIcon('Quarterly_Report', 'fa-file-excel', 'text-green-500', "BossMode.instance.legacyOS.launchApp('excel')")}
                        ${this.createDesktopIcon('Meeting_Notes', 'fa-file-word', 'text-blue-500', "BossMode.instance.legacyOS.launchApp('word')")}
                        ${this.createDesktopIcon('Intranet', 'fa-globe', 'text-blue-300', "BossMode.instance.legacyOS.launchApp('edge')")}
                        ${this.createDesktopIcon('Confidential', 'fa-folder', 'text-yellow-400', "alert('Access Denied')")}
                        ${this.skin === 'mac' ? this.createDesktopIcon('Macintosh HD', 'fa-hdd', 'text-gray-300') : ''}

                        <!-- Games Folder -->
                        ${this.createDesktopIcon('Wolfenstein 3D', 'fas fa-crosshairs', 'text-red-600', "BossMode.instance.legacyOS.launchApp('wolf3d')")}
                        ${this.createDesktopIcon('Solitaire', 'fas fa-clone', 'text-green-600', "BossMode.instance.legacyOS.launchApp('solitaire')")}
                    </div>

                    ${this.activeApp ? this.getAppWindowHtml(style) : ''}

                    ${this.startMenuOpen && hasBottomBar ? this.getStartMenuHtml(style) : ''}
                </div>

                ${hasBottomBar ? this.renderBottomBar(style) : ''}
            </div>
        `;

        // Re-attach listeners
        this.attachListeners();

        // Post-render hooks
        const contentArea = this.container.querySelector('.window-content');
        if (contentArea) {
            if (this.activeApp === 'excel') this.initExcelGrid();
            if (this.activeApp === 'minesweeper') new MinesweeperApp(contentArea);
            if (this.activeApp === 'wolf3d') this.wolf3dInstance = new Wolf3DApp(contentArea);
            if (this.activeApp === 'notepad') new NotepadApp(contentArea);
            if (this.activeApp === 'solitaire') this.renderSolitaire(contentArea);
            if (this.activeApp === 'terminal') {
                const termInput = document.getElementById('term-input');
                if(termInput) termInput.focus();
            }
        }
    }

    attachListeners() {
        // Placeholder for future event delegation if needed
    }

    createDesktopIcon(name, icon, color, action = null) {
        const safeAction = action ? action.replace('BossMode.instance.launchApp', 'BossMode.instance.legacyOS.launchApp') : '';
        return `
            <div class="flex flex-col items-center gap-1 group cursor-pointer w-20 text-white drop-shadow-md hover:bg-white/10 rounded p-2 transition-colors" onclick="${safeAction}">
                <i class="fas ${icon} text-3xl ${color} group-hover:scale-110 transition-transform filter drop-shadow-lg"></i>
                <span class="text-[11px] text-center leading-tight line-clamp-2 text-shadow-sm font-medium bg-black/20 rounded px-1">${name}</span>
            </div>
        `;
    }

    renderTopBar(style) {
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        if(this.skin === 'mac') {
            return `
                <div class="h-6 bg-white border-b border-gray-400 flex items-center justify-between px-4 z-[10001] shadow-sm text-black font-bold">
                    <div class="flex gap-4">
                        <i class="fab fa-apple"></i>
                        <span class="font-bold">Finder</span>
                        <span class="font-normal">File</span>
                        <span class="font-normal">Edit</span>
                        <span class="font-normal">View</span>
                        <span class="font-normal">Go</span>
                        <span class="font-normal">Special</span>
                    </div>
                    <div class="flex gap-4">
                        <i class="fas fa-search"></i>
                        <span>${time}</span>
                    </div>
                </div>
            `;
        }
        // Linux/Gnome Style
        return `
            <div class="h-6 ${style.barColor} flex items-center justify-between px-2 z-[10001] shadow-sm">
                <div class="flex gap-4 items-center">
                    <div class="flex items-center gap-1 cursor-pointer hover:bg-white/10 px-2 rounded" onclick="BossMode.instance.legacyOS.toggleStartMenu()">
                        <i class="${style.logo}"></i> <span>Applications</span>
                    </div>
                    <span>Places</span>
                    <span>System</span>
                </div>
                <div class="flex gap-4 items-center">
                    <span>${time}</span>
                    <i class="fas fa-power-off cursor-pointer" onclick="BossMode.instance.toggle(false)"></i>
                </div>
            </div>
        `;
    }

    renderBottomBar(style) {
        const apps = [
            { id: 'excel', icon: 'fa-file-excel', color: 'text-green-500', label: 'Excel' },
            { id: 'word', icon: 'fa-file-word', color: 'text-blue-500', label: 'Word' },
            { id: 'ppt', icon: 'fa-file-powerpoint', color: 'text-orange-500', label: 'PowerPoint' },
            { id: 'email', icon: 'fa-envelope', color: 'text-blue-300', label: 'Outlook' },
            { id: 'chat', icon: 'fa-comments', color: 'text-indigo-400', label: 'Teams' },
            { id: 'spotify', icon: 'fa-spotify', color: 'text-green-400', label: 'Spotify' },
            { id: 'terminal', icon: 'fa-terminal', color: 'text-gray-400', label: 'Terminal' },
            { id: 'minesweeper', icon: 'fa-bomb', color: 'text-red-400', label: 'Minesweeper' },
            { id: 'wolf3d', icon: 'fas fa-crosshairs', color: 'text-red-600', label: 'Wolf3D' }
        ];

        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        let barClass = style.barColor + " h-10 border-t-2 border-white flex items-center justify-between px-1 z-[10001] select-none shadow-lg shrink-0 text-black";
        let btnClass = "h-8 px-2 border-2 border-white border-b-black border-r-black bg-[#c0c0c0] flex items-center justify-center cursor-pointer gap-1 active:border-t-black active:border-l-black active:border-b-white active:border-r-white";

        if (this.skin === 'xp') {
            barClass = style.barColor + " h-10 flex items-center justify-between px-0 z-[10001] select-none shadow-lg shrink-0 text-white";
            btnClass = "h-10 px-4 bg-green-600 rounded-r-lg flex items-center justify-center cursor-pointer gap-1 hover:bg-green-500 italic font-bold shadow-inner border-r-2 border-green-400";
        }

        return `
            <div class="${barClass}">
                <div class="flex items-center gap-1 h-full">
                     <div class="${btnClass}" onclick="BossMode.instance.legacyOS.toggleStartMenu()">
                        <i class="${style.logo} text-lg ${this.skin==='xp'?'text-white italic':''}"></i>
                        <span class="font-bold">${style.startBtn}</span>
                    </div>

                    ${this.skin !== 'xp' ? '<div class="w-1 h-6 border-l border-gray-400 border-r border-white mx-1"></div>' : '<div class="w-2"></div>'}

                    ${apps.map(app => `
                        <div class="h-8 w-8 flex items-center justify-center cursor-pointer transition-all relative group ${this.activeApp === app.id ? 'bg-[#d0d0d0] border-2 border-black border-t-gray-600 border-l-gray-600' : 'hover:bg-white/10'}" onclick="BossMode.instance.legacyOS.launchApp('${app.id}')">
                            <i class="fas ${app.icon} ${app.color} text-lg"></i>
                        </div>
                    `).join('')}
                </div>

                <div class="flex items-center gap-2 text-[11px] h-full px-2 ${this.skin==='xp'?'bg-[#137ade] border-l-2 border-[#1990eb]':'border-2 border-gray-400 border-b-white border-r-white inset-shadow'}">
                    <i class="fas fa-volume-up cursor-pointer" onclick="BossMode.instance.soundManager.toggleMute()"></i>
                    <span class="mx-1">${time}</span>
                </div>
            </div>
        `;
    }

    launchApp(appId) {
        if(this.wolf3dInstance) {
            this.wolf3dInstance.destroy();
            this.wolf3dInstance = null;
        }
        this.activeApp = appId;
        this.startMenuOpen = false;
        this.soundManager.playSound('click');
        this.render();
    }

    logout() {
        // Clear state and return to Login
        this.activeApp = null;
        this.cleanupIntervals();
        if(this.wolf3dInstance) this.wolf3dInstance.destroy();
        this.container.innerHTML = '';
        BossMode.instance.logout();
    }

    closeWindow() {
        if(this.wolf3dInstance) {
            this.wolf3dInstance.destroy();
            this.wolf3dInstance = null;
        }
        this.activeApp = null;
        this.cleanupIntervals();
        this.render();
    }

    toggleStartMenu() {
        this.startMenuOpen = !this.startMenuOpen;
        this.notificationOpen = false;
        this.render();
    }

    getAppWindowHtml(style) {
        let content = '';
        let title = 'Application';
        let width = 'left-8 right-8'; // Default wide

        // Window Chrome Styles
        let winClass = `absolute ${width} top-8 bottom-16 ${style.winColor} border-2 border-white border-r-black border-b-black shadow-xl flex flex-col p-1`;
        let headerClass = `${style.titleColor} h-6 flex items-center justify-between px-2 select-none shrink-0 mb-1 text-white font-bold`;

        if (this.skin === 'xp') {
            winClass = `absolute ${width} top-8 bottom-16 ${style.winColor} border-4 border-blue-600 rounded-t-lg shadow-2xl flex flex-col p-0`;
            headerClass = `${style.titleColor} h-8 flex items-center justify-between px-2 select-none shrink-0 text-white font-bold text-shadow`;
        } else if (this.skin === 'mac') {
             winClass = `absolute ${width} top-10 bottom-10 ${style.winColor} border border-gray-400 shadow-xl flex flex-col p-0`;
             headerClass = `${style.titleColor} h-6 flex items-center justify-center relative select-none shrink-0`; // Mac centers title
        }

        switch(this.activeApp) {
            case 'excel': title = 'Microsoft Excel'; content = this.getExcelContent(); break;
            case 'word': title = 'Microsoft Word'; content = this.getWordContent(); break;
            case 'ppt': title = 'Microsoft PowerPoint'; content = this.getPPTContent(); break;
            case 'email': title = 'Outlook Express'; content = this.getEmailContent(); break;
            case 'chat': title = 'IRC Client'; content = this.getChatContent(); break;
            case 'terminal': title = 'Command Prompt'; content = this.getTerminalContent(); break;
            case 'edge': title = 'Internet Explorer'; content = this.getEdgeContent(); break;
            case 'minesweeper':
                title = 'Minesweeper';
                content = ''; // Rendered by class
                winClass = winClass.replace('left-8 right-8', 'left-1/3 right-1/3 top-20 bottom-auto h-96'); // Smaller window
                break;
            case 'wolf3d':
                title = 'Wolfenstein 3D';
                content = ''; // Rendered by class
                winClass = winClass.replace('left-8 right-8', 'left-1/4 right-1/4 top-10 bottom-20');
                break;
            case 'notepad':
                title = 'Notepad';
                content = '';
                winClass = winClass.replace('left-8 right-8', 'left-1/4 right-1/4 top-20 bottom-1/3');
                break;
            case 'solitaire':
                title = 'Solitaire';
                content = `<div class="h-full bg-green-700 flex items-center justify-center text-white">Solitaire Loading...</div>`;
                break;
            case 'spotify':
                title = 'WinAmp';
                content = this.getSpotifyContent();
                break;
        }

        // Close Button Logic
        let closeBtn = `<button class="w-4 h-4 bg-[#c0c0c0] border border-white border-b-black border-r-black flex items-center justify-center text-[10px] font-bold text-black hover:bg-white" onclick="BossMode.instance.legacyOS.closeWindow()">X</button>`;
        if(this.skin === 'xp') closeBtn = `<button class="w-6 h-6 bg-red-500 rounded border border-white/50 flex items-center justify-center text-white hover:bg-red-600" onclick="BossMode.instance.legacyOS.closeWindow()">X</button>`;
        if(this.skin === 'mac') closeBtn = `<div class="absolute left-2 flex gap-1"><div class="w-3 h-3 rounded-full bg-red-500 border border-red-600 cursor-pointer" onclick="BossMode.instance.legacyOS.closeWindow()"></div><div class="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-600"></div><div class="w-3 h-3 rounded-full bg-green-500 border border-green-600"></div></div>`;

        return `
            <div class="${winClass} os-window">
                <div class="${headerClass}">
                    ${this.skin === 'mac' ? closeBtn : ''} <!-- Mac buttons on left -->

                    ${this.skin !== 'mac' ? `<div class="flex items-center gap-2"><img src="https://img.icons8.com/color/48/000000/windows-logo.png" class="w-4 h-4 hidden"><span class="text-xs">${title}</span></div>` : `<span class="text-xs text-black">${title}</span>`}

                    ${this.skin !== 'mac' ? `<div class="flex items-center gap-1">${closeBtn}</div>` : ''}
                </div>
                <div class="flex-1 overflow-hidden flex flex-col relative bg-white border border-gray-500 window-content">
                    ${content}
                </div>
            </div>
        `;
    }

    getStartMenuHtml(style) {
        let menuClass = "absolute bottom-11 left-0 w-48 bg-[#c0c0c0] border-2 border-white border-r-black border-b-black shadow-xl flex flex-col z-[10002]";
        let sideBar = `<div class="bg-[#000080] text-white font-bold px-2 py-4 vertical-text absolute left-0 top-0 bottom-0 w-6 flex items-end"><span class="-rotate-90 origin-bottom-left translate-x-6 mb-2">WINDOWS</span></div>`;
        let itemHover = "hover:bg-[#000080] hover:text-white";

        if(this.skin === 'xp') {
            menuClass = "absolute bottom-10 left-0 w-64 bg-white border-2 border-blue-600 rounded-t-lg shadow-2xl flex flex-col z-[10002] overflow-hidden";
            sideBar = `<div class="bg-blue-600 p-2 flex items-center gap-2 text-white font-bold border-b border-orange-400"><div class="w-8 h-8 rounded border-2 border-white bg-blue-400 overflow-hidden"><i class="fas fa-user-circle text-2xl"></i></div>${this.user.name}</div>`;
            itemHover = "hover:bg-blue-100";
        }

        return `
            <div class="${menuClass}">
                ${this.skin !== 'xp' ? sideBar : ''}
                ${this.skin === 'xp' ? sideBar : ''} <!-- Header for XP -->

                <div class="${this.skin !== 'xp' ? 'pl-8' : 'p-2'} py-1 flex flex-col gap-1 bg-white">
                    ${['excel','word','ppt','email','chat','edge','terminal','minesweeper','notepad','wolf3d'].map(app => `
                        <div class="px-2 py-1 ${itemHover} cursor-pointer flex items-center gap-2" onclick="BossMode.instance.legacyOS.launchApp('${app}')">
                            <i class="fas fa-caret-right text-xs text-gray-400"></i>
                            <span class="capitalize text-sm font-medium">${app}</span>
                        </div>
                    `).join('')}
                    <div class="border-t border-gray-400 my-1"></div>
                    <div class="border-t border-gray-400 my-1"></div>
                    <div class="px-2 py-1 ${itemHover} cursor-pointer flex items-center gap-2" onclick="BossMode.instance.legacyOS.logout()">
                        <i class="fas fa-sign-out-alt text-xs text-yellow-600"></i>
                        <span>Log Off ${this.user.name}...</span>
                    </div>
                    <div class="px-2 py-1 ${itemHover} cursor-pointer flex items-center gap-2" onclick="BossMode.instance.toggle(false)">
                        <i class="fas fa-power-off text-xs text-red-500"></i>
                        <span>Shut Down...</span>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Content Helpers ---
    getExcelContent() {
        return `<div class="flex flex-col h-full">
            <div class="bg-[#c0c0c0] p-1 flex gap-2 border-b border-gray-400">
                <button onclick="BossMode.instance.legacyOS.generateExcelData()">Reset</button>
                <button onclick="BossMode.instance.legacyOS.generateDCF()">DCF</button>
            </div>
            <div class="flex items-center gap-2 p-1 bg-white border-b border-gray-400">
                <div id="boss-cell-addr" class="w-10 border border-gray-400 text-center bg-gray-100">A1</div>
                <input id="boss-formula-input" class="flex-1 border border-gray-400 px-1 font-mono">
            </div>
            <div class="flex-1 overflow-auto bg-[#c0c0c0] relative p-1">
                 <div class="flex mb-1"><div class="w-8"></div><div id="boss-col-headers" class="flex"></div></div>
                 <div class="flex"><div id="boss-row-headers" class="w-8 flex flex-col"></div><div id="boss-grid" class="grid bg-gray-500 gap-[1px]"></div></div>
            </div>
        </div>`;
    }

    getWordContent() { return `<div class="p-8 h-full overflow-y-auto bg-gray-200"><div class="bg-white shadow-md p-8 min-h-full font-serif text-black" contenteditable="true">${escapeHTML(this.docContent)}</div></div>`; }
    getPPTContent() { return `<div class="flex h-full"><div class="w-32 bg-gray-200 border-r p-2">${this.slides.map((s,i)=>`<div class="bg-white mb-2 p-1 text-[8px] cursor-pointer" onclick="BossMode.instance.legacyOS.setSlide(${i})">Slide ${i+1}</div>`).join('')}</div><div class="flex-1 p-8 bg-gray-100 flex items-center justify-center"><div class="bg-white w-full aspect-video p-8 shadow-lg text-black"><h1>${escapeHTML(this.slides[this.currentSlide].title)}</h1><ul>${this.slides[this.currentSlide].bullets.map(b=>`<li>${escapeHTML(b)}</li>`).join('')}</ul></div></div></div>`; }
    getEmailContent() { return `<div class="flex h-full"><div class="w-48 bg-white border-r overflow-y-auto text-black">${this.emails.map(e=>`<div class="p-2 border-b hover:bg-blue-100 cursor-pointer" onclick="BossMode.instance.legacyOS.selectEmail(${e.id})"><b>${escapeHTML(e.from)}</b><br>${escapeHTML(e.subject)}</div>`).join('')}</div><div class="flex-1 p-4 bg-white text-black">${this.selectedEmail?`<b>Subject: ${escapeHTML(this.selectedEmail.subject)}</b><hr class="my-2"><pre class="font-sans">${escapeHTML(this.selectedEmail.body)}</pre>`:''}</div></div>`; }
    getChatContent() { return `<div class="flex flex-col h-full text-black"><div class="flex-1 p-2 overflow-y-auto bg-white" id="chat-msgs">${(this.chatHistory[this.activeChannel]||[]).map(m=>`<div><b>${escapeHTML(m.user)}:</b> ${escapeHTML(m.text)}</div>`).join('')}</div><div class="p-2 border-t"><input id="chat-input" class="w-full border p-1" onkeydown="if(event.key==='Enter') BossMode.instance.legacyOS.sendChat()"></div></div>`; }
    getTerminalContent() { return `<div class="bg-black text-gray-300 font-mono h-full p-2 overflow-y-auto"><div id="term-output">${this.termHistory.map(l=>`<div>${escapeHTML(l)}</div>`).join('')}</div><div class="flex"><span>></span><input id="term-input" class="bg-black text-gray-300 border-none outline-none flex-1 ml-1" autofocus onkeydown="if(event.key==='Enter') BossMode.instance.legacyOS.runTerminalCommand(this.value)"></div></div>`; }
    getEdgeContent() { return `<div class="h-full bg-white flex flex-col text-black"><div class="bg-gray-200 p-1 border-b">Address: <input value="http://intranet.corp" class="w-1/2"></div><div class="p-4"><h1>Intranet</h1><p>Welcome to the corporate portal.</p><ul><li><a href="#">HR Policies</a></li><li><a href="#">Cafeteria Menu</a></li></ul></div></div>`; }
    getSpotifyContent() { return `<div class="bg-[#222] text-[#0f0] font-mono h-full p-2 flex flex-col"><div class="border border-[#0f0] p-2 mb-2 text-center text-xl">${this.currentTrack}</div><div class="flex gap-2 justify-center text-2xl"><button onclick="BossMode.instance.legacyOS.toggleMusic()">[ ${this.isPlayingMusic?'PAUSE':'PLAY'} ]</button></div><div class="mt-4 border-t border-[#0f0] pt-2">PLAYLIST:<br>1. Acid Mix<br>2. Glitch<br>3. Ambient</div></div>`; }

    // --- Logic Implementations ---
    generateExcelData() { this.excelData = {"A1":{value:"Data"},"B1":{value:100}}; if(this.activeApp==='excel') this.updateExcelGrid(); }
    generateDCF() { this.excelData={"A1":{value:"DCF"},"A2":{value:"Val:"},"B2":{value:"$1M"}}; this.updateExcelGrid(); }
    initExcelGrid() {
        const grid = document.getElementById('boss-grid');
        const colHeaders = document.getElementById('boss-col-headers');
        const rowHeaders = document.getElementById('boss-row-headers');
        if(!grid) return;

        grid.style.gridTemplateColumns = `repeat(10, 60px)`;
        colHeaders.innerHTML = ''; rowHeaders.innerHTML = '';

        for(let i=0;i<10;i++) {
            const d = document.createElement('div'); d.className="w-[60px] border-r border-gray-400 text-center bg-gray-200"; d.textContent=String.fromCharCode(65+i); colHeaders.appendChild(d);
        }
        for(let i=1;i<=20;i++) {
             const d = document.createElement('div'); d.className="h-[20px] border-b border-gray-400 text-center bg-gray-200"; d.textContent=i; rowHeaders.appendChild(d);
        }

        grid.innerHTML='';
        for(let r=1;r<=20;r++) {
            for(let c=0;c<10;c++) {
                const id = `${String.fromCharCode(65+c)}${r}`;
                const cell = document.createElement('div');
                cell.className="h-[20px] bg-white border-r border-b border-gray-300 overflow-hidden text-[10px] px-1";
                cell.id=`cell-${id}`;
                cell.onclick = () => this.selectCell(id);
                grid.appendChild(cell);
            }
        }
        this.updateExcelGrid();
    }
    updateExcelGrid() {
        for(let id in this.excelData) {
            const el = document.getElementById(`cell-${id}`);
            if(el) el.textContent = this.excelData[id].value;
        }
    }
    selectCell(id) {
        this.selectedCell=id;
        document.getElementById('boss-cell-addr').textContent=id;
        const val = this.excelData[id]?.value||'';
        document.getElementById('boss-formula-input').value=val;
    }

    // Key Handler
    handleKey(e) {
        if (this.activeApp === 'excel') {
             // Basic nav could go here
        }
    }

    startClippyLoop() {
        if(this.skin === 'win2000' || this.skin === 'xp' || this.skin === 'mac') return; // No Clippy on newer/mac OS
        // ... (Clippy logic if needed)
    }

    // Music
    toggleMusic() {
        this.isPlayingMusic = !this.isPlayingMusic;
        if(this.isPlayingMusic) {
             this.soundManager.setMusicStyle('chiptune');
             this.soundManager.startBGM();
             this.currentTrack = "Chiptune Mix";
        } else {
             this.soundManager.stopBGM();
             this.currentTrack = "Paused";
        }
        this.render();
    }

    renderSolitaire(c) {
        c.innerHTML = `
            <div class="h-full bg-green-700 p-4 flex flex-col items-center justify-center text-white">
                <div class="border-2 border-white rounded p-4 bg-green-800 shadow-xl">
                    <h1 class="text-2xl font-bold mb-4">Solitaire</h1>
                    <div class="flex gap-4">
                        <div class="w-16 h-24 bg-white rounded border-2 border-gray-300 shadow flex items-center justify-center text-black font-bold">A <span class="text-red-500">♥</span></div>
                        <div class="w-16 h-24 bg-blue-800 rounded border-2 border-white shadow bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
                    </div>
                    <p class="mt-4 text-xs">Simulated for productivity.</p>
                </div>
            </div>
        `;
    }

    runTerminalCommand(cmd) {
        this.termHistory.push(`C:\\> ${cmd}`);
        this.render();
    }
    sendChat() {
        const inp = document.getElementById('chat-input');
        if(inp.value) {
            if(!this.chatHistory[this.activeChannel]) this.chatHistory[this.activeChannel] = [];
            this.chatHistory[this.activeChannel].push({user:"Me", text:inp.value});
            this.render();
        }
    }
    setSlide(i) { this.currentSlide = i; this.render(); }
    selectEmail(id) { this.selectedEmail = this.emails.find(e=>e.id===id); this.render(); }
}
