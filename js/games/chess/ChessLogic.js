export class ChessLogic {
    constructor() {
        this.reset();
    }

    reset() {
        // Standard starting position FEN
        this.loadFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    }

    loadFEN(fen) {
        const parts = fen.split(' ');
        this.board = new Array(64).fill(null);
        this.turn = parts[1]; // 'w' or 'b'
        this.castling = { w: { k: false, q: false }, b: { k: false, q: false } };
        this.enPassant = null; // Target square index or null
        this.halfMoves = parseInt(parts[4]) || 0;
        this.fullMoves = parseInt(parts[5]) || 1;

        // Parse Board
        const rows = parts[0].split('/');
        for (let r = 0; r < 8; r++) {
            let c = 0;
            for (let char of rows[r]) {
                if (/\d/.test(char)) {
                    c += parseInt(char);
                } else {
                    const color = char === char.toUpperCase() ? 'w' : 'b';
                    const type = char.toLowerCase();
                    this.board[r * 8 + c] = { type, color, char };
                    c++;
                }
            }
        }

        // Parse Castling
        if (parts[2] !== '-') {
            if (parts[2].includes('K')) this.castling.w.k = true;
            if (parts[2].includes('Q')) this.castling.w.q = true;
            if (parts[2].includes('k')) this.castling.b.k = true;
            if (parts[2].includes('q')) this.castling.b.q = true;
        }

        // Parse En Passant
        if (parts[3] !== '-') {
            const file = parts[3].charCodeAt(0) - 97;
            const rank = 8 - parseInt(parts[3][1]);
            this.enPassant = rank * 8 + file;
        }
    }

    getPiece(idx) { return this.board[idx]; }

    // Convert rank/file to index 0-63
    idx(r, c) { return r * 8 + c; }
    // Convert index to {r, c}
    rc(idx) { return { r: Math.floor(idx / 8), c: idx % 8 }; }

    getLegalMoves(color = this.turn) {
        const moves = [];
        for (let i = 0; i < 64; i++) {
            const p = this.board[i];
            if (p && p.color === color) {
                const pieceMoves = this.getPseudoLegalMoves(i, p);
                pieceMoves.forEach(m => {
                    if (!this.leadsToCheck(m, color)) {
                        moves.push(m);
                    }
                });
            }
        }
        return moves;
    }

    getPseudoLegalMoves(idx, p) {
        const moves = [];
        const { r, c } = this.rc(idx);
        const forward = p.color === 'w' ? -1 : 1;
        const opponent = p.color === 'w' ? 'b' : 'w';
        const startRank = p.color === 'w' ? 6 : 1;

        const addMove = (tr, tc, flags = {}) => {
            if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return;
            const target = this.board[this.idx(tr, tc)];
            if (!target) {
                // Quiet move
                if (!flags.onlyCapture) moves.push({ from: idx, to: this.idx(tr, tc), type: 'move', ...flags });
            } else if (target.color === opponent) {
                // Capture
                if (!flags.onlyMove) moves.push({ from: idx, to: this.idx(tr, tc), type: 'capture', captured: target, ...flags });
            }
        };

        if (p.type === 'p') {
            // Forward 1
            let tr = r + forward, tc = c;
            if (tr >= 0 && tr <= 7 && !this.board[this.idx(tr, tc)]) {
                addMove(tr, tc, { onlyMove: true });
                // Forward 2
                if (r === startRank) {
                    let tr2 = r + forward * 2;
                    if (!this.board[this.idx(tr2, tc)]) {
                        addMove(tr2, tc, { onlyMove: true, doublePush: true });
                    }
                }
            }
            // Captures
            [[r + forward, c - 1], [r + forward, c + 1]].forEach(([cr, cc]) => {
                if (cr >= 0 && cr <= 7 && cc >= 0 && cc <= 7) {
                    const target = this.board[this.idx(cr, cc)];
                    if (target && target.color === opponent) {
                        moves.push({ from: idx, to: this.idx(cr, cc), type: 'capture', captured: target });
                    } else if (this.enPassant === this.idx(cr, cc)) {
                        moves.push({ from: idx, to: this.idx(cr, cc), type: 'enpassant', captured: { type: 'p', color: opponent } });
                    }
                }
            });
        } else if (p.type === 'n') {
            [[r-2,c-1],[r-2,c+1],[r-1,c-2],[r-1,c+2],[r+1,c-2],[r+1,c+2],[r+2,c-1],[r+2,c+1]].forEach(([tr, tc]) => addMove(tr, tc));
        } else if (p.type === 'k') {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr || dc) addMove(r + dr, c + dc);
                }
            }
            // Castling
            if (this.castling[p.color].k) {
                if (!this.board[this.idx(r, 5)] && !this.board[this.idx(r, 6)]) {
                    if (!this.isSquareAttacked(this.idx(r, 4), opponent) && !this.isSquareAttacked(this.idx(r, 5), opponent) && !this.isSquareAttacked(this.idx(r, 6), opponent)) {
                         moves.push({ from: idx, to: this.idx(r, 6), type: 'castle', side: 'k' });
                    }
                }
            }
            if (this.castling[p.color].q) {
                if (!this.board[this.idx(r, 3)] && !this.board[this.idx(r, 2)] && !this.board[this.idx(r, 1)]) {
                    if (!this.isSquareAttacked(this.idx(r, 4), opponent) && !this.isSquareAttacked(this.idx(r, 3), opponent) && !this.isSquareAttacked(this.idx(r, 2), opponent)) {
                        moves.push({ from: idx, to: this.idx(r, 2), type: 'castle', side: 'q' });
                    }
                }
            }

        } else {
            // Sliders
            const dirs = [];
            if (p.type === 'r' || p.type === 'q') dirs.push([0,1],[0,-1],[1,0],[-1,0]);
            if (p.type === 'b' || p.type === 'q') dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);

            dirs.forEach(([dr, dc]) => {
                let tr = r + dr, tc = c + dc;
                while (tr >= 0 && tr <= 7 && tc >= 0 && tc <= 7) {
                    const tidx = this.idx(tr, tc);
                    const target = this.board[tidx];
                    if (!target) {
                        moves.push({ from: idx, to: tidx, type: 'move' });
                    } else {
                        if (target.color === opponent) moves.push({ from: idx, to: tidx, type: 'capture', captured: target });
                        break; // Blocked
                    }
                    tr += dr; tc += dc;
                }
            });
        }
        return moves;
    }

    leadsToCheck(move, color) {
        // Simulate move
        const savedBoard = [...this.board]; // Shallow copy of array
        // We assume piece objects are immutable enough for this check or we clone them?
        // Piece objects are shared but replaced on move, so shallow array copy is safe IF we don't mutate piece props

        this.board[move.to] = this.board[move.from];
        this.board[move.from] = null;
        if (move.type === 'enpassant') {
            const capIdx = move.to + (color === 'w' ? 8 : -8);
            this.board[capIdx] = null;
        }

        const kingIdx = this.board.findIndex(p => p && p.type === 'k' && p.color === color);
        const opponent = color === 'w' ? 'b' : 'w';
        const inCheck = this.isSquareAttacked(kingIdx, opponent);

        // Restore
        this.board = savedBoard;
        return inCheck;
    }

    isSquareAttacked(idx, byColor) {
        // Simplified: Check if any piece of 'byColor' can move to 'idx'
        // Reverse logic: pretend a super-piece at 'idx' looks for attackers
        if (idx < 0 || idx > 63) return false;

        const { r, c } = this.rc(idx);

        // Pawn attacks
        const pawnRow = byColor === 'w' ? r + 1 : r - 1;
        if (pawnRow >= 0 && pawnRow <= 7) {
            if (c - 1 >= 0) {
                const p = this.board[this.idx(pawnRow, c - 1)];
                if (p && p.color === byColor && p.type === 'p') return true;
            }
            if (c + 1 <= 7) {
                const p = this.board[this.idx(pawnRow, c + 1)];
                if (p && p.color === byColor && p.type === 'p') return true;
            }
        }

        // Knight
        const knights = [[r-2,c-1],[r-2,c+1],[r-1,c-2],[r-1,c+2],[r+1,c-2],[r+1,c+2],[r+2,c-1],[r+2,c+1]];
        for(let [kr, kc] of knights) {
             if (kr>=0 && kr<=7 && kc>=0 && kc<=7) {
                 const p = this.board[this.idx(kr, kc)];
                 if (p && p.color === byColor && p.type === 'n') return true;
             }
        }

        // Sliders (Queen, Rook, Bishop)
        const dirs = [
            { d: [[0,1],[0,-1],[1,0],[-1,0]], t: ['r','q'] },
            { d: [[1,1],[1,-1],[-1,1],[-1,-1]], t: ['b','q'] }
        ];

        for(let grp of dirs) {
            for(let [dr, dc] of grp.d) {
                let tr = r + dr, tc = c + dc;
                while(tr >= 0 && tr <= 7 && tc >= 0 && tc <= 7) {
                    const p = this.board[this.idx(tr, tc)];
                    if (p) {
                        if (p.color === byColor && grp.t.includes(p.type)) return true;
                        break; // Blocked
                    }
                    tr += dr; tc += dc;
                }
            }
        }

        // King
        for(let dr=-1; dr<=1; dr++) {
            for(let dc=-1; dc<=1; dc++) {
                if (dr||dc) {
                    const tr=r+dr, tc=c+dc;
                    if (tr>=0 && tr<=7 && tc>=0 && tc<=7) {
                        const p = this.board[this.idx(tr, tc)];
                        if (p && p.color === byColor && p.type === 'k') return true;
                    }
                }
            }
        }

        return false;
    }

    makeMove(move) {
        // Assume valid
        const p = this.board[move.from];

        // 1. Move piece
        this.board[move.to] = p;
        this.board[move.from] = null;

        // 2. Handle Specials
        if (move.type === 'capture') {
            // Nothing extra (captured removed by overwrite)
        }
        if (move.type === 'enpassant') {
            const capIdx = move.to + (p.color === 'w' ? 8 : -8);
            this.board[capIdx] = null;
        }
        if (move.type === 'castle') {
            const row = p.color === 'w' ? 7 : 0;
            if (move.side === 'k') {
                const rook = this.board[this.idx(row, 7)];
                this.board[this.idx(row, 5)] = rook;
                this.board[this.idx(row, 7)] = null;
            } else {
                const rook = this.board[this.idx(row, 0)];
                this.board[this.idx(row, 3)] = rook;
                this.board[this.idx(row, 0)] = null;
            }
        }

        // 3. Promotion (Auto-Queen for now)
        if (p.type === 'p' && (move.to < 8 || move.to > 55)) {
            p.type = 'q';
            p.char = p.color === 'w' ? 'Q' : 'q';
        }

        // 4. Update Rights
        // Castling
        if (p.type === 'k') {
            this.castling[p.color].k = false;
            this.castling[p.color].q = false;
        }
        if (p.type === 'r') {
            const row = p.color === 'w' ? 7 : 0;
            if (move.from === this.idx(row, 0)) this.castling[p.color].q = false;
            if (move.from === this.idx(row, 7)) this.castling[p.color].k = false;
        }
        // If rook captured
        if (move.captured && move.captured.type === 'r') {
             // Technically should check corners
        }

        // En Passant
        if (move.doublePush) {
            this.enPassant = move.to + (p.color === 'w' ? 8 : -8);
        } else {
            this.enPassant = null;
        }

        this.turn = this.turn === 'w' ? 'b' : 'w';
        this.halfMoves++; // Simplify (not tracking 50 move rule strictly)
    }

    isCheck(color) {
        const kingIdx = this.board.findIndex(p => p && p.type === 'k' && p.color === color);
        return this.isSquareAttacked(kingIdx, color === 'w' ? 'b' : 'w');
    }

    isGameOver() {
        // Returns null if playing, 'checkmate' or 'stalemate'
        const moves = this.getLegalMoves(this.turn);
        if (moves.length === 0) {
            if (this.isCheck(this.turn)) return 'checkmate';
            return 'stalemate';
        }
        return null;
    }

    clone() {
        const c = new ChessLogic();
        c.board = [...this.board]; // Shallow copy of pieces is OK as pieces are replaced
        c.turn = this.turn;
        c.castling = JSON.parse(JSON.stringify(this.castling));
        c.enPassant = this.enPassant;
        return c;
    }
}
