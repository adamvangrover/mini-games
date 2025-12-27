
export default class TheGrind98 {
    constructor() {
        this.container = null;
        this.state = {
            money: 0,
            energy: 100,
            job: 'cashier',
            inventory: [],
            photos: [],
            isPlaying: false,
            shiftActive: false,
            dayTime: 540 // 9:00 AM in minutes
        };

        this.jobs = {
            cashier: { title: "GROCERY CASHIER", pay: 5, risk: 0, desc: "Scan items before they fall. Click to scan.", tutorial: "CLICK ITEMS TO SCAN" },
            developer: { title: "SOFTWARE ENGINEER", pay: 15, risk: 10, desc: "Write code to meet deadlines. Type ANY keys fast!", tutorial: "TYPE ANY KEYS FAST" },
            analyst: { title: "BANK ANALYST", pay: 30, risk: 20, desc: "Approve high credit (Green), Deny low (Red).", tutorial: "CLICK GREEN NUMBERS ONLY" },
            sales: { title: "YACHT SALESMAN", pay: 100, risk: 50, desc: "Negotiate deals. Choose the right dialogue.", tutorial: "CHOOSE WISELY" }
        };

        this.shopItems = [
            { id: 1, name: "Fast Food", price: 15, icon: "🍔", type: "food", energy: 30 },
            { id: 2, name: "Coffee", price: 5, icon: "☕", type: "food", energy: 15 },
            { id: 3, name: "Pager", price: 50, icon: "📟", type: "item", desc: "Stay connected" },
            { id: 4, name: "GameBoy", price: 120, icon: "👾", type: "item", desc: "For the commute" },
            { id: 5, name: "Sneakers", price: 200, icon: "👟", type: "item", desc: "Run faster" },
            { id: 6, name: "Used Sedan", price: 2500, icon: "🚗", type: "car", desc: "It runs... mostly" },
            { id: 7, name: "Brick Phone", price: 900, icon: "📱", type: "item", desc: "Cutting edge tech" },
            { id: 8, name: "Sports Car", price: 25000, icon: "🏎️", type: "car", desc: "Mid-life crisis" },
            { id: 9, name: "Suburban House", price: 150000, icon: "🏡", type: "house", desc: "The American Dream" },
            { id: 10, name: "Yacht", price: 1000000, icon: "🛥️", type: "boat", desc: "You made it" }
        ];

        this.gameLoopId = null;
        this.gameEntities = [];
        this.gameScore = 0;
        this.shiftTime = 0;
        this.timerInterval = null;

        // Dev mode vars
        this.codeLines = [];
        this.codeSnippets = ["function optimize() {", "  return true;", "  if(bug) fix();", "  while(alive) code();", "  console.log('$$$');", "  git push origin master", "  // TODO: Fix this mess"];

        // Sales mode vars
        this.clientPatience = 100;
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = this.getHTML();
        this.addStyles();

        // Bind UI
        this.bindEvents();

        // Start "Clock"
        this.timerInterval = setInterval(() => {
            if(!this.state.isPlaying) return;
            this.state.dayTime++;
            this.updateUI();
        }, 1000);

        // Start Game
        this.startGame();
    }

    getHTML() {
        return `
        <div id="grind-monitor">
            <div id="grind-screen">
                <div class="top-bar">
                    <div>THE GRIND '98</div>
                    <div id="clock">09:00 AM</div>
                    <div>BANK: $<span id="money-display">0</span></div>
                </div>

                <div class="main-area">
                    <!-- Sidebar Navigation -->
                    <div class="sidebar">
                        <div style="margin-bottom: 20px;">
                            <div class="stat-row"><span>ENERGY</span><span id="energy-val">100%</span></div>
                            <div style="width: 100%; height: 10px; border: 1px solid var(--crt-green); margin-top: 5px;">
                                <div id="energy-bar" style="width: 100%; height: 100%; background: var(--crt-green);"></div>
                            </div>
                        </div>

                        <button id="btn-work">GO TO WORK</button>
                        <button id="btn-shop">MALL</button>
                        <button id="btn-gallery">GALLERY</button>
                        <button id="btn-exit" style="margin-top:auto; border-color:red; color:red;">EXIT SYSTEM</button>

                        <hr style="border-color: var(--crt-green); width: 100%; margin: 15px 0;">

                        <div style="font-size: 1.1rem; margin-bottom: 5px;">CAREER PATH:</div>
                        <select id="job-selector" style="background: black; color: var(--crt-green); border: 1px solid var(--crt-green); padding: 5px; font-family: inherit; font-size: 1rem; width: 100%;">
                            <option value="cashier">Grocery Cashier</option>
                            <option value="developer">Software Engineer</option>
                            <option value="analyst">Bank Analyst</option>
                            <option value="sales">Yacht Salesman</option>
                        </select>

                        <div id="job-desc" style="margin-top: 10px; font-size: 0.9rem; color: #e0e0e0;">
                            Scanning groceries. Honest work.<br>Pay: Low
                        </div>
                    </div>

                    <!-- Content Area -->
                    <div class="content">

                        <!-- Work Modes -->
                        <div id="view-work" class="game-view">
                            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                                <span id="job-title-display">GROCERY CASHIER</span>
                                <span id="shift-timer">SHIFT: 0s</span>
                            </div>
                            <div class="game-canvas-container" id="game-container">
                                <canvas id="grindGameCanvas" width="600" height="400"></canvas>
                                <div id="start-work-overlay" style="position:absolute; top:0; left:0; background:rgba(0,0,0,0.8); width:100%; height:100%; display:flex; justify-content:center; align-items:center; flex-direction:column;">
                                    <h2 id="tutorial-text">CLICK ITEMS TO SCAN</h2>
                                    <button id="start-shift-btn">START SHIFT</button>
                                </div>
                            </div>
                        </div>

                        <!-- Shop View -->
                        <div id="view-shop" class="game-view hidden">
                            <div style="margin-bottom: 15px; border-bottom: 1px dashed var(--crt-green);">WELCOME TO THE MALL</div>
                            <div class="shop-grid" id="shop-container"></div>
                        </div>

                        <!-- Gallery View -->
                        <div id="view-gallery" class="game-view hidden">
                            <div style="margin-bottom: 15px; border-bottom: 1px dashed var(--crt-green);">YOUR ACHIEVEMENTS</div>
                            <div class="shop-grid" id="gallery-container">
                                <div style="padding: 20px;">No photos yet. Go buy something!</div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <div id="notification-area"></div>
        </div>

        <!-- Polaroids -->
        <canvas id="photoGen" width="400" height="450" style="display:none;"></canvas>
        <div id="polaroid-modal" class="hidden">
            <h2 style="color: white; margin-bottom: 20px;">NEW MEMORY UNLOCKED!</h2>
            <img id="polaroid-result" style="border: 10px solid white; border-bottom: 50px solid white; box-shadow: 0 0 20px black; max-height: 60vh;">
            <div style="margin-top: 20px; display: flex; gap: 20px;">
                <button id="btn-close-modal" style="border-color: white; color: white;">CLOSE</button>
            </div>
        </div>
        `;
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');

            :root {
                --crt-green: #00aa00;
                --crt-white: #e0e0e0;
            }

            #grind-monitor {
                width: 100%; height: 100%;
                background: #000;
                font-family: 'VT323', monospace;
                color: var(--crt-green);
                position: relative;
                overflow: hidden;
            }

            #grind-monitor::after {
                content: " "; pointer-events: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
                background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
                background-size: 100% 2px, 3px 100%;
                z-index: 10;
            }

            #grind-screen { padding: 20px; height: 100%; display: flex; flex-direction: column; }
            .top-bar { display: flex; justify-content: space-between; border-bottom: 2px solid var(--crt-green); padding-bottom: 10px; margin-bottom: 20px; font-size: 1.5rem; text-shadow: 0 0 5px var(--crt-green); }
            .main-area { flex-grow: 1; display: flex; gap: 20px; overflow: hidden; }
            .sidebar { width: 250px; border-right: 2px solid var(--crt-green); padding-right: 20px; display: flex; flex-direction: column; gap: 10px; }
            .content { flex-grow: 1; position: relative; background: rgba(0, 20, 0, 0.3); border: 1px solid var(--crt-green); padding: 20px; display: flex; flex-direction: column; }

            button { background: transparent; border: 2px solid var(--crt-green); color: var(--crt-green); font-family: 'VT323', monospace; font-size: 1.2rem; padding: 10px; cursor: pointer; text-transform: uppercase; }
            button:hover { background: var(--crt-green); color: #000; }

            .game-view.hidden { display: none !important; }
            .game-canvas-container { width: 100%; height: 100%; position: relative; display: flex; justify-content: center; align-items: center; background: #000; }
            canvas { image-rendering: pixelated; }

            .shop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; overflow-y: auto; height: 100%; padding-right: 10px; }
            .shop-item { border: 1px solid var(--crt-green); padding: 10px; display: flex; flex-direction: column; align-items: center; text-align: center; cursor: pointer; }
            .shop-item:hover { background: rgba(0, 170, 0, 0.1); }
            .shop-icon { font-size: 3rem; margin-bottom: 10px; }

            #notification-area { position: absolute; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 5px; z-index: 20; }
            .toast { background: var(--crt-green); color: black; padding: 10px; animation: fadeIn 0.3s; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

            #polaroid-modal { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.9); z-index: 100; display: flex; flex-direction: column; justify-content: center; align-items: center; }
            #polaroid-modal.hidden { display: none; }
        `;
        this.container.appendChild(style);
    }

    bindEvents() {
        this.container.querySelector('#btn-work').onclick = () => this.setMode('work');
        this.container.querySelector('#btn-shop').onclick = () => this.setMode('shop');
        this.container.querySelector('#btn-gallery').onclick = () => this.setMode('gallery');
        this.container.querySelector('#btn-exit').onclick = () => this.shutdown();

        this.container.querySelector('#job-selector').onchange = (e) => this.changeJob(e.target.value);
        this.container.querySelector('#start-shift-btn').onclick = () => this.startShift();
        this.container.querySelector('#btn-close-modal').onclick = () => this.container.querySelector('#polaroid-modal').classList.add('hidden');

        // Game Inputs
        const canvas = this.container.querySelector('#grindGameCanvas');
        canvas.onmousedown = (e) => this.handleGameClick(e);
        window.addEventListener('keydown', this.boundKeyHandler = (e) => this.handleGameKey(e));
    }

    startGame() {
        this.state.isPlaying = true;
        this.renderShop();
        this.updateUI();
    }

    updateUI() {
        this.container.querySelector('#money-display').innerText = this.state.money.toLocaleString();
        this.container.querySelector('#energy-val').innerText = Math.floor(this.state.energy) + "%";
        this.container.querySelector('#energy-bar').style.width = this.state.energy + "%";

        // Time
        let h = Math.floor(this.state.dayTime / 60);
        let m = this.state.dayTime % 60;
        let ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        m = m < 10 ? '0'+m : m;
        this.container.querySelector('#clock').innerText = `${h}:${m} ${ampm}`;
    }

    setMode(mode) {
        if(this.state.shiftActive) {
            this.notify("FINISH SHIFT FIRST!");
            return;
        }
        this.container.querySelectorAll('.game-view').forEach(el => el.classList.add('hidden'));
        this.container.querySelector(`#view-${mode}`).classList.remove('hidden');
        if (mode === 'gallery') this.renderGallery();
    }

    changeJob(jobKey) {
        if(this.state.shiftActive) return;
        this.state.job = jobKey;
        this.container.querySelector('#job-title-display').innerText = this.jobs[jobKey].title;
        this.container.querySelector('#job-desc').innerHTML = this.jobs[jobKey].desc + `<br>Max Pay: $${this.jobs[jobKey].pay}`;
        this.container.querySelector('#tutorial-text').innerText = this.jobs[jobKey].tutorial;
    }

    notify(msg) {
        const area = this.container.querySelector('#notification-area');
        const el = document.createElement('div');
        el.className = 'toast';
        el.innerText = `> ${msg}`;
        area.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    // --- GAME LOOP ---

    startShift() {
        if (this.state.energy < 5) {
            this.notify("TOO TIRED! EAT SOMETHING.");
            return;
        }
        this.container.querySelector('#start-work-overlay').classList.add('hidden');
        this.state.shiftActive = true;
        this.gameEntities = [];
        this.gameScore = 0;
        this.shiftTime = 20; // 20 seconds shift

        // Init specific game
        if(this.state.job === 'cashier') this.initCashier();
        if(this.state.job === 'developer') this.initDev();
        if(this.state.job === 'analyst') this.initAnalyst();
        if(this.state.job === 'sales') this.initSales();

        this.updateGame = this.updateGame.bind(this);
        this.gameLoopId = requestAnimationFrame(this.updateGame);
    }

    endShift(success) {
        this.state.shiftActive = false;
        cancelAnimationFrame(this.gameLoopId);
        this.container.querySelector('#start-work-overlay').classList.remove('hidden');

        // Calculate pay
        let pay = 0;
        if(this.state.job === 'cashier') pay = Math.floor(this.gameScore * 2);
        if(this.state.job === 'developer') pay = Math.floor(this.gameScore * 0.5);
        if(this.state.job === 'analyst') pay = Math.floor(this.gameScore * 10);
        if(this.state.job === 'sales') pay = this.gameScore > 0 ? this.jobs.sales.pay : 0;

        if(pay > 0) {
            this.state.money += pay;
            this.notify(`SHIFT OVER. EARNED $${pay}`);
        } else {
            this.notify("SHIFT FAILED. NO PAY.");
        }

        this.state.energy -= 10;
        if(this.state.energy < 0) this.state.energy = 0;
        this.updateUI();
    }

    updateGame() {
        if (!this.state.shiftActive) return;

        const canvas = this.container.querySelector('#grindGameCanvas');
        if(!canvas) return;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Timer
        this.shiftTime -= 0.016;
        this.container.querySelector('#shift-timer').innerText = `TIME: ${Math.ceil(this.shiftTime)}s`;
        if(this.shiftTime <= 0) {
            this.endShift(true);
            return;
        }

        // --- JOB LOGIC ---
        if (this.state.job === 'cashier') {
            if(Math.random() < 0.02) {
                this.gameEntities.push({x: 0, y: 200, type: Math.floor(Math.random()*3), w: 30, h: 30});
            }
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 230, 600, 10);

            ctx.font = "30px Arial";
            for(let i=this.gameEntities.length-1; i>=0; i--) {
                let e = this.gameEntities[i];
                e.x += 2;
                if(e.type === 0) ctx.fillText("🍎", e.x, e.y+25);
                if(e.type === 1) ctx.fillText("🍞", e.x, e.y+25);
                if(e.type === 2) ctx.fillText("🥚", e.x, e.y+25);

                if(e.x > 600) {
                    this.gameEntities.splice(i, 1);
                    this.notify("MISSED ITEM!");
                    this.gameScore = Math.max(0, this.gameScore - 1);
                }
            }
            ctx.fillStyle = 'white';
            ctx.font = "20px VT323";
            ctx.fillText(`SCANNED: ${this.gameScore}`, 20, 40);
        }
        else if (this.state.job === 'developer') {
            ctx.fillStyle = '#00aa00';
            ctx.font = "16px monospace";
            let y = 30;
            this.codeLines.forEach(line => {
                ctx.fillText(line, 20, y);
                y += 20;
            });
            ctx.fillStyle = '#333';
            ctx.fillRect(20, 350, 560, 20);
            ctx.fillStyle = '#00aa00';
            ctx.fillRect(20, 350, (this.gameScore/1000) * 560, 20);
            ctx.fillStyle = 'white';
            ctx.fillText("MASH KEYBOARD TO CODE", 20, 385);
        }
        else if (this.state.job === 'analyst') {
            if(Math.random() < 0.05 && this.gameEntities.length < 5) this.spawnNumber();
            for(let i=this.gameEntities.length-1; i>=0; i--) {
                let e = this.gameEntities[i];
                e.life--;
                let isPrime = e.val > 700;
                ctx.fillStyle = isPrime ? '#00ff00' : '#ff0000';
                ctx.font = "24px VT323";
                ctx.fillText(e.val, e.x, e.y);
                if(e.life <= 0) this.gameEntities.splice(i, 1);
            }
            ctx.fillStyle = 'white';
            ctx.fillText(`MEMOS FILED: ${this.gameScore}`, 20, 40);
        }
        else if (this.state.job === 'sales') {
            ctx.font = "100px Arial";
            ctx.fillText("🤵", 250, 150);
            ctx.fillStyle = 'red';
            ctx.fillRect(200, 50, 200, 10);
            ctx.fillStyle = 'green';
            ctx.fillRect(200, 50, this.clientPatience*2, 10);
            ctx.fillStyle = 'white';
            ctx.font = "20px VT323";
            ctx.fillText("CLIENT INTEREST", 200, 40);

            ctx.strokeStyle = 'white';
            ctx.strokeRect(50, 250, 150, 100);
            ctx.fillText("1. COMPLIMENT", 60, 300);
            ctx.strokeRect(220, 250, 150, 100);
            ctx.fillText("2. DISCUSS SPECS", 230, 300);
            ctx.strokeRect(390, 250, 150, 100);
            ctx.fillText("3. HARD SELL", 400, 300);

            this.clientPatience -= 0.1;
            if(this.clientPatience <= 0) {
                this.notify("CLIENT WALKED OUT.");
                this.shiftTime = 0;
            }
            if(this.clientPatience > 150) {
                this.gameScore = 1;
                this.notify("DEAL CLOSED!");
                this.shiftTime = 0;
            }
        }

        this.gameLoopId = requestAnimationFrame(this.updateGame);
    }

    // --- GAME HELPERS ---
    initCashier() { /* Entities spawn in loop */ }
    initDev() { this.codeLines = ["// START CODING..."]; }
    initAnalyst() { this.spawnNumber(); }
    spawnNumber() {
        this.gameEntities.push({
            x: Math.random() * 500 + 50,
            y: Math.random() * 300 + 50,
            val: Math.floor(Math.random() * 1000),
            life: 100
        });
    }
    initSales() { this.clientPatience = 100; }

    handleGameClick(e) {
        if (!this.state.shiftActive) return;
        const canvas = this.container.querySelector('#grindGameCanvas');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.state.job === 'cashier') {
            for(let i=this.gameEntities.length-1; i>=0; i--) {
                let en = this.gameEntities[i];
                if(x > en.x && x < en.x+30 && y > 180 && y < 250) {
                    this.gameScore++;
                    this.gameEntities.splice(i, 1);
                }
            }
        }
        else if (this.state.job === 'analyst') {
            for(let i=this.gameEntities.length-1; i>=0; i--) {
                let en = this.gameEntities[i];
                if(Math.abs(x - en.x) < 30 && Math.abs(y - en.y) < 20) {
                    if(en.val > 700) { this.gameScore++; this.notify("APPROVED"); }
                    else { this.gameScore--; this.notify("BAD LOAN!"); }
                    this.gameEntities.splice(i, 1);
                }
            }
        }
        else if (this.state.job === 'sales') {
            let impact = 0;
            if(y > 250 && y < 350) {
                if(x > 50 && x < 200) impact = 10;
                if(x > 220 && x < 370) impact = 5;
                if(x > 390 && x < 540) impact = (Math.random() > 0.7) ? 40 : -30;
            }
            this.clientPatience += impact;
            this.notify(impact > 0 ? "CLIENT LIKED THAT" : "CLIENT ANNOYED");
        }
    }

    handleGameKey(e) {
        if (!this.state.shiftActive) return;
        if (this.state.job === 'developer') {
            this.gameScore++;
            if (this.gameScore % 5 === 0) {
                let line = this.codeSnippets[Math.floor(Math.random()*this.codeSnippets.length)];
                this.codeLines.push(line);
                if(this.codeLines.length > 15) this.codeLines.shift();
            }
        }
    }

    renderShop() {
        const container = this.container.querySelector('#shop-container');
        if(!container) return;
        container.innerHTML = '';
        this.shopItems.forEach(item => {
            const el = document.createElement('div');
            el.className = 'shop-item';
            el.innerHTML = `
                <div class="shop-icon">${item.icon}</div>
                <div style="font-weight:bold">${item.name}</div>
                <div>$${item.price.toLocaleString()}</div>
                <div style="font-size:0.8em; color:#aaa;">${item.type === 'food' ? '+Energy' : 'Asset'}</div>
            `;
            el.onclick = () => this.buyItem(item);
            container.appendChild(el);
        });
    }

    buyItem(item) {
        if (this.state.money >= item.price) {
            this.state.money -= item.price;
            if (item.type === 'food') {
                this.state.energy = Math.min(100, this.state.energy + item.energy);
                this.notify(`ATE ${item.name}. YUM.`);
            } else {
                this.state.inventory.push(item);
                this.notify(`BOUGHT ${item.name}!`);
                this.generatePolaroid(item);
            }
            this.updateUI();
        } else {
            this.notify("INSUFFICIENT FUNDS.");
        }
    }

    generatePolaroid(item) {
        const pCanvas = this.container.querySelector('#photoGen');
        const pCtx = pCanvas.getContext('2d');

        const skyColor = ['#87CEEB', '#191970', '#FF4500'][Math.floor(Math.random()*3)];
        pCtx.fillStyle = skyColor;
        pCtx.fillRect(0,0,400,300);
        pCtx.fillStyle = '#228B22';
        pCtx.fillRect(0, 300, 400, 150);

        pCtx.font = "150px Arial";
        pCtx.textAlign = "center";
        pCtx.fillText(item.icon, 200, 250);

        pCtx.strokeStyle = 'black';
        pCtx.lineWidth = 5;
        pCtx.beginPath();
        pCtx.arc(280, 320, 20, 0, Math.PI*2);
        pCtx.moveTo(280, 340); pCtx.lineTo(280, 400);
        pCtx.moveTo(280, 360); pCtx.lineTo(250, 340);
        pCtx.moveTo(280, 360); pCtx.lineTo(310, 340);
        pCtx.moveTo(280, 400); pCtx.lineTo(260, 440);
        pCtx.moveTo(280, 400); pCtx.lineTo(300, 440);
        pCtx.stroke();

        pCtx.fillStyle = 'rgba(255, 255, 0, 0.1)';
        pCtx.fillRect(0,0,400,450);

        pCtx.font = "20px VT323";
        pCtx.fillStyle = '#ff8800';
        pCtx.textAlign = "right";
        pCtx.fillText("98 12 25", 380, 430);

        pCtx.font = "30px Brush Script MT";
        pCtx.fillStyle = 'white';
        pCtx.strokeStyle = 'black';
        pCtx.lineWidth = 1;
        pCtx.textAlign = "center";
        pCtx.fillText(`My New ${item.name}!`, 200, 50);
        pCtx.strokeText(`My New ${item.name}!`, 200, 50);

        const dataUrl = pCanvas.toDataURL("image/png");
        const img = this.container.querySelector('#polaroid-result');
        img.src = dataUrl;

        this.state.photos.push({src: dataUrl, name: item.name});
        this.container.querySelector('#polaroid-modal').classList.remove('hidden');
    }

    renderGallery() {
        const container = this.container.querySelector('#gallery-container');
        if(!container) return;
        container.innerHTML = '';
        if(this.state.photos.length === 0) {
            container.innerHTML = '<div style="padding:20px">Buy items to create memories.</div>';
            return;
        }
        this.state.photos.forEach(photo => {
            const el = document.createElement('div');
            el.className = 'shop-item';
            el.innerHTML = `<img src="${photo.src}" style="width:100%; border:5px solid white;"><div>${photo.name}</div>`;
            container.appendChild(el);
        });
    }

    shutdown() {
        if(this.timerInterval) clearInterval(this.timerInterval);
        if(this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
        window.removeEventListener('keydown', this.boundKeyHandler);

        // Do NOT call transitionToState('MENU') here because shutdown() is called BY transitionToState.
        // Calling it again creates an infinite loop.
        this.container.innerHTML = '';
    }
}
