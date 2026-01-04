import SoundManager from '../core/SoundManager.js';

export default class NeonTrail {
    constructor() {
        this.ctx = null;
        this.canvas = null;
        this.state = 'MENU'; // MENU, TRAVEL, EVENT, SHOP, GAME_OVER
        this.distance = 0;
        this.goal = 2000;
        this.day = 1;
        this.speed = 0; // 0=Stop, 1=Slow, 2=Fast

        this.resources = {
            food: 100,
            fuel: 100,
            health: 100,
            money: 500
        };

        this.events = [
            { text: "You found a glitch in the matrix.", effect: (s) => { s.food += 20; return "+20 Food"; } },
            { text: "Cyber-dysentery detected.", effect: (s) => { s.health -= 20; return "-20 Health"; } },
            { text: "Bandits raided your data cache.", effect: (s) => { s.money -= 50; return "-50 Credits"; } },
            { text: "Smooth highway ahead.", effect: (s) => { s.fuel -= 5; return "Efficient Travel"; } },
            { text: "System crash! Rebooting...", effect: (s) => { s.day += 2; return "Lost 2 Days"; } }
        ];

        this.landmarks = [
            { dist: 0, name: "Neo-York" },
            { dist: 500, name: "Cyber-Chicago" },
            { dist: 1000, name: "Denver_Prime" },
            { dist: 1500, name: "Silicon_Valley_2" },
            { dist: 2000, name: "The Mainframe (Oregon)" }
        ];

        this.nextLandmarkIndex = 1;
        this.msg = "";
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.style.position = 'relative';

        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.renderUI();
        window.addEventListener('resize', this.resize.bind(this));
        this.resize();
    }

    renderUI() {
        // Overlay UI
        const ui = document.createElement('div');
        ui.style.cssText = "position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; display:flex; flex-direction:column; justify-content:space-between; padding: 20px;";
        ui.innerHTML = `
            <div id="trail-menu" class="absolute inset-0 bg-slate-900/90 z-20 flex flex-col items-center justify-center pointer-events-auto">
                <h1 class="text-6xl font-bold text-green-400 mb-4 font-mono">NEON TRAIL</h1>
                <p class="text-slate-400 mb-8">Survive the journey to the Mainframe.</p>
                <button id="btn-start-trail" class="px-8 py-4 bg-green-700 text-white font-bold rounded hover:bg-green-600">START JOURNEY</button>
                <button id="btn-exit-trail" class="mt-4 px-8 py-2 border border-slate-600 text-slate-400 hover:text-white rounded">EXIT</button>
            </div>

            <div id="trail-hud" class="hidden w-full flex justify-between items-start pointer-events-auto font-mono text-green-400 text-shadow-sm">
                <div class="bg-black/50 p-4 border border-green-800 rounded">
                    <p>DAY: <span id="trail-day">1</span></p>
                    <p>DIST: <span id="trail-dist">0</span> / 2000</p>
                    <p>NEXT: <span id="trail-next">Cyber-Chicago (500)</span></p>
                </div>
                <div class="bg-black/50 p-4 border border-green-800 rounded text-right">
                    <p>FOOD: <span id="trail-food">100</span></p>
                    <p>FUEL: <span id="trail-fuel">100</span></p>
                    <p>HLTH: <span id="trail-health">100</span></p>
                    <p>$$$: <span id="trail-money">500</span></p>
                </div>
            </div>

            <div id="trail-controls" class="hidden w-full flex flex-col items-center pointer-events-auto pb-8">
                 <div id="trail-msg" class="mb-4 text-yellow-400 font-bold bg-black/80 px-4 py-2 rounded h-8"></div>
                 <div class="flex gap-4">
                     <button id="btn-stop" class="px-6 py-2 bg-red-900 border border-red-500 text-red-300 rounded hover:bg-red-800">STOP</button>
                     <button id="btn-go" class="px-6 py-2 bg-green-900 border border-green-500 text-green-300 rounded hover:bg-green-800">TRAVEL</button>
                     <button id="btn-fast" class="px-6 py-2 bg-yellow-900 border border-yellow-500 text-yellow-300 rounded hover:bg-yellow-800">RUSH</button>
                 </div>
            </div>

            <div id="trail-shop" class="hidden absolute inset-0 bg-slate-900/95 z-30 flex flex-col items-center justify-center pointer-events-auto font-mono">
                <h2 class="text-4xl text-cyan-400 mb-8" id="shop-title">TRADING POST</h2>
                <div class="grid grid-cols-2 gap-8 mb-8">
                    <button class="shop-item px-6 py-4 bg-slate-800 border border-cyan-600 hover:bg-slate-700 text-white rounded" data-item="food" data-cost="10" data-amt="20">Buy Food (20) - 10cr</button>
                    <button class="shop-item px-6 py-4 bg-slate-800 border border-cyan-600 hover:bg-slate-700 text-white rounded" data-item="fuel" data-cost="20" data-amt="20">Buy Fuel (20) - 20cr</button>
                    <button class="shop-item px-6 py-4 bg-slate-800 border border-cyan-600 hover:bg-slate-700 text-white rounded" data-item="health" data-cost="50" data-amt="20">Heal (20) - 50cr</button>
                </div>
                <button id="btn-leave-shop" class="px-8 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold">Leave</button>
            </div>
        `;
        this.container.appendChild(ui);

        document.getElementById('btn-start-trail').onclick = () => this.startGame();
        document.getElementById('btn-exit-trail').onclick = () => window.miniGameHub.goBack();

        document.getElementById('btn-stop').onclick = () => this.speed = 0;
        document.getElementById('btn-go').onclick = () => this.speed = 1;
        document.getElementById('btn-fast').onclick = () => this.speed = 2;

        document.getElementById('btn-leave-shop').onclick = () => {
             document.getElementById('trail-shop').classList.add('hidden');
             this.state = 'TRAVEL';
             this.speed = 0;
        };

        ui.querySelectorAll('.shop-item').forEach(btn => {
            btn.onclick = () => this.buyItem(btn.dataset.item, parseInt(btn.dataset.cost), parseInt(btn.dataset.amt));
        });
    }

    startGame() {
        this.state = 'TRAVEL';
        this.distance = 0;
        this.day = 1;
        this.speed = 0;
        this.nextLandmarkIndex = 1;
        this.resources = { food: 100, fuel: 100, health: 100, money: 500 };

        document.getElementById('trail-menu').classList.add('hidden');
        document.getElementById('trail-hud').classList.remove('hidden');
        document.getElementById('trail-controls').classList.remove('hidden');
        this.updateHUD();
    }

    buyItem(item, cost, amt) {
        if (this.resources.money >= cost) {
            this.resources.money -= cost;
            this.resources[item] = Math.min(this.resources[item] + amt, 100);
            this.updateHUD();
            SoundManager.getInstance().playSound('score');
        } else {
            SoundManager.getInstance().playSound('error');
        }
    }

    resize() {
        if (this.canvas && this.container) {
            this.canvas.width = this.container.clientWidth;
            this.canvas.height = this.container.clientHeight;
        }
    }

    update(dt) {
        if (this.state === 'TRAVEL') {
            if (this.speed > 0) {
                // Move
                const moveSpeed = this.speed === 2 ? 40 : 20; // km/s (simulated)
                const consumption = this.speed === 2 ? 1.5 : 1.0;

                this.distance += moveSpeed * dt;

                // Tick Day
                if (Math.random() < dt * 0.1) this.day++;

                // Consume
                if (Math.random() < dt * 0.5) {
                    this.resources.food -= consumption;
                    this.resources.fuel -= consumption;
                    if (this.resources.food <= 0 || this.resources.fuel <= 0) this.resources.health -= 5;
                }

                // Events
                if (Math.random() < dt * 0.1) {
                    this.triggerEvent();
                }

                // Landmarks
                const nextLandmark = this.landmarks[this.nextLandmarkIndex];
                if (nextLandmark && this.distance >= nextLandmark.dist) {
                    this.arriveAtLandmark(nextLandmark);
                }

                // Win/Loss
                if (this.distance >= this.goal) {
                    this.win();
                }
                if (this.resources.health <= 0) {
                    this.gameOver("CRITICAL SYSTEM FAILURE");
                }

                this.updateHUD();
            }
        }
    }

    triggerEvent() {
        this.speed = 0;
        const event = this.events[Math.floor(Math.random() * this.events.length)];
        const result = event.effect(this.resources);
        this.showMsg(`${event.text} (${result})`);
        SoundManager.getInstance().playSound('blip');
    }

    arriveAtLandmark(lm) {
        this.speed = 0;
        this.distance = lm.dist; // Snap
        this.nextLandmarkIndex++;
        this.showMsg(`ARRIVED AT ${lm.name}`);

        setTimeout(() => {
             document.getElementById('trail-shop').classList.remove('hidden');
             document.getElementById('shop-title').textContent = `WELCOME TO ${lm.name}`;
             this.state = 'SHOP';
        }, 1500);
    }

    showMsg(txt) {
        const el = document.getElementById('trail-msg');
        if (el) {
            el.textContent = txt;
            setTimeout(() => el.textContent = "", 3000);
        }
    }

    updateHUD() {
        document.getElementById('trail-day').textContent = this.day;
        document.getElementById('trail-dist').textContent = Math.floor(this.distance);
        document.getElementById('trail-next').textContent = this.landmarks[this.nextLandmarkIndex] ? `${this.landmarks[this.nextLandmarkIndex].name} (${this.landmarks[this.nextLandmarkIndex].dist})` : "FINISH";

        document.getElementById('trail-food').textContent = Math.floor(this.resources.food);
        document.getElementById('trail-fuel').textContent = Math.floor(this.resources.fuel);
        document.getElementById('trail-health').textContent = Math.floor(this.resources.health);
        document.getElementById('trail-money').textContent = Math.floor(this.resources.money);
    }

    win() {
        this.state = 'GAME_OVER';
        window.miniGameHub.showGameOver(this.resources.money + (this.resources.health * 10), () => this.startGame());
        window.miniGameHub.showToast("YOU REACHED THE MAINFRAME!");
    }

    gameOver(reason) {
        this.state = 'GAME_OVER';
        window.miniGameHub.showGameOver(Math.floor(this.distance), () => this.startGame());
        window.miniGameHub.showToast(reason);
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Retro Landscape
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0,0,w,h);

        // Horizon
        const horizon = h * 0.6;

        // Sky
        const grad = this.ctx.createLinearGradient(0,0,0,horizon);
        grad.addColorStop(0, '#020617');
        grad.addColorStop(1, '#1e1b4b');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0,0,w,horizon);

        // Sun
        this.ctx.beginPath();
        this.ctx.arc(w/2, horizon, 100, 0, Math.PI, true);
        this.ctx.fillStyle = '#facc15';
        this.ctx.fill();

        // Ground Grid
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, horizon, w, h-horizon);
        this.ctx.clip();

        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, horizon, w, h-horizon);

        this.ctx.strokeStyle = '#22c55e'; // Green
        this.ctx.lineWidth = 2;

        // Moving lines
        const speedOffset = (Date.now() / 1000 * (this.speed * 500)) % 1000; // Simulated z movement

        // Perspective lines
        for(let x = 0; x <= w; x+= w/10) {
            this.ctx.beginPath();
            this.ctx.moveTo(w/2, horizon);
            this.ctx.lineTo((x - w/2) * 5 + w/2, h);
            this.ctx.stroke();
        }

        // Horizontal lines coming towards camera
        // Using logarithmic spacing for perspective? Simple linear for now
        // Actually, for retro grid, lines should move down.
        // y = horizon + (d / z)

        // Draw car/wagon
        if (this.speed > 0 || this.state === 'TRAVEL') {
            const bounce = Math.sin(Date.now() / 100) * 5;
            this.ctx.font = '50px FontAwesome';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('\uf1b9', w/2, h - 100 + bounce); // Car
        }

        this.ctx.restore();
    }

    shutdown() {
        window.removeEventListener('resize', this.resize);
    }
}
