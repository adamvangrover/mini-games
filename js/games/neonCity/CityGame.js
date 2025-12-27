import World from './World.js';
import { Player, NPC, Car, DataNode, GlitchPortal, BuildingMarker } from './Entities.js';
import InputManager from '../../core/InputManager.js';
import LLMService from '../../core/LLMService.js';
import HackingPuzzle from './HackingPuzzle.js';
import Progression from './Progression.js';
import CityUI from './CityUI.js';
import SaveSystem from '../../core/SaveSystem.js';

export default class CityGame {
    constructor(container) {
        this.container = container;
        this.inputManager = InputManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();

        // Systems
        this.progression = new Progression();
        this.ui = new CityUI(container);

        // Three.js Core
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Game State
        this.world = null;
        this.player = null;
        this.npcs = [];
        this.cars = [];
        this.interactables = [];

        this.activePuzzle = null;
        this.isChatting = false;
        this.meditating = false;

        // Setup
        this.initThree();
        this.world = new World(this.scene);
        this.setupEntities();
        this.setupHackingUI();

        // Initial Update
        this.ui.updateHUD(this.progression);
        this.player.setVehicle(this.progression.data.equippedVehicle, this.progression.getCurrentStats());
    }

    initThree() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510);
        this.scene.fog = new THREE.FogExp2(0x050510, 0.0025);

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(0, 40, 40);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
    }

    setupEntities() {
        // Player
        this.player = new Player(this.scene, 0, 0);

        // NPCs
        const roles = ["Merchant", "Guard", "Hacker", "Citizen", "Drone"];
        for(let i=0; i<30; i++) {
            const x = (Math.random() - 0.5) * 400;
            const z = (Math.random() - 0.5) * 400;
            const role = roles[Math.floor(Math.random() * roles.length)];
            this.npcs.push(new NPC(this.scene, x, z, role));
        }

        // Cars
        for(let i=0; i<10; i++) {
             const x = (Math.random() - 0.5) * 500;
             const z = (Math.random() - 0.5) * 500;
             this.cars.push(new Car(this.scene, x, z));
        }

        // Data Nodes
        for(let i=0; i<10; i++) {
            const x = (Math.random() - 0.5) * 400;
            const z = (Math.random() - 0.5) * 400;
            this.interactables.push(new DataNode(this.scene, x, z));
        }

        // Glitch Portals (Random)
        for(let i=0; i<3; i++) {
            const x = (Math.random() - 0.5) * 600;
            const z = (Math.random() - 0.5) * 600;
            this.interactables.push(new GlitchPortal(this.scene, x, z));
        }

        // Shops and Apartments (Fixed-ish locations)
        this.interactables.push(new BuildingMarker(this.scene, 50, 50, 'shop'));
        this.interactables.push(new BuildingMarker(this.scene, -50, -50, 'home'));
    }

    setupHackingUI() {
        this.hackingPuzzle = new HackingPuzzle(this.container, (success) => {
            if(success) {
                this.saveSystem.addCurrency(50);
                this.progression.addXP(100);
                this.ui.updateHUD(this.progression);
                window.miniGameHub.soundManager.playSound('powerup');
                if(this.activeNode) this.activeNode.hack();
            } else {
                 window.miniGameHub.soundManager.playSound('explosion');
            }
            this.activePuzzle = null;
        });
    }

    resize(w, h) {
        if(this.camera && this.renderer) {
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        }
    }

    update(dt) {
        if(this.meditating) {
            this.progression.data.meditationTime += dt;
            if(Math.random() < 0.05) { // Slow tick
                this.progression.addXP(1);
                this.ui.updateHUD(this.progression);
            }
            // Exit check
            const keys = this.inputManager.keys;
            if (Object.values(keys).some(k => k)) {
                 this.meditating = false;
                 this.ui.hideMeditate();
                 this.inputManager.keys = {}; // Clear input buffer
            }
            return;
        }

        const isShopOpen = this.ui.shopOverlay && !this.ui.shopOverlay.classList.contains('hidden');
        if(this.activePuzzle || isShopOpen) return;

        // Controls
        if(!this.isChatting && !isShopOpen) {
            const keys = this.inputManager.keys;
            const move = new THREE.Vector3(0, 0, 0);

            if(keys['ArrowUp'] || keys['w']) move.z -= 1;
            if(keys['ArrowDown'] || keys['s']) move.z += 1;
            if(keys['ArrowLeft'] || keys['a']) move.x -= 1;
            if(keys['ArrowRight'] || keys['d']) move.x += 1;

            this.player.move(move, dt);

            if(keys['e'] || keys['Enter']) {
                this.tryInteract();
                this.inputManager.keys['e'] = false;
                this.inputManager.keys['Enter'] = false;
            }
        }

        // Entities Update
        this.npcs.forEach(npc => npc.update(dt));
        this.cars.forEach((c, i) => {
             c.update(dt);
             if(c.mesh.position.length() > 600) c.reset();
        });
        this.interactables.forEach(i => i.update(dt));
        this.world.update(dt);

        // Camera Follow
        const targetPos = this.player.mesh.position.clone();
        targetPos.y += 30;
        targetPos.z += 30;
        this.camera.position.lerp(targetPos, 0.1);
        this.camera.lookAt(this.player.mesh.position);

        this.checkInteractions();
    }

    checkInteractions() {
        if(this.isChatting || this.activePuzzle || this.meditating) return;

        let prompt = null;
        const playerPos = this.player.mesh.position;
        const interactDist = 8;

        // Check Interactables
        for(let obj of this.interactables) {
            if(obj.mesh.position.distanceTo(playerPos) < interactDist) {
                if(obj instanceof DataNode && !obj.hacked) prompt = "Press E to Hack Data Node";
                if(obj instanceof GlitchPortal) prompt = "Press E to Enter Glitch";
                if(obj instanceof BuildingMarker) {
                    if(obj.type === 'shop') prompt = "Press E to Enter Dealership";
                    if(obj.type === 'home') prompt = "Press E to Meditate";
                }
            }
        }

        // Check NPCs
        if(!prompt) {
            const npc = this.npcs.find(n => n.mesh.position.distanceTo(playerPos) < interactDist);
            if(npc) prompt = `Press E to Talk to ${npc.role}`;
        }

        if(prompt) {
            this.ui.promptOverlay.textContent = prompt;
            this.ui.promptOverlay.classList.remove('hidden');
        } else {
            this.ui.promptOverlay.classList.add('hidden');
        }
    }

    tryInteract() {
        const playerPos = this.player.mesh.position;
        const interactDist = 8;

        // 1. Interactables
        for(let obj of this.interactables) {
            if(obj.mesh.position.distanceTo(playerPos) < interactDist) {
                if(obj instanceof DataNode && !obj.hacked) {
                    this.activeNode = obj;
                    this.activePuzzle = true;
                    this.hackingPuzzle.start();
                    return;
                }
                if(obj instanceof GlitchPortal) {
                    this.enterGlitch();
                    return;
                }
                if(obj instanceof BuildingMarker) {
                    if(obj.type === 'shop') {
                        this.ui.showShop(this.progression, this.saveSystem, (id, equip) => {
                            if(equip) {
                                this.progression.equipVehicle(id);
                                this.player.setVehicle(id, this.progression.getCurrentStats());
                                this.ui.updateHUD(this.progression);
                                window.miniGameHub.soundManager.playSound('powerup');
                            } else {
                                this.progression.unlockVehicle(id);
                                window.miniGameHub.soundManager.playSound('coin');
                            }
                        });
                        return;
                    }
                    if(obj.type === 'home') {
                        this.meditating = true;
                        this.ui.showMeditate();
                        return;
                    }
                }
            }
        }

        // 2. NPCs
        const npc = this.npcs.find(n => n.mesh.position.distanceTo(playerPos) < interactDist);
        if(npc) {
            this.startChat(npc);
        }
    }

    enterGlitch() {
        const games = ['neon-jump', 'tower-defense-game', 'neon-shooter', 'aetheria-game', 'matterhorn-game'];
        const gameId = games[Math.floor(Math.random() * games.length)];

        this.ui.showMessage("GLITCH DETECTED... MIGRATING...", "text-fuchsia-400");

        setTimeout(() => {
             if (window.miniGameHub && window.miniGameHub.transitionToState) {
                window.miniGameHub.transitionToState('IN_GAME', { gameId: gameId });
            }
        }, 1500);
    }

    startChat(npc) {
        this.isChatting = true;
        this.activeNPC = npc;
        this.ui.chatOverlay.classList.remove('hidden');
        this.ui.chatOverlay.querySelector('#chat-speaker').textContent = `${npc.role}`;
        this.ui.chatOverlay.querySelector('#chat-text').innerHTML = `<span class="text-cyan-300">Agent:</span> Connected securely.`;
        this.ui.chatOverlay.querySelector('#chat-input').focus();
    }

    endChat() {
        this.isChatting = false;
        this.activeNPC = null;
        this.ui.chatOverlay.classList.add('hidden');
        this.container.focus();
    }

    async sendChatMessage() {
        const input = this.ui.chatOverlay.querySelector('#chat-input');
        const text = input.value.trim();
        if(!text) return;

        const display = this.ui.chatOverlay.querySelector('#chat-text');
        display.innerHTML = `<div class="mb-2"><span class="text-fuchsia-300 font-bold">You:</span> ${text}</div>`;
        input.value = '';

        const thinkingId = 'thinking-' + Date.now();
        display.innerHTML += `<div id="${thinkingId}" class="text-gray-500 text-sm animate-pulse italic">Decrypting response...</div>`;
        display.scrollTop = display.scrollHeight;

        const response = await LLMService.chat(text, this.activeNPC.role);

        const thinking = document.getElementById(thinkingId);
        if(thinking) thinking.remove();

        display.innerHTML += `<div class="mb-4 pl-4 border-l-2 border-cyan-500/30"><span class="text-cyan-300 font-bold">Agent:</span> ${response}</div>`;
        display.scrollTop = display.scrollHeight;

        // Reward for socializing
        if(Math.random() < 0.3) {
            this.progression.addXP(10);
            this.ui.updateHUD(this.progression);
        }
    }

    draw() {
        if(this.scene && this.camera && this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}
