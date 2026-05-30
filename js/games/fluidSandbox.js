import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';
import InputManager from '../core/InputManager.js';

export default class FluidSandbox {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();
        this.input = InputManager.getInstance();
        this.boundResize = this.resize.bind(this);
        this.boundLoop = this.loop.bind(this);
        this.lastTime = 0;

        // Simulation Grid Settings
        this.cols = 200;
        this.rows = 150;
        this.cellSize = 4; // Visual size of each cell
        this.grid = new Uint8Array(this.cols * this.rows); // Current frame
        this.nextGrid = new Uint8Array(this.cols * this.rows); // Next frame buffer

        // ImageData for fast rendering
        this.imageData = null;

        // Timing
        this.accumulatedTime = 0;
        this.tickRate = 1 / 60; // 60 updates per sec

        // Element Types
        this.EMPTY = 0;
        this.SAND = 1;
        this.WATER = 2;
        this.WALL = 3;

        this.currentElement = this.SAND;
        this.brushSize = 2;

        this.wasMouseDown = false;
    }

    async init(container) {
        this.container = container;

        // Setup UI and Canvas
        this.container.innerHTML = `
            <div class="relative w-full h-full bg-slate-900 overflow-hidden font-mono select-none flex flex-col" id="fluidSandbox-ui">
                <!-- Toolbar -->
                <div class="h-16 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-4 z-20 shadow-md">
                    <div class="text-xl font-bold text-cyan-400">FLUID_SYS</div>
                    <div id="fs-palette" class="flex gap-2">
                        <button class="palette-btn w-8 h-8 rounded border-2 border-slate-600 bg-[#d97706]" data-type="1" title="Sand"></button>
                        <button class="palette-btn w-8 h-8 rounded border-2 border-slate-600 bg-[#0284c7]" data-type="2" title="Water"></button>
                        <button class="palette-btn w-8 h-8 rounded border-2 border-slate-600 bg-[#475569]" data-type="3" title="Wall"></button>
                        <button class="palette-btn w-8 h-8 rounded border-2 border-slate-600 bg-black" data-type="0" title="Eraser"></button>
                    </div>
                    <div class="flex-grow"></div>
                    <button id="fs-clear" class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm pointer-events-auto transition">CLEAR</button>
                    <button class="back-btn px-4 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition pointer-events-auto border border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]">ABORT</button>
                </div>

                <!-- Sandbox Area -->
                <div class="flex-grow relative flex items-center justify-center bg-black cursor-crosshair overflow-hidden" id="fs-canvas-container">
                    <canvas id="fluidSandbox-canvas" class="block shadow-[0_0_20px_rgba(0,0,0,0.8)] border border-slate-800"></canvas>
                </div>
            </div>
        `;

        this.canvas = this.container.querySelector('#fluidSandbox-canvas');
        // Disable image smoothing for crisp pixels
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        // Set fixed canvas resolution
        this.canvas.width = this.cols * this.cellSize;
        this.canvas.height = this.rows * this.cellSize;
        this.ctx.imageSmoothingEnabled = false;

        // Create ImageData buffer matching canvas size
        this.imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);

        // Initialize grid
        this.clearGrid();

        this.bindEvents();

        window.addEventListener('resize', this.boundResize);
        this.resize(); // Handle CSS scaling

        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    bindEvents() {
        const btns = this.container.querySelectorAll('.palette-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentElement = parseInt(e.target.dataset.type);
                btns.forEach(b => b.classList.remove('border-white', 'scale-110'));
                e.target.classList.add('border-white', 'scale-110');
            });
        });
        // Select sand initially
        btns[0].classList.add('border-white', 'scale-110');

        const clearBtn = this.container.querySelector('#fs-clear');
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearGrid());
    }

    clearGrid() {
        this.grid.fill(0); // 0 = empty
        this.nextGrid.fill(0);
    }

    loop(timestamp) {
        if (!this.canvas) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Fixed timestep for deterministic physics
        this.accumulatedTime += Math.min(dt, 0.1);
        while (this.accumulatedTime >= this.tickRate) {
            this.update();
            this.accumulatedTime -= this.tickRate;
        }

        this.draw();

        this.animationId = requestAnimationFrame(this.boundLoop);
    }

    update() {
        this.handleInput();

        // Copy current to next, so stationary objects persist
        this.nextGrid.set(this.grid);

        // Process cells from bottom to top, randomly left/right
        for (let r = this.rows - 1; r >= 0; r--) {
            // Randomize column processing order for organic liquid flow
            const startC = Math.random() < 0.5 ? 0 : this.cols - 1;
            const stepC = startC === 0 ? 1 : -1;

            for (let c = startC; c >= 0 && c < this.cols; c += stepC) {
                const idx = r * this.cols + c;
                const type = this.grid[idx];

                if (type === this.EMPTY || type === this.WALL) continue;

                // --- Physics Rules ---
                if (type === this.SAND) {
                    // Try straight down
                    if (r < this.rows - 1 && this.nextGrid[(r + 1) * this.cols + c] === this.EMPTY) {
                        this.nextGrid[idx] = this.EMPTY;
                        this.nextGrid[(r + 1) * this.cols + c] = this.SAND;
                    }
                    // Try down-left or down-right
                    else if (r < this.rows - 1) {
                        const dl = c > 0 && this.nextGrid[(r + 1) * this.cols + (c - 1)] === this.EMPTY;
                        const dr = c < this.cols - 1 && this.nextGrid[(r + 1) * this.cols + (c + 1)] === this.EMPTY;

                        if (dl && dr) {
                            const goLeft = Math.random() < 0.5;
                            this.nextGrid[idx] = this.EMPTY;
                            this.nextGrid[(r + 1) * this.cols + (goLeft ? c - 1 : c + 1)] = this.SAND;
                        } else if (dl) {
                            this.nextGrid[idx] = this.EMPTY;
                            this.nextGrid[(r + 1) * this.cols + (c - 1)] = this.SAND;
                        } else if (dr) {
                            this.nextGrid[idx] = this.EMPTY;
                            this.nextGrid[(r + 1) * this.cols + (c + 1)] = this.SAND;
                        }
                    }
                }
                else if (type === this.WATER) {
                    // Try straight down
                    if (r < this.rows - 1 && this.nextGrid[(r + 1) * this.cols + c] === this.EMPTY) {
                        this.nextGrid[idx] = this.EMPTY;
                        this.nextGrid[(r + 1) * this.cols + c] = this.WATER;
                    }
                    // Try down-left or down-right
                    else if (r < this.rows - 1 && (this.nextGrid[(r + 1) * this.cols + (c - 1)] === this.EMPTY || this.nextGrid[(r + 1) * this.cols + (c + 1)] === this.EMPTY)) {
                        const dl = c > 0 && this.nextGrid[(r + 1) * this.cols + (c - 1)] === this.EMPTY;
                        const dr = c < this.cols - 1 && this.nextGrid[(r + 1) * this.cols + (c + 1)] === this.EMPTY;

                        if (dl && dr) {
                            const goLeft = Math.random() < 0.5;
                            this.nextGrid[idx] = this.EMPTY;
                            this.nextGrid[(r + 1) * this.cols + (goLeft ? c - 1 : c + 1)] = this.WATER;
                        } else if (dl) {
                            this.nextGrid[idx] = this.EMPTY;
                            this.nextGrid[(r + 1) * this.cols + (c - 1)] = this.WATER;
                        } else if (dr) {
                            this.nextGrid[idx] = this.EMPTY;
                            this.nextGrid[(r + 1) * this.cols + (c + 1)] = this.WATER;
                        }
                    }
                    // Try straight left or right (fluid dispersion)
                    else {
                        const sl = c > 0 && this.nextGrid[r * this.cols + (c - 1)] === this.EMPTY;
                        const sr = c < this.cols - 1 && this.nextGrid[r * this.cols + (c + 1)] === this.EMPTY;

                        if (sl && sr) {
                            const goLeft = Math.random() < 0.5;
                            this.nextGrid[idx] = this.EMPTY;
                            this.nextGrid[r * this.cols + (goLeft ? c - 1 : c + 1)] = this.WATER;
                        } else if (sl) {
                            this.nextGrid[idx] = this.EMPTY;
                            this.nextGrid[r * this.cols + (c - 1)] = this.WATER;
                        } else if (sr) {
                            this.nextGrid[idx] = this.EMPTY;
                            this.nextGrid[r * this.cols + (c + 1)] = this.WATER;
                        }
                    }
                }
            }
        }

        // Swap buffers
        const temp = this.grid;
        this.grid = this.nextGrid;
        this.nextGrid = temp;
    }

    handleInput() {
        if (this.input.mouse.down) {
            const mx = this.input.mouse.x;
            const my = this.input.mouse.y;

            // Adjust for CSS scaling
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;

            const px = (mx - rect.left) * scaleX;
            const py = (my - rect.top) * scaleY;

            const cx = Math.floor(px / this.cellSize);
            const cy = Math.floor(py / this.cellSize);

            // Draw with brush size
            for (let i = -this.brushSize; i <= this.brushSize; i++) {
                for (let j = -this.brushSize; j <= this.brushSize; j++) {
                    // Make brush circular
                    if (i*i + j*j <= this.brushSize*this.brushSize) {
                        const gridX = cx + i;
                        const gridY = cy + j;

                        if (gridX >= 0 && gridX < this.cols && gridY >= 0 && gridY < this.rows) {
                            // Don't overwrite walls unless erasing
                            if (this.currentElement === this.EMPTY || this.grid[gridY * this.cols + gridX] !== this.WALL) {
                                // Add randomness to sand/water spawning for better look
                                if (this.currentElement === this.WALL || this.currentElement === this.EMPTY || Math.random() < 0.5) {
                                    this.grid[gridY * this.cols + gridX] = this.currentElement;
                                }
                            }
                        }
                    }
                }
            }
            this.soundManager.playSound('click'); // maybe too noisy, omit or debounce?
        }
    }

    draw() {
        if (!this.ctx || !this.imageData) return;

        const data = this.imageData.data;
        const width = this.canvas.width;
        const cs = this.cellSize;

        // Render grid to ImageData
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cellType = this.grid[r * this.cols + c];

                // Map Element Types to Colors
                let rCol=0, gCol=0, bCol=0;
                if (cellType === this.SAND) { rCol=217; gCol=119; bCol=6; }
                else if (cellType === this.WATER) { rCol=2; gCol=132; bCol=199; }
                else if (cellType === this.WALL) { rCol=71; gCol=85; bCol=105; }

                // Fill the block of pixels representing this cell
                const startY = r * cs;
                const startX = c * cs;

                for(let py=0; py<cs; py++) {
                    const rowOffset = (startY + py) * width;
                    for(let px=0; px<cs; px++) {
                        const idx = (rowOffset + (startX + px)) * 4;
                        data[idx] = rCol;     // R
                        data[idx+1] = gCol;   // G
                        data[idx+2] = bCol;   // B
                        data[idx+3] = 255;    // Alpha
                    }
                }
            }
        }

        // Push buffer to canvas
        this.ctx.putImageData(this.imageData, 0, 0);
    }

    resize() {
        if (!this.canvas || !this.container) return;
        // Do not change canvas.width/height directly as it breaks the pixel array size.
        // Instead, use CSS to scale the canvas to fit the container while maintaining aspect ratio.
        const containerRect = this.container.querySelector('#fs-canvas-container').getBoundingClientRect();

        const scale = Math.min(
            containerRect.width / this.canvas.width,
            containerRect.height / this.canvas.height
        ) * 0.95; // 95% to leave a tiny padding

        this.canvas.style.transform = `scale(${scale})`;
    }

    async shutdown() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.boundResize);
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
