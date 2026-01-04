// Piece-Square Tables (Midgame)
const PST = {
    p: [
         0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
         5,  5, 10, 25, 25, 10,  5,  5,
         0,  0,  0, 20, 20,  0,  0,  0,
         5, -5,-10,  0,  0,-10, -5,  5,
         5, 10, 10,-20,-20, 10, 10,  5,
         0,  0,  0,  0,  0,  0,  0,  0
    ],
    n: [
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50
    ],
    b: [
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20
    ],
    r: [
         0,  0,  0,  0,  0,  0,  0,  0,
         5, 10, 10, 10, 10, 10, 10,  5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
         5, 10, 10, 10, 10, 10, 10,  5,
         0,  0,  0,  0,  0,  0,  0,  0
    ],
    q: [
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5,  5,  5,  5,  0,-10,
         -5,  0,  5,  5,  5,  5,  0, -5,
          0,  0,  5,  5,  5,  5,  0, -5,
        -10,  5,  5,  5,  5,  5,  0,-10,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20
    ],
    k: [
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -10,-20,-20,-20,-20,-20,-20,-10,
         20, 20,  0,  0,  0,  0, 20, 20,
         20, 30, 10,  0,  0, 10, 30, 20
    ]
};

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

export class ChessAI {
    constructor(logic) {
        this.logic = logic;
        this.nodes = 0;
        this.style = 'balanced'; // aggressive, defensive, balanced
    }

    getBestMove(depth, color, onProgress) {
        this.nodes = 0;
        let bestMove = null;
        let bestScore = -Infinity;
        let alpha = -Infinity;
        let beta = Infinity;

        const moves = this.logic.getLegalMoves(color);
        // Simple move ordering: Captures first
        moves.sort((a, b) => (b.type === 'capture' ? 10 : 0) - (a.type === 'capture' ? 10 : 0));

        for (let i = 0; i < moves.length; i++) {
            const m = moves[i];

            // Clone logic state to simulate
            const clone = this.logic.clone();
            clone.makeMove(m);

            const score = -this.minimax(clone, depth - 1, -beta, -alpha, color === 'w' ? 'b' : 'w');

            if (score > bestScore) {
                bestScore = score;
                bestMove = m;
            }
            if (score > alpha) {
                alpha = score;
            }

            if (onProgress) onProgress(i, moves.length);
        }

        console.log(`AI Search: Depth ${depth}, Nodes ${this.nodes}, Score ${bestScore}`);
        return bestMove;
    }

    minimax(logic, depth, alpha, beta, color) {
        this.nodes++;
        if (depth === 0) return this.evaluate(logic, color);

        const moves = logic.getLegalMoves(color);
        if (moves.length === 0) {
            if (logic.isCheck(color)) return -Infinity + depth; // Prefer shorter mate
            return 0; // Stalemate
        }

        // Move Ordering optimization could go here

        for (const m of moves) {
            const clone = logic.clone();
            clone.makeMove(m);

            const score = -this.minimax(clone, depth - 1, -beta, -alpha, color === 'w' ? 'b' : 'w');

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }
        return alpha;
    }

    evaluate(logic, color) {
        let score = 0;

        // Material & PST
        for (let i = 0; i < 64; i++) {
            const p = logic.board[i];
            if (p) {
                // Determine PST index (flip for black)
                let pIdx = i;
                if (p.color === 'b') {
                    pIdx = 63 - i;
                }

                let val = PIECE_VALUES[p.type] + PST[p.type][pIdx];

                // Style Adjustments
                if (this.style === 'aggressive') {
                     // Bonus for advanced pieces
                     if ((p.color === 'w' && i < 32) || (p.color === 'b' && i > 31)) val += 10;
                } else if (this.style === 'defensive') {
                     // Bonus for king safety (simplified)
                     if (p.type === 'k') val += 50;
                }

                if (p.color === color) score += val;
                else score -= val;
            }
        }

        // Mobility (Number of legal moves) - expensive?
        // score += logic.getLegalMoves(color).length * 5;
        // score -= logic.getLegalMoves(color === 'w' ? 'b' : 'w').length * 5;

        return score;
    }
}
