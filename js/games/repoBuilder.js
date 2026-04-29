import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class RepoBuilder {
    constructor() {
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.container = null;
        this.isActive = false;

        // Game State
        this.linesOfCode = 0;
        this.agents = 0;
        this.serverCapacity = 1;
        this.lastUpdate = 0;
        this.agentCost = 100;
        this.serverCost = 500;

        // Load existing save
        const saved = this.saveSystem.getGameConfig('repoBuilder');
        if (saved) {
            this.linesOfCode = saved.linesOfCode || 0;
            this.agents = saved.agents || 0;
            this.serverCapacity = saved.serverCapacity || 1;
        }

        this.updateUI = this.updateUI.bind(this);
    }

    async init(container) {
        this.container = container;
        this.isActive = true;
        this.lastUpdate = performance.now();
        this.render();
        this.bindEvents();
        this.gameLoop = requestAnimationFrame((t) => this.update(t));
    }

    render() {
        this.container.innerHTML = `
            <div class="flex flex-col h-full bg-slate-900 text-green-400 font-mono overflow-hidden relative p-4">
                <div class="border-b border-green-500/50 pb-4 mb-4 flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold"><i class="fa-solid fa-server mr-2"></i>REPO BUILDER v1.0</h1>
                        <p class="text-xs text-slate-400">Scale the repository. Deploy AI agents.</p>
                    </div>
                    <div class="text-right">
                        <div class="text-4xl font-bold" id="rb-loc">${Math.floor(this.linesOfCode)}</div>
                        <div class="text-xs text-slate-400">Lines of Code (LOC)</div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 flex-1">
                    <!-- Stats Panel -->
                    <div class="bg-slate-800 border border-slate-700 p-4 rounded flex flex-col gap-4">
                        <h2 class="text-xl font-bold text-white border-b border-slate-600 pb-2">INFRASTRUCTURE</h2>

                        <div class="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-700">
                            <div>
                                <div class="text-white font-bold"><i class="fa-solid fa-robot mr-2 text-blue-400"></i>AI Agents</div>
                                <div class="text-xs text-slate-400">Generates 1 LOC/sec</div>
                            </div>
                            <div class="text-2xl font-bold" id="rb-agents">${this.agents}</div>
                        </div>

                        <div class="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-700">
                            <div>
                                <div class="text-white font-bold"><i class="fa-solid fa-microchip mr-2 text-fuchsia-400"></i>Server Capacity</div>
                                <div class="text-xs text-slate-400">Multiplies generation x${this.serverCapacity}</div>
                            </div>
                            <div class="text-2xl font-bold" id="rb-servers">${this.serverCapacity}</div>
                        </div>
                    </div>

                    <!-- Actions Panel -->
                    <div class="flex flex-col gap-4">
                        <button id="rb-btn-code" class="flex-1 bg-green-900/50 hover:bg-green-800 border border-green-500 rounded p-4 transition-colors flex flex-col items-center justify-center">
                            <i class="fa-solid fa-keyboard text-4xl mb-2 text-green-400"></i>
                            <span class="font-bold text-lg">WRITE CODE</span>
                            <span class="text-xs text-green-300">+1 LOC</span>
                        </button>

                        <button id="rb-btn-agent" class="bg-blue-900/50 hover:bg-blue-800 border border-blue-500 rounded p-4 transition-colors flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed">
                            <div>
                                <div class="font-bold text-white">Deploy Agent</div>
                                <div class="text-xs text-blue-300" id="rb-agent-cost">Cost: ${this.agentCost} LOC</div>
                            </div>
                            <i class="fa-solid fa-plus text-blue-400"></i>
                        </button>

                        <button id="rb-btn-server" class="bg-fuchsia-900/50 hover:bg-fuchsia-800 border border-fuchsia-500 rounded p-4 transition-colors flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed">
                            <div>
                                <div class="font-bold text-white">Upgrade Server</div>
                                <div class="text-xs text-fuchsia-300" id="rb-server-cost">Cost: ${this.serverCost} LOC</div>
                            </div>
                            <i class="fa-solid fa-arrow-up text-fuchsia-400"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Cache elements
        this.elLoc = this.container.querySelector('#rb-loc');
        this.elAgents = this.container.querySelector('#rb-agents');
        this.elServers = this.container.querySelector('#rb-servers');
        this.btnAgent = this.container.querySelector('#rb-btn-agent');
        this.btnServer = this.container.querySelector('#rb-btn-server');
        this.elAgentCost = this.container.querySelector('#rb-agent-cost');
        this.elServerCost = this.container.querySelector('#rb-server-cost');
    }

    bindEvents() {
        const btnCode = this.container.querySelector('#rb-btn-code');

        btnCode.onclick = () => {
            this.linesOfCode += 1 * this.serverCapacity;
            this.soundManager.playSound('click');
            this.updateUI();
        };

        this.btnAgent.onclick = () => {
            if (this.linesOfCode >= this.agentCost) {
                this.linesOfCode -= this.agentCost;
                this.agents++;
                this.agentCost = Math.floor(100 * Math.pow(1.15, this.agents));
                this.soundManager.playSound('powerup');
                this.save();
                this.updateUI();
            }
        };

        this.btnServer.onclick = () => {
            if (this.linesOfCode >= this.serverCost) {
                this.linesOfCode -= this.serverCost;
                this.serverCapacity++;
                this.serverCost = Math.floor(500 * Math.pow(1.5, this.serverCapacity - 1));
                this.soundManager.playSound('levelUp');
                this.save();
                this.updateUI();
            }
        };
    }

    update(timestamp) {
        if (!this.isActive) return;

        const dt = (timestamp - this.lastUpdate) / 1000;
        this.lastUpdate = timestamp;

        if (this.agents > 0) {
            this.linesOfCode += (this.agents * this.serverCapacity) * dt;
            this.updateUI();
        }

        // Auto save every 10 seconds (approx)
        if (Math.random() < 0.01) {
            this.save();
        }

        this.gameLoop = requestAnimationFrame((t) => this.update(t));
    }

    updateUI() {
        if (!this.isActive) return;

        this.elLoc.textContent = Math.floor(this.linesOfCode);
        this.elAgents.textContent = this.agents;
        this.elServers.textContent = this.serverCapacity;

        this.elAgentCost.textContent = `Cost: ${this.agentCost} LOC`;
        this.elServerCost.textContent = `Cost: ${this.serverCost} LOC`;

        this.btnAgent.disabled = this.linesOfCode < this.agentCost;
        this.btnServer.disabled = this.linesOfCode < this.serverCost;
    }

    save() {
        this.saveSystem.saveGameConfig('repoBuilder', {
            linesOfCode: this.linesOfCode,
            agents: this.agents,
            serverCapacity: this.serverCapacity
        });
    }

    shutdown() {
        this.isActive = false;
        if (this.gameLoop) cancelAnimationFrame(this.gameLoop);
        this.save();
        this.container.innerHTML = '';

        // Clear references
        this.elLoc = null;
        this.elAgents = null;
        this.elServers = null;
        this.btnAgent = null;
        this.btnServer = null;
        this.elAgentCost = null;
        this.elServerCost = null;
    }
}