
export class MinesweeperApp {
    constructor(container) {
        this.container = container;
        this.width = 9;
        this.height = 9;
        this.mines = 10;
        this.grid = [];
        this.gameOver = false;
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="flex flex-col h-full bg-[#c0c0c0] border-l-2 border-t-2 border-white border-r-2 border-b-2 border-gray-500 p-1">
                <div class="flex justify-between items-center bg-[#c0c0c0] border-l-2 border-t-2 border-gray-500 border-r-2 border-b-2 border-white p-1 mb-1">
                    <div class="bg-black text-red-600 font-mono text-xl px-1 border-2 border-gray-500 border-r-white border-b-white inset-shadow">010</div>
                    <div class="w-6 h-6 bg-[#c0c0c0] border-2 border-white border-r-gray-500 border-b-gray-500 active:border-t-gray-500 active:border-l-gray-500 active:border-b-white active:border-r-white flex items-center justify-center cursor-pointer" onclick="this.closest('.window-content').minesweeper.reset()">😊</div>
                    <div class="bg-black text-red-600 font-mono text-xl px-1 border-2 border-gray-500 border-r-white border-b-white inset-shadow">000</div>
                </div>
                <div class="grid grid-cols-9 gap-[1px] bg-gray-500 border-l-2 border-t-2 border-gray-500 border-r-2 border-b-2 border-white" id="ms-grid"></div>
            </div>
        `;
        // Attach instance
        this.container.minesweeper = this;
        this.reset();
    }

    reset() {
        this.grid = [];
        this.gameOver = false;
        const gridEl = this.container.querySelector('#ms-grid');
        gridEl.innerHTML = '';

        // Generate Mines
        let minesPlaced = 0;
        const cells = new Array(this.width * this.height).fill(0).map(() => ({ mine: false, revealed: false, flagged: false, count: 0 }));

        while(minesPlaced < this.mines) {
            const idx = Math.floor(Math.random() * cells.length);
            if(!cells[idx].mine) {
                cells[idx].mine = true;
                minesPlaced++;
            }
        }

        // Calc Counts
        for(let i=0; i<cells.length; i++) {
            if(cells[i].mine) continue;
            const x = i % this.width;
            const y = Math.floor(i / this.width);
            let count = 0;
            for(let dy=-1; dy<=1; dy++) {
                for(let dx=-1; dx<=1; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if(nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                        if(cells[ny * this.width + nx].mine) count++;
                    }
                }
            }
            cells[i].count = count;
        }
        this.grid = cells;
        this.renderGrid();
    }

    renderGrid() {
        const gridEl = this.container.querySelector('#ms-grid');
        gridEl.innerHTML = '';
        this.grid.forEach((cell, i) => {
            const div = document.createElement('div');
            div.className = `w-6 h-6 text-xs font-bold flex items-center justify-center select-none cursor-default ${cell.revealed ? 'border border-gray-400 bg-[#c0c0c0]' : 'bg-[#c0c0c0] border-t-2 border-l-2 border-white border-r-2 border-b-2 border-gray-500'}`;

            div.onmousedown = (e) => {
                if(this.gameOver) return;
                if(e.button === 2) { // Right click
                    cell.flagged = !cell.flagged;
                    this.renderGrid();
                } else {
                    if(cell.flagged) return;
                    this.reveal(i);
                }
            };

            if(cell.revealed) {
                if(cell.mine) {
                    div.textContent = '💣';
                    div.className = 'w-6 h-6 bg-red-500 border border-gray-400 flex items-center justify-center';
                } else if(cell.count > 0) {
                    div.textContent = cell.count;
                    const colors = ['blue', 'green', 'red', 'navy', 'maroon', 'teal', 'black', 'gray'];
                    div.style.color = colors[cell.count-1];
                }
            } else if(cell.flagged) {
                div.textContent = '🚩';
                div.classList.add('text-red-600');
            }

            gridEl.appendChild(div);
        });
    }

    reveal(i) {
        const cell = this.grid[i];
        if(cell.revealed) return;
        cell.revealed = true;
        if(cell.mine) {
            this.gameOver = true;
            alert('GAME OVER');
        } else if(cell.count === 0) {
            // Flood fill
            const x = i % this.width;
            const y = Math.floor(i / this.width);
            for(let dy=-1; dy<=1; dy++) {
                for(let dx=-1; dx<=1; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if(nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                        this.reveal(ny * this.width + nx);
                    }
                }
            }
        }
        this.renderGrid();
    }
}

export class NotepadApp {
    constructor(container) {
        this.container = container;
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="flex flex-col h-full bg-white text-black font-mono text-sm">
                <div class="flex gap-2 p-1 border-b border-gray-200 text-xs bg-gray-50">
                    <span class="hover:bg-blue-100 px-1 cursor-pointer">File</span>
                    <span class="hover:bg-blue-100 px-1 cursor-pointer">Edit</span>
                    <span class="hover:bg-blue-100 px-1 cursor-pointer">Format</span>
                    <span class="hover:bg-blue-100 px-1 cursor-pointer">View</span>
                    <span class="hover:bg-blue-100 px-1 cursor-pointer">Help</span>
                </div>
                <textarea class="flex-1 p-1 outline-none resize-none border-none text-black bg-white font-mono" spellcheck="false">
Welcome to Notepad.
This is a simple text editor.
Do not forget to save your work (actually, you can't save).
                </textarea>
            </div>
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
            <div class="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
                <canvas id="wolf-canvas" width="320" height="200" class="image-pixelated w-full h-full object-contain"></canvas>
                <div class="absolute bottom-2 left-2 text-red-600 font-mono text-xs">AMMO: 99  HEALTH: 100%  LIVES: 3</div>
            </div>
        `;
    }

    initGame() {
        const canvas = this.container.querySelector('#wolf-canvas');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');

        // Simple Raycaster State
        const mapWidth = 24;
        const mapHeight = 24;
        const map = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,2,2,2,2,2,0,0,0,0,3,0,3,0,3,0,0,0,0,0,1],
            [1,0,0,0,2,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,2,0,0,0,2,0,0,0,0,3,0,0,0,3,0,0,0,0,0,1],
            [1,0,0,0,2,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,2,2,0,2,2,0,0,0,0,3,0,3,0,3,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];

        let posX = 22, posY = 12;
        let dirX = -1, dirY = 0;
        let planeX = 0, planeY = 0.66;

        // Input
        const keys = {};
        const onKey = (e) => keys[e.code] = e.type === 'keydown';
        document.addEventListener('keydown', onKey);
        document.addEventListener('keyup', onKey);
        this.cleanup = () => {
             document.removeEventListener('keydown', onKey);
             document.removeEventListener('keyup', onKey);
             this.running = false;
        };

        const loop = () => {
            if(!this.running) return;

            // Movement
            const rotSpeed = 0.05;
            const moveSpeed = 0.08;

            if (keys['ArrowRight']) {
                const oldDirX = dirX;
                dirX = dirX * Math.cos(-rotSpeed) - dirY * Math.sin(-rotSpeed);
                dirY = oldDirX * Math.sin(-rotSpeed) + dirY * Math.cos(-rotSpeed);
                const oldPlaneX = planeX;
                planeX = planeX * Math.cos(-rotSpeed) - planeY * Math.sin(-rotSpeed);
                planeY = oldPlaneX * Math.sin(-rotSpeed) + planeY * Math.cos(-rotSpeed);
            }
            if (keys['ArrowLeft']) {
                const oldDirX = dirX;
                dirX = dirX * Math.cos(rotSpeed) - dirY * Math.sin(rotSpeed);
                dirY = oldDirX * Math.sin(rotSpeed) + dirY * Math.cos(rotSpeed);
                const oldPlaneX = planeX;
                planeX = planeX * Math.cos(rotSpeed) - planeY * Math.sin(rotSpeed);
                planeY = oldPlaneX * Math.sin(rotSpeed) + planeY * Math.cos(rotSpeed);
            }
            if (keys['ArrowUp']) {
                if(map[Math.floor(posY)][Math.floor(posX + dirX * moveSpeed)] === 0) posX += dirX * moveSpeed;
                if(map[Math.floor(posY + dirY * moveSpeed)][Math.floor(posX)] === 0) posY += dirY * moveSpeed;
            }
            if (keys['ArrowDown']) {
                if(map[Math.floor(posY)][Math.floor(posX - dirX * moveSpeed)] === 0) posX -= dirX * moveSpeed;
                if(map[Math.floor(posY - dirY * moveSpeed)][Math.floor(posX)] === 0) posY -= dirY * moveSpeed;
            }

            // Draw
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, canvas.width, canvas.height / 2); // Ceiling
            ctx.fillStyle = '#666';
            ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2); // Floor

            for(let x = 0; x < canvas.width; x++) {
                const cameraX = 2 * x / canvas.width - 1;
                const rayDirX = dirX + planeX * cameraX;
                const rayDirY = dirY + planeY * cameraX;

                let mapX = Math.floor(posX);
                let mapY = Math.floor(posY);

                let sideDistX, sideDistY;
                const deltaDistX = Math.abs(1 / rayDirX);
                const deltaDistY = Math.abs(1 / rayDirY);
                let perpWallDist;
                let stepX, stepY;
                let hit = 0;
                let side;

                if (rayDirX < 0) { stepX = -1; sideDistX = (posX - mapX) * deltaDistX; }
                else { stepX = 1; sideDistX = (mapX + 1.0 - posX) * deltaDistX; }
                if (rayDirY < 0) { stepY = -1; sideDistY = (posY - mapY) * deltaDistY; }
                else { stepY = 1; sideDistY = (mapY + 1.0 - posY) * deltaDistY; }

                while (hit === 0) {
                    if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
                    else { sideDistY += deltaDistY; mapY += stepY; side = 1; }
                    if (map[mapY] && map[mapY][mapX] > 0) hit = 1;
                }

                if (side === 0) perpWallDist = (mapX - posX + (1 - stepX) / 2) / rayDirX;
                else perpWallDist = (mapY - posY + (1 - stepY) / 2) / rayDirY;

                const lineHeight = Math.floor(canvas.height / perpWallDist);
                let drawStart = -lineHeight / 2 + canvas.height / 2;
                if(drawStart < 0) drawStart = 0;
                let drawEnd = lineHeight / 2 + canvas.height / 2;
                if(drawEnd >= canvas.height) drawEnd = canvas.height - 1;

                let color = '#AA3333';
                if(map[mapY][mapX] === 2) color = '#33AA33';
                if(map[mapY][mapX] === 3) color = '#3333AA';
                if(side === 1) {
                    // Darken for side
                    // Simple logic to darken color hex?
                    color = (color === '#AA3333') ? '#772222' : (color === '#33AA33' ? '#227722' : '#222277');
                }

                ctx.fillStyle = color;
                ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    destroy() {
        if(this.cleanup) this.cleanup();
    }
}
