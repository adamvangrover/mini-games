import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class ZenGardenGame {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.sandCanvas = null;
        this.sandCtx = null;
        
        this.width = 0;
        this.height = 0;
        
        this.tool = 'rake'; // rake, rock, plant, eraser
        this.objects = []; // {type, x, y, size, color, angle}
        this.paths = []; // {tool: 'rake'|'eraser', points: [{x,y}, ...]}
        this.currentPath = null;
        
        this.isDragging = false;
        this.lastPos = null;
        this.theme = 'day';

        this.palettes = {
            day: {
                sand: '#f2d2a9',
                sandShadow: '#e0c098',
                rock: ['#5a5a5a', '#7a7a7a', '#4a4a4a'],
                plant: ['#4ade80', '#22c55e', '#16a34a'],
                highlight: '#f9e4c9'
            },
            night: {
                sand: '#1e1b4b',
                sandShadow: '#0f172a',
                rock: ['#334155', '#475569', '#1e293b'],
                plant: ['#2dd4bf', '#14b8a6', '#0d9488'], // Cyan/Teal bioluminescent
                highlight: '#312e81'
            }
        };
        this.palette = this.palettes.day;
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = "game-container relative w-full h-full min-h-screen bg-slate-900";

        // Create Canvases
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.className = "absolute top-0 left-0 w-full h-full cursor-crosshair";
        
        // Sand Layer (Offscreen)
        this.sandCanvas = document.createElement('canvas');
        this.sandCtx = this.sandCanvas.getContext('2d');

        this.container.appendChild(this.canvas);

        // UI Overlay
        const ui = document.createElement('div');
        ui.className = "absolute top-4 left-4 flex flex-col gap-4 pointer-events-none";
        ui.innerHTML = `
            <div class="pointer-events-auto bg-slate-800/90 backdrop-blur p-4 rounded-xl border border-slate-700 shadow-lg flex flex-col gap-2">
                <h2 class="text-xl font-bold text-amber-200 text-center font-serif">Zen Garden</h2>
                <div class="flex gap-2 justify-center">
                    <button id="tool-rake" class="tool-btn w-10 h-10 rounded bg-amber-200 text-amber-900 hover:bg-white transition flex items-center justify-center shadow" title="Rake"><i class="fas fa-stream"></i></button>
                    <button id="tool-rock" class="tool-btn w-10 h-10 rounded bg-slate-600 text-slate-200 hover:bg-slate-500 transition flex items-center justify-center shadow" title="Rock"><i class="fas fa-cube"></i></button>
                    <button id="tool-plant" class="tool-btn w-10 h-10 rounded bg-green-600 text-green-100 hover:bg-green-500 transition flex items-center justify-center shadow" title="Plant"><i class="fas fa-leaf"></i></button>
                    <button id="tool-eraser" class="tool-btn w-10 h-10 rounded bg-red-900/50 text-red-200 hover:bg-red-800/50 transition flex items-center justify-center shadow" title="Smooth Sand"><i class="fas fa-eraser"></i></button>
                </div>
                <hr class="border-slate-600">
                <div class="flex gap-2">
                    <button id="zen-save" class="flex-1 pointer-events-auto px-2 py-2 bg-cyan-700 hover:bg-cyan-600 text-white text-xs rounded transition"><i class="fas fa-save"></i> Save</button>
                    <button id="zen-load" class="flex-1 pointer-events-auto px-2 py-2 bg-cyan-700 hover:bg-cyan-600 text-white text-xs rounded transition"><i class="fas fa-upload"></i> Load</button>
                </div>
                <button id="zen-theme" class="pointer-events-auto px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded transition"><i class="fas fa-moon"></i> Toggle Theme</button>
                <button id="zen-clear" class="pointer-events-auto px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded transition">Clear Garden</button>
                <button id="zen-exit" class="pointer-events-auto px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded transition">Back to Menu</button>
            </div>
            <div id="zen-msg" class="pointer-events-auto text-xs text-white bg-black/50 p-2 rounded max-w-[200px] opacity-0 transition-opacity text-center">
                Garden Saved!
            </div>
        `;
        this.container.appendChild(ui);

        // Bindings
        this.resize();
        window.addEventListener('resize', () => this.resize());

        ['rake', 'rock', 'plant', 'eraser'].forEach(t => {
            document.getElementById(`tool-${t}`).onclick = () => this.setTool(t);
        });

        document.getElementById('zen-clear').onclick = () => this.resetGarden();
        document.getElementById('zen-exit').onclick = () => window.miniGameHub.goBack();
        document.getElementById('zen-save').onclick = () => this.saveGarden();
        document.getElementById('zen-load').onclick = () => this.loadGarden();
        document.getElementById('zen-theme').onclick = () => this.toggleTheme();

        // Input
        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: (clientX - rect.left) * (this.canvas.width / rect.width),
                y: (clientY - rect.top) * (this.canvas.height / rect.height)
            };
        };

        const start = (e) => {
            if (e.type.startsWith('touch')) e.preventDefault();
            this.isDragging = true;
            this.lastPos = getPos(e);
            this.handleInteractStart(this.lastPos);
        };
        const move = (e) => {
            if (e.type.startsWith('touch')) e.preventDefault();
            if (!this.isDragging) return;
            const pos = getPos(e);
            this.handleInteractMove(this.lastPos, pos);
            this.lastPos = pos;
        };
        const end = (e) => {
            if (e.type.startsWith('touch')) e.preventDefault();
            this.isDragging = false;
            if (this.currentPath) {
                this.paths.push(this.currentPath);
                this.currentPath = null;
            }
        };

        this.canvas.addEventListener('mousedown', start);
        this.canvas.addEventListener('mousemove', move);
        this.canvas.addEventListener('mouseup', end);
        this.canvas.addEventListener('mouseleave', end);

        this.canvas.addEventListener('touchstart', start, {passive: false});
        this.canvas.addEventListener('touchmove', move, {passive: false});
        this.canvas.addEventListener('touchend', end);

        SaveSystem.getInstance().incrementStat('zen_visits');
        this.resetGarden();
        this.loop();
    }

    resize() {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.sandCanvas.width = this.width;
        this.sandCanvas.height = this.height;
        
        // Replay paths on sand canvas
        this.fillSand();
        this.paths.forEach(path => this.replayPath(path));
    }

    resetGarden() {
        this.objects = [];
        this.paths = [];
        this.fillSand();
    }

    fillSand() {
        if (!this.sandCtx) return;
        this.sandCtx.fillStyle = this.palette.sand;
        this.sandCtx.fillRect(0, 0, this.width, this.height);
    }
    
    saveGarden() {
        const data = {
            objects: this.objects,
            paths: this.paths
        };
        SaveSystem.getInstance().setGameConfig('zen_garden_save', data);
        
        const msg = document.getElementById('zen-msg');
        msg.textContent = "Garden Saved!";
        msg.classList.remove('opacity-0');
        setTimeout(() => msg.classList.add('opacity-0'), 2000);
    }
    
    loadGarden() {
        const data = SaveSystem.getInstance().getGameConfig('zen_garden_save');
        if (data && data.objects) {
            this.objects = data.objects;
            this.paths = data.paths || [];
            this.fillSand();
            this.paths.forEach(path => this.replayPath(path));
            
            const msg = document.getElementById('zen-msg');
            msg.textContent = "Garden Loaded!";
            msg.classList.remove('opacity-0');
            setTimeout(() => msg.classList.add('opacity-0'), 2000);
        } else {
             const msg = document.getElementById('zen-msg');
            msg.textContent = "No Save Found";
            msg.classList.remove('opacity-0');
            setTimeout(() => msg.classList.add('opacity-0'), 2000);
        }
    }

    setTool(t) {
        this.tool = t;
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('ring-2', 'ring-white'));
        document.getElementById(`tool-${t}`).classList.add('ring-2', 'ring-white');
    }

    handleInteractStart(pos) {
        if (this.tool === 'rock') {
            this.objects.push({
                type: 'rock',
                x: pos.x,
                y: pos.y,
                size: 15 + Math.random() * 20,
                angle: Math.random() * Math.PI * 2,
                color: this.palette.rock[Math.floor(Math.random() * this.palette.rock.length)]
            });
            window.miniGameHub.soundManager.playSound('click'); 
        } else if (this.tool === 'plant') {
             this.objects.push({
                type: 'plant',
                x: pos.x,
                y: pos.y,
                size: 10 + Math.random() * 10,
                color: this.palette.plant[Math.floor(Math.random() * this.palette.plant.length)]
            });
            window.miniGameHub.soundManager.playSound('click');
        } else if (this.tool === 'rake' || this.tool === 'eraser') {
            this.currentPath = { tool: this.tool, points: [pos] };
        }
    }
    
    handleInteractMove(from, to) {
        if (this.tool === 'rake' || this.tool === 'eraser') {
            this.rakeSand(from, to, this.tool);
            if (this.currentPath) this.currentPath.points.push(to);
        }
    }

    rakeSand(from, to, tool) {
        const ctx = this.sandCtx;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (tool === 'rake') {
            const size = 20;
            ctx.strokeStyle = this.palette.sandShadow;
            ctx.lineWidth = size;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();

            ctx.strokeStyle = this.palette.highlight; 
            ctx.lineWidth = size * 0.3;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
        } else if (tool === 'eraser') {
            ctx.strokeStyle = this.palette.sand;
            ctx.lineWidth = 40;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
        }
    }
    
    replayPath(path) {
        if (!path.points || path.points.length < 2) return;
        for(let i=0; i<path.points.length-1; i++) {
            this.rakeSand(path.points[i], path.points[i+1], path.tool);
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'day' ? 'night' : 'day';
        this.palette = this.palettes[this.theme];
        this.fillSand();
        this.paths.forEach(p => this.replayPath(p));
        
        // Update button icon
        const btn = document.getElementById('zen-theme');
        btn.innerHTML = this.theme === 'day' ? '<i class="fas fa-moon"></i> Toggle Theme' : '<i class="fas fa-sun"></i> Toggle Theme';
    }

    loop() {
        if (!this.ctx) return;
        requestAnimationFrame(() => this.loop());
        this.draw();
    }

    draw() {
        if (this.width <= 0 || this.height <= 0) return;
        
        this.ctx.drawImage(this.sandCanvas, 0, 0);

        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
        this.ctx.shadowOffsetY = 5;

        for (const obj of this.objects) {
            this.ctx.save();
            this.ctx.translate(obj.x, obj.y);
            
            if (obj.type === 'rock') {
                this.ctx.rotate(obj.angle);
                this.ctx.fillStyle = obj.color;
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, obj.size, obj.size * 0.8, 0, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.shadowBlur = 0;
                this.ctx.shadowOffsetY = 0;
                this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
                this.ctx.beginPath();
                this.ctx.arc(-obj.size*0.3, -obj.size*0.3, obj.size*0.2, 0, Math.PI*2);
                this.ctx.fill();

            } else if (obj.type === 'plant') {
                this.ctx.fillStyle = obj.color;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, obj.size, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.shadowBlur = 0;
                this.ctx.shadowOffsetY = 0;
                this.ctx.fillStyle = obj.color; 
                for(let i=0; i<5; i++) {
                     const a = (i/5) * Math.PI * 2;
                     this.ctx.beginPath();
                     this.ctx.arc(Math.cos(a)*obj.size, Math.sin(a)*obj.size, obj.size*0.6, 0, Math.PI*2);
                     this.ctx.fill();
                }
            }
            this.ctx.restore();
        }
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
    }
    
    shutdown() {
        this.ctx = null;
        this.sandCtx = null;
        this.container.innerHTML = '';
        window.removeEventListener('resize', this.resize);
    }
}
