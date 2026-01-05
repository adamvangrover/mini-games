export const CHESS_TUTORIALS = [
    {
        title: "Rules: Movement",
        content: `
            <h3>How Pieces Move</h3>
            <ul class="list-disc pl-5 text-sm space-y-2">
                <li><strong>Pawn:</strong> Forward 1 square (or 2 on first move). Captures diagonally.</li>
                <li><strong>Rook:</strong> Horizontally or Vertically any distance.</li>
                <li><strong>Knight:</strong> 'L' shape (2 one way, 1 the other). Can jump over pieces.</li>
                <li><strong>Bishop:</strong> Diagonally any distance.</li>
                <li><strong>Queen:</strong> Combined Rook + Bishop power.</li>
                <li><strong>King:</strong> 1 square in any direction. Protect him!</li>
            </ul>
        `
    },
    {
        title: "Rules: Specials",
        content: `
            <h3>Special Moves</h3>
            <ul class="list-disc pl-5 text-sm space-y-2">
                <li><strong>Castling:</strong> King moves 2 squares towards Rook, Rook jumps over King. Conditions: No pieces between, King not in check, King/Rook haven't moved.</li>
                <li><strong>En Passant:</strong> Pawn capture special rule. If enemy pawn moves 2 squares and lands beside yours, you can capture it as if it moved 1 square.</li>
                <li><strong>Promotion:</strong> Pawn reaching end of board becomes Queen (or R, B, N).</li>
            </ul>
        `
    },
    {
        title: "Strategy: Openings",
        content: `
            <h3>Opening Principles</h3>
            <ul class="list-disc pl-5 text-sm space-y-2">
                <li><strong>Control the Center:</strong> e4/d4 are strong first moves.</li>
                <li><strong>Develop Pieces:</strong> Get Knights and Bishops out early.</li>
                <li><strong>Safety:</strong> Castle early to protect your King.</li>
                <li><strong>Don't Move Twice:</strong> Avoid moving same piece twice in opening unless necessary.</li>
            </ul>
        `
    },
    {
        title: "Strategy: Tactics",
        content: `
            <h3>Common Tactics</h3>
            <ul class="list-disc pl-5 text-sm space-y-2">
                <li><strong>Fork:</strong> One piece attacks two enemy pieces at once (Knights are great at this).</li>
                <li><strong>Pin:</strong> Attacking a piece that cannot move without exposing a more valuable piece behind it.</li>
                <li><strong>Skewer:</strong> Like a pin, but the more valuable piece is in front.</li>
            </ul>
        `
    }
];
