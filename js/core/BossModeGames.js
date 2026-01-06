
export class MinesweeperApp {
    constructor(container) {
        this.container = container;
        this.gridSize = 9;
        this.mines = 10;
        this.grid = [];
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="h-full flex flex-col bg-[#c0c0c0] border-2 border-white border-r-gray-500 border-b-gray-500 p-1">
                <div class="flex justify-between mb-2 bg-[#c0c0c0] border-2 border-gray-500 border-r-white border-b-white p-1 inset-shadow">
                    <div class="bg-black text-red-600 font-mono text-xl px-1 border border-gray-500 inset-shadow">010</div>
                    <button class="w-6 h-6 border-2 border-white border-r-gray-500 border-b-gray-500 active:border-gray-500 active:border-r-white active:border-b-white bg-[#c0c0c0] flex items-center justify-center text-sm" onclick="this.closest('.os-window').minesweeper.reset()">😊</button>
                    <div class="bg-black text-red-600 font-mono text-xl px-1 border border-gray-500 inset-shadow">000</div>
                </div>
                <div id="ms-grid" class="grid grid-cols-9 bg-gray-400 border-4 border-gray-400 gap-[1px]"></div>
            </div>
        `;
        // Attach instance to DOM for onclick handlers
        this.container.closest('.os-window').minesweeper = this;
        this.reset();
    }

    reset() {
        const gridEl = this.container.querySelector('#ms-grid');
        gridEl.innerHTML = '';
        this.grid = [];

        for (let i = 0; i < this.gridSize * this.gridSize; i++) {
            this.grid.push({ mine: false, revealed: false, flagged: false, count: 0 });
            const cell = document.createElement('div');
            cell.className = "w-5 h-5 bg-[#c0c0c0] border-2 border-white border-r-gray-500 border-b-gray-500 text-[10px] font-bold flex items-center justify-center cursor-default select-none";
            cell.dataset.idx = i;
            cell.onmousedown = (e) => this.handleClick(e, i);
            gridEl.appendChild(cell);
        }

        // Place mines
        let placed = 0;
        while(placed < this.mines) {
            const idx = Math.floor(Math.random() * this.grid.length);
            if(!this.grid[idx].mine) {
                this.grid[idx].mine = true;
                placed++;
            }
        }

        // Calc counts
        for(let i=0; i<this.grid.length; i++) {
            if(this.grid[i].mine) continue;
            const neighbors = this.getNeighbors(i);
            this.grid[i].count = neighbors.filter(n => this.grid[n].mine).length;
        }
    }

    getNeighbors(idx) {
        const neighbors = [];
        const x = idx % this.gridSize;
        const y = Math.floor(idx / this.gridSize);
        for(let dx=-1; dx<=1; dx++) {
            for(let dy=-1; dy<=1; dy++) {
                if(dx===0 && dy===0) continue;
                const nx = x+dx, ny=y+dy;
                if(nx>=0 && nx<this.gridSize && ny>=0 && ny<this.gridSize) {
                    neighbors.push(ny * this.gridSize + nx);
                }
            }
        }
        return neighbors;
    }

    handleClick(e, idx) {
        if(e.button === 2) {
            this.grid[idx].flagged = !this.grid[idx].flagged;
            this.updateCell(idx);
        } else {
            this.reveal(idx);
        }
    }

    reveal(idx) {
        const cell = this.grid[idx];
        if(cell.revealed || cell.flagged) return;
        cell.revealed = true;
        this.updateCell(idx);

        if(cell.mine) {
            alert("GAME OVER");
            this.revealAll();
        } else if(cell.count === 0) {
            this.getNeighbors(idx).forEach(n => this.reveal(n));
        }
    }

    revealAll() {
        this.grid.forEach((c,i) => { c.revealed = true; this.updateCell(i); });
    }

    updateCell(idx) {
        const cell = this.grid[idx];
        const el = this.container.querySelector(`[data-idx="${idx}"]`);
        if(!el) return;

        if(cell.revealed) {
            el.className = "w-5 h-5 border border-gray-400 bg-gray-200 text-[10px] font-bold flex items-center justify-center cursor-default";
            if(cell.mine) {
                el.textContent = '💣';
                el.style.backgroundColor = 'red';
            } else if(cell.count > 0) {
                el.textContent = cell.count;
                const colors = ['blue', 'green', 'red', 'purple', 'maroon', 'turquoise', 'black', 'gray'];
                el.style.color = colors[cell.count-1];
            }
        } else if(cell.flagged) {
            el.textContent = '🚩';
        } else {
            el.textContent = '';
        }
    }
}

export class NotepadApp {
    constructor(container) {
        this.container = container;
        this.render();
    }
    render() {
        this.container.innerHTML = `
            <textarea class="w-full h-full resize-none p-1 font-mono text-sm outline-none border-none" spellcheck="false">Welcome to Notepad.</textarea>
        `;
    }
}

export class Wolf3DApp {
    constructor(container) {
        this.container = container;
        this.running = true;
        this.render();
        this.initGame();
    }

    render() {
        this.container.innerHTML = `
            <div class="w-full h-full bg-black relative flex items-center justify-center overflow-hidden">
                <canvas id="wolf-canvas" class="image-pixelated w-full h-full object-contain"></canvas>
                <div class="absolute bottom-2 left-2 text-white font-mono text-xs pointer-events-none">ARROWS to Move</div>
            </div>
        `;
    }

    initGame() {
        const canvas = this.container.querySelector('canvas');
        if(!canvas) return;

        // Low res for retro feel
        canvas.width = 320;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');

        // Simple Raycaster State
        const mapSize = 16;
        const map = [
            1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
            1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
            1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
            1,0,0,0,0,0,1,0,0,0,0,2,0,0,0,1,
            1,0,0,0,0,0,1,0,0,0,0,2,0,0,0,1,
            1,0,0,0,0,0,1,1,1,0,0,0,0,0,0,1,
            1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
            1,0,3,3,3,0,0,0,0,0,0,0,0,0,0,1,
            1,0,3,0,3,0,0,0,0,0,0,0,0,0,0,1,
            1,0,3,0,0,0,0,0,4,4,4,4,0,0,0,1,
            1,0,0,0,0,0,0,0,4,0,0,4,0,0,0,1,
            1,0,0,5,0,0,0,0,4,0,0,0,0,0,0,1,
            1,0,0,5,0,0,0,0,4,4,0,4,0,0,0,1,
            1,0,0,5,0,0,0,0,0,0,0,0,0,0,0,1,
            1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,
            1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
        ];

        let pX = 8, pY = 8, pA = 0;
        const fov = Math.PI / 3;

        const loop = () => {
            if(!this.running) return;

            // Draw Ceiling/Floor
            ctx.fillStyle = '#383838'; // Ceiling
            ctx.fillRect(0, 0, 320, 100);
            ctx.fillStyle = '#707070'; // Floor
            ctx.fillRect(0, 100, 320, 100);

            // Raycast
            for(let x=0; x<320; x+=2) { // Skip pixels for performance/retro look
                const rayAngle = (pA - fov/2.0) + (x/320.0) * fov;
                const eyeX = Math.cos(rayAngle);
                const eyeY = Math.sin(rayAngle);

                let distToWall = 0;
                let hitWall = false;
                let texture = 0;

                let testX = pX;
                let testY = pY;

                while(!hitWall && distToWall < 20) {
                    distToWall += 0.1;
                    testX = Math.floor(pX + eyeX * distToWall);
                    testY = Math.floor(pY + eyeY * distToWall);

                    if(testX < 0 || testX >= mapSize || testY < 0 || testY >= mapSize) {
                        hitWall = true;
                        distToWall = 20;
                    } else {
                        if(map[testY * mapSize + testX] > 0) {
                            hitWall = true;
                            texture = map[testY * mapSize + testX];
                        }
                    }
                }

                // Calculate Height
                const ceiling = 100.0 - 200.0 / distToWall;
                const floor = 200.0 - ceiling;
                const h = floor - ceiling;

                // Color based on texture (Blue, Green, Red walls)
                let color = '#fff';
                if(texture === 1) color = `rgb(0,0,${255-distToWall*10})`; // Blue
                if(texture === 2) color = `rgb(0,${255-distToWall*10},0)`; // Green
                if(texture === 3) color = `rgb(${255-distToWall*10},0,0)`; // Red
                if(texture === 4) color = `rgb(${255-distToWall*10},${255-distToWall*10},0)`; // Yellow
                if(texture === 5) color = `rgb(${255-distToWall*10},0,${255-distToWall*10})`; // Magenta

                ctx.fillStyle = color;
                ctx.fillRect(x, ceiling, 2, h);
            }

            requestAnimationFrame(loop);
        };

        loop();

        // Controls
        this.keyHandler = (e) => {
            if(!this.running) return;
            const speed = 0.2;
            const rotSpeed = 0.1;
            if(e.key === 'ArrowUp') {
                pX += Math.cos(pA) * speed;
                pY += Math.sin(pA) * speed;
            }
            if(e.key === 'ArrowDown') {
                pX -= Math.cos(pA) * speed;
                pY -= Math.sin(pA) * speed;
            }
            if(e.key === 'ArrowLeft') pA -= rotSpeed;
            if(e.key === 'ArrowRight') pA += rotSpeed;
        };
        document.addEventListener('keydown', this.keyHandler);
    }

    destroy() {
        this.running = false;
        document.removeEventListener('keydown', this.keyHandler);
    }
}
