
export default class ExiledGame {
    constructor() {
        this.container = null;
        this.state = null;
        this.engine = null;
        this.game = null;
        this.combat = null;
        this.hacking = null;
        this.ui = null;
        this.procedural = null;
        this.db = null;
        this.visuals = null;
        this.nodes = null;
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = `
            <div class="exiled-game relative flex flex-col h-full w-full bg-black text-neon-green font-mono overflow-hidden select-none">
                <style>
                    /* Scoped styles for Exiled Spark */
                    .exiled-game { font-family: 'Courier New', monospace; }
                    .exiled-game .text-neon-green { color: #39ff14; }
                    .exiled-game .text-neon-green-dim { color: #1b7a0a; }
                    .exiled-game .text-neon-blue { color: #00f3ff; }
                    .exiled-game .text-neon-pink { color: #ff0099; }
                    .exiled-game .text-neon-red { color: #ff003c; }
                    .exiled-game .text-neon-yellow { color: #fcee0a; }
                    .exiled-game .text-neon-purple { color: #b026ff; }
                    .exiled-game .bg-panel { background-color: #0a0f0a; }

                    .exiled-game .scanlines {
                        background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
                        background-size: 100% 3px, 3px 100%;
                        pointer-events: none;
                        position: absolute; inset: 0; z-index: 50;
                    }
                    .exiled-game .flicker { animation: exiled-flicker 0.15s infinite; pointer-events: none; opacity: 0.05; background: white; position: absolute; inset: 0; z-index: 51; }
                    @keyframes exiled-flicker { 0% { opacity: 0.02; } 50% { opacity: 0.05; } 100% { opacity: 0.02; } }

                    .exiled-game .hud-panel {
                        background: rgba(5, 10, 5, 0.95);
                        border: 1px solid #1b7a0a;
                        box-shadow: 0 0 10px rgba(57, 255, 20, 0.05);
                        backdrop-filter: blur(4px);
                    }

                    .exiled-game .btn-interact {
                        position: relative;
                        background: rgba(0, 20, 0, 0.6);
                        border-left: 2px solid #1b7a0a;
                        transition: all 0.2s;
                        text-align: left;
                        overflow: hidden;
                    }
                    .exiled-game .btn-interact:hover:not(:disabled) {
                        background: rgba(57, 255, 20, 0.1);
                        border-left-color: #39ff14;
                        padding-left: 1.5rem;
                        text-shadow: 0 0 8px #39ff14;
                    }
                    .exiled-game .btn-interact:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }

                    .exiled-game .typewriter p { animation: exiled-typeIn 0.3s ease-out forwards; opacity: 0; }
                    @keyframes exiled-typeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

                    .exiled-game .scene-container { perspective: 1000px; overflow: hidden; position: relative; }
                    .exiled-game .shake { animation: exiled-shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
                    @keyframes exiled-shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }

                    .exiled-game .map-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
                    .exiled-game .map-node { aspect-ratio: 1; border: 1px solid #1b7a0a; display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; transition: 0.2s; }
                    .exiled-game .map-node:hover { background: #1b7a0a; color: black; }
                    .exiled-game .map-node.active { background: #39ff14; color: black; font-weight: bold; box-shadow: 0 0 10px #39ff14; }

                    .exiled-game ::-webkit-scrollbar { width: 6px; }
                    .exiled-game ::-webkit-scrollbar-track { background: #020202; }
                    .exiled-game ::-webkit-scrollbar-thumb { background: #1b7a0a; }
                </style>

                <div class="scanlines"></div>
                <div class="flicker"></div>

                <div class="relative z-10 flex flex-col h-full max-w-[1600px] mx-auto p-2 gap-2 w-full">

                    <!-- Header -->
                    <header class="hud-panel p-2 flex justify-between items-end shrink-0">
                        <div>
                            <h1 class="text-xl md:text-2xl font-bold tracking-widest text-neon-green drop-shadow-[0_0_5px_rgba(57,255,20,0.8)]">EXILED SPARK <span class="text-xs text-neon-yellow align-top">OMEGA v31.0</span></h1>
                            <div class="text-xs text-neon-green-dim">ASCENSION ENGINE ONLINE <span class="mx-2">|</span> <span id="ui-location">LOC: BOOT_SEQUENCE</span></div>
                        </div>
                        <div class="text-right font-mono text-xs hidden sm:block">
                            <button id="exit-btn" class="border border-red-500 text-red-500 px-2 py-1 hover:bg-red-500 hover:text-white transition">EXIT SYSTEM</button>
                        </div>
                    </header>

                    <!-- Game Layout -->
                    <div class="flex flex-1 overflow-hidden gap-2 flex-col md:flex-row">

                        <!-- LEFT: Visuals & Narrative -->
                        <main class="flex-[3] flex flex-col gap-2 min-h-0">

                            <!-- Scene Visualizer -->
                            <div id="scene-display" class="hud-panel h-48 md:h-64 w-full relative bg-black scene-container border-b-2 border-neon-green-dim flex items-center justify-center overflow-hidden">
                                <div class="absolute inset-0 flex items-center justify-center opacity-20">
                                    <pre class="text-[8px] leading-[8px] text-neon-green">SYSTEM STANDBY...</pre>
                                </div>
                            </div>

                            <!-- Text Log -->
                            <div id="game-log" class="hud-panel flex-1 overflow-y-auto p-4 space-y-3 font-mono bg-opacity-90 bg-panel scroll-smooth text-sm"></div>

                            <!-- Input/Action Area -->
                            <div class="hud-panel p-2 shrink-0 bg-black">
                                <div id="action-container" class="grid grid-cols-1 md:grid-cols-2 gap-2"></div>
                            </div>
                        </main>

                        <!-- RIGHT: Systems & Stats -->
                        <aside class="flex-[2] flex flex-col gap-2 min-w-[300px] min-h-0">

                            <!-- Vitals -->
                            <div class="hud-panel p-3 grid grid-cols-2 gap-4 bg-panel">
                                <div>
                                    <div class="flex justify-between text-xs mb-1"><span>INTEGRITY</span> <span id="val-hp" class="text-neon-red">100/100</span></div>
                                    <div class="h-2 bg-red-900/30 w-full"><div id="bar-hp" class="h-full bg-neon-red transition-all" style="width: 100%"></div></div>
                                </div>
                                <div>
                                    <div class="flex justify-between text-xs mb-1"><span>SPARK</span> <span id="val-sp" class="text-neon-yellow">50/50</span></div>
                                    <div class="h-2 bg-yellow-900/30 w-full"><div id="bar-sp" class="h-full bg-neon-yellow transition-all" style="width: 100%"></div></div>
                                </div>
                                <div class="col-span-2 flex justify-between text-xs mt-1 border-t border-neon-green-dim pt-2">
                                    <div class="text-neon-yellow">CREDITS: <span id="val-cr" class="text-white font-bold">0</span></div>
                                    <div class="text-neon-blue">XP: <span id="val-xp" class="text-white font-bold">0</span></div>
                                    <div class="text-neon-purple">LVL: <span id="val-lvl" class="text-white font-bold">1</span></div>
                                </div>
                            </div>

                            <!-- Party Panel -->
                            <div id="party-panel" class="hud-panel p-2 bg-panel min-h-[60px]">
                                <div class="text-[10px] font-bold text-neon-green border-b border-neon-green-dim mb-2">ACTIVE PARTY LINK</div>
                                <div id="party-list" class="flex flex-wrap gap-2 text-xs">
                                    <span class="text-gray-500 italic">No companions synced.</span>
                                </div>
                            </div>

                            <!-- Tabs & Content -->
                            <div class="hud-panel flex-1 flex flex-col overflow-hidden bg-panel">
                                <div class="flex border-b border-neon-green-dim">
                                    <button id="tab-btn-inv" class="tab-btn flex-1 py-2 text-xs hover:bg-neon-green hover:text-black transition-colors active-tab text-black bg-neon-green" data-tab="inv">GEAR</button>
                                    <button id="tab-btn-map" class="tab-btn flex-1 py-2 text-xs hover:bg-neon-green hover:text-black transition-colors" data-tab="map">MAP</button>
                                    <button id="tab-btn-quest" class="tab-btn flex-1 py-2 text-xs hover:bg-neon-green hover:text-black transition-colors" data-tab="quest">JOBS</button>
                                    <button id="tab-btn-sys" class="tab-btn flex-1 py-2 text-xs hover:bg-neon-green hover:text-black transition-colors" data-tab="sys">SYS</button>
                                </div>

                                <div class="p-3 flex-1 overflow-y-auto relative text-sm">
                                    <!-- Inventory -->
                                    <div id="tab-inv" class="space-y-4">
                                        <div class="grid grid-cols-2 gap-2 text-xs mb-4 border-b border-neon-green-dim pb-4">
                                            <div id="slot-wep" class="border border-neon-green-dim p-2 text-center opacity-70 hover:opacity-100 cursor-pointer">WEAPON: <span class="text-white block">Fists</span></div>
                                            <div id="slot-arm" class="border border-neon-green-dim p-2 text-center opacity-70 hover:opacity-100 cursor-pointer">ARMOR: <span class="text-white block">None</span></div>
                                            <div id="slot-imp" class="border border-neon-green-dim p-2 text-center opacity-70 hover:opacity-100 cursor-pointer">IMPLANT: <span class="text-white block">Basic Chip</span></div>
                                            <div id="slot-dek" class="border border-neon-green-dim p-2 text-center opacity-70 hover:opacity-100 cursor-pointer">DECK: <span class="text-white block">None</span></div>
                                        </div>
                                        <h4 class="text-xs font-bold text-neon-green">BACKPACK</h4>
                                        <div id="inv-list" class="space-y-1 text-xs"></div>
                                    </div>

                                    <!-- Map -->
                                    <div id="tab-map" class="hidden h-full flex flex-col">
                                        <div class="text-center text-xs text-neon-green mb-2">NEO-TOKYO SECTOR 7</div>
                                        <div class="map-grid flex-1" id="map-container"></div>
                                        <div class="mt-2 text-xs text-gray-400 h-8 border-t border-neon-green-dim pt-1 flex justify-between">
                                            <span>SELECT NODE</span>
                                            <span id="map-danger" class="text-neon-red"></span>
                                        </div>
                                    </div>

                                    <!-- Jobs -->
                                    <div id="tab-quest" class="hidden space-y-3">
                                        <div class="border-b border-neon-green-dim pb-2">
                                            <h4 class="text-xs font-bold text-neon-yellow mb-2">MAIN DIRECTIVE</h4>
                                            <div id="main-quest" class="text-xs text-gray-300">Initialize System.</div>
                                        </div>
                                        <div>
                                            <h4 class="text-xs font-bold mb-2">CONTRACTS</h4>
                                            <div id="contract-list" class="space-y-2"></div>
                                        </div>
                                    </div>

                                    <!-- System -->
                                    <div id="tab-sys" class="hidden space-y-2">
                                        <div class="text-xs mb-4">
                                            <p>STR: <span id="stat-str" class="text-white">1</span></p>
                                            <p>AGI: <span id="stat-agi" class="text-white">1</span></p>
                                            <p>TEC: <span id="stat-tec" class="text-white">1</span></p>
                                            <p class="text-gray-500 mt-2 text-[10px]">Points avail: <span id="stat-pts">0</span></p>
                                            <div id="lvl-btns" class="hidden flex gap-2 mt-1">
                                                <button id="lvl-btn-str" class="text-[10px] border px-1 border-neon-green">+STR</button>
                                                <button id="lvl-btn-agi" class="text-[10px] border px-1 border-neon-green">+AGI</button>
                                                <button id="lvl-btn-tec" class="text-[10px] border px-1 border-neon-green">+TEC</button>
                                            </div>
                                        </div>
                                        <button id="btn-save" class="w-full border border-neon-blue text-neon-blue p-2 text-xs hover:bg-neon-blue/10">FORCE SAVE</button>
                                        <button id="btn-reset" class="w-full border border-neon-red text-neon-red p-2 text-xs hover:bg-neon-red/10">HARD RESET</button>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>

                <!-- Modals -->
                <div id="modal-overlay" class="hidden fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
                    <div class="hud-panel w-full max-w-lg p-4 bg-black relative border-neon-blue">
                        <h2 id="modal-title" class="text-xl font-bold mb-4 text-center border-b border-gray-800 pb-2 tracking-widest text-neon-blue">SYSTEM</h2>
                        <div id="modal-content" class="min-h-[200px] flex flex-col justify-center items-center"></div>
                    </div>
                </div>
            </div>
        `;

        this.initGameLogic();

        // Bind UI
        this.container.querySelector('#exit-btn').onclick = () => window.miniGameHub.goBack();
        this.container.querySelector('#tab-btn-inv').onclick = () => this.ui.tab('inv');
        this.container.querySelector('#tab-btn-map').onclick = () => this.ui.tab('map');
        this.container.querySelector('#tab-btn-quest').onclick = () => this.ui.tab('quest');
        this.container.querySelector('#tab-btn-sys').onclick = () => this.ui.tab('sys');

        this.container.querySelector('#slot-wep').onclick = () => this.game.unequip('weapon');
        this.container.querySelector('#slot-arm').onclick = () => this.game.unequip('armor');
        this.container.querySelector('#slot-imp').onclick = () => this.game.unequip('implant');
        this.container.querySelector('#slot-dek').onclick = () => this.game.unequip('deck');

        this.container.querySelector('#lvl-btn-str').onclick = () => this.game.levelUp('str');
        this.container.querySelector('#lvl-btn-agi').onclick = () => this.game.levelUp('agi');
        this.container.querySelector('#lvl-btn-tec').onclick = () => this.game.levelUp('tec');

        this.container.querySelector('#btn-save').onclick = () => this.engine.save();
        this.container.querySelector('#btn-reset').onclick = () => this.engine.hardReset();

        this.engine.init();
    }

    initGameLogic() {
        const self = this;

        // --- CORE DATABASE ---
        this.db = {
            items: {
                "med_stim": { name: "Med-Stim", type: "use", val: 30, cost: 50, effect: (s) => { s.hp = Math.min(s.maxHp, s.hp + 30); return "Integrity Restored +30"; } },
                "spark_cell": { name: "Spark Cell", type: "use", val: 25, cost: 80, effect: (s) => { s.sp = Math.min(s.maxSp, s.sp + 25); return "Energy Recharged +25"; } },
                "scrap": { name: "Scrap Tech", type: "junk", val: 10, cost: 0 },
                "data_chip": { name: "Encrypted Data", type: "junk", val: 100, cost: 0 },
                "drive": { name: "Kurogane Drive", type: "quest", val: 0, cost: 0 },

                "knife": { name: "Mono-Knife", type: "weapon", slot: "weapon", dmg: 5, cost: 100 },
                "katana": { name: "Ronin Katana", type: "weapon", slot: "weapon", dmg: 18, cost: 1500 },
                "pistol": { name: "Type-14 Pistol", type: "weapon", slot: "weapon", dmg: 12, cost: 350 },
                "deck_v1": { name: "Script-Kiddie v1", type: "deck", slot: "deck", pwr: 1, cost: 150 },
                "vest": { name: "Ballistic Vest", type: "armor", slot: "armor", def: 3, cost: 200 }
            },
            enemies: {
                "rat": { name: "Cyber-Rat", hp: 20, maxHp: 20, dmg: 4, xp: 10, cr: 5, visual: "rat" },
                "thug": { name: "Street Thug", hp: 45, maxHp: 45, dmg: 8, xp: 25, cr: 15, visual: "punk" },
                "drone": { name: "Sec-Drone", hp: 30, maxHp: 30, dmg: 12, xp: 30, cr: 20, visual: "drone" },
                "guard": { name: "Arasaka Guard", hp: 80, maxHp: 80, dmg: 15, xp: 80, cr: 100, visual: "soldier" },
                "juggernaut": { name: "The Juggernaut", hp: 200, maxHp: 200, dmg: 25, xp: 1000, cr: 500, visual: "mech" }
            },
            locations: {
                "slums": { name: "Sector 7 Slums", danger: 1, desc: "Rain-slicked alleyways.", visual: "city_rain" },
                "market": { name: "Neon Market", danger: 0, desc: "Crowded stalls and noise.", visual: "market" },
                "corpo": { name: "Arasaka Plaza", danger: 3, desc: "Clean, cold, and deadly.", visual: "plaza" },
                "net": { name: "The Deep Net", danger: 2, desc: "A void of data.", visual: "net" },
                "safehouse": { name: "The Bunker", danger: 0, desc: "Your secure base of operations.", visual: "bunker" },
                "london": { name: "Old Town London", danger: 2, desc: "Simulated steampunk reality.", visual: "gears" },
                "metro": { name: "Metro Station", danger: 1, desc: "Transit hub.", visual: "train" }
            }
        };

        // --- VISUAL ENGINE ---
        this.visuals = {
            get: (type) => {
                const base = "w-full h-full relative flex items-center justify-center overflow-hidden";
                switch(type) {
                    case 'city_rain':
                        return `<div class="${base} bg-gray-900"><div class="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black to-transparent z-10"></div><div class="flex items-end justify-center gap-1 opacity-50 h-full w-full"><div class="w-10 h-32 bg-green-900"></div><div class="w-14 h-48 bg-green-800"></div><div class="w-20 h-56 bg-green-900 z-0"></div></div><div class="rain absolute inset-0 z-20 pointer-events-none opacity-50">${'<i></i>'.repeat(20)}</div></div>`;
                    case 'market':
                         return `<div class="${base} bg-black"><div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-black to-black"></div><div class="text-yellow-400 font-bold text-4xl animate-pulse tracking-widest border-2 border-yellow-500 p-4 rounded glow">OPEN</div></div>`;
                    case 'net':
                        return `<div class="${base} bg-black"><div class="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(500px)_rotateX(60deg)] origin-bottom animate-[pulse_4s_infinite]"></div><div class="text-neon-pink font-mono text-6xl font-bold z-10">DATA_VOID</div></div>`;
                    case 'bunker':
                        return `<div class="${base} bg-gray-900"><div class="border-4 border-gray-700 w-3/4 h-3/4 flex items-center justify-center bg-black"><div class="text-green-500 font-mono text-xs">SAFEHOUSE<br>SECURE</div></div></div>`;
                    case 'gears':
                        return `<div class="${base} bg-[#1a1005]"><div class="w-32 h-32 border-4 border-[#8b5a2b] rounded-full flex items-center justify-center animate-spin"><div class="w-4 h-full bg-[#8b5a2b]"></div><div class="h-4 w-full bg-[#8b5a2b]"></div></div><div class="absolute top-10 right-20 w-16 h-16 border-4 border-[#cd7f32] rounded-full animate-spin direction-reverse"></div></div>`;
                    case 'combat':
                        return `<div class="${base} bg-red-900/10"><div class="w-full h-px bg-red-500 absolute top-1/2 animate-ping"></div><div class="w-px h-full bg-red-500 absolute left-1/2 animate-ping"></div><div class="border-2 border-red-500 w-32 h-32 absolute animate-spin"></div></div>`;
                    case 'mech':
                         return `<div class="${base}"><div class="w-40 h-56 bg-gray-800 border-4 border-yellow-600 relative flex flex-col items-center shadow-2xl"><div class="w-full h-10 bg-black flex items-center justify-center gap-4"><div class="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div></div><div class="mt-4 w-24 h-24 border-2 border-yellow-500 grid grid-cols-2 gap-1 p-1"><div class="bg-gray-600"></div><div class="bg-gray-600"></div><div class="bg-gray-600"></div><div class="bg-gray-600"></div></div></div></div>`;
                    default:
                        return `<div class="${base} text-neon-green text-xs font-mono"><pre>[ NO_SIGNAL ]</pre></div>`;
                }
            }
        };

        // --- STATE ---
        this.state = {
            player: {
                hp: 100, maxHp: 100,
                sp: 50, maxSp: 50,
                xp: 0, level: 1,
                credits: 100,
                stats: { str: 1, agi: 1, tec: 1, pts: 0 },
                location: 'slums',
                inventory: [],
                equipment: { weapon: null, armor: null, implant: null, deck: null },
                party: [],
                quests: [],
                flags: { introDone: false, metKenji: false }
            },
            currentNode: null
        };

        // --- ENGINE ---
        this.engine = {
            init: () => {
                const saved = localStorage.getItem('exiled_spark_v31');
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        Object.assign(self.state.player, parsed.player);
                        self.engine.goto(parsed.currentNode || 'hub');
                    } catch(e) { self.engine.goto('boot'); }
                } else {
                    self.engine.goto('boot');
                }
                self.ui.update();
                self.procedural.generateContracts();
            },

            save: () => {
                localStorage.setItem('exiled_spark_v31', JSON.stringify({
                    player: self.state.player,
                    currentNode: self.state.currentNode
                }));
                self.engine.log("GAME SAVED.", "text-blue-400");
            },

            hardReset: () => {
                if(confirm("Wipe all progress?")) {
                    localStorage.removeItem('exiled_spark_v31');
                    self.state.player = {
                        hp: 100, maxHp: 100, sp: 50, maxSp: 50, xp: 0, level: 1, credits: 100,
                        stats: { str: 1, agi: 1, tec: 1, pts: 0 }, location: 'slums', inventory: [],
                        equipment: { weapon: null, armor: null, implant: null, deck: null },
                        party: [], quests: [], flags: { introDone: false, metKenji: false }
                    };
                    self.engine.init();
                }
            },

            goto: (nodeId) => {
                self.state.currentNode = nodeId;
                const node = self.nodes[nodeId];
                if (!node) return;

                const locData = self.db.locations[self.state.player.location];
                self.container.querySelector('#scene-display').innerHTML = self.visuals.get(node.visual || (locData ? locData.visual : 'default'));
                self.container.querySelector('#ui-location').innerText = `LOC: ${nodeId.toUpperCase()}`;

                let text = typeof node.text === 'function' ? node.text() : node.text;
                self.engine.log(text);

                const container = self.container.querySelector('#action-container');
                container.innerHTML = '';

                if (node.options) {
                    node.options.forEach(opt => {
                        if (opt.req && !opt.req(self.state.player)) return;

                        const btn = document.createElement('button');
                        btn.className = "btn-interact w-full p-3 font-mono text-sm text-neon-green hover:text-white";
                        btn.innerHTML = `<span class="mr-2">></span> ${opt.text}`;
                        btn.onclick = () => {
                            if (opt.cost && self.state.player.credits < opt.cost) {
                                self.engine.log("Insufficient Funds.", "text-red-500");
                                return;
                            }
                            if (opt.cost) self.game.modCredits(-opt.cost);
                            if (opt.action) opt.action();
                            if (opt.next) self.engine.goto(opt.next);
                            self.engine.save();
                        };
                        container.appendChild(btn);
                    });
                }
            },

            log: (msg, color = "text-gray-300") => {
                const log = self.container.querySelector('#game-log');
                const div = document.createElement('div');
                div.className = `typewriter border-b border-gray-800 pb-2 ${color}`;
                div.innerHTML = `<p>${msg}</p>`;
                log.appendChild(div);
                log.scrollTop = log.scrollHeight;
                while (log.children.length > 30) log.removeChild(log.firstChild);
            }
        };

        // --- GAME LOGIC ---
        this.game = {
            modHp: (amt) => {
                const p = self.state.player;
                p.hp = Math.max(0, Math.min(p.maxHp, p.hp + amt));
                self.ui.update();
                if (amt < 0) self.container.querySelector('.exiled-game').classList.add('shake');
                setTimeout(()=>self.container.querySelector('.exiled-game').classList.remove('shake'), 500);
                if (p.hp <= 0) self.engine.goto('death');
            },
            modSp: (amt) => {
                self.state.player.sp = Math.max(0, Math.min(self.state.player.maxSp, self.state.player.sp + amt));
                self.ui.update();
            },
            modCredits: (amt) => {
                self.state.player.credits += amt;
                self.engine.log(amt > 0 ? `Credits: +${amt}` : `Credits: ${amt}`, amt > 0 ? "text-yellow-400" : "text-red-400");
                self.ui.update();
            },
            modXp: (amt) => {
                self.state.player.xp += amt;
                if (self.state.player.xp >= self.state.player.level * 100) {
                    self.state.player.xp -= self.state.player.level * 100;
                    self.state.player.level++;
                    self.state.player.stats.pts++;
                    self.state.player.maxHp += 10;
                    self.state.player.hp = self.state.player.maxHp;
                    self.engine.log(`LEVEL UP! Now Level ${self.state.player.level}`, "text-neon-pink font-bold");
                }
                self.ui.update();
            },
            addItem: (id) => {
                self.state.player.inventory.push(id);
                self.engine.log(`Acquired: ${self.db.items[id].name}`, "text-green-400");
                self.ui.update();
            },
            equip: (itemId) => {
                const item = self.db.items[itemId];
                if (!item.slot) return;
                const old = self.state.player.equipment[item.slot];
                if (old) self.state.player.inventory.push(old);
                const idx = self.state.player.inventory.indexOf(itemId);
                if(idx > -1) self.state.player.inventory.splice(idx, 1);
                self.state.player.equipment[item.slot] = itemId;
                self.engine.log(`Equipped: ${item.name}`);
                self.ui.update();
            },
            unequip: (slot) => {
                const item = self.state.player.equipment[slot];
                if (item) {
                    self.state.player.equipment[slot] = null;
                    self.state.player.inventory.push(item);
                    self.engine.log(`Unequipped: ${self.db.items[item].name}`);
                    self.ui.update();
                }
            },
            levelUp: (stat) => {
                if (self.state.player.stats.pts > 0) {
                    self.state.player.stats[stat]++;
                    self.state.player.stats.pts--;
                    self.ui.update();
                }
            },
            travel: (locId) => {
                self.state.player.location = locId;
                self.engine.log(`Traveling to ${self.db.locations[locId].name}...`);
                if (Math.random() < (self.db.locations[locId].danger * 0.25)) {
                    self.combat.start(self.procedural.randomEnemy(locId));
                } else {
                    if (locId === 'safehouse') self.engine.goto('safehouse_hub');
                    else self.engine.goto('hub');
                }
            },
            addParty: (name) => {
                if (!self.state.player.party.includes(name)) {
                    self.state.player.party.push(name);
                    self.engine.log(`${name} joined the party!`, "text-neon-blue font-bold");
                    self.ui.update();
                }
            },
            consume: (id) => {
                const item = self.db.items[id];
                self.engine.log(item.effect(self.state.player), "text-neon-yellow");
                const idx = self.state.player.inventory.indexOf(id);
                self.state.player.inventory.splice(idx, 1);
                self.ui.update();
            }
        };

        // --- COMBAT ---
        this.combat = {
            enemy: null,
            turn: 0,
            start: (enemyObj) => {
                self.combat.enemy = JSON.parse(JSON.stringify(enemyObj));
                self.combat.turn = 1;
                self.container.querySelector('#scene-display').innerHTML = self.visuals.get(enemyObj.visual);
                self.engine.log(`WARNING: Hostile Detected - ${self.combat.enemy.name}`, "text-red-500 font-bold");
                self.state.currentNode = 'combat';
                self.combat.renderMenu();
            },
            renderMenu: () => {
                const container = self.container.querySelector('#action-container');
                container.innerHTML = '';
                const addBtn = (txt, fn, color="text-white") => {
                    const btn = document.createElement('button');
                    btn.className = `btn-interact p-3 w-full border border-gray-700 hover:bg-red-900/20 ${color}`;
                    btn.innerHTML = txt;
                    btn.onclick = fn;
                    container.appendChild(btn);
                };

                self.engine.log(`TURN ${self.combat.turn} | Enemy: ${self.combat.enemy.hp}/${self.combat.enemy.maxHp}`, "text-gray-500");

                const wep = self.state.player.equipment.weapon ? self.db.items[self.state.player.equipment.weapon] : { name: "Fists", dmg: 2 };
                const dmg = Math.floor(wep.dmg + (self.state.player.stats.str * 1.5));
                addBtn(`Attack (${wep.name})`, () => self.combat.playerAct('attack', dmg), "text-red-400");

                if (self.state.player.sp >= 10) {
                    const sparkDmg = 20 + (self.state.player.stats.tec * 5);
                    addBtn(`Spark Blast (10 SP)`, () => self.combat.playerAct('spark', sparkDmg), "text-yellow-400");
                }

                if (self.state.player.party.includes('The Ronin')) addBtn(`Ronin: Slash`, () => self.combat.playerAct('ronin', 15), "text-neon-blue");
                if (self.state.player.party.includes('Hana')) addBtn(`Hana: Repair`, () => self.combat.playerAct('hana', 15), "text-neon-pink");
                if (self.state.player.inventory.includes('med_stim')) addBtn(`Use Med-Stim`, () => self.combat.playerAct('heal'));

                addBtn(`Flee`, () => {
                    if (Math.random() + (self.state.player.stats.agi * 0.1) > 0.5) {
                        self.engine.log("Escaped!");
                        self.engine.goto('hub');
                    } else {
                        self.engine.log("Escape Failed!", "text-red-500");
                        self.combat.enemyAct();
                    }
                });
            },
            playerAct: (type, val) => {
                if (type === 'attack') {
                    self.combat.enemy.hp -= val;
                    self.engine.log(`Hit for ${val} dmg!`, "text-neon-green");
                } else if (type === 'spark') {
                    self.game.modSp(-10);
                    self.combat.enemy.hp -= val;
                    self.engine.log(`Spark surge: ${val} dmg!`, "text-yellow-300");
                } else if (type === 'ronin') {
                    self.combat.enemy.hp -= val;
                    self.engine.log(`Ronin strikes: ${val} dmg!`, "text-neon-blue");
                } else if (type === 'hana') {
                    self.game.modHp(val);
                    self.engine.log(`Hana repairs: +${val} HP.`, "text-neon-pink");
                } else if (type === 'heal') {
                    const idx = self.state.player.inventory.indexOf('med_stim');
                    self.state.player.inventory.splice(idx, 1);
                    self.game.modHp(30);
                    self.engine.log("Used Med-Stim.");
                }

                if (self.combat.enemy.hp <= 0) self.combat.win();
                else setTimeout(self.combat.enemyAct, 800);
            },
            enemyAct: () => {
                const dodgeChance = self.state.player.stats.agi * 0.05;
                if (Math.random() > dodgeChance) {
                    const armId = self.state.player.equipment.armor;
                    const armor = armId ? self.db.items[armId].def : 0;
                    const dmg = Math.max(1, self.combat.enemy.dmg - armor);
                    self.engine.log(`${self.combat.enemy.name} hits you: ${dmg} dmg!`, "text-red-500");
                    self.game.modHp(-dmg);
                } else {
                    self.engine.log("You dodged the attack!", "text-blue-300");
                }
                self.combat.turn++;
                if (self.state.player.hp > 0) self.combat.renderMenu();
            },
            win: () => {
                self.engine.log(`TARGET ELIMINATED.`, "text-neon-green font-bold");
                self.game.modXp(self.combat.enemy.xp);
                self.game.modCredits(self.combat.enemy.cr);
                setTimeout(() => {
                    if (self.combat.enemy.name === "The Juggernaut") self.engine.goto('mission_victory');
                    else self.engine.goto('hub');
                }, 1500);
            }
        };

        // --- HACKING ---
        this.hacking = {
            start: (difficulty, onSuccess) => {
                const modal = self.container.querySelector('#modal-overlay');
                self.container.querySelector('#modal-title').innerText = "BREACH PROTOCOL";
                modal.classList.remove('hidden');

                const hex = ['1C', '55', 'BD', 'E9', '7A'];
                let target = [];
                for(let i=0; i<difficulty+2; i++) target.push(hex[Math.floor(Math.random()*hex.length)]);
                let buffer = [];

                const render = () => {
                    const content = self.container.querySelector('#modal-content');
                    content.innerHTML = `
                        <div class="text-center mb-4">
                            <div class="text-xs text-gray-500">REQUIRED SEQUENCE</div>
                            <div class="font-mono text-lg text-neon-blue tracking-widest border border-neon-blue p-2 bg-black">${target.join(' ')}</div>
                        </div>
                        <div class="text-center mb-4">
                            <div class="text-xs text-gray-500">BUFFER</div>
                            <div class="font-mono h-6 text-white">${buffer.join(' ')}</div>
                        </div>
                        <div class="grid grid-cols-4 gap-2 w-64 mx-auto" id="hacking-grid"></div>
                        <button id="hacking-abort" class="mt-4 text-red-500 text-xs border border-red-900 px-4 py-1">ABORT</button>
                    `;

                    const grid = content.querySelector('#hacking-grid');
                    for(let i=0; i<16; i++) {
                         const val = hex[Math.floor(Math.random()*hex.length)];
                         const btn = document.createElement('button');
                         btn.className = "border border-green-800 hover:bg-green-900 text-neon-green text-xs p-2 font-mono";
                         btn.innerText = val;
                         btn.onclick = () => input(val);
                         grid.appendChild(btn);
                    }
                    content.querySelector('#hacking-abort').onclick = () => modal.classList.add('hidden');
                };

                const input = (val) => {
                    buffer.push(val);
                    const tStr = target.join('');
                    const bStr = buffer.join('');

                    if(bStr.includes(tStr)) {
                        modal.classList.add('hidden');
                        self.engine.log("SYSTEM BREACHED.", "text-neon-blue");
                        if(self.state.player.party.includes('Aiko')) self.game.modCredits(50);
                        if (onSuccess && self.nodes[onSuccess]) self.engine.goto(onSuccess);
                        else self.game.modCredits(100 * difficulty);
                    } else if (buffer.length > target.length + 2) {
                        modal.classList.add('hidden');
                        self.engine.log("BREACH FAILED. ALARM TRIGGERED.", "text-neon-red");
                        self.game.modHp(-10);
                    } else {
                        render();
                    }
                };
                render();
            }
        };

        // --- PROCEDURAL ---
        this.procedural = {
            contracts: [],
            generateContracts: () => {
                self.procedural.contracts = [];
                const types = ['Courier', 'Hunt', 'Hack'];
                for(let i=0; i<3; i++) {
                    const type = types[Math.floor(Math.random()*types.length)];
                    let quest = { id: Math.random().toString(36), type: type.toLowerCase(), reward: 100 + (self.state.player.level*50), complete: false };
                    if (type === 'Hunt') { quest.desc = `Eliminate 3 enemies in Slums`; quest.target = 3; quest.progress = 0; }
                    else if (type === 'Courier') { quest.desc = `Deliver package to Market`; }
                    else { quest.desc = `Hack Corp Terminal`; }
                    self.procedural.contracts.push(quest);
                }
            },
            randomEnemy: (loc) => {
                const danger = self.db.locations[loc].danger;
                if (danger >= 4) return self.db.enemies.juggernaut;
                if (danger >= 3) return self.db.enemies.guard;
                if (danger >= 2) return self.db.enemies.drone;
                return self.db.enemies.thug;
            }
        };

        // --- UI ---
        this.ui = {
            tab: (id) => {
                self.container.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('text-black', 'bg-neon-green');
                    b.classList.add('text-neon-green');
                });
                self.container.querySelector(`.tab-btn[data-tab="${id}"]`).classList.add('text-black', 'bg-neon-green');
                self.container.querySelector(`.tab-btn[data-tab="${id}"]`).classList.remove('text-neon-green');

                ['inv', 'map', 'quest', 'sys'].forEach(t => self.container.querySelector(`#tab-${t}`).classList.add('hidden'));
                self.container.querySelector(`#tab-${id}`).classList.remove('hidden');

                if (id === 'map') self.ui.renderMap();
            },
            update: () => {
                const p = self.state.player;
                self.container.querySelector('#val-hp').innerText = `${Math.floor(p.hp)}/${p.maxHp}`;
                self.container.querySelector('#bar-hp').style.width = `${(p.hp/p.maxHp)*100}%`;
                self.container.querySelector('#val-sp').innerText = `${Math.floor(p.sp)}/${p.maxSp}`;
                self.container.querySelector('#bar-sp').style.width = `${(p.sp/p.maxSp)*100}%`;
                self.container.querySelector('#val-cr').innerText = p.credits;
                self.container.querySelector('#val-xp').innerText = p.xp;
                self.container.querySelector('#val-lvl').innerText = p.level;

                self.container.querySelector('#stat-str').innerText = p.stats.str;
                self.container.querySelector('#stat-agi').innerText = p.stats.agi;
                self.container.querySelector('#stat-tec').innerText = p.stats.tec;
                self.container.querySelector('#stat-pts').innerText = p.stats.pts;

                if (p.stats.pts > 0) self.container.querySelector('#lvl-btns').classList.remove('hidden');
                else self.container.querySelector('#lvl-btns').classList.add('hidden');

                self.container.querySelector('#slot-wep').innerHTML = `WEAPON:<br><span class="text-neon-green">${p.equipment.weapon ? self.db.items[p.equipment.weapon].name : 'Fists'}</span>`;
                self.container.querySelector('#slot-arm').innerHTML = `ARMOR:<br><span class="text-neon-green">${p.equipment.armor ? self.db.items[p.equipment.armor].name : 'None'}</span>`;

                const invList = self.container.querySelector('#inv-list');
                invList.innerHTML = '';
                const counts = {};
                p.inventory.forEach(i => counts[i] = (counts[i] || 0) + 1);
                for (let [id, count] of Object.entries(counts)) {
                    const item = self.db.items[id] || {name:id};
                    const div = document.createElement('div');
                    div.className = "flex justify-between items-center border border-gray-800 p-1 bg-gray-900";
                    let actions = '';
                    if (item.type === 'use') {
                         const btn = document.createElement('button');
                         btn.className = "text-xs text-neon-green px-1 border border-neon-green ml-1";
                         btn.innerText = "USE";
                         btn.onclick = () => self.game.consume(id);
                         actions = btn;
                    }
                    if (['weapon','armor','deck'].includes(item.type)) {
                         const btn = document.createElement('button');
                         btn.className = "text-xs text-neon-blue px-1 border border-neon-blue ml-1";
                         btn.innerText = "EQP";
                         btn.onclick = () => self.game.equip(id);
                         actions = btn;
                    }
                    div.innerHTML = `<span>${item.name} x${count}</span>`;
                    const divAct = document.createElement('div');
                    if(typeof actions !== 'string') divAct.appendChild(actions);
                    div.appendChild(divAct);
                    invList.appendChild(div);
                }

                const partyEl = self.container.querySelector('#party-list');
                partyEl.innerHTML = p.party.length
                    ? p.party.map(n => `<span class="bg-blue-900/30 text-neon-blue px-2 py-1 border border-blue-800">${n}</span>`).join('')
                    : '<span class="text-gray-500 italic">No companions synced.</span>';

                const list = self.container.querySelector('#contract-list');
                list.innerHTML = '';
                self.procedural.contracts.forEach(q => {
                    const div = document.createElement('div');
                    div.className = "p-2 border border-green-900 bg-black text-xs flex justify-between";
                    if (q.complete) div.innerHTML = `<span class="text-gray-500 line-through">${q.desc}</span> <button class="text-neon-yellow animate-pulse">CLAIM ${q.reward}cr</button>`; // Needs click handler
                    else {
                        const active = self.state.player.quests.find(x => x.id === q.id);
                        if (active) div.innerHTML = `<span class="text-neon-blue">${q.desc} (${active.progress||0}/${active.target||1})</span> <span class="text-gray-500">ACTIVE</span>`;
                        else {
                            const btn = document.createElement('button');
                            btn.className = "text-neon-green hover:underline";
                            btn.innerText = "ACCEPT";
                            btn.onclick = () => self.ui.acceptContract(q.id);
                            const sp = document.createElement('span');
                            sp.innerText = q.desc;
                            div.appendChild(sp);
                            div.appendChild(btn);
                        }
                    }
                    if(q.complete) {
                        const btn = div.querySelector('button');
                        btn.onclick = () => self.ui.claimReward(q.id);
                    }
                    list.appendChild(div);
                });
            },
            renderMap: () => {
                const grid = self.container.querySelector('#map-container');
                grid.innerHTML = '';
                const worldMap = [
                    'safehouse', 'slums', 'market', 'metro',
                    'london', 'slums', 'net', 'corpo',
                    'wastes', 'wastes', 'net', 'corpo',
                    'wastes', 'wastes', 'wastes', 'wastes'
                ];
                worldMap.forEach((loc, idx) => {
                    const div = document.createElement('div');
                    const isCurrent = (self.state.player.location === loc);
                    const isUnlocked = loc !== 'london' || self.state.player.party.includes('Hana');

                    div.className = `map-node ${isCurrent ? 'active' : ''} ${!isUnlocked ? 'opacity-30' : ''}`;
                    div.innerHTML = loc.substring(0,2).toUpperCase();
                    if (loc === self.state.player.location) div.innerHTML = 'YOU';

                    div.onmouseenter = () => self.container.querySelector('#map-danger').innerText = `Danger: ${self.db.locations[loc] ? self.db.locations[loc].danger : '?'} /5`;
                    div.onclick = () => { if(isUnlocked && !['combat'].includes(self.state.currentNode) && self.db.locations[loc]) self.game.travel(loc); };
                    grid.appendChild(div);
                });
            },
            acceptContract: (id) => {
                const q = self.procedural.contracts.find(x => x.id === id);
                if (q) { self.state.player.quests.push(q); self.engine.log(`Contract Accepted.`); self.ui.update(); }
            },
            claimReward: (id) => {
                const qIdx = self.state.player.quests.findIndex(x => x.id === id);
                const pIdx = self.procedural.contracts.findIndex(x => x.id === id);
                if (qIdx > -1) {
                    self.game.modCredits(self.state.player.quests[qIdx].reward);
                    self.state.player.quests.splice(qIdx, 1);
                    self.procedural.contracts.splice(pIdx, 1);
                    self.engine.log("Contract Complete.");
                    self.ui.update();
                }
            }
        };

        // --- NODES ---
        this.nodes = {
            'boot': {
                text: "SYSTEM BOOT... MEMORY FRAGMENTS LOADED.<br>WELCOME BACK, SPARK.",
                visual: "net",
                options: [{ text: "INITIALIZE", next: 'intro' }]
            },
            'intro': {
                text: "You wake in a dumpster in Sector 7 Slums. Rain falls. You have a knife, a glitched memory, and the Spark.",
                visual: "city_rain",
                options: [{ text: "Check Pockets", action: () => { self.game.addItem('knife'); self.game.equip('knife'); }, next: 'hub' }]
            },
            'hub': {
                text: () => {
                    const loc = self.db.locations[self.state.player.location];
                    return `<strong>${loc.name}</strong><br>${loc.desc}<br><br>What will you do?`;
                },
                options: [
                    { text: "Visit Shop", next: 'shop' },
                    { text: "Patrol (Combat)", action: () => self.combat.start(self.procedural.randomEnemy(self.state.player.location)) },
                    { text: "Hack Terminal", action: () => self.hacking.start(3) },
                    { text: "Check Metro", next: 'metro_station' },
                    { text: "Visit Rusty Cog (Kenji)", next: 'bar', req: (s) => !s.flags.metKenji && s.location === 'slums' }
                ]
            },
            'safehouse_hub': {
                text: "<strong>THE BUNKER</strong><br>Your base of operations. The party gathers here.",
                visual: "bunker",
                options: [
                    { text: "Rest (Full Heal)", action: () => { self.game.modHp(999); self.engine.log("Systems Restored."); } },
                    { text: "Simulation: Bitcoin City (Recruit Aiko)", next: 'sim_bitcoin', req: (s) => !s.party.includes('Aiko') },
                    { text: "Simulation: London (Recruit Hana)", next: 'sim_london', req: (s) => !s.party.includes('Hana') },
                    { text: "Exit to Slums", action: () => self.game.travel('slums') }
                ]
            },
            'shop': {
                text: "A vendor grunts at you.",
                visual: "market",
                options: [
                    { text: "Buy Med-Stim (50cr)", cost: 50, action: () => self.game.addItem('med_stim') },
                    { text: "Buy Spark Cell (80cr)", cost: 80, action: () => self.game.addItem('spark_cell') },
                    { text: "Buy Vest (200cr)", cost: 200, action: () => self.game.addItem('vest') },
                    { text: "Leave", next: 'hub' }
                ]
            },
            'bar': {
                text: "Kenji slides a chip over. 'Arasaka Warehouse 42. Get the drive.'",
                visual: "city_rain",
                options: [
                    { text: "Accept Mission", action: () => { self.state.player.flags.metKenji = true; self.procedural.contracts.push({id:'main', desc:'Raid Warehouse 42', type:'raid', reward:500}); self.ui.update(); }, next: 'hub' }
                ]
            },
            'sim_bitcoin': {
                text: "<strong>SIMULATION: BITCOIN CITY</strong><br>A realm of pure data. You find Aiko fighting code-wraiths.",
                visual: "net",
                options: [
                    { text: "Help Aiko", action: () => { self.game.addParty('Aiko'); self.engine.log("Aiko joined the party."); }, next: 'safehouse_hub' }
                ]
            },
            'sim_london': {
                text: "<strong>SIMULATION: LONDON</strong><br>Gears grind. You find Hana, the Geisha droid, lost in time.",
                visual: "gears",
                options: [
                    { text: "Repair Hana", action: () => { self.game.addParty('Hana'); self.engine.log("Hana joined the party."); }, next: 'safehouse_hub' }
                ]
            },
            'metro_station': {
                text: "Mag-lev trains hum.",
                visual: "city_rain",
                options: [
                    { text: "Warehouse 42 (Mission)", next: 'warehouse_entry', req: (s) => s.flags.metKenji },
                    { text: "Back to Hub", next: 'hub' }
                ]
            },
            'warehouse_entry': {
                text: "Warehouse 42. Two guards.",
                visual: "plaza",
                options: [
                    { text: "Attack", action: () => self.combat.start(self.db.enemies.guard) },
                    { text: "Hack Gate", action: () => self.hacking.start(4, 'warehouse_boss') }
                ]
            },
            'warehouse_boss': {
                text: "Inside, <strong>THE JUGGERNAUT</strong> awaits.",
                visual: "mech",
                options: [{ text: "FIGHT", action: () => self.combat.start(self.db.enemies.juggernaut) }]
            },
            'mission_victory': {
                text: "The Juggernaut falls. <strong>The Ronin</strong> steps from the shadows. 'Impressive.'",
                visual: "bunker",
                options: [{ text: "Go with Ronin", action: () => { self.game.addParty('The Ronin'); self.game.travel('safehouse'); } }]
            },
            'death': {
                text: "<span class='text-red-600 font-bold'>CRITICAL FAILURE</span>",
                visual: "combat",
                options: [{ text: "REBOOT", action: () => self.engine.init() }]
            }
        };
    }

    shutdown() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
