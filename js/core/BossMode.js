import SaveSystem from './SaveSystem.js';
import SoundManager from './SoundManager.js';
import AdsManager from './AdsManager.js';
import { EMAILS, DOCUMENTS, SLIDES, CHATS, TERMINAL_ADVENTURE } from './BossModeContent.js';

export default class BossMode {
    constructor() {
        if (BossMode.instance) return BossMode.instance;
        BossMode.instance = this;

        this.isActive = false;
        this.mode = 'excel'; // 'excel', 'ppt', 'word', 'email', 'chat', 'terminal', 'bsod'
        this.startMenuOpen = false;
        this.notificationOpen = false;

        this.overlay = null;
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.adsManager = AdsManager.getInstance();

        // State tracking
        this.wasMuted = false;
        this.wallpaperIndex = 0;
        this.wallpapers = [
            'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop', // Default Blue
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop', // Landscape
            'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop', // Abstract Dark
            'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=2070&auto=format&fit=crop'  // Mountains
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
        window.BossMode = BossMode; // Expose for verification/onclick handlers
    }

    init() {
        let existing = document.getElementById('boss-mode-overlay');
        if (existing) existing.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'boss-mode-overlay';
        this.overlay.className = 'hidden fixed inset-0 z-[10000] bg-white font-sans text-xs text-black flex flex-col cursor-default select-none overflow-hidden';

        document.body.appendChild(this.overlay);

        this.bindGlobalEvents();
        this.generateExcelData();
    }

    bindGlobalEvents() {
        document.addEventListener('keydown', (e) => {
            if (this.isActive) {
                this.handleKey(e);
            }
        });
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
        else if (this.mode === 'terminal') appContent = this.getTerminalContent();

        this.overlay.innerHTML = `
            <!-- Desktop Area -->
            <div class="flex-1 relative overflow-hidden bg-cover bg-center flex flex-col transition-[background-image] duration-500 ease-in-out" style="background-image: url('${this.wallpapers[this.wallpaperIndex]}')">
                 <!-- Main App Window -->
                 <div class="flex-1 p-2 flex flex-col overflow-hidden relative backdrop-blur-sm bg-black/10">
                      <div class="flex-1 bg-white shadow-2xl rounded-lg flex flex-col overflow-hidden border border-gray-400 animate-pop-in">
                           ${appContent}
                      </div>
                 </div>

                 <!-- Start Menu (Absolute) -->
                 ${this.startMenuOpen ? this.getStartMenu() : ''}

                 <!-- Notifications (Absolute) -->
                 ${this.notificationOpen ? this.getNotificationCenter() : ''}
            </div>

            <!-- Taskbar -->
            <div class="h-10 bg-[#f3f3f3]/90 backdrop-blur-md border-t border-gray-300 flex items-center justify-between px-2 shadow-lg z-50">
                 <div class="flex items-center gap-1 h-full">
                      <!-- Start Button -->
                      <div class="h-8 w-8 hover:bg-white/50 rounded flex items-center justify-center cursor-pointer transition-colors" id="boss-start-btn">
                          <i class="fab fa-windows text-blue-500 text-lg"></i>
                      </div>

                      <!-- Search -->
                      <div class="bg-white border border-gray-300 rounded-sm h-7 flex items-center px-2 w-48 mx-2">
                           <i class="fas fa-search text-gray-400 mr-2"></i>
                           <span class="text-gray-400 select-none">Type here to search</span>
                      </div>

                      <!-- App Icons -->
                      ${taskbarApps.map(app => `
                          <div class="h-8 w-8 hover:bg-white/50 rounded flex items-center justify-center cursor-pointer transition-all relative group ${this.mode === app.id ? 'bg-gray-200 border-b-2 border-blue-500' : ''}" id="boss-switch-${app.id}">
                               <i class="fas ${app.icon} ${app.color} text-lg transform group-hover:-translate-y-0.5 transition-transform"></i>
                               ${this.mode === app.id ? '<div class="absolute bottom-0 w-3 h-0.5 bg-blue-500 rounded-full"></div>' : ''}
                               <!-- Tooltip -->
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

    // --- Content Generators ---

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
                      <div class="bg-white p-2 rounded shadow-sm border border-gray-200">
                           <div class="flex items-center gap-2 mb-1">
                                <i class="fas fa-shield-alt text-red-500"></i>
                                <span class="font-bold text-[10px] text-gray-600">IT Security</span>
                                <span class="text-[9px] text-gray-400 ml-auto">10m</span>
                           </div>
                           <div class="font-bold text-gray-800">Password Expiring</div>
                           <div class="text-gray-600">Please change your password immediately.</div>
                      </div>
                 </div>
                 <div class="bg-[#e6e6e6] p-3 grid grid-cols-4 gap-2 border-t border-gray-300">
                      <div class="bg-white p-2 rounded flex flex-col items-center justify-center gap-1 cursor-pointer">
                           <i class="fas fa-wifi text-gray-600"></i>
                           <span class="text-[9px]">Network</span>
                      </div>
                      <div class="bg-blue-500 text-white p-2 rounded flex flex-col items-center justify-center gap-1 cursor-pointer">
                           <i class="fas fa-map-marker-alt"></i>
                           <span class="text-[9px]">Location</span>
                      </div>
                      <div class="bg-white p-2 rounded flex flex-col items-center justify-center gap-1 cursor-pointer">
                           <i class="fas fa-moon text-gray-600"></i>
                           <span class="text-[9px]">Focus</span>
                      </div>
                      <div class="bg-white p-2 rounded flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-gray-100" onclick="BossMode.instance.cycleWallpaper()">
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
                         <i class="fas fa-times cursor-pointer hover:bg-red-500 px-2 transition-colors" id="boss-close-x"></i>
                     </div>
                </div>
            </div>

            <div class="bg-[#f3f2f1] border-b border-[#e1dfdd] flex flex-col shadow-sm select-none z-20 relative">
                <div class="flex items-center px-2 py-1 gap-1 text-[#252423] text-[11px]">
                    <span class="bg-[#2b579a] text-white px-3 py-1 rounded-sm cursor-pointer hover:bg-[#1e3e6e]">File</span>
                    <span class="bg-white font-bold border-t border-l border-r border-[#e1dfdd] shadow-sm -mb-[1px] px-3 py-1 cursor-pointer rounded-t-sm border-b-green-600">Home</span>
                    <span class="hover:bg-[#e1dfdd] px-3 py-1 cursor-pointer rounded-sm">Insert</span>
                    <span class="hover:bg-[#e1dfdd] px-3 py-1 cursor-pointer rounded-sm">Page Layout</span>
                    <span class="hover:bg-[#e1dfdd] px-3 py-1 cursor-pointer rounded-sm">Formulas</span>
                    <span class="hover:bg-[#e1dfdd] px-3 py-1 cursor-pointer rounded-sm">Data</span>
                    <span class="hover:bg-[#e1dfdd] px-3 py-1 cursor-pointer rounded-sm">Review</span>
                    <span class="hover:bg-[#e1dfdd] px-3 py-1 cursor-pointer rounded-sm">View</span>
                </div>
                <div class="bg-[#f3f2f1] px-2 py-1 flex gap-2 h-16 items-center border-b border-[#c8c6c4]">
                     <div class="flex flex-col items-center px-2 border-r border-gray-300 gap-1 hover:bg-gray-200 cursor-pointer p-1 rounded">
                          <i class="fas fa-paste text-2xl text-gray-500"></i>
                          <span class="text-[10px]">Paste</span>
                     </div>
                     <div class="flex flex-col gap-1 border-r border-gray-300 px-2">
                          <div class="flex items-center gap-1 bg-white border border-gray-300 px-1 text-[11px] w-28 justify-between">
                               <span>Calibri</span><i class="fas fa-chevron-down text-[8px]"></i>
                          </div>
                          <div class="flex gap-1 text-[12px]">
                               <span class="font-bold hover:bg-gray-200 px-1 cursor-pointer">B</span>
                               <span class="italic hover:bg-gray-200 px-1 cursor-pointer">I</span>
                               <span class="underline hover:bg-gray-200 px-1 cursor-pointer">U</span>
                          </div>
                     </div>
                     <div class="flex gap-2 px-2 items-center">
                        <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px]" onclick="BossMode.instance.generateFakeData()">
                            <i class="fas fa-sync-alt text-green-600 text-xl"></i> <span>Refresh</span>
                        </button>
                        <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px]" onclick="BossMode.instance.openChart()">
                            <i class="fas fa-chart-bar text-blue-600 text-xl"></i> <span>Chart</span>
                        </button>
                        <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px]" onclick="BossMode.instance.exportToCSV()">
                            <i class="fas fa-file-csv text-green-700 text-xl"></i> <span>CSV</span>
                        </button>
                    </div>
                </div>
            </div>

            <div class="bg-white border-b border-[#e1dfdd] flex items-center px-2 py-1 gap-2 h-8 shadow-inner z-10">
                <div id="boss-cell-addr" class="bg-white border border-[#e1dfdd] px-2 w-16 text-center text-gray-600 font-bold text-sm flex items-center justify-center h-6">A1</div>
                <div class="flex gap-2 text-gray-400 px-2 border-r border-[#e1dfdd]">
                     <i class="fas fa-times hover:text-red-500 cursor-pointer"></i>
                     <i class="fas fa-check hover:text-green-500 cursor-pointer"></i>
                     <i class="fas fa-function hover:text-blue-500 cursor-pointer">fx</i>
                </div>
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
                    <div id="clippy-bubble" class="absolute -top-16 -left-32 w-40 bg-[#ffffe1] border border-black p-2 text-[10px] rounded shadow-lg hidden">
                        It looks like you're trying to slack off.
                    </div>
                    <div class="text-4xl animate-bounce" style="animation-duration: 3s;">📎</div>
                 </div>
            </div>

            <div class="bg-[#f3f2f1] border-t border-[#c8c6c4] flex items-center justify-between px-2 py-0.5 text-gray-600 text-[11px] h-6 select-none z-20">
                 <div class="flex items-center gap-4">
                     <span class="text-[#217346] font-bold">Ready</span>
                     <span id="boss-status-msg" class="text-gray-400">Circular Reference Warning</span>
                 </div>
                 <div class="flex gap-4 items-center">
                    <span>Avg: <span id="boss-avg-display">-</span></span>
                    <span>Sum: <span id="boss-sum-display">-</span></span>
                    <div class="flex items-center gap-2 border-l border-gray-300 pl-2">
                        <i class="fas fa-minus hover:text-black cursor-pointer"></i>
                        <div class="w-16 h-1 bg-gray-300 rounded-full relative"><div class="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-[#217346] rounded-full"></div></div>
                        <i class="fas fa-plus hover:text-black cursor-pointer"></i>
                        <span>100%</span>
                   </div>
                 </div>
            </div>
        `;
    }

    getPPTContent() {
        return `
            <div class="bg-[#b7472a] text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm">
                <div class="flex items-center gap-4">
                     <i class="fas fa-file-powerpoint"></i>
                     <span class="font-bold text-sm">Q3_Synergy_Deck_v4.pptx</span>
                </div>
                <div class="flex gap-3 text-white/80"><i class="fas fa-times cursor-pointer hover:bg-red-500 px-2" id="boss-close-x"></i></div>
            </div>
            <div class="bg-[#f3f2f1] border-b border-[#e1dfdd] flex flex-col shadow-sm select-none z-20 relative">
                <div class="flex items-center px-2 py-1 gap-1 text-[#252423] text-[11px]">
                    <span class="bg-[#2b579a] text-white px-3 py-1 rounded-sm cursor-pointer hover:bg-[#1e3e6e]">File</span>
                    <span class="bg-white font-bold border-t border-l border-r border-[#e1dfdd] shadow-sm -mb-[1px] px-3 py-1 cursor-pointer rounded-t-sm border-b-orange-600">Home</span>
                    <span class="hover:bg-[#e1dfdd] px-3 py-1 cursor-pointer rounded-sm">Insert</span>
                    <span class="hover:bg-[#e1dfdd] px-3 py-1 cursor-pointer rounded-sm">Design</span>
                    <span class="hover:bg-[#e1dfdd] px-3 py-1 cursor-pointer rounded-sm">Transitions</span>
                    <span class="hover:bg-[#e1dfdd] px-3 py-1 cursor-pointer rounded-sm">Animations</span>
                </div>
                <div class="bg-[#f3f2f1] px-2 py-1 flex gap-2 h-16 items-center border-b border-[#c8c6c4]">
                     <button class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px]" onclick="BossMode.instance.addSlide()">
                        <i class="fas fa-plus-square text-orange-600 text-xl"></i> <span>New Slide</span>
                     </button>
                     <div class="border-l border-gray-300 h-10 mx-1"></div>
                     <div class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px] cursor-pointer" onclick="BossMode.instance.exportToPPT()">
                        <i class="fas fa-file-export text-orange-600 text-xl"></i> <span>Export</span>
                     </div>
                     <div class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px] cursor-pointer">
                        <i class="fas fa-play text-gray-600 text-xl"></i> <span>Present</span>
                     </div>
                </div>
            </div>

            <div class="flex-1 flex bg-[#d0cec9] overflow-hidden">
                <div class="w-48 bg-[#e1dfdd] border-r border-[#c8c6c4] overflow-y-auto flex flex-col gap-4 p-4">
                    ${this.slides.map((slide, i) => `
                        <div class="bg-white aspect-video shadow-md p-2 flex flex-col gap-1 cursor-pointer ${i === this.currentSlide ? 'ring-2 ring-[#b7472a]' : 'hover:ring-1 hover:ring-gray-400'}" onclick="BossMode.instance.setSlide(${i})">
                            <div class="h-1 w-8 bg-gray-300 mb-1"></div>
                            <div class="text-[9px] font-bold text-gray-600 truncate">${slide.title}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="flex-1 flex items-center justify-center p-8 bg-[#d0cec9]">
                    <div class="bg-white aspect-[16/9] w-full max-w-4xl shadow-2xl flex flex-col p-12 relative animate-fade-in">
                        <h1 class="text-4xl font-bold text-gray-800 mb-8 border-b-4 border-[#b7472a] pb-2 outline-none" contenteditable="true" oninput="BossMode.instance.updateSlideTitle(this.innerText)">${this.slides[this.currentSlide].title}</h1>
                        <ul class="list-disc list-inside text-2xl text-gray-600 space-y-4 outline-none" contenteditable="true" oninput="BossMode.instance.updateSlideBullets(this)">
                            ${this.slides[this.currentSlide].bullets.map(b => `<li>${b}</li>`).join('')}
                        </ul>
                        <div class="absolute bottom-4 right-4 text-gray-400 text-sm">Confidential</div>
                    </div>
                </div>
            </div>
             <div class="bg-[#b7472a] text-white/90 text-[10px] px-2 h-6 flex items-center justify-between">
                <span>Slide ${this.currentSlide + 1} of ${this.slides.length}</span>
                <span>English (U.S.)</span>
             </div>
        `;
    }

    getWordContent() {
        return `
            <div class="bg-[#2b579a] text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm">
                <div class="flex items-center gap-4">
                     <i class="fas fa-file-word"></i>
                     <span class="font-bold text-sm">${this.docTitle}</span>
                </div>
                <div class="flex gap-3 text-white/80"><i class="fas fa-times cursor-pointer hover:bg-red-500 px-2" id="boss-close-x"></i></div>
            </div>
            <div class="bg-[#f3f2f1] border-b border-[#e1dfdd] flex flex-col shadow-sm select-none z-20 relative">
                <div class="flex items-center px-2 py-1 gap-1 text-[#252423] text-[11px]">
                    <div class="relative group">
                        <span class="bg-[#2b579a] text-white px-3 py-1 rounded-sm cursor-pointer hover:bg-[#1e3e6e] block">File</span>
                        <div class="absolute top-full left-0 bg-white border border-gray-300 shadow-xl hidden group-hover:block w-48 py-1 z-50">
                            <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-800" onclick="BossMode.instance.cycleDoc()">Open Next</div>
                            <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-800" onclick="BossMode.instance.exportToDoc()">Save As...</div>
                            <div class="border-t border-gray-200 my-1"></div>
                            <div class="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-800">Print</div>
                        </div>
                    </div>
                    <span class="bg-white font-bold border-t border-l border-r border-[#e1dfdd] shadow-sm -mb-[1px] px-3 py-1 cursor-pointer rounded-t-sm border-b-blue-600">Home</span>
                    <span class="hover:bg-[#e1dfdd] px-3 py-1 cursor-pointer rounded-sm">Insert</span>
                    <span class="hover:bg-[#e1dfdd] px-3 py-1 cursor-pointer rounded-sm">Layout</span>
                    <span class="hover:bg-[#e1dfdd] px-3 py-1 cursor-pointer rounded-sm">References</span>
                </div>
                <div class="bg-[#f3f2f1] px-2 py-1 flex gap-2 h-16 items-center border-b border-[#c8c6c4]">
                     <div class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px] cursor-pointer" onclick="BossMode.instance.exportToDoc()">
                        <i class="fas fa-save text-blue-800 text-xl"></i> <span>Save</span>
                     </div>
                     <div class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px] cursor-pointer ${this.wordStealthMode ? 'bg-gray-300' : ''}" onclick="BossMode.instance.toggleWordStealth()">
                        <i class="fas fa-user-secret text-black text-xl"></i> <span>Stealth</span>
                     </div>
                     <div class="border-l border-gray-300 h-10 mx-1"></div>
                     <div class="flex flex-col gap-1 px-2">
                          <div class="flex items-center gap-1 bg-white border border-gray-300 px-1 text-[11px] w-32 justify-between">
                               <span>Times New Roman</span><i class="fas fa-chevron-down text-[8px]"></i>
                          </div>
                          <div class="flex gap-1 text-[12px]">
                               <span class="font-bold hover:bg-gray-200 px-1 cursor-pointer">B</span>
                               <span class="italic hover:bg-gray-200 px-1 cursor-pointer">I</span>
                               <span class="underline hover:bg-gray-200 px-1 cursor-pointer">U</span>
                          </div>
                     </div>
                </div>
            </div>

            <div class="flex-1 bg-[#d0cec9] overflow-y-auto flex justify-center p-8">
                 <div class="bg-white w-[21cm] min-h-[29.7cm] shadow-2xl p-[2.54cm] text-black font-serif text-sm leading-relaxed outline-none" contenteditable="true" spellcheck="false" id="word-doc-content" oninput="BossMode.instance.updateDocContent(this.innerText)">
                    <p class="mb-4 text-center font-bold text-lg underline">INTERNAL MEMORANDUM</p>
                    ${this.docContent.replace(/\n/g, '<br>')}
                 </div>
            </div>
        `;
    }

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

    updateDocContent(newText) {
        this.docContent = newText;
    }

    updateSlideTitle(text) {
        this.slides[this.currentSlide].title = text;
    }

    updateSlideBullets(ulElement) {
        // Parse LIs
        const bullets = [];
        ulElement.querySelectorAll('li').forEach(li => bullets.push(li.innerText));
        this.slides[this.currentSlide].bullets = bullets;
    }

    exportToPPT() {
        let content = "PRESENTATION DECK\n=================\n\n";
        this.slides.forEach((s, i) => {
            content += `SLIDE ${i+1}: ${s.title}\n`;
            content += "-------------------\n";
            s.bullets.forEach(b => content += `* ${b}\n`);
            content += "\n";
        });
        this.downloadFile(content, "Presentation.txt", "text/plain");
    }

    getEmailContent() {
        const selected = this.selectedEmail;
        return `
            <div class="bg-[#0078d4] text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm">
                <div class="flex items-center gap-4">
                     <i class="fas fa-envelope"></i>
                     <span class="font-bold text-sm">Outlook - Inbox (${this.emails.length})</span>
                </div>
                <div class="flex gap-3 text-white/80"><i class="fas fa-times cursor-pointer hover:bg-red-500 px-2" id="boss-close-x"></i></div>
            </div>
            <div class="bg-[#f3f2f1] border-b border-[#e1dfdd] flex flex-col shadow-sm select-none z-20 relative">
                <div class="flex items-center px-2 py-1 gap-1 text-[#252423] text-[11px]">
                    <span class="bg-[#0078d4] text-white px-3 py-1 rounded-sm cursor-pointer">Home</span>
                    <span class="hover:bg-[#e1dfdd] px-3 py-1 cursor-pointer rounded-sm">View</span>
                    <span class="hover:bg-[#e1dfdd] px-3 py-1 cursor-pointer rounded-sm">Help</span>
                </div>
                 <div class="bg-[#f3f2f1] px-2 py-1 flex gap-2 h-16 items-center border-b border-[#c8c6c4]">
                     <div class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px] cursor-pointer">
                        <i class="fas fa-plus-circle text-blue-600 text-xl"></i> <span>New Email</span>
                     </div>
                     <div class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px] cursor-pointer">
                        <i class="fas fa-trash-alt text-gray-600 text-xl"></i> <span>Delete</span>
                     </div>
                     <div class="flex flex-col items-center hover:bg-gray-200 p-1 rounded text-[10px] cursor-pointer">
                        <i class="fas fa-archive text-gray-600 text-xl"></i> <span>Archive</span>
                     </div>
                </div>
            </div>
            <div class="flex-1 flex bg-white overflow-hidden">
                <div class="w-64 bg-[#f0f0f0] border-r border-[#d0d0d0] flex flex-col hidden sm:flex">
                    <div class="p-2 font-bold text-gray-700 text-sm">Favorites</div>
                    <div class="pl-4 py-1 text-xs hover:bg-gray-200 cursor-pointer font-bold">Inbox <span class="text-blue-600 font-bold ml-1">${this.emails.length}</span></div>
                    <div class="pl-4 py-1 text-xs hover:bg-gray-200 cursor-pointer">Sent Items</div>
                    <div class="pl-4 py-1 text-xs hover:bg-gray-200 cursor-pointer">Drafts</div>
                </div>
                <div class="w-80 border-r border-[#d0d0d0] flex flex-col overflow-y-auto bg-white">
                    ${this.emails.map(email => `
                        <div class="border-b border-gray-200 p-3 cursor-pointer hover:bg-[#cde6f7] ${selected && selected.id === email.id ? 'bg-[#cde6f7] border-l-4 border-l-[#0078d4]' : ''}" onclick="BossMode.instance.selectEmail(${email.id})">
                            <div class="flex justify-between items-baseline mb-1">
                                <span class="font-bold text-sm text-gray-800 truncate">${email.from}</span>
                                <span class="text-[10px] text-gray-500 whitespace-nowrap ml-2">${email.time}</span>
                            </div>
                            <div class="text-xs text-[#0078d4] font-semibold mb-1 truncate">${email.subject}</div>
                            <div class="text-[11px] text-gray-500 truncate">${email.body.substring(0, 40)}...</div>
                        </div>
                    `).join('')}
                </div>
                <div class="flex-1 flex flex-col bg-white">
                    ${selected ? `
                        <div class="border-b border-gray-200 p-4 bg-[#f8f9fa]">
                            <h2 class="text-xl font-bold text-gray-800 mb-2">${selected.subject}</h2>
                            <div class="flex items-center gap-2">
                                <div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-xs">
                                    ${selected.from.substring(0,2).toUpperCase()}
                                </div>
                                <div class="flex flex-col">
                                    <span class="text-sm font-bold text-gray-700">${selected.from}</span>
                                    <span class="text-[10px] text-gray-500">To: Me; Team</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex-1 p-6 text-sm text-gray-800 leading-relaxed overflow-y-auto whitespace-pre-wrap font-serif">
                            ${selected.body}
                        </div>
                        <div class="p-4 border-t border-gray-200 bg-[#f8f9fa] flex gap-2">
                            <button class="bg-[#0078d4] hover:bg-[#106ebe] text-white px-4 py-1 rounded text-xs flex items-center gap-2" onclick="BossMode.instance.replyEmail()"><i class="fas fa-reply"></i> Reply</button>
                            <button class="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-1 rounded text-xs" onclick="BossMode.instance.replyEmail(true)">Forward</button>
                        </div>
                    ` : `
                        <div class="flex-1 flex items-center justify-center text-gray-400">
                            <div class="text-center">
                                <i class="fas fa-envelope-open text-4xl mb-2"></i>
                                <p>Select an item to read</p>
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    getChatContent() {
        const msgs = this.chatHistory[this.activeChannel] || [];
        return `
            <div class="bg-[#464775] text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm">
                <div class="flex items-center gap-4">
                     <i class="fas fa-comments"></i>
                     <span class="font-bold text-sm">Teams - Corporate Chat</span>
                </div>
                <div class="flex gap-3 text-white/80"><i class="fas fa-times cursor-pointer hover:bg-red-500 px-2" id="boss-close-x"></i></div>
            </div>
            <div class="flex-1 flex bg-[#f5f5f5] overflow-hidden">
                <div class="w-16 bg-[#33344a] flex flex-col items-center py-4 gap-4 text-white/60">
                     <div class="text-white relative cursor-pointer"><i class="fas fa-bell"></i><div class="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div></div>
                     <div class="hover:text-white cursor-pointer"><i class="fas fa-comment-alt"></i></div>
                     <div class="hover:text-white cursor-pointer"><i class="fas fa-users"></i></div>
                     <div class="hover:text-white cursor-pointer"><i class="fas fa-calendar-alt"></i></div>
                </div>
                <div class="w-64 bg-[#f0f0f0] border-r border-[#d0d0d0] flex flex-col">
                    <div class="p-3 font-bold text-xs uppercase tracking-wide opacity-70">Teams</div>
                    <div class="px-2">
                        <div class="p-2 rounded hover:bg-white cursor-pointer flex items-center gap-2 ${this.activeChannel === 'general' ? 'bg-white shadow-sm' : ''}" onclick="BossMode.instance.switchChannel('general')"># general</div>
                        <div class="p-2 rounded hover:bg-white cursor-pointer flex items-center gap-2 ${this.activeChannel === 'random' ? 'bg-white shadow-sm' : ''}" onclick="BossMode.instance.switchChannel('random')"># random</div>
                    </div>
                </div>
                <div class="flex-1 flex flex-col bg-white">
                    <div class="p-3 border-b border-gray-200 font-bold text-gray-700 flex justify-between">
                        <span>#${this.activeChannel}</span>
                        <i class="fas fa-info-circle text-gray-400"></i>
                    </div>
                    <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4" id="chat-msgs">
                        ${msgs.map(m => `
                            <div class="flex gap-3">
                                <div class="w-8 h-8 rounded bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">${m.user.charAt(0)}</div>
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
                        <div class="border border-gray-300 rounded p-2 flex gap-2">
                            <input id="chat-input" class="flex-1 outline-none text-sm" placeholder="Type a new message..." autocomplete="off">
                            <button class="text-[#464775] hover:bg-gray-100 p-1 rounded" onclick="BossMode.instance.sendChat()"><i class="fas fa-paper-plane"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getTerminalContent() {
        return `
            <div class="bg-gray-900 text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm border-b border-gray-700">
                <div class="flex items-center gap-4">
                     <i class="fas fa-terminal"></i>
                     <span class="font-bold text-sm">Administrator: Command Prompt</span>
                </div>
                <div class="flex gap-3 text-white/80"><i class="fas fa-times cursor-pointer hover:bg-red-500 px-2" id="boss-close-x"></i></div>
            </div>
            <div class="flex-1 bg-black p-2 font-mono text-green-500 text-sm overflow-y-auto cursor-text" onclick="document.getElementById('term-input').focus()">
                <div id="term-output">
                    ${this.termHistory.map(l => `<div>${l}</div>`).join('')}
                </div>
                <div class="flex">
                    <span>C:\\Users\\JohnDoe&gt;</span>
                    <input id="term-input" class="bg-transparent border-none outline-none text-green-500 flex-1 ml-1" autocomplete="off" autofocus>
                </div>
            </div>
        `;
    }

    bindInternalEvents() {
        const close = document.getElementById('boss-close-x');
        if (close) close.onclick = () => this.toggle(false);

        // Taskbar App Switcher
        const modes = ['excel', 'ppt', 'word', 'email', 'chat', 'terminal'];
        modes.forEach(m => {
            const btn = document.getElementById(`boss-switch-${m}`);
            if (btn) btn.onclick = () => {
                this.mode = m;
                this.soundManager.playSound('click');
                this.render();
            };
        });

        // Start Menu Toggle
        const startBtn = document.getElementById('boss-start-btn');
        if (startBtn) startBtn.onclick = () => {
             this.startMenuOpen = !this.startMenuOpen;
             this.notificationOpen = false;
             this.soundManager.playSound('click');
             this.render();
        };

        // Power Off (in Start Menu)
        const powerBtn = document.getElementById('boss-power-btn');
        if (powerBtn) powerBtn.onclick = () => this.toggle(false);

        // Notification Toggle
        const notifBtn = document.getElementById('boss-notification-btn');
        const clockArea = document.getElementById('boss-clock-area');
        const toggleNotif = () => {
             this.notificationOpen = !this.notificationOpen;
             this.startMenuOpen = false;
             this.soundManager.playSound('click');
             this.render();
        };
        if(notifBtn) notifBtn.onclick = toggleNotif;
        if(clockArea) clockArea.onclick = toggleNotif;

        // Excel Specifics
        if (this.mode === 'excel') {
            const input = document.getElementById('boss-formula-input');
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        this.commitEdit(input.value);
                        input.blur();
                    }
                });
            }

            // Clippy interaction
            const clippy = document.getElementById('clippy-container');
            if (clippy) {
                clippy.onclick = () => {
                    const bubble = document.getElementById('clippy-bubble');
                    bubble.textContent = "I see you're clicking me. Stop it.";
                    bubble.classList.remove('hidden');
                    setTimeout(() => bubble.classList.add('hidden'), 2000);
                };
            }
        }
    }

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
    }

    // --- Logic ---

    handleKey(e) {
        // Global Key Handler for Boss Mode
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        if (e.key === 'Escape') return; // Handled in main.js

        // Snake Control (Delegate if active)
        if (this.snakeGame && this.mode === 'excel') {
            const k = e.key;
            const d = this.snakeGame.dir;
            // Prevent default scrolling
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();

            if (k === 'ArrowUp' && d.r !== 1) this.snakeGame.dir = {c: 0, r: -1};
            if (k === 'ArrowDown' && d.r !== -1) this.snakeGame.dir = {c: 0, r: 1};
            if (k === 'ArrowLeft' && d.c !== 1) this.snakeGame.dir = {c: -1, r: 0};
            if (k === 'ArrowRight' && d.c !== -1) this.snakeGame.dir = {c: 1, r: 0};
            return;
        }

        // Flight Control
        if (this.flightGame && this.mode === 'excel') {
            const k = e.key;
            if (k === 'ArrowLeft') this.flightGame.playerX = Math.max(0, this.flightGame.playerX - 1);
            if (k === 'ArrowRight') this.flightGame.playerX = Math.min(14, this.flightGame.playerX + 1);
            if (k === 'Escape') this.stopFlightGame();
            e.preventDefault();
            return;
        }

        // Word Stealth Typing
        if (this.mode === 'word' && this.wordStealthMode) {
             e.preventDefault();
             if (e.key.length === 1 || e.key === 'Enter') {
                 // this.soundManager.playSound('click');
                 const doc = document.getElementById('word-doc-content');
                 if (doc) {
                     // Add next chunk of fake text
                     const chunk = this.fakeText.substring(this.fakeTextIndex, this.fakeTextIndex + 3 + Math.floor(Math.random() * 5));
                     this.fakeTextIndex += chunk.length;
                     if (this.fakeTextIndex >= this.fakeText.length) this.fakeTextIndex = 0;

                     // Insert at caret (simplified: just append for now, or use range if possible)
                     // A real implementation would handle selection, but appending is safer for "panic" mode
                     const range = document.getSelection().getRangeAt(0);
                     const textNode = document.createTextNode(chunk);
                     range.insertNode(textNode);
                     range.collapse(false);
                 }
             }
             return;
        }

        // Fake Typing Logic (If not editing a cell)
        if (this.mode === 'excel' && this.selectedCell) {
             if (document.activeElement.tagName !== 'INPUT' && e.key.length === 1) {
                 // Easter Egg: Typing plays sounds of generic keyboard
                 // this.soundManager.playSound('click');
                 // Logic to advance fake text in the cell could go here
                 const cell = this.excelData[this.selectedCell];
                 if(cell && typeof cell.value === 'string' && cell.value.startsWith('=')) return; // Don't overwrite formulas

                 // Fake Typing Effect
                 /*
                 let current = this.excelData[this.selectedCell]?.value || "";
                 if(this.fakeTextIndex < this.fakeText.length) {
                    current += this.fakeText[this.fakeTextIndex];
                    this.fakeTextIndex++;
                    if(this.fakeTextIndex >= this.fakeText.length) this.fakeTextIndex = 0;
                    this.setCell(this.selectedCell, current);
                    this.updateExcelGrid();
                 }
                 */
             }
        }
    }

    updateClippy() {
        // Clippy Logic handled by Interval
    }

    startClippyLoop() {
        if (this.clippyTimer) clearInterval(this.clippyTimer);
        this.clippyTimer = setInterval(() => {
            if (!this.isActive || this.mode !== 'excel') return;
            if (Math.random() > 0.8) {
                const bubble = document.getElementById('clippy-bubble');
                if (bubble) {
                    bubble.textContent = this.clippyMessages[Math.floor(Math.random() * this.clippyMessages.length)];
                    bubble.classList.remove('hidden');
                    setTimeout(() => bubble.classList.add('hidden'), 4000);
                }
            }
        }, 12000);
    }

    // --- Excel Data ---
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

        // Totals
        this.setCell(`A${r}`, "TOTAL", null, true);
        for (let c=0; c<4; c++) {
            const col = String.fromCharCode(66 + c);
            this.setCell(`${col}${r}`, 0, `=SUM(${col}2:${col}${r-1})`);
        }

        // Random Notes
        this.setCell("G2", "Notes:", null, true);
        this.setCell("G3", "Ensure synergy targets met.");

        if (this.mode === 'excel') this.updateExcelGrid();
    }

    setCell(id, value, formula = null, bold = false) {
        this.excelData[id] = { value, formula, bold };
    }

    updateExcelGrid() {
        // Very basic dependency resolution (2 passes)
        for(let i=0; i<2; i++) {
            for (let id in this.excelData) {
                const cell = this.excelData[id];
                if (cell.formula) {
                    cell.value = this.evaluateFormula(cell.formula);
                }
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
        document.getElementById('boss-formula-input').value = val;

        document.getElementById('boss-sum-display').textContent = (data && typeof data.value === 'number') ? data.value.toLocaleString() : '-';
    }

    editCell(id) {
        document.getElementById('boss-formula-input').focus();
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
        } else if (upper === '=COFFEE') {
             this.setCell(this.selectedCell, "☕ Break Time");
        } else {
             if (val.startsWith('=')) {
                 this.setCell(this.selectedCell, 0, val);
             } else {
                 this.setCell(this.selectedCell, isNaN(val) ? val : parseFloat(val));
             }
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

    exportToDoc() {
        this.downloadFile(this.docContent, this.docTitle, "text/plain");
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

    addSlide() {
        this.slides.push({ title: "New Slide", bullets: ["Add point here"] });
        this.setSlide(this.slides.length - 1);
    }

    setSlide(index) {
        this.currentSlide = index;
        this.render();
    }

    openChart() {
         const canvas = document.createElement('canvas');
         canvas.width = 400;
         canvas.height = 300;
         const ctx = canvas.getContext('2d');

         // Background
         ctx.fillStyle = 'white';
         ctx.fillRect(0,0,400,300);

         // Axes
         ctx.strokeStyle = '#333';
         ctx.lineWidth = 2;
         ctx.beginPath();
         ctx.moveTo(40, 260);
         ctx.lineTo(360, 260);
         ctx.moveTo(40, 260);
         ctx.lineTo(40, 40);
         ctx.stroke();

         // Data (Random bars for Q1-Q4)
         const colors = ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000'];
         const data = [15, 28, 22, 24]; // From "Revenue" row mock
         const max = 30;

         const barWidth = 50;
         const gap = 30;
         let x = 60;

         data.forEach((val, i) => {
             const h = (val / max) * 220;
             ctx.fillStyle = colors[i];
             ctx.fillRect(x, 260 - h, barWidth, h);

             // Label
             ctx.fillStyle = '#333';
             ctx.font = '12px Arial';
             ctx.textAlign = 'center';
             ctx.fillText(`Q${i+1}`, x + barWidth/2, 280);
             x += barWidth + gap;
         });

         ctx.save();
         ctx.translate(20, 150);
         ctx.rotate(-Math.PI/2);
         ctx.fillText("Revenue (k)", 0, 0);
         ctx.restore();

         const imgData = canvas.toDataURL();
         this.adsManager.createPopup("Q3 Revenue Analysis", `<img src="${imgData}" style="width:100%; height:auto; border:1px solid #ccc;">`, "bg-white text-black");
    }

    // --- Email ---
    selectEmail(id) {
        this.selectedEmail = this.emails.find(e => e.id === id);
        this.render();
    }

    replyEmail(forward = false) {
        const prefix = forward ? "FW: " : "Re: ";
        const newBody = forward ? "\n\n-----Original Message-----\n" + this.selectedEmail.body : "\n\nI'll circle back on this shortly.\n\nSent from my NeonPad";
        this.selectedEmail = {
            id: Date.now(),
            from: "Me",
            subject: prefix + this.selectedEmail.subject,
            time: "Now",
            body: newBody
        };
        this.render();
    }

    // --- Chat ---
    switchChannel(channel) {
        this.activeChannel = channel;
        if (!this.chatHistory[channel]) this.chatHistory[channel] = [];
        this.render();
    }

    sendChat() {
        const input = document.getElementById('chat-input');
        if (!input || !input.value.trim()) return;

        const msg = input.value;
        this.chatHistory[this.activeChannel].push({ user: 'Me', time: 'Now', text: msg });
        input.value = '';
        this.render();

        setTimeout(() => {
            const responses = [
                "Agreed.", "Let's circle back.", "Can we take this offline?", "Synergy.", "Great point.", "Thinking outside the box."
            ];
            const randomResp = responses[Math.floor(Math.random() * responses.length)];
            this.chatHistory[this.activeChannel].push({ user: 'Manager', time: 'Now', text: randomResp });
            this.render();
        }, 1000);
    }

    // --- Terminal ---
    runTerminalCommand(cmd) {
        this.termHistory.push(`C:\\Users\\JohnDoe> ${cmd}`);
        this.termInput = "";

        const c = cmd.trim().toLowerCase();
        if (c === 'help') {
            this.termHistory.push("Available commands: ls, cd, ping, npm install, exit, bsod");
        } else if (c === 'ls' || c === 'dir') {
            this.termHistory.push(" Volume in drive C has no label.");
            this.termHistory.push(" Directory of C:\\Users\\JohnDoe");
            this.termHistory.push("12/30/2025  09:00 AM    <DIR>          .");
            this.termHistory.push("12/30/2025  09:00 AM    <DIR>          ..");
            this.termHistory.push("12/30/2025  10:00 AM    <DIR>          Documents");
            this.termHistory.push("12/30/2025  10:00 AM    <DIR>          Downloads");
            this.termHistory.push("               0 File(s)              0 bytes");
        } else if (c === 'ping') {
            this.termHistory.push("Pinging google.com [8.8.8.8] with 32 bytes of data:");
            this.termHistory.push("Reply from 8.8.8.8: bytes=32 time=20ms TTL=115");
        } else if (c === 'npm install') {
            this.termHistory.push("npm WARN deprecated request@2.88.2: request has been deprecated");
            this.termHistory.push("[..................] / idealTree:lib: sill idealTree buildDeps");
        } else if (c === 'quest' || c === 'adventure') {
            this.startAdventure();
        } else if (c === 'matrix') {
            this.termHistory.push("Wake up, Neo...");
            this.termHistory.push("The Matrix has you...");
            setTimeout(() => this.termHistory.push("Follow the white rabbit."), 2000);
            setTimeout(() => this.termHistory.push("Knock, knock, Neo."), 4000);
        } else if (this.adventure) {
            this.handleAdventureCommand(c);
        } else if (c === 'bsod') {
            this.mode = 'bsod';
            this.render();
            return;
        } else if (c === 'exit') {
            this.toggle(false);
            return;
        } else if (c) {
            this.termHistory.push(`'${c}' is not recognized as an internal or external command.`);
        }

        this.render();
    }

    // --- Adventure Game ---
    startAdventure() {
        this.adventure = {
            currentRoom: 'start',
            inventory: []
        };
        this.termHistory.push("--- CORPORATE QUEST ---");
        this.printRoom();
    }

    printRoom() {
        if (!this.adventure) return;
        const room = TERMINAL_ADVENTURE[this.adventure.currentRoom];
        this.termHistory.push(room.text);
        if (room.items && room.items.length > 0) {
            this.termHistory.push("You see: " + room.items.join(", "));
        }
        const exits = Object.keys(room.exits).join(", ").toUpperCase();
        this.termHistory.push("Exits: " + exits);
    }

    handleAdventureCommand(cmd) {
        if (!this.adventure) return;

        const args = cmd.split(' ');
        const action = args[0];
        const target = args[1];
        const room = TERMINAL_ADVENTURE[this.adventure.currentRoom];

        if (['n', 'north', 's', 'south', 'e', 'east', 'w', 'west'].includes(action)) {
            let dir = action;
            if (dir === 'n') dir = 'north';
            if (dir === 's') dir = 'south';
            if (dir === 'e') dir = 'east';
            if (dir === 'w') dir = 'west';

            if (room.exits[dir]) {
                if (room.exits[dir] === 'rack_locked' && !this.adventure.inventory.includes('keycard')) {
                    this.termHistory.push("The door is locked. You need a keycard.");
                } else {
                    this.adventure.currentRoom = room.exits[dir];
                    this.printRoom();
                }
            } else {
                this.termHistory.push("You can't go that way.");
            }
        } else if (action === 'look') {
            this.printRoom();
        } else if (action === 'take' || action === 'get') {
            if (room.items && room.items.includes(target)) {
                this.adventure.inventory.push(target);
                room.items = room.items.filter(i => i !== target);
                this.termHistory.push(`You picked up the ${target}.`);
            } else {
                this.termHistory.push("You can't take that.");
            }
        } else if (action === 'inventory' || action === 'i') {
            this.termHistory.push("Inventory: " + (this.adventure.inventory.join(", ") || "Nothing"));
        } else if (action === 'quit') {
            this.adventure = null;
            this.termHistory.push("Game Over.");
        } else {
            this.termHistory.push("I don't understand that.");
        }
    }

    // --- Snake ---
    startSnakeGame() {
        if (this.snakeGame) return;
        this.snakeGame = {
            active: true,
            snake: [{c: 5, r: 5}, {c: 4, r: 5}, {c: 3, r: 5}],
            dir: {c: 1, r: 0},
            food: {c: 10, r: 10},
            interval: setInterval(() => this.updateSnake(), 150)
        };
        // Note: Key listener is handled globally in handleKey()
    }

    updateSnake() {
        if (!this.isActive || !this.snakeGame) return;
        const head = {...this.snakeGame.snake[0]};
        head.c += this.snakeGame.dir.c;
        head.r += this.snakeGame.dir.r;

        if (head.c < 0) head.c = 14;
        if (head.c > 14) head.c = 0;
        if (head.r < 1) head.r = 30;
        if (head.r > 30) head.r = 1;

        if (this.snakeGame.snake.some(s => s.c === head.c && s.r === head.r)) {
            this.stopSnakeGame();
            return;
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

        el.style.backgroundColor = 'white';
        el.style.color = 'black';

        if (this.snakeGame.snake.some(s => s.c === col && s.r === row)) {
            el.style.backgroundColor = '#217346';
            el.style.color = 'transparent';
        }
        if (this.snakeGame.food.c === col && this.snakeGame.food.r === row) {
             el.textContent = '🍎';
        }
    }

    // --- Flight Simulator ---
    startFlightGame() {
        if (this.flightGame) return;
        this.flightGame = {
            active: true,
            playerX: 7,
            obstacles: [], // {x, y}
            score: 0,
            interval: setInterval(() => this.updateFlight(), 100)
        };
    }

    updateFlight() {
        if (!this.isActive || !this.flightGame) return;

        // Spawn Obstacles
        if (Math.random() < 0.2) {
            this.flightGame.obstacles.push({x: Math.floor(Math.random() * 15), y: 31});
        }

        // Move Obstacles
        this.flightGame.obstacles.forEach(o => o.y--);
        this.flightGame.obstacles = this.flightGame.obstacles.filter(o => o.y >= 0);

        // Collision Check (Player is at y=2)
        if (this.flightGame.obstacles.some(o => o.x === this.flightGame.playerX && o.y === 2)) {
            this.stopFlightGame();
            return;
        }

        this.flightGame.score++;
        this.updateExcelGrid();
    }

    stopFlightGame() {
        if (this.flightGame) {
            clearInterval(this.flightGame.interval);
            this.flightGame = null;
            this.soundManager.playSound('game-over');
            alert("CRASH! Flight Over.");
            this.updateExcelGrid();
        }
    }

    renderFlightCell(el, id) {
        const col = id.charCodeAt(0) - 65;
        const row = parseInt(id.substring(1));

        // Render sky
        el.style.backgroundColor = '#87CEEB';
        el.style.color = 'transparent';

        // Render Player (Plane) at Row 2
        if (row === 2 && col === this.flightGame.playerX) {
            el.style.backgroundColor = 'transparent';
            el.style.color = 'black';
            el.textContent = '✈️';
            el.style.fontSize = '14px';
            el.style.textAlign = 'center';
        }

        // Render Obstacles (Clouds/Birds)
        if (this.flightGame.obstacles.some(o => o.x === col && o.y === row)) {
            el.style.backgroundColor = 'white';
            el.style.borderRadius = '50%';
        }
    }

    // --- Toggle ---
    toggle(forceState = null) {
        const nextState = forceState !== null ? forceState : !this.isActive;
        if (nextState === this.isActive) return;

        this.isActive = nextState;

        if (this.isActive) {
            this.overlay.classList.remove('hidden');
            this.render();

            // Sound Mute
            this.wasMuted = this.soundManager.muted;
            if (!this.wasMuted) {
                this.soundManager.toggleMute();
                const btn = document.getElementById('mute-btn-hud');
                if(btn) btn.innerHTML = '<i class="fas fa-volume-mute text-red-400"></i>';
            }
            this.startClippyLoop();
        } else {
            this.overlay.classList.add('hidden');
            if (!this.wasMuted && this.soundManager.muted) {
                this.soundManager.toggleMute();
                const btn = document.getElementById('mute-btn-hud');
                if(btn) btn.innerHTML = '<i class="fas fa-volume-up"></i>';
            }
            if (this.clippyTimer) clearInterval(this.clippyTimer);
        }
    }
}