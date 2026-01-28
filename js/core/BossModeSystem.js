export class SystemMonitorApp {
    constructor(container) {
        this.container = container;
        this.history = {
            cpu: new Array(50).fill(0),
            ram: new Array(50).fill(0),
            gpu: new Array(50).fill(0),
            net: new Array(50).fill(0)
        };
        this.processes = [
            { name: 'kernel.sys', pid: 4, cpu: 0.1, mem: 140 },
            { name: 'desktop.wm', pid: 322, cpu: 1.2, mem: 450 },
            { name: 'chrome.exe', pid: 4102, cpu: 12.5, mem: 2400 },
            { name: 'chrome.exe', pid: 4103, cpu: 0.2, mem: 120 },
            { name: 'chrome.exe', pid: 4104, cpu: 0.1, mem: 90 },
            { name: 'node.js', pid: 8821, cpu: 4.5, mem: 600 },
            { name: 'slack.exe', pid: 5512, cpu: 2.1, mem: 800 },
            { name: 'spotify.exe', pid: 1204, cpu: 1.8, mem: 400 },
            { name: 'explorer.exe', pid: 1024, cpu: 0.5, mem: 200 }
        ];
        this.render();
        this.startMonitoring();
    }

    render() {
        this.container.innerHTML = `
            <div class="h-full flex flex-col bg-[#1e1e1e] text-gray-300 font-sans text-xs select-none">
                <!-- Header -->
                <div class="bg-[#252526] p-2 border-b border-[#333333] flex justify-between items-center">
                    <span class="font-bold">System Monitor v2.4</span>
                    <div class="flex gap-2">
                        <span class="bg-green-900 text-green-400 px-2 rounded">ONLINE</span>
                        <span class="bg-blue-900 text-blue-400 px-2 rounded">SECURE</span>
                    </div>
                </div>

                <!-- Graphs Grid -->
                <div class="grid grid-cols-2 gap-2 p-2 h-1/2">
                    ${this.createGraphCard('CPU Usage', 'cpu-canvas', 'text-blue-400')}
                    ${this.createGraphCard('Memory Usage', 'ram-canvas', 'text-purple-400')}
                    ${this.createGraphCard('GPU Load', 'gpu-canvas', 'text-green-400')}
                    ${this.createGraphCard('Network I/O', 'net-canvas', 'text-orange-400')}
                </div>

                <!-- Process List -->
                <div class="flex-1 overflow-hidden flex flex-col bg-[#252526] mx-2 mb-2 rounded border border-[#333333]">
                    <div class="bg-[#333333] px-2 py-1 flex font-bold text-gray-400 border-b border-[#444444]">
                        <div class="flex-1">Name</div>
                        <div class="w-16 text-right">PID</div>
                        <div class="w-16 text-right">CPU%</div>
                        <div class="w-20 text-right">Mem (MB)</div>
                    </div>
                    <div class="flex-1 overflow-y-auto custom-scroll" id="process-list">
                        ${this.renderProcessList()}
                    </div>
                </div>

                <!-- Footer -->
                <div class="h-6 bg-[#007acc] text-white flex items-center px-2 justify-between">
                    <span>Processes: ${this.processes.length}</span>
                    <span>Uptime: ${this.getUptime()}</span>
                </div>
            </div>
        `;
    }

    createGraphCard(title, id, colorClass) {
        return `
            <div class="bg-[#252526] border border-[#333333] rounded flex flex-col overflow-hidden relative group">
                <div class="absolute top-1 left-2 font-bold ${colorClass} z-10 text-[10px] uppercase tracking-wider">${title}</div>
                <div class="absolute top-1 right-2 font-bold text-white z-10 text-lg" id="${id}-val">0%</div>
                <canvas id="${id}" class="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"></canvas>
            </div>
        `;
    }

    renderProcessList() {
        return this.processes.sort((a,b) => b.cpu - a.cpu).map(p => `
            <div class="flex px-2 py-0.5 hover:bg-[#2a2d2e] cursor-pointer group border-b border-[#333333]/50">
                <div class="flex-1 truncate group-hover:text-white">${p.name}</div>
                <div class="w-16 text-right text-gray-500">${p.pid}</div>
                <div class="w-16 text-right ${p.cpu > 10 ? 'text-orange-400' : 'text-gray-400'}">${p.cpu.toFixed(1)}</div>
                <div class="w-20 text-right text-gray-400">${p.mem}</div>
            </div>
        `).join('');
    }

    startMonitoring() {
        let lastUpdate = 0;
        const update = (now) => {
            if (now - lastUpdate > 100) { // Throttle to 10fps
                lastUpdate = now;

                // Update Data
                this.updateData('cpu', 20, 30); // Base 20, variance 30
                this.updateData('ram', 40, 10);
                this.updateData('gpu', 5, 80); // Spiky
                this.updateData('net', 10, 50);

                // Update DOM
                this.drawGraph('cpu', '#60a5fa');
                this.drawGraph('ram', '#c084fc');
                this.drawGraph('gpu', '#4ade80');
                this.drawGraph('net', '#fb923c');

                // Simulate Process Flux
                this.processes.forEach(p => {
                    if (Math.random() > 0.7) p.cpu = Math.max(0, p.cpu + (Math.random() - 0.5) * 2);
                    if (Math.random() > 0.9) p.mem += Math.floor((Math.random() - 0.5) * 10);
                });
                const list = document.getElementById('process-list');
                if(list && Math.random() > 0.8) list.innerHTML = this.renderProcessList();
            }
            this.animationFrame = requestAnimationFrame(update);
        };
        this.animationFrame = requestAnimationFrame(update);
    }

    updateData(key, base, variance) {
        const last = this.history[key][this.history[key].length - 1];
        let next = base + Math.random() * variance;

        // Smooth it a bit
        next = (last * 0.7) + (next * 0.3);

        this.history[key].shift();
        this.history[key].push(next);

        // Update Text
        const el = document.getElementById(`${key}-canvas-val`);
        if(el) el.textContent = Math.round(next) + (key === 'net' ? ' Mbps' : '%');
    }

    drawGraph(key, color) {
        const canvas = document.getElementById(`${key}-canvas`);
        if (!canvas) return;

        // Handle Resize
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const ctx = canvas.getContext('2d');
        const data = this.history[key];
        const w = canvas.width;
        const h = canvas.height;
        const step = w / (data.length - 1);

        ctx.clearRect(0, 0, w, h);

        // Draw Fill
        ctx.beginPath();
        ctx.moveTo(0, h);
        data.forEach((val, i) => {
            const y = h - (val / 100) * h;
            ctx.lineTo(i * step, y);
        });
        ctx.lineTo(w, h);
        ctx.fillStyle = color + '33'; // Low opacity hex
        ctx.fill();

        // Draw Line
        ctx.beginPath();
        data.forEach((val, i) => {
            const y = h - (val / 100) * h;
            if (i === 0) ctx.moveTo(0, y);
            else ctx.lineTo(i * step, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    getUptime() {
        const s = Math.floor(performance.now() / 1000);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return `${h}h ${m}m ${s % 60}s`;
    }

    destroy() {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    }
}
