import SaveSystem from './SaveSystem.js';
import SoundManager from './SoundManager.js';
import AdsManager from './AdsManager.js';
import { EMAILS, DOCUMENTS, SLIDES, CHATS, TERMINAL_ADVENTURE } from './BossModeContent.js';

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

export default class BossModeV0 {
    constructor(container) {
        this.container = container;
        this.isActive = true;
        this.mode = 'excel';
        this.startMenuOpen = false;
        this.notificationOpen = false;

        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.adsManager = AdsManager.getInstance();

        // State tracking
        this.wasMuted = false;
        this.wallpaperIndex = 0;
        this.wallpapers = [
            'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop'
        ];

        // Excel Data
        this.excelData = {};
        this.selectedCell = null;
        this.snakeGame = null;
        this.flightGame = null;

        // PPT Data
        this.currentSlide = 0;
        this.slides = [...SLIDES];

        // Word Data
        this.docIndex = 0;
        this.docTitle = DOCUMENTS[0].title;
        this.docContent = DOCUMENTS[0].content;
        this.wordStealthMode = false;

        // Email Data
        this.emails = [...EMAILS];
        this.selectedEmail = this.emails[0];

        // Chat Data
        this.activeChannel = 'general';
        this.chatHistory = JSON.parse(JSON.stringify(CHATS));

        // Terminal Data
        this.termHistory = [
            "Microsoft Windows [Version 10.0.19045.3693]",
            "(c) Microsoft Corporation. All rights reserved.",
            "",
            "C:\\Users\\JohnDoe>"
        ];
        this.termInput = "";
        this.adventure = null;

        // Spotify Data
        this.spotifyPlaylists = [
            { id: 'focus', name: 'Deep Work Focus', description: 'Beats to study/relax to', style: 'lofi', cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=200&auto=format' },
            { id: 'coding', name: 'Cyberpunk Coding', description: 'Synthwave for hackers', style: 'synthwave', cover: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format' },
            { id: 'gym', name: 'Industrial Grind', description: 'Heavy machinery beats', style: 'industrial', cover: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=200&auto=format' },
            { id: 'nostalgia', name: '8-Bit Memories', description: 'Chiptune classics', style: 'chiptune', cover: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format' },
            { id: 'acid', name: 'Acid Techno', description: '303 lines all night', style: 'acid', cover: 'https://images.unsplash.com/photo-1594623930572-300a3011d9ae?q=80&w=200&auto=format' }
        ];
        this.currentPlaylist = this.spotifyPlaylists[0];
        this.isPlayingSpotify = false;

        // Fake Typing Logic
        this.typingBuffer = "";
        this.fakeText = "We need to circle back on the low-hanging fruit to ensure we are all singing from the same hymn sheet. Moving forward, let's deep dive into the granularity of our deliverables. ";
        this.fakeTextIndex = 0;

        // Clippy
        this.clippyMessages = [
            "It looks like you're pretending to work.",
            "Would you like help hiding that game?",
            "I noticed you typed '=GAME'. Bold strategy.",
            "Your boss is approaching. Look busy!",
            "Don't forget to leverage the synergy.",
            "I can make this spreadsheet look 20% more boring.",
            "Did you know 'Alt+B' is the universal symbol for productivity?"
        ];

        this.init();
    }

    init() {
        this.container.innerHTML = '';
        this.container.className = 'absolute inset-0 bg-white font-sans text-xs text-black flex flex-col cursor-default select-none overflow-hidden';

        this.generateExcelData();
        this.render();
        this.startClippyLoop();
    }

    destroy() {
        if (this.snakeGame) clearInterval(this.snakeGame.interval);
        if (this.flightGame) clearInterval(this.flightGame.interval);
        if (this.clippyTimer) clearInterval(this.clippyTimer);
        this.container.innerHTML = '';
    }

    render() {
        this.renderDesktop();
        if (this.mode !== 'bsod') {
            this.bindInternalEvents();
            this.updateClippy();
        }
    }

    renderDesktop() {
        if (this.mode === 'bsod') {
             this.renderBSOD();
             return;
        }

        const taskbarApps = [
            { id: 'excel', icon: 'fa-file-excel', color: 'text-green-600', label: 'Excel' },
            { id: 'ppt', icon: 'fa-file-powerpoint', color: 'text-orange-600', label: 'PowerPoint' },
            { id: 'word', icon: 'fa-file-word', color: 'text-blue-600', label: 'Word' },
            { id: 'email', icon: 'fa-envelope', color: 'text-blue-400', label: 'Outlook' },
            { id: 'chat', icon: 'fa-comments', color: 'text-indigo-600', label: 'Teams' },
            { id: 'spotify', icon: 'fa-spotify', color: 'text-green-500', label: 'Spotify' },
            { id: 'terminal', icon: 'fa-terminal', color: 'text-gray-400', label: 'Terminal' }
        ];

        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const currentDate = new Date().toLocaleDateString();

        let appContent = '';
        if (this.mode === 'excel') appContent = this.getExcelContent();
        else if (this.mode === 'ppt') appContent = this.getPPTContent();
        else if (this.mode === 'word') appContent = this.getWordContent();
        else if (this.mode === 'email') appContent = this.getEmailContent();
        else if (this.mode === 'chat') appContent = this.getChatContent();
        else if (this.mode === 'spotify') appContent = this.getSpotifyContent();
        else if (this.mode === 'terminal') appContent = this.getTerminalContent();

        this.container.innerHTML = `
            <div class="flex-1 relative overflow-hidden bg-cover bg-center flex flex-col transition-[background-image] duration-500 ease-in-out" style="background-image: url('${this.wallpapers[this.wallpaperIndex]}')">
                 <div class="flex-1 p-2 flex flex-col overflow-hidden relative backdrop-blur-sm bg-black/10">
                      <div class="flex-1 bg-white shadow-2xl rounded-lg flex flex-col overflow-hidden border border-gray-400 animate-pop-in">
                           ${appContent}
                      </div>
                 </div>

                 ${this.startMenuOpen ? this.getStartMenu() : ''}
                 ${this.notificationOpen ? this.getNotificationCenter() : ''}
            </div>

            <div class="h-10 bg-[#f3f3f3]/90 backdrop-blur-md border-t border-gray-300 flex items-center justify-between px-2 shadow-lg z-50">
                 <div class="flex items-center gap-1 h-full">
                      <div class="h-8 w-8 hover:bg-white/50 rounded flex items-center justify-center cursor-pointer transition-colors" id="boss-start-btn">
                          <i class="fab fa-windows text-blue-500 text-lg"></i>
                      </div>

                      <div class="bg-white border border-gray-300 rounded-sm h-7 flex items-center px-2 w-48 mx-2">
                           <i class="fas fa-search text-gray-400 mr-2"></i>
                           <span class="text-gray-400 select-none">Type here to search</span>
                      </div>

                      ${taskbarApps.map(app => `
                          <div class="h-8 w-8 hover:bg-white/50 rounded flex items-center justify-center cursor-pointer transition-all relative group ${this.mode === app.id ? 'bg-gray-200 border-b-2 border-blue-500' : ''}" id="boss-switch-${app.id}">
                               <i class="fas ${app.icon} ${app.color} text-lg transform group-hover:-translate-y-0.5 transition-transform"></i>
                               ${this.mode === app.id ? '<div class="absolute bottom-0 w-3 h-0.5 bg-blue-500 rounded-full"></div>' : ''}
                               <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none delay-500">
                                   ${app.label}
                               </div>
                          </div>
                      `).join('')}
                 </div>

                 <div class="flex items-center gap-2 h-full px-2 text-[11px] text-gray-700">
                      <div class="hover:bg-white/50 px-1 py-0.5 rounded cursor-pointer"><i class="fas fa-chevron-up"></i></div>
                      <div class="hover:bg-white/50 px-1 py-0.5 rounded cursor-pointer"><i class="fas fa-wifi"></i></div>
                      <div class="hover:bg-white/50 px-1 py-0.5 rounded cursor-pointer"><i class="fas fa-volume-up"></i></div>
                      <div class="flex flex-col items-end leading-tight px-2 hover:bg-white/50 rounded cursor-pointer h-full justify-center" id="boss-clock-area">
                           <span>${currentTime}</span>
                           <span>${currentDate}</span>
                      </div>
                      <div class="h-full w-1 border-l border-gray-300 ml-1"></div>
                      <div class="w-2 h-full hover:bg-white/50 cursor-pointer" id="boss-notification-btn"></div>
                 </div>
            </div>
        `;

        if (this.mode === 'excel') this.initExcelGrid();
    }

    getStartMenu() {
        return `
            <div class="absolute bottom-11 left-2 w-72 bg-[#f2f2f2]/95 backdrop-blur-xl shadow-2xl rounded-t-lg border border-gray-300 flex flex-col z-50 animate-slide-up origin-bottom-left" style="height: 400px;">
                 <div class="p-4 flex-1">
                      <div class="font-bold text-gray-700 mb-2">Pinned</div>
                      <div class="grid grid-cols-4 gap-2">
                           <div class="flex flex-col items-center gap-1 hover:bg-white/50 p-2 rounded cursor-pointer"><i class="fas fa-file-excel text-green-600 text-xl"></i><span class="text-[9px]">Excel</span></div>
                           <div class="flex flex-col items-center gap-1 hover:bg-white/50 p-2 rounded cursor-pointer"><i class="fas fa-file-word text-blue-600 text-xl"></i><span class="text-[9px]">Word</span></div>
                           <div class="flex flex-col items-center gap-1 hover:bg-white/50 p-2 rounded cursor-pointer"><i class="fas fa-envelope text-blue-400 text-xl"></i><span class="text-[9px]">Outlook</span></div>
                           <div class="flex flex-col items-center gap-1 hover:bg-white/50 p-2 rounded cursor-pointer"><i class="fas fa-calculator text-gray-600 text-xl"></i><span class="text-[9px]">Calc</span></div>
                      </div>
                      <div class="font-bold text-gray-700 mt-4 mb-2">Recommended</div>
                      <div class="flex flex-col gap-1">
                           <div class="flex items-center gap-3 p-2 hover:bg-white/50 rounded cursor-pointer">
                                <i class="fas fa-file-powerpoint text-orange-600"></i>
                                <div class="flex flex-col">
                                     <span class="font-bold text-gray-800">Q3_Synergy_Deck_v4.pptx</span>
                                     <span class="text-gray-500 text-[9px]">Recently opened</span>
                                </div>
                           </div>
                           <div class="flex items-center gap-3 p-2 hover:bg-white/50 rounded cursor-pointer">
                                <i class="fas fa-file-pdf text-red-600"></i>
                                <div class="flex flex-col">
                                     <span class="font-bold text-gray-800">Employee_Handbook.pdf</span>
                                     <span class="text-gray-500 text-[9px]">2h ago</span>
                                </div>
                           </div>
                      </div>
                 </div>
                 <div class="bg-[#e6e6e6] p-3 flex justify-between items-center border-t border-gray-300 rounded-b-lg">
                      <div class="flex items-center gap-2 hover:bg-white/50 p-1 rounded cursor-pointer">
                           <div class="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-[10px]">JD</div>
                           <span class="font-bold text-gray-700">John Doe</span>
                      </div>
                      <i class="fas fa-power-off hover:bg-white/50 p-2 rounded cursor-pointer text-gray-600" id="boss-power-btn"></i>
                 </div>
            </div>
        `;
    }

    getNotificationCenter() {
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
                      <div class="bg-white p-2 rounded flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-gray-100" onclick="BossMode.instance.currentGuest.cycleWallpaper()">
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

    getExcelContent() {
        return `
            <div class="bg-[#217346] text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm relative z-30">
                <div class="flex items-center gap-4">
                     <div class="flex gap-2 items-center">
                         <i class="fas fa-th"></i>
                         <span class="text-[10px] hidden sm:inline">AutoSave <span class="opacity-50">On</span></span>
                     </div>
                     <div class="flex items-center gap-2 border-l border-white/20 pl-4">
                         <i class="fas fa-file-excel"></i>
                         <span class="font-bold text-sm truncate">Financial_Projections_FY25_FINAL.xlsx</span>
                         <span class="bg-white/20 px-1 rounded text-[9px]">Saved</span>
                     </div>
                </div>
                <div class="flex items-center gap-4">
                     <div class="flex items-center gap-2 bg-white/10 px-2 py-0.5 rounded-full">
                         <div class="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[9px]">JD</div>
                         <span class="text-[10px] hidden sm:inline">John Doe</span>
                     </div>
                     <div class="flex gap-3 text-white/80">
                         <i class="fas fa-minus cursor-pointer hover:text-white"></i>
                         <i class="fas fa-window-maximize cursor-pointer hover:text-white"></i>
                     </div>
                </div>
            </div>

            <div class="bg-[#f3f2f1] border-b border-[#e1dfdd] flex flex-col shadow-sm select-none z-20 relative">
                <div class="flex items-center px-2 py-1 gap-1 text-[#252423] text-[11px]">
                    <span class="bg-[#2b579a] text-white px-3 py-1 rounded-sm cursor-pointer hover:bg-[#1e3e6e]">File</span>
                    <span class="bg-white font-bold border-t border-l border-r border-[#e1dfdd] shadow-sm -mb-[1px] px-3 py-1 cursor-pointer rounded-t-sm border-b-green-600">Home</span>
                    <span class="hover:bg-[#e1dfdd] px-3 py-1 cursor-pointer rounded-sm">Insert</span>
                </div>
                <div class="bg-[#f3f2f1] px-2 py-1 flex gap-2 h-16 items-center border-b border-[#c8c6c4]">
                     <div class="flex gap-2 px-2 items-center">
                        <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px]" onclick="BossMode.instance.currentGuest.generateExcelData()">
                            <i class="fas fa-sync-alt text-green-600 text-xl"></i> <span>Refresh</span>
                        </button>
                    </div>
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
        `;
    }

    bindInternalEvents() {
        const modes = ['excel', 'ppt', 'word', 'email', 'chat', 'spotify', 'terminal'];
        modes.forEach(m => {
            const btn = this.container.querySelector(`#boss-switch-${m}`);
            if (btn) btn.onclick = () => { this.mode = m; this.soundManager.playSound('click'); this.render(); };
        });
        const startBtn = this.container.querySelector('#boss-start-btn');
        if(startBtn) startBtn.onclick = () => { this.startMenuOpen = !this.startMenuOpen; this.notificationOpen = false; this.render(); };

        const notifBtn = this.container.querySelector('#boss-notification-btn');
        if(notifBtn) notifBtn.onclick = () => { this.notificationOpen = !this.notificationOpen; this.render(); };

        const closeX = this.container.querySelector('#boss-close-x');
        if(closeX) closeX.onclick = () => { BossMode.instance.toggle(false); };

        if (this.mode === 'excel') {
            const input = this.container.querySelector('#boss-formula-input');
            if(input) {
                input.onkeydown = (e) => {
                    if (e.key === 'Enter') {
                        this.commitEdit(input.value);
                        input.blur();
                    }
                };
            }
        }
    }

    initExcelGrid() {
        const rows = 30;
        const cols = 15;
        const grid = this.container.querySelector('#boss-grid');
        const colHeaders = this.container.querySelector('#boss-col-headers');
        const rowHeaders = this.container.querySelector('#boss-row-headers');

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
                grid.appendChild(cell);
            }
        }
        this.updateExcelGrid();
    }

    generateExcelData() {
        this.excelData = {};
        const categories = ["Revenue", "COGS", "Gross Margin", "Opex", "R&D", "S&M", "G&A", "EBITDA", "Net Income"];
        let r = 2;
        this.setCell("A1", "Category", null, true);
        categories.forEach(cat => {
            this.setCell(`A${r}`, cat, null, true);
            for (let c=0; c<4; c++) {
                const col = String.fromCharCode(66 + c);
                const val = Math.floor(Math.random() * 50000) + 10000;
                this.setCell(`${col}${r}`, val);
            }
            r++;
        });
        if (this.mode === 'excel') this.updateExcelGrid();
    }

    setCell(id, value, formula = null, bold = false) {
        this.excelData[id] = { value, formula, bold };
    }

    updateExcelGrid() {
        // Evaluate formulas
        for(let i=0; i<2; i++) {
            for (let id in this.excelData) {
                const cell = this.excelData[id];
                if (cell.formula) cell.value = this.evaluateFormula(cell.formula);
            }
        }

        const cells = this.container.querySelectorAll('[id^="cell-"]');
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

    evaluateFormula(f) { return "#ERR"; } // Simplified

    selectCell(id) {
        this.selectedCell = id;
        const input = this.container.querySelector('#boss-formula-input');
        const addr = this.container.querySelector('#boss-cell-addr');
        if(addr) addr.textContent = id;
        if(input) input.value = this.excelData[id]?.value || '';
    }

    commitEdit(val) {
        if (!this.selectedCell) return;
        const upper = val.toString().toUpperCase();
        if (upper === '=SNAKE()') { this.startSnakeGame(); this.setCell(this.selectedCell, "SNAKE ACTIVE"); }
        else if (upper === '=FLIGHT()') { this.startFlightGame(); this.setCell(this.selectedCell, "FLIGHT SIM ACTIVE"); }
        else { this.setCell(this.selectedCell, isNaN(val) ? val : parseFloat(val)); }
        this.updateExcelGrid();
    }

    // Games
    startSnakeGame() {
        if(this.snakeGame) return;
        this.snakeGame = { active:true, snake:[{c:5,r:5},{c:4,r:5}], dir:{c:1,r:0}, food:{c:10,r:10}, interval: setInterval(()=>this.updateSnake(),150) };
    }
    updateSnake() {
        if(!this.snakeGame) return;
        const head = {...this.snakeGame.snake[0]};
        head.c += this.snakeGame.dir.c; head.r += this.snakeGame.dir.r;
        if(head.c<0||head.c>14||head.r<1||head.r>30) { this.stopSnakeGame(); return; }
        this.snakeGame.snake.unshift(head);
        if(head.c===this.snakeGame.food.c && head.r===this.snakeGame.food.r) { this.snakeGame.food = {c:Math.floor(Math.random()*15),r:Math.floor(Math.random()*30)+1}; }
        else this.snakeGame.snake.pop();
        this.updateExcelGrid();
    }
    stopSnakeGame() { clearInterval(this.snakeGame.interval); this.snakeGame=null; alert("GAME OVER"); this.updateExcelGrid(); }
    renderSnakeCell(el, id) {
        const c=id.charCodeAt(0)-65; const r=parseInt(id.substring(1));
        if(this.snakeGame.snake.some(s=>s.c===c && s.r===r)) { el.style.backgroundColor='#217346'; el.style.color='transparent'; }
        if(this.snakeGame.food.c===c && this.snakeGame.food.r===r) el.textContent='🍎';
    }

    startFlightGame() {
        if(this.flightGame) return;
        this.flightGame = { active:true, playerX:7, obstacles:[], score:0, interval: setInterval(()=>this.updateFlight(),100) };
    }
    updateFlight() {
        if(!this.flightGame) return;
        if(Math.random()<0.2) this.flightGame.obstacles.push({x:Math.floor(Math.random()*15), y:31});
        this.flightGame.obstacles.forEach(o=>o.y--);
        this.flightGame.obstacles = this.flightGame.obstacles.filter(o=>o.y>=0);
        if(this.flightGame.obstacles.some(o=>o.x===this.flightGame.playerX && o.y===2)) { this.stopFlightGame(); return; }
        this.updateExcelGrid();
    }
    stopFlightGame() { clearInterval(this.flightGame.interval); this.flightGame=null; alert("CRASH"); this.updateExcelGrid(); }
    renderFlightCell(el, id) {
        const c=id.charCodeAt(0)-65; const r=parseInt(id.substring(1));
        el.style.backgroundColor='#87CEEB'; el.style.color='transparent';
        if(r===2 && c===this.flightGame.playerX) { el.style.backgroundColor='transparent'; el.style.color='black'; el.textContent='✈️'; }
        if(this.flightGame.obstacles.some(o=>o.x===c && o.y===r)) { el.style.backgroundColor='white'; el.style.borderRadius='50%'; }
    }

    updateClippy() {}
    startClippyLoop() {}
    renderBSOD() { this.container.innerHTML = `<div class="bg-blue-700 text-white p-20 h-full text-4xl">:(<br>Your PC ran into a problem.</div>`; }

    // Content Getters
    getPPTContent() { return `<div class="flex h-full bg-gray-200"><div class="w-48 bg-white p-4">Slide 1</div><div class="flex-1 flex items-center justify-center"><div class="bg-white w-2/3 h-2/3 p-8 shadow-lg"><h1>${escapeHTML(this.slides[this.currentSlide].title)}</h1><ul>${this.slides[this.currentSlide].bullets.map(b=>`<li>${escapeHTML(b)}</li>`).join('')}</ul></div></div></div>`; }
    getWordContent() { return `<div class="bg-gray-200 h-full p-8 flex justify-center overflow-auto"><div class="bg-white w-[21cm] min-h-[29cm] shadow-lg p-10 font-serif">${escapeHTML(this.docContent).replace(/\n/g, '<br>')}</div></div>`; }
    getEmailContent() { return `<div class="flex h-full"><div class="w-64 bg-white border-r overflow-y-auto">${this.emails.map(e=>`<div class="p-2 border-b cursor-pointer hover:bg-gray-100" onclick="BossMode.instance.currentGuest.selectedEmail=BossMode.instance.currentGuest.emails.find(x=>x.id===${e.id});BossMode.instance.currentGuest.render()"><b>${escapeHTML(e.from)}</b><br>${escapeHTML(e.subject)}</div>`).join('')}</div><div class="flex-1 p-4 bg-white">${this.selectedEmail ? `<b>${escapeHTML(this.selectedEmail.subject)}</b><hr class="my-2">${escapeHTML(this.selectedEmail.body).replace(/\n/g, '<br>')}` : 'Select an email'}</div></div>`; }
    getChatContent() { return `<div class="flex h-full"><div class="w-64 bg-gray-100 border-r">#${escapeHTML(this.activeChannel)}</div><div class="flex-1 bg-white p-4 flex flex-col gap-2 overflow-y-auto">${(this.chatHistory[this.activeChannel]||[]).map(m=>`<div><b>${escapeHTML(m.user)}:</b> ${escapeHTML(m.text)}</div>`).join('')}</div></div>`; }
    getSpotifyContent() { return `<div class="bg-black text-white h-full p-4"><h1>Spotify</h1><div class="my-4 text-green-400 font-mono">${escapeHTML(this.currentPlaylist.name)} - ${escapeHTML(this.currentPlaylist.description)}</div><button onclick="BossMode.instance.currentGuest.soundManager.toggleMute()">Toggle Music</button></div>`; }
    getTerminalContent() { return `<div class="bg-black text-green-500 font-mono h-full p-2 overflow-y-auto">${this.termHistory.map(l=>`<div>${escapeHTML(l)}</div>`).join('')}</div>`; }
}
