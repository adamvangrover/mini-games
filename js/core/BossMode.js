// The "Spreadsheet" that is actually a stealth game console.
import SaveSystem from './SaveSystem.js';
import SoundManager from './SoundManager.js';
import AdsManager from './AdsManager.js';

export default class BossMode {
    constructor() {
        if (BossMode.instance) return BossMode.instance;
        BossMode.instance = this;

        this.isActive = false;
        this.mode = 'excel'; // 'excel', 'ppt'
        this.overlay = null;
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.adsManager = AdsManager.getInstance();

        // State tracking
        this.wasMuted = false;

        // Data
        this.excelData = {};
        this.selectedCell = null;
        this.snakeGame = null;

        // PPT Data
        this.currentSlide = 0;
        this.slides = [
            { title: "Q4 Strategy Alignment", bullets: ["Synergize backward overflow", "Leverage holistic paradigms", "Drill down into cross-media value"] },
            { title: "Growth Vectors", bullets: ["Organic upscale engagement", "Hyper-local bandwidth", "Touch-base with key stakeholders"] },
            { title: "Risk Analysis", bullets: ["Mitigate mission-critical fallout", "Pivot to agile deliverables", "Right-size the human capital"] }
        ];

        // Fake Typing
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
        if (this.mode === 'excel') {
            this.renderExcelLayout();
        } else {
            this.renderPPTLayout();
        }
        this.bindInternalEvents();
        this.updateClippy();
    }

    // --- Excel Mode ---

    renderExcelLayout() {
        this.overlay.innerHTML = `
            <!-- Top Title Bar -->
            <div class="bg-[#217346] text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm">
                <div class="flex items-center gap-4">
                     <div class="flex gap-2 items-center">
                         <i class="fas fa-th"></i>
                         <span class="text-[10px]">AutoSave <span class="opacity-50">On</span></span>
                     </div>
                     <div class="flex items-center gap-2 border-l border-white/20 pl-4">
                         <i class="fas fa-file-excel"></i>
                         <span class="font-bold text-sm">Financial_Projections_FY25_DRAFT.xlsx</span>
                         <span class="bg-white/20 px-1 rounded text-[9px]">Saved</span>
                     </div>
                </div>
                <div class="flex items-center gap-4">
                     <div class="flex items-center gap-2 bg-white/10 px-2 py-0.5 rounded-full">
                         <div class="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[9px]">JD</div>
                         <span class="text-[10px]">John Doe</span>
                     </div>
                     <div class="flex gap-3 text-white/80 text-[10px]">
                          <i class="fas fa-minus cursor-pointer hover:text-white"></i>
                          <i class="fas fa-window-maximize cursor-pointer hover:text-white"></i>
                          <i class="fas fa-times cursor-pointer hover:bg-red-500 hover:text-white px-2 py-1 transition-colors" id="boss-close-x"></i>
                     </div>
                </div>
            </div>

            <!-- Ribbon -->
            <div class="bg-[#f3f2f1] border-b border-[#e1dfdd] flex flex-col shadow-sm z-10">
                <div class="flex items-center px-2 py-1 gap-1 text-[#252423] text-[11px]">
                    <span class="bg-white px-3 py-1 border-t border-l border-r border-[#e1dfdd] text-[#217346] font-bold rounded-t-sm shadow-sm z-10 -mb-[1px]">Home</span>
                    <span class="hover:bg-[#e1dfdd] hover:text-black px-3 py-1 cursor-pointer rounded-sm transition-colors" id="boss-switch-ppt">Insert (PPT)</span>
                    <span class="hover:bg-[#e1dfdd] hover:text-black px-3 py-1 cursor-pointer rounded-sm transition-colors">Page Layout</span>
                    <span class="hover:bg-[#e1dfdd] hover:text-black px-3 py-1 cursor-pointer rounded-sm transition-colors">Formulas</span>
                    <span class="hover:bg-[#e1dfdd] hover:text-black px-3 py-1 cursor-pointer rounded-sm transition-colors">Data</span>
                    <span class="hover:bg-[#e1dfdd] hover:text-black px-3 py-1 cursor-pointer rounded-sm transition-colors">Review</span>
                    <span class="hover:bg-[#e1dfdd] hover:text-black px-3 py-1 cursor-pointer rounded-sm transition-colors">View</span>
                </div>
                <div class="px-2 py-2 flex items-center gap-2 h-24 bg-[#f3f2f1] overflow-x-auto">
                     <div class="flex flex-col items-center gap-1 border-r border-[#c8c6c4] pr-3 px-1 hover:bg-gray-200/50 rounded cursor-pointer group">
                          <i class="fas fa-paste text-2xl text-gray-600 group-hover:text-black"></i>
                          <span class="text-[10px]">Paste</span>
                     </div>
                     <div class="flex flex-col gap-1 border-r border-[#c8c6c4] pr-3 px-1">
                          <div class="flex items-center gap-1 bg-white border border-[#c8c6c4] px-1 w-28 justify-between text-[11px] h-6">
                               <span>Calibri</span>
                               <i class="fas fa-chevron-down text-[8px]"></i>
                          </div>
                          <div class="flex gap-1 text-[12px] text-gray-700">
                               <span class="font-bold w-6 h-6 flex items-center justify-center hover:bg-gray-300 cursor-pointer rounded">B</span>
                               <span class="italic w-6 h-6 flex items-center justify-center hover:bg-gray-300 cursor-pointer rounded">I</span>
                               <span class="underline w-6 h-6 flex items-center justify-center hover:bg-gray-300 cursor-pointer rounded">U</span>
                               <div class="border-l border-gray-300 mx-1 h-4 self-center"></div>
                               <i class="fas fa-fill text-yellow-400 border-b-4 border-yellow-400 h-5"></i>
                               <i class="fas fa-font text-red-600 border-b-4 border-red-600 h-5"></i>
                          </div>
                     </div>

                     <div class="flex gap-2 border-r border-[#c8c6c4] pr-3 items-center">
                        <div class="flex flex-col items-center hover:bg-gray-200 rounded p-1 cursor-pointer" onclick="BossMode.instance.generateFakeData()">
                            <i class="fas fa-sync-alt text-green-600 text-lg"></i>
                            <span class="text-[10px]">Refresh</span>
                        </div>
                        <div class="flex flex-col items-center hover:bg-gray-200 rounded p-1 cursor-pointer" onclick="BossMode.instance.openChart()">
                            <i class="fas fa-chart-bar text-blue-600 text-lg"></i>
                            <span class="text-[10px]">Chart</span>
                        </div>
                     </div>

                     <!-- Clippy Area -->
                     <div class="flex-1 flex justify-end items-center pr-4">
                        <div id="clippy-container" class="relative group cursor-pointer transition-transform hover:scale-105">
                            <div id="clippy-bubble" class="absolute -top-16 -left-32 w-40 bg-[#ffffe1] border border-black p-2 text-[10px] rounded shadow-lg hidden">
                                It looks like you're trying to slack off.
                            </div>
                            <div class="text-4xl animate-bounce" style="animation-duration: 3s;">📎</div>
                        </div>
                     </div>
                </div>
            </div>

            <!-- Formula Bar -->
            <div class="bg-white border-b border-[#e1dfdd] flex items-center px-2 py-1 gap-2 h-8 shadow-inner">
                <div id="boss-cell-addr" class="bg-white border border-[#e1dfdd] px-2 w-16 text-center text-gray-600 font-bold text-sm">A1</div>
                <div class="flex gap-2 text-gray-400 px-2 border-r border-[#e1dfdd]">
                     <i class="fas fa-times hover:text-red-500 cursor-pointer"></i>
                     <i class="fas fa-check hover:text-green-500 cursor-pointer"></i>
                     <i class="fas fa-function hover:text-blue-500 cursor-pointer">fx</i>
                </div>
                <input id="boss-formula-input" class="bg-white border-none flex-1 px-2 font-mono text-gray-800 outline-none h-full text-sm" value="">
            </div>

            <!-- Grid -->
            <div class="flex-1 flex overflow-hidden relative bg-[#e1dfdd]">
                 <div id="boss-row-headers" class="w-10 bg-[#f3f2f1] border-r border-[#c8c6c4] flex flex-col text-center text-gray-500 select-none overflow-hidden pt-[24px] text-[11px]"></div>
                 <div class="flex-1 flex flex-col overflow-hidden relative">
                    <div id="boss-col-headers" class="h-6 bg-[#f3f2f1] border-b border-[#c8c6c4] flex text-gray-500 font-bold select-none pr-4 text-[11px]"></div>
                    <div id="boss-grid-scroll" class="flex-1 overflow-auto bg-white relative">
                        <div id="boss-grid" class="grid relative select-none"></div>
                    </div>
                 </div>
            </div>

            <!-- Footer -->
            <div class="bg-[#f3f2f1] border-t border-[#c8c6c4] flex items-center justify-between px-2 py-0.5 text-gray-600 text-[11px] h-6 select-none">
                 <div class="flex items-center gap-4">
                      <span class="text-[#217346] font-bold">Ready</span>
                      <span id="boss-status-msg">Circular Reference Warning</span>
                 </div>
                 <div class="flex items-center gap-4">
                      <span>Average: <span id="boss-avg-display">-</span></span>
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
        this.initExcelGrid();
    }

    renderPPTLayout() {
        this.overlay.innerHTML = `
             <div class="bg-[#b7472a] text-white flex items-center justify-between px-2 py-1 select-none h-8 shadow-sm">
                <div class="flex items-center gap-4">
                     <div class="flex gap-2 items-center">
                         <i class="fas fa-th"></i>
                         <span class="text-[10px]">AutoSave <span class="opacity-50">On</span></span>
                     </div>
                     <div class="flex items-center gap-2 border-l border-white/20 pl-4">
                         <i class="fas fa-file-powerpoint"></i>
                         <span class="font-bold text-sm">Q3_Synergy_Deck_FINAL_v2.pptx</span>
                     </div>
                </div>
                <div class="flex items-center gap-4">
                     <div class="flex gap-3 text-white/80 text-[10px]">
                          <i class="fas fa-minus cursor-pointer"></i>
                          <i class="fas fa-window-maximize cursor-pointer"></i>
                          <i class="fas fa-times cursor-pointer" id="boss-close-x"></i>
                     </div>
                </div>
            </div>

            <!-- Ribbon -->
            <div class="bg-[#f3f2f1] border-b border-[#e1dfdd] flex flex-col shadow-sm">
                <div class="flex items-center px-2 py-1 gap-1 text-[#252423] text-[11px]">
                    <span class="hover:bg-[#e1dfdd] hover:text-black px-3 py-1 cursor-pointer rounded-sm" id="boss-switch-excel">File (Excel)</span>
                    <span class="bg-white px-3 py-1 border-t border-l border-r border-[#e1dfdd] text-[#b7472a] font-bold rounded-t-sm shadow-sm z-10 -mb-[1px]">Home</span>
                    <span class="hover:bg-[#e1dfdd] hover:text-black px-3 py-1 cursor-pointer rounded-sm">Design</span>
                    <span class="hover:bg-[#e1dfdd] hover:text-black px-3 py-1 cursor-pointer rounded-sm">Transitions</span>
                    <span class="hover:bg-[#e1dfdd] hover:text-black px-3 py-1 cursor-pointer rounded-sm">Animations</span>
                    <span class="hover:bg-[#e1dfdd] hover:text-black px-3 py-1 cursor-pointer rounded-sm">Slide Show</span>
                </div>
                <div class="px-2 py-2 flex items-center gap-4 h-20 bg-[#f3f2f1]">
                     <div class="flex flex-col items-center gap-1 border-r border-[#c8c6c4] pr-4 cursor-pointer hover:bg-gray-200 p-1 rounded">
                          <i class="fas fa-plus-square text-2xl text-gray-600"></i>
                          <span class="text-[10px]">New Slide</span>
                     </div>
                     <div class="flex flex-col items-center gap-1 border-r border-[#c8c6c4] pr-4">
                          <i class="fas fa-shapes text-2xl text-gray-600"></i>
                          <span class="text-[10px]">Shapes</span>
                     </div>
                     <div class="flex flex-col items-center gap-1">
                          <i class="fas fa-play text-2xl text-[#b7472a]"></i>
                          <span class="text-[10px]">Present</span>
                     </div>
                </div>
            </div>

            <!-- Main Workspace -->
            <div class="flex-1 flex bg-[#d0cec9] overflow-hidden">
                <!-- Slide Sorter -->
                <div class="w-48 bg-[#e1dfdd] border-r border-[#c8c6c4] overflow-y-auto flex flex-col gap-4 p-4">
                    ${this.slides.map((slide, i) => `
                        <div class="bg-white aspect-video shadow-md p-2 flex flex-col gap-1 cursor-pointer ${i === this.currentSlide ? 'ring-2 ring-[#b7472a]' : 'hover:ring-1 hover:ring-gray-400'}" onclick="BossMode.instance.setSlide(${i})">
                            <div class="h-1 w-8 bg-gray-300 mb-1"></div>
                            <div class="h-12 border border-dashed border-gray-200 flex items-center justify-center text-[8px] text-gray-400">Slide ${i+1}</div>
                            <div class="text-[9px] font-bold text-gray-600 truncate">${slide.title}</div>
                        </div>
                    `).join('')}
                </div>

                <!-- Active Slide -->
                <div class="flex-1 flex items-center justify-center p-8 bg-[#d0cec9]">
                    <div class="bg-white aspect-[16/9] w-full max-w-4xl shadow-2xl flex flex-col p-12 relative animate-fade-in">
                        <h1 class="text-4xl font-bold text-gray-800 mb-8 border-b-4 border-[#b7472a] pb-2">${this.slides[this.currentSlide].title}</h1>
                        <ul class="list-disc list-inside text-2xl text-gray-600 space-y-4">
                            ${this.slides[this.currentSlide].bullets.map(b => `<li>${b}</li>`).join('')}
                        </ul>

                        <div class="absolute bottom-4 right-4 text-gray-400 text-sm">Confidential - Internal Use Only</div>
                        <div class="absolute bottom-4 left-4 w-12 h-12 border-2 border-gray-300 rounded-full flex items-center justify-center opacity-20">
                            <i class="fas fa-globe text-2xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
             <div class="bg-[#b7472a] text-white/90 text-[10px] px-2 h-6 flex items-center justify-between">
                <span>Slide ${this.currentSlide + 1} of ${this.slides.length}</span>
                <span>English (U.S.)</span>
             </div>
        `;
    }

    bindInternalEvents() {
        // Close
        const close = document.getElementById('boss-close-x');
        if (close) close.onclick = () => this.toggle(false);

        // Switch Modes
        const toPPT = document.getElementById('boss-switch-ppt');
        if (toPPT) toPPT.onclick = () => { this.mode = 'ppt'; this.render(); };

        const toExcel = document.getElementById('boss-switch-excel');
        if (toExcel) toExcel.onclick = () => { this.mode = 'excel'; this.render(); };

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

            // Clippy
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

        // Headers
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

        // Cells
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
        // Global Key Handler for Boss Mode (Fake Typing, Navigation)
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        if (e.key === 'Escape') return; // Handled in main.js

        if (this.mode === 'excel' && this.selectedCell) {
            // If typing alphanumeric and not editing, start Fake Typing
            if (e.key.length === 1 && !document.activeElement.matches('input')) {
                // Check for Arrow Keys navigation
                // TODO: Add arrow navigation
            }
        }
    }

    updateClippy() {
        if (Math.random() > 0.995 && this.mode === 'excel') { // Low chance per frame if called in loop, but we call this once.
            // Actually let's use a timeout loop
        }
    }

    startClippyLoop() {
        if (this.clippyTimer) clearInterval(this.clippyTimer);
        this.clippyTimer = setInterval(() => {
            if (!this.isActive || this.mode !== 'excel') return;
            if (Math.random() > 0.7) {
                const bubble = document.getElementById('clippy-bubble');
                if (bubble) {
                    bubble.textContent = this.clippyMessages[Math.floor(Math.random() * this.clippyMessages.length)];
                    bubble.classList.remove('hidden');
                    setTimeout(() => bubble.classList.add('hidden'), 4000);
                }
            }
        }, 10000);
    }

    // --- Data ---

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
        this.setCell("G4", "Review overhead costs.");
    }

    setCell(id, value, formula = null, bold = false) {
        this.excelData[id] = { value, formula, bold };
    }

    updateExcelGrid() {
        // Recalc
        for (let id in this.excelData) {
            const cell = this.excelData[id];
            if (cell.formula) {
                cell.value = this.evaluateFormula(cell.formula);
            }
        }

        // DOM
        const cells = document.querySelectorAll('[id^="cell-"]');
        cells.forEach(el => {
            const id = el.dataset.id;
            const item = this.excelData[id];

            // Reset
            el.textContent = '';
            el.className = "border-r border-b border-[#e1dfdd] px-1 overflow-hidden whitespace-nowrap text-[11px] hover:bg-gray-50 cursor-cell bg-white relative";

            if (item) {
                el.textContent = typeof item.value === 'number' ? item.value.toLocaleString() : item.value;
                if (item.bold) el.classList.add('font-bold');
            }

            // Snake
            if (this.snakeGame) this.renderSnakeCell(el, id);
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
                    if (this.excelData[key]) sum += (parseFloat(this.excelData[key].value) || 0);
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

        // Sum calculation for selection (mock)
        document.getElementById('boss-sum-display').textContent = (typeof data?.value === 'number') ? data.value.toLocaleString() : '-';
    }

    editCell(id) {
        document.getElementById('boss-formula-input').focus();
    }

    commitEdit(val) {
        if (!this.selectedCell) return;

        // Easter Eggs
        const upper = val.toString().toUpperCase();
        if (upper === '=SNAKE()') {
            this.startSnakeGame();
            this.setCell(this.selectedCell, "SNAKE ACTIVE");
        } else if (upper === '=GAME()') {
             this.setCell(this.selectedCell, "Nice try.");
             this.adsManager.createPopup("System Alert", "Gaming detected. Reporting to HR.", "bg-red-900");
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

    setSlide(index) {
        this.currentSlide = index;
        this.render(); // Re-render PPT
    }

    openChart() {
         this.adsManager.createPopup("Q3 Revenue Analysis", "<div class='h-32 bg-slate-200 flex items-end gap-2 p-2'><div class='w-4 bg-blue-500 h-1/2'></div><div class='w-4 bg-blue-500 h-3/4'></div><div class='w-4 bg-blue-500 h-full'></div></div>", "bg-white text-black");
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

        this.snakeHandler = (e) => {
            if (!this.snakeGame) return;
            const k = e.key;
            const d = this.snakeGame.dir;
            if (k === 'ArrowUp' && d.r === 0) this.snakeGame.dir = {c: 0, r: -1};
            if (k === 'ArrowDown' && d.r === 0) this.snakeGame.dir = {c: 0, r: 1};
            if (k === 'ArrowLeft' && d.c === 0) this.snakeGame.dir = {c: -1, r: 0};
            if (k === 'ArrowRight' && d.c === 0) this.snakeGame.dir = {c: 1, r: 0};
        };
        window.addEventListener('keydown', this.snakeHandler);
    }

    updateSnake() {
        if (!this.isActive || !this.snakeGame) return;
        const head = {...this.snakeGame.snake[0]};
        head.c += this.snakeGame.dir.c;
        head.r += this.snakeGame.dir.r;

        // Wrap
        if (head.c < 0) head.c = 14;
        if (head.c > 14) head.c = 0;
        if (head.r < 1) head.r = 30;
        if (head.r > 30) head.r = 1;

        // Self hit
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
            window.removeEventListener('keydown', this.snakeHandler);
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
