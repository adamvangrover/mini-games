import { ChessLogic } from './ChessLogic.js';
import { ChessAI } from './ChessAI.js';
import { CHESS_TUTORIALS } from './ChessTutorials.js';
import SoundManager from '../../core/SoundManager.js';

export default class ClassicChessGame {
    constructor() {
        this.logic = new ChessLogic();
        this.ai = new ChessAI(this.logic);
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.mode = 'MENU'; // MENU, PVP, PVAI, AIVAI, TUTORIAL
        this.selected = null;
        this.validMoves = [];
        this.flipBoard = false; // If player plays black
        this.aiConfig = { w: 'balanced', b: 'balanced', depth: 3, speed: 500 }; // Speed for AIvAI
        this.timers = { auto: 0 };
        this.gameOver = false;

        // Piece Icons (Unicode) - Fallback if fonts fail, but usually safe on modern browsers
        this.pieces = {
            w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
            b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
        };
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.style.position = 'relative';

        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.renderUI();
        window.addEventListener('resize', this.resize.bind(this));

        // Input
        this.canvas.addEventListener('mousedown', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleClick(e.touches[0]); }, {passive: false});

        this.resize();
    }

    renderUI() {
        const ui = document.createElement('div');
        ui.id = 'chess-ui-layer';
        ui.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; display:flex; flex-direction:column; align-items:center; justify-content:center;";

        ui.innerHTML = `
            <!-- MENU -->
            <div id="chess-main-menu" class="bg-slate-900/95 p-8 rounded-xl border border-cyan-500 pointer-events-auto text-center shadow-[0_0_50px_rgba(6,182,212,0.3)]">
                <h1 class="text-5xl font-bold text-white mb-2">CLASSIC CHESS</h1>
                <p class="text-cyan-400 mb-8 tracking-widest">EXPERT EDITION</p>

                <div class="grid grid-cols-1 gap-4 w-64">
                    <button class="menu-btn px-6 py-3 bg-slate-800 hover:bg-cyan-900 border border-slate-600 rounded text-white font-bold transition-all" onclick="this.dispatchEvent(new CustomEvent('mode', {bubbles:true, detail:'PVAI'}))">
                        <i class="fas fa-user-astronaut mr-2"></i> Vs AI
                    </button>
                    <button class="menu-btn px-6 py-3 bg-slate-800 hover:bg-fuchsia-900 border border-slate-600 rounded text-white font-bold transition-all" onclick="this.dispatchEvent(new CustomEvent('mode', {bubbles:true, detail:'AIVAI'}))">
                        <i class="fas fa-robot mr-2"></i> Watch AI vs AI
                    </button>
                    <button class="menu-btn px-6 py-3 bg-slate-800 hover:bg-green-900 border border-slate-600 rounded text-white font-bold transition-all" onclick="this.dispatchEvent(new CustomEvent('mode', {bubbles:true, detail:'TUTORIAL'}))">
                        <i class="fas fa-book mr-2"></i> Tutorials
                    </button>
                    <button class="menu-btn px-6 py-3 bg-slate-800 hover:bg-red-900 border border-slate-600 rounded text-white font-bold transition-all" onclick="window.miniGameHub.goBack()">
                        Exit
                    </button>
                </div>
            </div>

            <!-- SETUP: PVAI -->
            <div id="chess-setup-pvai" class="hidden bg-slate-900/95 p-8 rounded-xl border border-cyan-500 pointer-events-auto text-center">
                <h2 class="text-2xl font-bold text-white mb-4">Match Setup</h2>
                <div class="mb-4 text-left">
                    <label class="block text-slate-400 text-sm mb-1">Difficulty (Depth)</label>
                    <input type="range" min="1" max="4" value="3" class="w-full" id="pvai-depth">
                    <div class="flex justify-between text-xs text-slate-500"><span>Easy</span><span>Expert</span></div>
                </div>
                <div class="mb-6 text-left">
                    <label class="block text-slate-400 text-sm mb-1">AI Style</label>
                    <select id="pvai-style" class="w-full bg-slate-800 border border-slate-600 text-white rounded p-2">
                        <option value="balanced">Balanced</option>
                        <option value="aggressive">Aggressive (Attacker)</option>
                        <option value="defensive">Defensive (Fortress)</option>
                    </select>
                </div>
                <button id="btn-start-pvai" class="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded text-white font-bold">START MATCH</button>
                <button class="mt-2 text-slate-500 hover:text-white underline text-sm" onclick="document.getElementById('chess-setup-pvai').classList.add('hidden'); document.getElementById('chess-main-menu').classList.remove('hidden');">Back</button>
            </div>

            <!-- SETUP: AIVAI -->
            <div id="chess-setup-aivai" class="hidden bg-slate-900/95 p-8 rounded-xl border border-fuchsia-500 pointer-events-auto text-center">
                <h2 class="text-2xl font-bold text-white mb-4">Simulation Setup</h2>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <h3 class="text-white font-bold text-sm">WHITE AI</h3>
                        <select id="aivai-style-w" class="w-full bg-slate-800 border border-slate-600 text-white rounded p-2 text-xs">
                            <option value="balanced">Balanced</option>
                            <option value="aggressive">Aggressive</option>
                            <option value="defensive">Defensive</option>
                        </select>
                    </div>
                    <div>
                        <h3 class="text-black bg-white px-1 font-bold text-sm">BLACK AI</h3>
                        <select id="aivai-style-b" class="w-full bg-slate-800 border border-slate-600 text-white rounded p-2 text-xs">
                            <option value="balanced">Balanced</option>
                            <option value="aggressive">Aggressive</option>
                            <option value="defensive">Defensive</option>
                        </select>
                    </div>
                </div>
                <div class="mb-6 text-left">
                    <label class="block text-slate-400 text-sm mb-1">Move Speed (ms)</label>
                    <input type="range" min="50" max="2000" value="500" step="50" class="w-full" id="aivai-speed">
                    <div class="flex justify-between text-xs text-slate-500"><span>Hyper</span><span>Slow</span></div>
                </div>
                <button id="btn-start-aivai" class="w-full px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 rounded text-white font-bold">START SIMULATION</button>
                 <button class="mt-2 text-slate-500 hover:text-white underline text-sm" onclick="document.getElementById('chess-setup-aivai').classList.add('hidden'); document.getElementById('chess-main-menu').classList.remove('hidden');">Back</button>
            </div>

            <!-- TUTORIALS -->
            <div id="chess-tutorials" class="hidden w-full max-w-2xl bg-slate-900/95 p-8 rounded-xl border border-green-500 pointer-events-auto h-[80vh] flex flex-col">
                <h2 class="text-2xl font-bold text-white mb-4">Academy</h2>
                <div class="flex gap-2 mb-4 overflow-x-auto pb-2">
                    ${CHESS_TUTORIALS.map((t, i) => `
                        <button class="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-white text-sm whitespace-nowrap border border-slate-600" onclick="this.dispatchEvent(new CustomEvent('tut', {bubbles:true, detail:${i}}))">${t.title}</button>
                    `).join('')}
                </div>
                <div id="tut-content" class="bg-slate-800 p-6 rounded flex-1 overflow-y-auto text-slate-300">
                    Select a topic...
                </div>
                <button class="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white" onclick="document.getElementById('chess-tutorials').classList.add('hidden'); document.getElementById('chess-main-menu').classList.remove('hidden');">Back to Menu</button>
            </div>

            <!-- IN GAME HUD -->
            <div id="chess-hud" class="hidden absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-auto">
                 <button class="bg-slate-900/80 text-white px-4 py-2 rounded hover:bg-slate-800" onclick="this.dispatchEvent(new CustomEvent('back'))"><i class="fas fa-arrow-left"></i> Menu</button>
                 <div class="bg-slate-900/80 px-4 py-2 rounded text-white font-mono" id="chess-turn-indicator">TURN: WHITE</div>
            </div>
        `;
        this.container.appendChild(ui);

        // Event Listeners
        ui.addEventListener('mode', (e) => {
            document.getElementById('chess-main-menu').classList.add('hidden');
            if (e.detail === 'PVAI') document.getElementById('chess-setup-pvai').classList.remove('hidden');
            if (e.detail === 'AIVAI') document.getElementById('chess-setup-aivai').classList.remove('hidden');
            if (e.detail === 'TUTORIAL') {
                document.getElementById('chess-tutorials').classList.remove('hidden');
                // Load first
                this.loadTutorial(0);
            }
        });

        ui.addEventListener('tut', (e) => this.loadTutorial(e.detail));

        document.getElementById('btn-start-pvai').onclick = () => {
            const depth = parseInt(document.getElementById('pvai-depth').value);
            const style = document.getElementById('pvai-style').value;
            this.startPVAI(depth, style);
        };

        document.getElementById('btn-start-aivai').onclick = () => {
             const styleW = document.getElementById('aivai-style-w').value;
             const styleB = document.getElementById('aivai-style-b').value;
             const speed = parseInt(document.getElementById('aivai-speed').value);
             this.startAIVAI(styleW, styleB, speed);
        };

        ui.addEventListener('back', () => {
            this.mode = 'MENU';
            this.gameOver = true;
            document.getElementById('chess-hud').classList.add('hidden');
            document.getElementById('chess-main-menu').classList.remove('hidden');
        });
    }

    loadTutorial(idx) {
        document.getElementById('tut-content').innerHTML = CHESS_TUTORIALS[idx].content;
    }

    resize() {
        if (this.canvas && this.container) {
            this.canvas.width = this.container.clientWidth;
            this.canvas.height = this.container.clientHeight;
            // Board dims
            const size = Math.min(this.canvas.width, this.canvas.height) * 0.9;
            this.boardRect = {
                x: (this.canvas.width - size) / 2,
                y: (this.canvas.height - size) / 2,
                w: size,
                h: size,
                cell: size / 8
            };
        }
    }

    startPVAI(depth, style) {
        this.mode = 'PVAI';
        this.aiConfig = { w: null, b: style, depth: depth, speed: 0 };
        this.resetGame();
    }

    startAIVAI(wStyle, bStyle, speed) {
        this.mode = 'AIVAI';
        this.aiConfig = { w: wStyle, b: bStyle, depth: 2, speed: speed }; // Lower depth for speed watching? Or keep 3.
        this.resetGame();
    }

    resetGame() {
        this.logic.reset();
        this.gameOver = false;
        this.selected = null;
        this.validMoves = [];
        this.timers.auto = 0;

        document.getElementById('chess-setup-pvai').classList.add('hidden');
        document.getElementById('chess-setup-aivai').classList.add('hidden');
        document.getElementById('chess-hud').classList.remove('hidden');
        this.updateHUD();
    }

    updateHUD() {
        const el = document.getElementById('chess-turn-indicator');
        if (el) el.textContent = `TURN: ${this.logic.turn === 'w' ? 'WHITE' : 'BLACK'}`;
    }

    handleClick(e) {
        if (this.gameOver) return;
        if (this.mode === 'AIVAI') return;
        if (this.mode === 'PVAI' && this.logic.turn === 'b') return; // AI Turn

        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        // Check board bounds
        const bx = x - this.boardRect.x;
        const by = y - this.boardRect.y;

        if (bx < 0 || bx > this.boardRect.w || by < 0 || by > this.boardRect.h) {
            this.selected = null;
            this.validMoves = [];
            return;
        }

        const col = Math.floor(bx / this.boardRect.cell);
        const row = Math.floor(by / this.boardRect.cell);
        const idx = row * 8 + col;

        // Logic uses standard orientation (0,0 is a8).
        // Our board rendering: row 0 is top (a8..h8). row 7 is bottom (a1..h1).
        // Wait, standard FEN r0 is rank 8. Logic code: row 0 is rank 8.
        // So visually Top-Left (0,0) matches logic index 0. Perfect.

        // Handle Move
        const move = this.validMoves.find(m => m.to === idx);
        if (move) {
            this.makeMove(move);
            return;
        }

        // Select
        const p = this.logic.board[idx];
        if (p && p.color === this.logic.turn) {
            this.selected = idx;
            this.validMoves = this.logic.getLegalMoves(this.logic.turn).filter(m => m.from === idx);
            SoundManager.getInstance().playSound('click');
        } else {
            this.selected = null;
            this.validMoves = [];
        }
    }

    makeMove(move) {
        this.logic.makeMove(move);
        SoundManager.getInstance().playSound(move.type === 'capture' ? 'kick' : 'click');

        this.selected = null;
        this.validMoves = [];

        // Check End
        const state = this.logic.isGameOver();
        if (state) {
            this.endGame(state);
        } else {
            this.updateHUD();
        }
    }

    endGame(state) {
        this.gameOver = true;
        let msg = "";
        if (state === 'checkmate') {
            msg = `CHECKMATE! ${this.logic.turn === 'w' ? 'BLACK' : 'WHITE'} WINS!`;
            SoundManager.getInstance().playSound('victory');
        } else {
            msg = "STALEMATE / DRAW";
        }
        window.miniGameHub.showToast(msg);
    }

    update(dt) {
        if (this.gameOver) return;

        // AI Logic
        const color = this.logic.turn;
        const config = color === 'w' ? this.aiConfig.w : this.aiConfig.b;

        if (config) {
            this.timers.auto += dt;
            let threshold = this.mode === 'AIVAI' ? this.aiConfig.speed / 1000 : 1.0;

            if (this.timers.auto > threshold) {
                this.timers.auto = 0;
                // Run AI
                // Use setTimeout to allow UI render before freeze (JS single thread)
                // Or async
                this.ai.style = config === 'balanced' ? 'balanced' : config;
                const move = this.ai.getBestMove(this.aiConfig.depth, color);
                if (move) {
                    this.makeMove(move);
                } else {
                    // Should be game over handled by isGameOver logic?
                    // Sometimes getLegalMoves returns empty but isGameOver wasn't called.
                    const state = this.logic.isGameOver();
                    if(state) this.endGame(state);
                }
            }
        }
    }

    draw() {
        if (!this.ctx || !this.boardRect) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // BG
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        const { x, y, w: bw, h: bh, cell } = this.boardRect;

        // Board
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const idx = r * 8 + c;
                const isDark = (r + c) % 2 === 1;

                ctx.fillStyle = isDark ? '#334155' : '#94a3b8';

                // Highlights
                if (this.selected === idx) ctx.fillStyle = 'rgba(6, 182, 212, 0.5)'; // Cyan
                // Last Move?

                // Valid Move Target
                if (this.validMoves.some(m => m.to === idx)) {
                    ctx.fillStyle = isDark ? '#059669' : '#34d399'; // Green
                    if (this.logic.board[idx]) ctx.fillStyle = '#f43f5e'; // Red (Capture)
                }

                ctx.fillRect(x + c * cell, y + r * cell, cell, cell);

                // Piece
                const p = this.logic.board[idx];
                if (p) {
                    const char = this.pieces[p.color][p.type];
                    ctx.font = `${cell * 0.8}px serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = p.color === 'w' ? '#fff' : '#000';
                    if (p.color === 'w') {
                        ctx.shadowColor = '#000';
                        ctx.shadowBlur = 5;
                    }
                    ctx.fillText(char, x + c * cell + cell/2, y + r * cell + cell/2 + 5);
                    ctx.shadowBlur = 0;
                }
            }
        }

        // Coordinates (Simple)
        ctx.fillStyle = '#64748b';
        ctx.font = '12px monospace';
        for(let i=0; i<8; i++) {
            ctx.fillText(8-i, x - 15, y + i*cell + cell/2);
            ctx.fillText(String.fromCharCode(97+i), x + i*cell + cell/2, y + bh + 15);
        }
    }

    shutdown() {
        window.removeEventListener('resize', this.resize);
    }
}
