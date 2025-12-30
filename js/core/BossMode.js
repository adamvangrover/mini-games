// The "Spreadsheet" that is actually a stealth game console.
import SaveSystem from './SaveSystem.js';
import SoundManager from './SoundManager.js';
import AdsManager from './AdsManager.js';

export default class BossMode {
    constructor() {
        if (BossMode.instance) return BossMode.instance;
        BossMode.instance = this;

        this.isActive = false;
        this.overlay = null;
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.adsManager = AdsManager.getInstance();
        this.wasMuted = false;
        this.wasPaused = false;

        this.data = {}; // Cell Data: { "A1": { value: "100", formula: "=SUM(B1:B5)" } }
        this.selectedCell = null; // { col: "A", row: 1 }

        this.snakeGame = null; // Active hidden game state

        this.init();
    }

    init() {
        // Create the DOM overlay if it doesn't exist
        // Note: We are replacing the static one from index.html with a dynamic one
        let existing = document.getElementById('boss-mode-overlay');
        if (existing) existing.remove(); // Remove the static one to upgrade it

        this.overlay = document.createElement('div');
        this.overlay.id = 'boss-mode-overlay';
        this.overlay.className = 'hidden fixed inset-0 z-[10000] bg-white font-sans text-xs text-black flex flex-col cursor-default select-none overflow-hidden';

        this.renderLayout();
        document.body.appendChild(this.overlay);

        this.bindEvents();
        this.generateFakeData();
    }

    renderLayout() {
        this.overlay.innerHTML = `
            <!-- Top Title Bar -->
            <div class="bg-[#217346] text-white flex items-center justify-between px-2 py-1 select-none h-8">
                <div class="flex items-center gap-4">
                     <div class="flex gap-2">
                         <i class="fas fa-th"></i>
                         <span>AutoSave</span>
                         <div class="w-8 h-4 bg-white/20 rounded-full relative"><div class="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div></div>
                     </div>
                     <div class="flex items-center gap-2 border-l border-white/20 pl-4">
                         <i class="fas fa-save"></i>
                         <span class="font-bold">Quarterly_Financial_Report_FY24.xlsx</span>
                         <span class="bg-white/20 px-1 rounded text-[10px]">Saved</span>
                     </div>
                </div>
                <div class="flex items-center gap-4">
                     <div class="flex items-center gap-2">
                         <div class="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[10px]">JD</div>
                         <span>John Doe</span>
                     </div>
                     <div class="flex gap-4 text-white/80">
                          <i class="fas fa-window-minimize cursor-pointer"></i>
                          <i class="fas fa-window-restore cursor-pointer"></i>
                          <i class="fas fa-times cursor-pointer hover:bg-red-500 px-2 py-1" id="boss-close-x"></i>
                     </div>
                </div>
            </div>

            <!-- Ribbon (Static) -->
            <div class="bg-[#f3f2f1] border-b border-[#e1dfdd] flex flex-col">
                <div class="flex items-center px-2 py-1 gap-4 text-[#252423]">
                    <span class="bg-white px-2 py-1 border-b-2 border-[#217346] text-[#217346] font-bold">File</span>
                    <span class="hover:bg-[#e1dfdd] px-2 py-1 cursor-pointer">Home</span>
                    <span class="hover:bg-[#e1dfdd] px-2 py-1 cursor-pointer">Insert</span>
                    <span class="hover:bg-[#e1dfdd] px-2 py-1 cursor-pointer">Page Layout</span>
                    <span class="hover:bg-[#e1dfdd] px-2 py-1 cursor-pointer">Formulas</span>
                    <span class="hover:bg-[#e1dfdd] px-2 py-1 cursor-pointer">Data</span>
                    <span class="hover:bg-[#e1dfdd] px-2 py-1 cursor-pointer">Review</span>
                    <span class="hover:bg-[#e1dfdd] px-2 py-1 cursor-pointer">View</span>
                    <span class="hover:bg-[#e1dfdd] px-2 py-1 cursor-pointer">Help</span>
                </div>
                <div class="px-2 py-2 flex items-center gap-2 h-20 overflow-hidden whitespace-nowrap bg-[#f3f2f1]">
                    <!-- Basic Ribbon Icons -->
                     <div class="flex flex-col items-center gap-1 border-r border-[#e1dfdd] pr-2">
                          <i class="fas fa-paste text-xl text-gray-600"></i>
                          <span class="text-[10px]">Paste</span>
                     </div>
                     <div class="flex flex-col gap-1 border-r border-[#e1dfdd] pr-2">
                          <div class="flex items-center gap-1 bg-white border border-[#e1dfdd] px-1 w-24 justify-between text-[10px]">
                               <span>Calibri</span>
                               <i class="fas fa-chevron-down text-[8px]"></i>
                          </div>
                          <div class="flex gap-1 text-[11px]">
                               <span class="font-bold px-1 hover:bg-gray-200 cursor-pointer">B</span>
                               <span class="italic px-1 hover:bg-gray-200 cursor-pointer">I</span>
                               <span class="underline px-1 hover:bg-gray-200 cursor-pointer">U</span>
                               <div class="border-l border-gray-300 mx-1"></div>
                               <i class="fas fa-fill text-yellow-400 border-b-2 border-yellow-400"></i>
                          </div>
                     </div>
                     <!-- Add "Generate" Button for Math Puzzle -->
                     <button id="boss-gen-btn" class="flex flex-col items-center gap-1 px-3 py-1 hover:bg-gray-200 rounded border border-transparent hover:border-gray-300">
                        <i class="fas fa-calculator text-green-600 text-lg"></i>
                        <span class="text-[10px]">Re-Calc</span>
                     </button>
                     <!-- Add "Stock Ticker" Button -->
                     <button id="boss-stocks-btn" class="flex flex-col items-center gap-1 px-3 py-1 hover:bg-gray-200 rounded border border-transparent hover:border-gray-300">
                        <i class="fas fa-chart-line text-blue-600 text-lg"></i>
                        <span class="text-[10px]">Markets</span>
                     </button>
                </div>
            </div>

            <!-- Formula Bar -->
            <div class="bg-white border-b border-[#e1dfdd] flex items-center px-2 py-1 gap-2 h-8">
                <div id="boss-cell-addr" class="bg-white border border-[#e1dfdd] px-2 w-16 text-center text-gray-600 font-bold">A1</div>
                <div class="flex gap-2 text-gray-400 px-2 border-r border-[#e1dfdd]">
                     <i class="fas fa-times"></i>
                     <i class="fas fa-check"></i>
                     <i class="fas fa-function">fx</i>
                </div>
                <input id="boss-formula-input" class="bg-white border-none flex-1 px-2 font-mono text-gray-800 outline-none h-full" value="">
            </div>

            <!-- Grid Container -->
            <div class="flex-1 flex overflow-hidden relative">
                 <!-- Row Header -->
                 <div id="boss-row-headers" class="w-10 bg-[#f3f2f1] border-r border-[#e1dfdd] flex flex-col text-center text-gray-500 select-none overflow-hidden pt-[24px]">
                    <!-- Populated by JS -->
                 </div>

                 <div class="flex-1 flex flex-col overflow-hidden relative">
                    <!-- Col Header -->
                    <div id="boss-col-headers" class="h-6 bg-[#f3f2f1] border-b border-[#e1dfdd] flex text-gray-500 font-bold select-none pr-4">
                        <!-- Populated by JS -->
                    </div>

                    <!-- Cells Scroll Area -->
                    <div id="boss-grid-scroll" class="flex-1 overflow-auto bg-white relative">
                        <div id="boss-grid" class="grid relative">
                            <!-- Cells Populated by JS -->
                        </div>
                    </div>
                 </div>
            </div>

            <!-- Footer -->
            <div class="bg-[#f3f2f1] border-t border-[#e1dfdd] flex items-center justify-between px-2 py-0.5 text-gray-600 text-[11px] h-6">
                 <div class="flex items-center gap-4">
                      <span class="text-[#217346] font-bold">Ready</span>
                      <span>Sum: <span id="boss-sum-display">0</span></span>
                 </div>
                 <div class="flex items-center gap-2">
                      <i class="fas fa-minus hover:text-black cursor-pointer"></i>
                      <div class="w-20 h-1 bg-gray-300 rounded-full"></div>
                      <i class="fas fa-plus hover:text-black cursor-pointer"></i>
                      <span>100%</span>
                 </div>
            </div>

            <!-- Tabs -->
             <div class="bg-[#f3f2f1] border-t border-[#e1dfdd] flex items-center px-2 gap-1 h-8">
                 <div class="flex items-center gap-2 px-2 text-gray-500">
                      <i class="fas fa-chevron-left"></i>
                      <i class="fas fa-chevron-right"></i>
                 </div>
                 <div class="bg-white text-[#217346] font-bold px-4 h-full flex items-center border-t-2 border-x border-[#e1dfdd] border-b-white z-10 -mb-[1px]">Data</div>
                 <div class="text-gray-600 px-4 h-full flex items-center hover:bg-[#e1dfdd] cursor-pointer">Analysis</div>
                 <div class="text-gray-500 px-2 h-full flex items-center hover:bg-[#e1dfdd] cursor-pointer"><i class="fas fa-plus-circle"></i></div>
             </div>
        `;
    }

    bindEvents() {
        // Toggle Listener is in main.js calling handleKey
        document.getElementById('boss-close-x').onclick = () => this.toggle(false);
        document.getElementById('boss-gen-btn').onclick = () => this.generateFakeData();
        document.getElementById('boss-stocks-btn').onclick = () => this.openStockMarket();

        // Formula Input
        const input = document.getElementById('boss-formula-input');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.commitEdit(input.value);
                input.blur();
            }
        });

        // Grid Logic
        this.initGrid();
    }

    initGrid() {
        const rows = 30;
        const cols = 15; // A-O
        const grid = document.getElementById('boss-grid');
        const colHeaders = document.getElementById('boss-col-headers');
        const rowHeaders = document.getElementById('boss-row-headers');

        // Setup Grid CSS
        grid.style.gridTemplateColumns = `repeat(${cols}, 80px)`;
        grid.style.gridTemplateRows = `repeat(${rows}, 24px)`;

        // Headers
        colHeaders.innerHTML = '';
        rowHeaders.innerHTML = '';

        for (let c=0; c<cols; c++) {
            const char = String.fromCharCode(65 + c);
            const div = document.createElement('div');
            div.className = "flex-1 border-r border-[#e1dfdd] flex items-center justify-center min-w-[80px]";
            div.textContent = char;
            colHeaders.appendChild(div);
        }

        for (let r=1; r<=rows; r++) {
            const div = document.createElement('div');
            div.className = "h-[24px] border-b border-[#e1dfdd] flex items-center justify-center";
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
                cell.dataset.col = c;
                cell.dataset.row = r;
                cell.className = "border-r border-b border-[#e1dfdd] px-1 overflow-hidden whitespace-nowrap text-[11px] hover:bg-gray-50 cursor-cell bg-white relative";
                cell.onclick = () => this.selectCell(id);
                cell.ondblclick = () => this.editCell(id);
                grid.appendChild(cell);
            }
        }
    }

    generateFakeData() {
        this.data = {};
        const categories = ["Revenue", "COGS", "Gross Margin", "Opex", "R&D", "S&M", "G&A", "EBITDA", "Net Income"];

        // Headers
        this.setData("A1", "Category");
        this.setData("B1", "Q1");
        this.setData("C1", "Q2");
        this.setData("D1", "Q3");
        this.setData("E1", "Q4");

        let r = 2;
        categories.forEach(cat => {
            this.setData(`A${r}`, cat);
            // Random Values
            for (let c=0; c<4; c++) {
                const col = String.fromCharCode(66 + c); // B, C, D, E
                const val = Math.floor(Math.random() * 50000) + 10000;
                this.setData(`${col}${r}`, val);
            }
            r++;
        });

        // Add a "Total" row with Formula
        this.setData(`A${r}`, "TOTAL");
        for (let c=0; c<4; c++) {
            const col = String.fromCharCode(66 + c);
            this.setData(`${col}${r}`, 0, `=SUM(${col}2:${col}${r-1})`);
        }

        this.updateGrid();
    }

    setData(id, value, formula = null) {
        this.data[id] = { value, formula: formula || null };
    }

    updateGrid() {
        // Simple recalculation of formulas
        for (let id in this.data) {
            const cell = this.data[id];
            if (cell.formula) {
                cell.value = this.evaluateFormula(cell.formula);
            }
        }

        // Update DOM
        const cells = document.querySelectorAll('[id^="cell-"]');
        cells.forEach(el => {
            const id = el.dataset.id;
            const item = this.data[id];
            if (item) {
                el.textContent = typeof item.value === 'number' ? item.value.toLocaleString() : item.value;
                if (id.startsWith('A') || id.endsWith('1')) el.classList.add('font-bold');
            } else {
                el.textContent = '';
            }

            // Snake Rendering
            if (this.snakeGame) {
                this.renderSnakeCell(el, id);
            }
        });
    }

    evaluateFormula(f) {
        if (f.startsWith('=SUM')) {
            const range = f.match(/\((.*?)\)/)[1]; // B2:B10
            const [start, end] = range.split(':');
            const col = start.charAt(0);
            const startRow = parseInt(start.substring(1));
            const endRow = parseInt(end.substring(1));
            let sum = 0;
            for (let i=startRow; i<=endRow; i++) {
                const key = `${col}${i}`;
                if (this.data[key]) sum += (parseFloat(this.data[key].value) || 0);
            }
            return sum;
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
        const data = this.data[id];
        document.getElementById('boss-formula-input').value = data ? (data.formula || data.value) : '';
    }

    editCell(id) {
        // Placeholder: Focus formula bar
        document.getElementById('boss-formula-input').focus();
    }

    commitEdit(val) {
        if (!this.selectedCell) return;

        // Easter Egg: Game Trigger
        if (val.toUpperCase() === '=SNAKE()') {
            this.startSnakeGame();
            this.setData(this.selectedCell, "SNAKE MODE ACTIVE");
        } else if (val.startsWith('=')) {
            this.setData(this.selectedCell, 0, val);
        } else {
            this.setData(this.selectedCell, isNaN(val) ? val : parseFloat(val));
        }
        this.updateGrid();
    }

    // --- Snake Game Logic ---
    startSnakeGame() {
        if (this.snakeGame) return;
        this.snakeGame = {
            active: true,
            snake: [{c: 5, r: 5}, {c: 4, r: 5}, {c: 3, r: 5}],
            dir: {c: 1, r: 0}, // Right
            food: {c: 10, r: 10},
            score: 0,
            interval: setInterval(() => this.updateSnake(), 200)
        };

        // Bind Keys
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

        // Wall Collision (Wrap or Die? Let's Wrap)
        if (head.c < 0) head.c = 14;
        if (head.c > 14) head.c = 0;
        if (head.r < 1) head.r = 30;
        if (head.r > 30) head.r = 1;

        // Self Collision
        if (this.snakeGame.snake.some(s => s.c === head.c && s.r === head.r)) {
            this.stopSnakeGame();
            return;
        }

        this.snakeGame.snake.unshift(head);

        // Eat Food
        if (head.c === this.snakeGame.food.c && head.r === this.snakeGame.food.r) {
            this.snakeGame.score += 10;
            this.soundManager.playSound('coin');
            // Move Food
            this.snakeGame.food = {
                c: Math.floor(Math.random() * 15),
                r: Math.floor(Math.random() * 30) + 1
            };
        } else {
            this.snakeGame.snake.pop();
        }

        this.updateGrid();
    }

    stopSnakeGame() {
        if (this.snakeGame) {
            clearInterval(this.snakeGame.interval);
            window.removeEventListener('keydown', this.snakeHandler);
            this.snakeGame = null;
            this.soundManager.playSound('game-over');
            alert("SNAKE OVER. Back to work.");
            this.generateFakeData(); // Reset grid
        }
    }

    renderSnakeCell(el, id) {
        // id is like "A1"
        const colChar = id.charAt(0);
        const rowStr = id.substring(1);
        const col = colChar.charCodeAt(0) - 65;
        const row = parseInt(rowStr);

        // Clear previous styles
        el.style.backgroundColor = 'white';
        el.style.color = 'black';

        // Draw Snake
        if (this.snakeGame.snake.some(s => s.c === col && s.r === row)) {
            el.style.backgroundColor = '#217346'; // Excel Green
            el.style.color = '#217346'; // Hide text
            el.textContent = '';
        }

        // Draw Food
        if (this.snakeGame.food.c === col && this.snakeGame.food.r === row) {
            el.style.backgroundColor = '#d946ef'; // Neon Pink Apple
            el.style.color = '#d946ef';
            el.textContent = '🍎';
        }
    }

    openStockMarket() {
         // Create a fake popup
         this.adsManager.createPopup("Neon Markets", "NKKEI: +20% | NDAQ: -5%", "bg-slate-800");
    }

    // --- Core Toggle ---
    toggle(forceState = null) {
        const nextState = forceState !== null ? forceState : !this.isActive;
        if (nextState === this.isActive) return;

        this.isActive = nextState;

        if (this.isActive) {
            this.overlay.classList.remove('hidden');

            // Save state
            this.wasMuted = this.soundManager.muted;
            //this.wasPaused = (window.miniGameHub.currentState === 'IN_GAME'); // Access global state is tricky here without reference

            // Mute and Pause
            if (!this.soundManager.muted) {
                this.soundManager.toggleMute();
                const btn = document.getElementById('mute-btn-hud');
                if(btn) btn.innerHTML = '<i class="fas fa-volume-mute text-red-400"></i>';
            }
            // Trigger pause in main loop? Handled by main.js listener usually,
            // but if we move logic here, we need access to `transitionToState` or `togglePause`.
            // For now, main.js handles the pause trigger, BossMode handles the UI.

        } else {
            this.overlay.classList.add('hidden');
            // Unmute
            if (!this.wasMuted && this.soundManager.muted) {
                this.soundManager.toggleMute();
                const btn = document.getElementById('mute-btn-hud');
                if(btn) btn.innerHTML = '<i class="fas fa-volume-up"></i>';
            }
        }
    }
}
