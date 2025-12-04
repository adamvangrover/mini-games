// Matterhorn Game Adapter
import Game from "./matterhorn/Game.js";

export default class MatterhornGame {
    constructor() {
        this.canvas = null;
        this.uiRoot = null;
    }

    async init(container) {
        if (typeof THREE === 'undefined') {
            container.innerHTML = `<div class="p-4 text-red-500">Error: Three.js is not loaded. Please check your internet connection or standard libraries.</div>`;
            return;
        }

        // Inject HTML if missing
        if (!container.querySelector('#matterhornCanvas')) {
            container.innerHTML = `
                <div id="matterhorn-wrapper" class="relative w-full h-full">
                    <canvas id="matterhornCanvas" class="w-full h-full block"></canvas>

                    <!-- UI Root -->
                    <div id="mh-ui-root" class="absolute inset-0 pointer-events-none">
                        <!-- Start Screen -->
                        <div id="mh-start-screen" class="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 pointer-events-auto">
                            <h1 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-white mb-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">MATTERHORN</h1>
                            <p class="text-blue-200 text-xl mb-8">Ascend the Peak. Discover the Secrets.</p>

                            <div class="space-y-4 mb-8 text-center text-slate-300">
                                <p><kbd class="bg-slate-700 px-2 py-1 rounded">W</kbd><kbd class="bg-slate-700 px-2 py-1 rounded">A</kbd><kbd class="bg-slate-700 px-2 py-1 rounded">S</kbd><kbd class="bg-slate-700 px-2 py-1 rounded">D</kbd> Move</p>
                                <p><kbd class="bg-slate-700 px-2 py-1 rounded">Mouse</kbd> Look</p>
                                <p><kbd class="bg-slate-700 px-2 py-1 rounded">E</kbd> Interact</p>
                                <p><kbd class="bg-slate-700 px-2 py-1 rounded">Shift</kbd> Run</p>
                            </div>

                            <button id="mh-start-btn" class="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-lg transition-transform hover:scale-105">
                                Begin Ascent
                            </button>
                            <button class="back-btn mt-4 px-4 py-2 bg-red-600/50 hover:bg-red-500 text-white rounded">Exit</button>
                        </div>

                        <!-- HUD (Hidden initially) -->
                        <div id="mh-hud-container" class="hidden absolute inset-0 pointer-events-none">
                            <div class="absolute top-4 left-4 text-white font-mono bg-black/50 p-2 rounded">
                                <div class="text-xs text-slate-400">ALTITUDE</div>
                                <div class="text-xl font-bold"><span id="mh-altitude">0</span>m</div>
                            </div>

                            <!-- Prompt -->
                            <div id="mh-prompt" class="absolute bottom-1/4 w-full text-center hidden">
                                <div class="inline-block bg-black/70 text-white px-4 py-2 rounded border border-white/20">
                                    <span id="mh-prompt-key" class="font-bold text-yellow-400">E</span> <span id="mh-prompt-text">Interact</span>
                                </div>
                            </div>

                            <!-- Notifications -->
                            <div id="mh-notifications" class="absolute top-4 right-4 flex flex-col gap-2 items-end"></div>
                        </div>
                    </div>
                </div>
            `;

            container.querySelector('.back-btn').addEventListener('click', () => {
                 if (window.miniGameHub) window.miniGameHub.goBack();
            });
        }

        this.canvas = container.querySelector('#matterhornCanvas');
        this.uiRoot = container.querySelector('#mh-ui-root');

        // Reset UI visibility
        const startScreen = container.querySelector('#mh-start-screen');
        const hud = container.querySelector('#mh-hud-container');

        if(startScreen) startScreen.classList.remove('hidden');
        if(hud) hud.classList.add('hidden');

        // Start button handler
        const startBtn = container.querySelector('#mh-start-btn');
        if (startBtn) {
             startBtn.onclick = () => {
                if(startScreen) startScreen.classList.add('hidden');
                if(hud) hud.classList.remove('hidden');
                Game.start();

                // Request pointer lock
                this.canvas.requestPointerLock = this.canvas.requestPointerLock || this.canvas.mozRequestPointerLock;
                if (this.canvas.requestPointerLock) {
                    this.canvas.requestPointerLock();
                } else {
                    document.body.requestPointerLock();
                }
            };
        }

        // Initialize Game Controller
        Game.init({
            canvas: this.canvas,
            uiRoot: this.uiRoot
        });
    }

    update(dt) {
        if (Game) {
             Game.update(dt);
        }
    }

    draw() {
        if (Game) {
             Game.draw();
        }
    }

    shutdown() {
        if (Game) Game.shutdown();

        const startBtn = document.getElementById('mh-start-btn');
        if(startBtn) startBtn.onclick = null;

        // Ensure pointer lock is released
        if (document.exitPointerLock) document.exitPointerLock();
    }
}
