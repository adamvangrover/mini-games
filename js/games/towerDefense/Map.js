import { CONFIG } from './config.js';

export default class Map {
    constructor() {
        this.cols = CONFIG.MAP_COLS;
        this.rows = CONFIG.MAP_ROWS;
        this.tileSize = CONFIG.TILE_SIZE;
        this.grid = [];
        this.waypoints = [];
        this.generated = false;
    }

    generate() {
        // Reset grid
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = new Array(this.cols).fill(0);
        }

        // Generate a random path from left/top to right/bottom
        // For simplicity, let's do Left (row random) to Right (row random)
        const startRow = Math.floor(Math.random() * (this.rows - 2)) + 1;
        const endRow = Math.floor(Math.random() * (this.rows - 2)) + 1;

        const path = this.generateRandomPath({c: 0, r: startRow}, {c: this.cols - 1, r: endRow});

        if (path) {
            this.waypoints = path;
            // Mark path on grid
            path.forEach(p => {
                this.grid[p.r][p.c] = 1;
            });
            this.grid[path[0].r][path[0].c] = 2; // Start (Spawn)
            this.grid[path[path.length-1].r][path[path.length-1].c] = 3; // End (Base)

            // Simplify waypoints for movement (only corners)
            this.simplifyWaypoints();
        } else {
            // Fallback if generation fails (should rarely happen with this logic)
            this.generate();
        }
    }

    generateRandomPath(start, end) {
        // Simple random walk with bias
        // Not perfect, but works for "Neon" chaotic feel
        // Actually, let's use a modified BFS/A* or just a "Drunkard's Walk" that moves towards goal

        // Let's try a constructive approach: Move Right, Up, or Down. prevent moving back Left.
        let current = { ...start };
        const path = [current];
        let attempts = 0;

        while ((current.c !== end.c || current.r !== end.r) && attempts < 1000) {
            attempts++;
            const moves = [];

            // Right
            if (current.c < this.cols - 1) moves.push({c: current.c + 1, r: current.r});

            // Up
            if (current.r > 1) moves.push({c: current.c, r: current.r - 1});

            // Down
            if (current.r < this.rows - 2) moves.push({c: current.c, r: current.r + 1});

            // Filter moves that don't backtrack immediately (simple check)
            // But since we only move Right, Up, Down, we just need to ensure we don't go Up then Down immediately
            // A simple way is to check if the neighbor is already in path

            const validMoves = moves.filter(m => !path.some(p => p.c === m.c && p.r === m.r));

            if (validMoves.length === 0) break; // Stuck

            // Sort moves by distance to end to bias towards it
            validMoves.sort((a, b) => {
                const da = Math.abs(a.c - end.c) + Math.abs(a.r - end.r);
                const db = Math.abs(b.c - end.c) + Math.abs(b.r - end.r);
                return da - db + (Math.random() * 2 - 1); // Add randomness
            });

            current = validMoves[0];
            path.push(current);

            if (current.c === end.c && current.r === end.r) return path;
        }

        // If failed, return a straight line path fallback
        const fallback = [];
        for(let c=0; c<this.cols; c++) fallback.push({c, r: Math.floor(this.rows/2)});
        return fallback;
    }

    simplifyWaypoints() {
        // The movement logic needs specific points to turn.
        // The raw path has every tile. We can reduce it to just turning points.
        if (this.waypoints.length < 2) return;

        const simple = [this.waypoints[0]];
        let lastDir = {
            c: this.waypoints[1].c - this.waypoints[0].c,
            r: this.waypoints[1].r - this.waypoints[0].r
        };

        for (let i = 1; i < this.waypoints.length - 1; i++) {
            const next = this.waypoints[i+1];
            const curr = this.waypoints[i];
            const dir = { c: next.c - curr.c, r: next.r - curr.r };

            if (dir.c !== lastDir.c || dir.r !== lastDir.r) {
                simple.push(curr);
                lastDir = dir;
            }
        }
        simple.push(this.waypoints[this.waypoints.length - 1]);
        this.waypoints = simple;
    }

    getTile(c, r) {
        if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return null;
        return this.grid[r][c];
    }

    setTile(c, r, val) {
        if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return;
        this.grid[r][c] = val;
    }

    draw(ctx) {
        // Draw Grid
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let r = 0; r <= this.rows; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * this.tileSize);
            ctx.lineTo(this.cols * this.tileSize, r * this.tileSize);
            ctx.stroke();
        }
        for (let c = 0; c <= this.cols; c++) {
            ctx.beginPath();
            ctx.moveTo(c * this.tileSize, 0);
            ctx.lineTo(c * this.tileSize, this.rows * this.tileSize);
            ctx.stroke();
        }

        // Draw Path
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.grid[r][c];
                const x = c * this.tileSize;
                const y = r * this.tileSize;

                if (tile === 1 || tile === 2 || tile === 3) { // Path, Start, End
                    ctx.fillStyle = '#334155';
                    ctx.fillRect(x, y, this.tileSize, this.tileSize);

                    // Add a glowing line in the center to show flow
                    // This requires context of neighbors, but let's just make the path tiles glow slightly
                    ctx.fillStyle = 'rgba(6, 182, 212, 0.1)';
                    ctx.fillRect(x + 10, y + 10, this.tileSize - 20, this.tileSize - 20);
                }

                if (tile === 2) { // Start
                    ctx.fillStyle = '#10b981'; // Green
                    ctx.font = '20px Arial';
                    ctx.fillText('START', x + 5, y + 40);
                }

                if (tile === 3) { // End
                    ctx.fillStyle = '#ef4444'; // Red
                    ctx.font = '20px Arial';
                    ctx.fillText('BASE', x + 10, y + 40);
                }
            }
        }
    }
}
