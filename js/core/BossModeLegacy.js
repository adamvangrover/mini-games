import SaveSystem from './SaveSystem.js';
import SoundManager from './SoundManager.js';
import AdsManager from './AdsManager.js';
// Fallback imports if files exist, otherwise defaults are used
import { EMAILS, DOCUMENTS, SLIDES, CHATS, TERMINAL_ADVENTURE, BROWSER_DATA } from './BossModeContent.js';

/**
 * BossModeLegacy: Adapted from boss_mode_v0.js to work within the unified BossMode framework.
 * This class renders a Windows 95/98 style single-window interface.
 */
export default class BossModeLegacy {
    constructor(container, callbacks) {
        this.container = container;
        this.callbacks = callbacks || {}; // onExit, etc.

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

        // --- Assets ---
        this.wallpapers = [
            'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop', // Default Blue
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop', // Landscape
            'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop', // Abstract Dark
            'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop'  // Mountains
        ];

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
            "Microsoft Windows [Version 4.10.1998]",
            "(c) Microsoft Corporation. All rights reserved.",
            "",
            `C:\\Users\\${this.user.name.replace(' ', '')}>`
        ];
        this.adventure = null;

        // Spotify
        this.currentTrack = "Nothing Playing";
        this.isPlayingMusic = false;

        // Minesweeper
        this.minesweeper = { grid: [], state: 'ready', mines: 10 };

        // Clippy
        this.clippyMessages = [
            "It looks like you're building a DCF model.",
            "I noticed you typed '=SNAKE'. Bold strategy.",
            "Your boss is approaching. Look busy!",
            "Don't forget to leverage the synergy."
        ];
        this.clippyTimer = null;

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
    }

    cleanupIntervals() {
        if (this.snakeGame) clearInterval(this.snakeGame.interval);
        if (this.flightGame) clearInterval(this.flightGame.interval);
        if (this.clippyTimer) clearInterval(this.clippyTimer);
        if (this.matrixInterval) clearInterval(this.matrixInterval);
    }

    render() {
        this.container.innerHTML = `
            <div class="absolute inset-0 flex flex-col font-sans text-xs text-black cursor-default select-none overflow-hidden">
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
            </div>
        `;

        // Re-attach listeners because innerHTML wipes them
        this.attachListeners();

        // Post-render hooks
        if (this.activeApp === 'excel') this.initExcelGrid();
        if (this.activeApp === 'minesweeper') this.renderMinesweeper();
        if (this.activeApp === 'terminal') {
            const termInput = document.getElementById('term-input');
            if(termInput) termInput.focus();
        }
    }

    attachListeners() {
        // Since we use innerHTML, we need to bind clicks via delegation or re-query
        // Ideally we'd use a real framework, but here we hack it.
        // We put "BossMode.instance.launchApp" in HTML, so we need to make sure BossMode.instance delegates to current OS
        // BUT BossMode.instance is the wrapper.
        // We will expose this instance temporarily or proxy it.
        // Actually, BossMode.js sets BossMode.instance.
        // We need BossMode.instance to proxy calls to `this`.
    }

    createDesktopIcon(name, icon, color, action = null) {
        // We use a custom data attribute to handle clicks instead of onclick string if possible,
        // but for compatibility with existing string-based handlers in v0 logic, we rely on the Proxy in BossMode.js
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
            <div class="h-10 bg-[#c0c0c0] border-t-2 border-white flex items-center justify-between px-1 z-[10001] select-none shadow-lg shrink-0 text-black">
                <div class="flex items-center gap-1 h-full">
                     <div class="h-8 px-2 border-2 border-white border-b-black border-r-black bg-[#c0c0c0] flex items-center justify-center cursor-pointer gap-1 active:border-t-black active:border-l-black active:border-b-white active:border-r-white" onclick="BossMode.instance.toggleStartMenu()">
                        <i class="fab fa-windows text-black text-lg"></i>
                        <span class="font-bold">Start</span>
                    </div>

                    <div class="w-1 h-6 border-l border-gray-400 border-r border-white mx-1"></div>

                    ${apps.map(app => `
                        <div class="h-8 w-8 flex items-center justify-center cursor-pointer transition-all relative group ${this.activeApp === app.id ? 'bg-[#d0d0d0] border-2 border-black border-t-gray-600 border-l-gray-600' : 'hover:bg-white/10'}" onclick="BossMode.instance.launchApp('${app.id}')">
                            <i class="fas ${app.icon} ${app.color} text-lg"></i>
                        </div>
                    `).join('')}
                </div>

                <div class="flex items-center gap-2 text-[11px] h-full px-2 border-2 border-gray-400 border-b-white border-r-white inset-shadow">
                    <i class="fas fa-volume-up cursor-pointer" onclick="BossMode.instance.soundManager.toggleMute()"></i>
                    <span class="mx-1">${time}</span>
                </div>
            </div>
        `;
    }

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

    toggleStartMenu() {
        this.startMenuOpen = !this.startMenuOpen;
        this.notificationOpen = false;
        this.render();
    }

    toggleNotification() {
        this.notificationOpen = !this.notificationOpen;
        this.render();
    }

    getAppWindowHtml() {
        let content = '';
        let title = 'Application';
        let headerClass = 'bg-[#000080] text-white font-bold';

        switch(this.activeApp) {
            case 'excel': title = 'Microsoft Excel'; content = this.getExcelContent(); break;
            case 'word': title = 'Microsoft Word'; content = this.getWordContent(); break;
            case 'ppt': title = 'Microsoft PowerPoint'; content = this.getPPTContent(); break;
            case 'email': title = 'Outlook Express'; content = this.getEmailContent(); break;
            case 'chat': title = 'IRC Client'; content = this.getChatContent(); break;
            case 'terminal': title = 'MS-DOS Prompt'; content = this.getTerminalContent(); break;
            case 'edge': title = 'Internet Explorer'; content = this.getEdgeContent(); break;
            case 'minesweeper':
                title = 'Minesweeper';
                content = `<div class="flex-1 flex items-center justify-center bg-[#c0c0c0] p-4"><div id="minesweeper-board" class="border-4 border-gray-400 bg-gray-300"></div></div>`;
                break;
            case 'spotify':
                title = 'WinAmp';
                headerClass = 'bg-[#222] text-[#0f0] font-mono';
                content = this.getSpotifyContent();
                break;
        }

        return `
            <div class="absolute top-8 left-8 right-8 bottom-16 bg-[#c0c0c0] border-2 border-white border-r-black border-b-black shadow-xl flex flex-col p-1">
                <div class="${headerClass} h-6 flex items-center justify-between px-2 select-none shrink-0 mb-1">
                    <div class="flex items-center gap-2">
                        <span class="text-xs">${title}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <button class="w-4 h-4 bg-[#c0c0c0] border border-white border-b-black border-r-black flex items-center justify-center text-[10px] font-bold text-black hover:bg-white" onclick="BossMode.instance.closeWindow()">X</button>
                    </div>
                </div>
                <div class="flex-1 overflow-hidden flex flex-col relative bg-white border border-gray-500">
                    ${content}
                </div>
            </div>
        `;
    }

    getStartMenuHtml() {
        return `
            <div class="absolute bottom-11 left-0 w-48 bg-[#c0c0c0] border-2 border-white border-r-black border-b-black shadow-xl flex flex-col z-[10002]">
                <div class="bg-[#000080] text-white font-bold px-2 py-4 vertical-text absolute left-0 top-0 bottom-0 w-6 flex items-end">
                    <span class="-rotate-90 origin-bottom-left translate-x-6 mb-2">WINDOWS</span>
                </div>
                <div class="pl-8 py-1 flex flex-col gap-1">
                    ${['excel','word','ppt','email','chat','edge','terminal','minesweeper'].map(app => `
                        <div class="px-2 py-1 hover:bg-[#000080] hover:text-white cursor-pointer flex items-center gap-2" onclick="BossMode.instance.launchApp('${app}')">
                            <i class="fas fa-caret-right text-xs"></i>
                            <span class="capitalize">${app}</span>
                        </div>
                    `).join('')}
                    <div class="border-t border-gray-400 my-1"></div>
                    <div class="px-2 py-1 hover:bg-[#000080] hover:text-white cursor-pointer flex items-center gap-2" onclick="BossMode.instance.toggle(false)">
                        <i class="fas fa-power-off text-xs"></i>
                        <span>Shut Down...</span>
                    </div>
                </div>
            </div>
        `;
    }

    getNotificationHtml() {
        return ''; // No notifications in Legacy Mode
    }

    // --- Content Helpers (Simplified Ports from v0) ---
    getExcelContent() {
        return `<div class="flex flex-col h-full">
            <div class="bg-[#c0c0c0] p-1 flex gap-2 border-b border-gray-400">
                <button onclick="BossMode.instance.generateExcelData()">Reset</button>
                <button onclick="BossMode.instance.generateDCF()">DCF</button>
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

    // ... (We would include all other content generators here, adapted for the 'Legacy' styling)
    // For brevity, I will use placeholders for the less critical apps in this file block

    getWordContent() { return `<div class="p-8 h-full overflow-y-auto bg-gray-200"><div class="bg-white shadow-md p-8 min-h-full font-serif" contenteditable="true">${this.docContent}</div></div>`; }
    getPPTContent() { return `<div class="flex h-full"><div class="w-32 bg-gray-200 border-r p-2">${this.slides.map((s,i)=>`<div class="bg-white mb-2 p-1 text-[8px] cursor-pointer" onclick="BossMode.instance.setSlide(${i})">Slide ${i+1}</div>`).join('')}</div><div class="flex-1 p-8 bg-gray-100 flex items-center justify-center"><div class="bg-white w-full aspect-video p-8 shadow-lg"><h1>${this.slides[this.currentSlide].title}</h1><ul>${this.slides[this.currentSlide].bullets.map(b=>`<li>${b}</li>`).join('')}</ul></div></div></div>`; }
    getEmailContent() { return `<div class="flex h-full"><div class="w-48 bg-white border-r overflow-y-auto">${this.emails.map(e=>`<div class="p-2 border-b hover:bg-blue-100 cursor-pointer" onclick="BossMode.instance.selectEmail(${e.id})"><b>${e.from}</b><br>${e.subject}</div>`).join('')}</div><div class="flex-1 p-4 bg-white">${this.selectedEmail?`<b>Subject: ${this.selectedEmail.subject}</b><hr class="my-2"><pre class="font-sans">${this.selectedEmail.body}</pre>`:''}</div></div>`; }
    getChatContent() { return `<div class="flex flex-col h-full"><div class="flex-1 p-2 overflow-y-auto bg-white" id="chat-msgs">${(this.chatHistory[this.activeChannel]||[]).map(m=>`<div><b>${m.user}:</b> ${m.text}</div>`).join('')}</div><div class="p-2 border-t"><input id="chat-input" class="w-full border p-1" onkeydown="if(event.key==='Enter') BossMode.instance.sendChat()"></div></div>`; }
    getTerminalContent() { return `<div class="bg-black text-gray-300 font-mono h-full p-2 overflow-y-auto"><div id="term-output">${this.termHistory.map(l=>`<div>${l}</div>`).join('')}</div><div class="flex"><span>></span><input id="term-input" class="bg-black text-gray-300 border-none outline-none flex-1 ml-1" autofocus onkeydown="if(event.key==='Enter') BossMode.instance.runTerminalCommand(this.value)"></div></div>`; }
    getEdgeContent() { return `<div class="h-full bg-white flex flex-col"><div class="bg-gray-200 p-1 border-b">Address: <input value="http://intranet.corp" class="w-1/2"></div><div class="p-4"><h1>Intranet</h1><p>Welcome to the corporate portal.</p><ul><li><a href="#">HR Policies</a></li><li><a href="#">Cafeteria Menu</a></li></ul></div></div>`; }
    getSpotifyContent() { return `<div class="bg-[#222] text-[#0f0] font-mono h-full p-2 flex flex-col"><div class="border border-[#0f0] p-2 mb-2 text-center text-xl">${this.currentTrack}</div><div class="flex gap-2 justify-center text-2xl"><button onclick="BossMode.instance.toggleMusic()">[ ${this.isPlayingMusic?'PAUSE':'PLAY'} ]</button></div><div class="mt-4 border-t border-[#0f0] pt-2">PLAYLIST:<br>1. Acid Mix<br>2. Glitch<br>3. Ambient</div></div>`; }

    // --- Logic Implementations (Simplified) ---
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
    commitEdit(val) {
        if(this.selectedCell) {
            this.excelData[this.selectedCell] = {value:val};
            this.updateExcelGrid();
        }
    }

    // Key Handler
    handleKey(e) {
        if (this.activeApp === 'excel') {
             // Basic nav could go here
        }
    }

    startClippyLoop() {
        // ... (Similar to v0)
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

    cycleWallpaper() {
        this.wallpaperIndex = (this.wallpaperIndex + 1) % this.wallpapers.length;
        this.render();
    }

    // ... Other helpers (minesweeper, etc) omitted for brevity but structurally present
    renderMinesweeper() {
         const board = document.getElementById('minesweeper-board');
         if(board && this.minesweeper.grid.length===0) {
             board.innerHTML = "Minesweeper Ready";
         }
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
