import SoundManager from '../core/SoundManager.js';

export default class NeonChess {
    constructor() {
        this.ctx = null;
        this.canvas = null;
        this.board = []; // 8x8 grid
        this.turn = 'white'; // 'white', 'black'
        this.selected = null; // {x, y}
        this.validMoves = [];
        this.mode = 'MENU'; // MENU, PVP, AUTO
        this.gameOver = false;
        this.autoTimer = 0;

        // Piece Map
        this.pieces = {
            'p': { type: 'pawn', icon: '\uf443' },
            'r': { type: 'rook', icon: '\uf447' },
            'n': { type: 'knight', icon: '\uf441' },
            'b': { type: 'bishop', icon: '\uf43a' },
            'q': { type: 'queen', icon: '\uf445' },
            'k': { type: 'king', icon: '\uf43f' }
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

        // UI Layer
        const ui = document.createElement('div');
        ui.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; display:flex; flex-direction:column; justify-content:center; align-items:center;";
        ui.innerHTML = `
            <div id="chess-menu" class="bg-slate-900/90 p-8 rounded-xl border border-cyan-500 pointer-events-auto flex flex-col gap-4 text-center">
                <h1 class="text-4xl font-bold text-cyan-400 mb-4">NEON CHESS</h1>
                <h2 class="text-xl text-red-400 mb-4 font-bold">SUICIDE MODE</h2>
                <p class="text-sm text-slate-400 mb-6 max-w-xs">Capturing is MANDATORY. The first player to LOSE all pieces (or get stalemated with no pieces) WINS.</p>
                <button id="btn-pvp" class="px-6 py-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded font-bold">Player vs CPU</button>
                <button id="btn-auto" class="px-6 py-3 bg-fuchsia-700 hover:bg-fuchsia-600 text-white rounded font-bold">Autoplay (Watch)</button>
                <button id="btn-exit-chess" class="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded mt-4">Exit</button>
            </div>
             <div id="chess-game-ui" class="hidden absolute top-4 left-4 pointer-events-auto">
                 <button id="btn-chess-back" class="text-slate-500 hover:text-white"><i class="fas fa-arrow-left"></i> Back</button>
                 <div class="mt-2 text-white font-mono" id="chess-status">Turn: WHITE</div>
            </div>
        `;
        this.container.appendChild(ui);

        document.getElementById('btn-pvp').onclick = () => this.startGame('PVP');
        document.getElementById('btn-auto').onclick = () => this.startGame('AUTO');
        document.getElementById('btn-exit-chess').onclick = () => window.miniGameHub.goBack();
        document.getElementById('btn-chess-back').onclick = () => {
             this.mode = 'MENU';
             document.getElementById('chess-menu').classList.remove('hidden');
             document.getElementById('chess-game-ui').classList.add('hidden');
        };

        this.canvas.addEventListener('mousedown', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
             e.preventDefault();
             this.handleClick(e.touches[0]);
        }, {passive:false});

        window.addEventListener('resize', this.resize.bind(this));
        this.resize();
    }

    resize() {
        if (this.canvas && this.container) {
            this.canvas.width = this.container.clientWidth;
            this.canvas.height = this.container.clientHeight;
            this.cellSize = Math.min(this.canvas.width, this.canvas.height) / 8 * 0.9;
            this.offsetX = (this.canvas.width - this.cellSize * 8) / 2;
            this.offsetY = (this.canvas.height - this.cellSize * 8) / 2;
        }
    }

    startGame(mode) {
        this.mode = mode;
        this.resetBoard();
        document.getElementById('chess-menu').classList.add('hidden');
        document.getElementById('chess-game-ui').classList.remove('hidden');
        this.gameOver = false;
        this.turn = 'white';
        this.updateStatus();
    }

    resetBoard() {
        // Standard setup
        // White (bottom): Uppercase. Black (top): Lowercase
        // P=Pawn, R=Rook, N=Knight, B=Bishop, Q=Queen, K=King
        const setup = [
            ['r','n','b','q','k','b','n','r'],
            ['p','p','p','p','p','p','p','p'],
            [null,null,null,null,null,null,null,null],
            [null,null,null,null,null,null,null,null],
            [null,null,null,null,null,null,null,null],
            [null,null,null,null,null,null,null,null],
            ['P','P','P','P','P','P','P','P'],
            ['R','N','B','Q','K','B','N','R']
        ];

        // Deep copy
        this.board = setup.map(row => [...row]);
    }

    handleClick(e) {
        if (this.mode === 'AUTO' || this.gameOver) return;
        if (this.mode === 'PVP' && this.turn === 'black') return; // CPU Turn

        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        const col = Math.floor((x - this.offsetX) / this.cellSize);
        const row = Math.floor((y - this.offsetY) / this.cellSize);

        if (col >= 0 && col < 8 && row >= 0 && row < 8) {
            this.handleInput(row, col);
        } else {
            this.selected = null;
            this.validMoves = [];
        }
    }

    handleInput(row, col) {
        const piece = this.board[row][col];
        const isMyPiece = piece && (this.turn === 'white' ? piece === piece.toUpperCase() : piece === piece.toLowerCase());

        // If clicking a valid move for selected piece
        const move = this.validMoves.find(m => m.r === row && m.c === col);
        if (move) {
            this.makeMove(move);
            return;
        }

        // Select piece
        if (isMyPiece) {
            this.selected = { r: row, c: col };
            this.validMoves = this.getMoves(row, col, piece);

            // Suicide Chess Rule: If ANY move captures, only capturing moves are valid globally.
            // But simplifying: If THIS piece has captures, filtering them?
            // Proper rule: If ANY piece can capture, player MUST capture.

            // Check global captures first
            const allMoves = this.getAllMoves(this.turn);
            const canCapture = allMoves.some(m => m.capture);

            if (canCapture) {
                // If global capture exists, valid moves for THIS piece must be captures
                this.validMoves = this.validMoves.filter(m => m.capture);
                // If this piece has no captures, but others do, this piece cannot move (unless it's the only one moving? No, standard rule is you MUST select a piece that can capture)
                if (this.validMoves.length === 0) {
                     // Can't select this if others can capture
                     // Show feedback?
                }
            }
        } else {
            this.selected = null;
            this.validMoves = [];
        }
    }

    getAllMoves(color) {
        let moves = [];
        for(let r=0; r<8; r++) {
            for(let c=0; c<8; c++) {
                const p = this.board[r][c];
                if (p && (color === 'white' ? p === p.toUpperCase() : p === p.toLowerCase())) {
                    moves = [...moves, ...this.getMoves(r, c, p)];
                }
            }
        }
        return moves;
    }

    makeMove(move) {
        const p = this.board[move.fromR][move.fromC];
        this.board[move.r][move.c] = p; // Move
        this.board[move.fromR][move.fromC] = null; // Clear old

        // Promotion (Simple: Always Queen)
        if (p === 'P' && move.r === 0) this.board[move.r][move.c] = 'Q';
        if (p === 'p' && move.r === 7) this.board[move.r][move.c] = 'q';

        // King capture is allowed in suicide chess (game continues)

        SoundManager.getInstance().playSound(move.capture ? 'explosion' : 'click');

        this.selected = null;
        this.validMoves = [];
        this.checkWinCondition();

        if (!this.gameOver) {
            this.turn = this.turn === 'white' ? 'black' : 'white';
            this.updateStatus();
        }
    }

    checkWinCondition() {
        // Win if no pieces left OR stalemate (no moves)
        // Suicide chess: Lose all pieces = WIN
        const whitePieces = this.board.flat().filter(p => p && p === p.toUpperCase()).length;
        const blackPieces = this.board.flat().filter(p => p && p === p.toLowerCase()).length;

        if (whitePieces === 0) {
            this.endGame('WHITE WINS!');
        } else if (blackPieces === 0) {
            this.endGame('BLACK WINS!');
        } else {
             // Check stalemate
             // If current player has no moves, they win (in some variants) or draw.
             // In "Losing Chess", stalemate is a WIN for the stalemated player.
             const nextTurn = this.turn === 'white' ? 'black' : 'white';
             const moves = this.getAllMoves(nextTurn);
             // Note: getAllMoves doesn't filter captures yet, logic below does.

             // Must filter if captures exist
             const canCapture = moves.some(m => m.capture);
             const valid = canCapture ? moves.filter(m => m.capture) : moves;

             if (valid.length === 0) {
                 this.endGame(`${nextTurn.toUpperCase()} WINS (Stalemate)!`);
             }
        }
    }

    endGame(msg) {
        this.gameOver = true;
        window.miniGameHub.showGameOver(100, () => this.startGame(this.mode)); // Score doesn't matter much
        window.miniGameHub.showToast(msg);
    }

    updateStatus() {
        const el = document.getElementById('chess-status');
        if (el) el.textContent = `Turn: ${this.turn.toUpperCase()}`;
    }

    update(dt) {
        if (this.gameOver) return;

        if (this.mode === 'AUTO' || (this.mode === 'PVP' && this.turn === 'black')) {
            this.autoTimer += dt;
            if (this.autoTimer > (this.mode === 'AUTO' ? 0.2 : 1.0)) {
                this.autoTimer = 0;
                this.cpuMove();
            }
        }
    }

    cpuMove() {
        const moves = this.getAllMoves(this.turn);
        const canCapture = moves.some(m => m.capture);
        let valid = canCapture ? moves.filter(m => m.capture) : moves;

        if (valid.length === 0) return; // Should be handled by win check

        // Pick random
        const move = valid[Math.floor(Math.random() * valid.length)];
        this.makeMove(move);
    }

    // Logic
    getMoves(r, c, p) {
        const moves = [];
        const type = p.toLowerCase();
        const color = p === p.toUpperCase() ? 'white' : 'black';
        const forward = color === 'white' ? -1 : 1;

        const add = (nr, nc) => {
            if (nr < 0 || nr > 7 || nc < 0 || nc > 7) return false; // OOB
            const target = this.board[nr][nc];
            if (target) {
                const tColor = target === target.toUpperCase() ? 'white' : 'black';
                if (tColor !== color) {
                    moves.push({r: nr, c: nc, fromR: r, fromC: c, capture: true});
                    return false; // Blocked by capture
                }
                return false; // Blocked by friendly
            } else {
                moves.push({r: nr, c: nc, fromR: r, fromC: c, capture: false});
                return true; // Continue
            }
        };

        if (type === 'p') {
            // Move 1
            if (this.board[r+forward] && !this.board[r+forward][c]) {
                moves.push({r: r+forward, c: c, fromR: r, fromC: c, capture: false});
                // Move 2
                if ((color === 'white' && r === 6) || (color === 'black' && r === 1)) {
                     if (this.board[r+(forward*2)] && !this.board[r+(forward*2)][c]) {
                         moves.push({r: r+(forward*2), c: c, fromR: r, fromC: c, capture: false});
                     }
                }
            }
            // Capture
            [[r+forward, c-1], [r+forward, c+1]].forEach(([nr, nc]) => {
                if (nr>=0 && nr<8 && nc>=0 && nc<8) {
                    const t = this.board[nr][nc];
                    if (t) {
                         const tColor = t === t.toUpperCase() ? 'white' : 'black';
                         if (tColor !== color) moves.push({r: nr, c: nc, fromR: r, fromC: c, capture: true});
                    }
                }
            });
        }
        else if (type === 'n') {
            [[r-2,c-1],[r-2,c+1],[r-1,c-2],[r-1,c+2],[r+1,c-2],[r+1,c+2],[r+2,c-1],[r+2,c+1]].forEach(([nr, nc]) => add(nr, nc));
        }
        else if (type === 'k') { // King moves as normal piece here (can be captured)
             for(let i=-1; i<=1; i++) for(let j=-1; j<=1; j++) if(i||j) add(r+i, c+j);
        }
        else {
            // Slider directions
            const dirs = [];
            if (type === 'r' || type === 'q') dirs.push([0,1],[0,-1],[1,0],[-1,0]);
            if (type === 'b' || type === 'q') dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);

            dirs.forEach(([dr, dc]) => {
                let nr = r + dr, nc = c + dc;
                while(add(nr, nc)) {
                    nr += dr; nc += dc;
                }
            });
        }
        return moves;
    }

    draw() {
        if (!this.ctx || !this.cellSize || !this.board || this.board.length !== 8) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        const cs = this.cellSize;
        const ox = this.offsetX;
        const oy = this.offsetY;

        // Draw Board
        for(let r=0; r<8; r++) {
            for(let c=0; c<8; c++) {
                const isBlack = (r+c) % 2 === 1;
                ctx.fillStyle = isBlack ? '#1e293b' : '#334155';

                // Highlight moves
                if (this.selected && this.selected.r === r && this.selected.c === c) ctx.fillStyle = '#0891b2'; // Cyan
                if (this.validMoves.some(m => m.r === r && m.c === c)) {
                    ctx.fillStyle = isBlack ? '#047857' : '#059669'; // Green hint
                    if (this.board[r][c]) ctx.fillStyle = '#be123c'; // Red for capture
                }

                ctx.fillRect(ox + c*cs, oy + r*cs, cs, cs);

                // Draw Piece
                const p = this.board[r][c];
                if (p) {
                    const type = p.toLowerCase();
                    const isWhite = p === p.toUpperCase();
                    const icon = this.pieces[type].icon; // This is raw unicode, needs fontawesome font loaded?
                    // Canvas doesn't render FontAwesome unicode easily without loading font.
                    // Fallback to text or shapes?
                    // Let's use text for now: P, R, N...

                    ctx.font = `bold ${cs*0.7}px "FontAwesome", sans-serif`;
                    ctx.fillStyle = isWhite ? '#f8fafc' : '#000000';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    // Shadow for neon
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = isWhite ? 'white' : 'black';

                    // Map manually if font awesome doesn't load
                    // Actually, simple letters might be clearer for MVP
                    // Let's use simple shapes or letters.
                    // Actually, unicode chess pieces exist! ♔♕♖♗♘♙
                    const uni = {
                        'k': isWhite?'♔':'♚',
                        'q': isWhite?'♕':'♛',
                        'r': isWhite?'♖':'♜',
                        'b': isWhite?'♗':'♝',
                        'n': isWhite?'♘':'♞',
                        'p': isWhite?'♙':'♟'
                    };

                    ctx.fillText(uni[type], ox + c*cs + cs/2, oy + r*cs + cs/2 + 5);
                    ctx.shadowBlur = 0;
                }
            }
        }
    }

    shutdown() {
        window.removeEventListener('resize', this.resize);
    }
}
