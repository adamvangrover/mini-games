import SaveSystem from '../core/SaveSystem.js';
import SoundManager from '../core/SoundManager.js';

export default class NeonMUD {
    constructor() {
        this.container = null;
        this.saveSystem = SaveSystem.getInstance();
        this.soundManager = SoundManager.getInstance();

        // Game State
        this.player = {
            room: 'nexus',
            inventory: []
        };

        // Try to load saved state
        const savedState = this.saveSystem.getGameConfig('neonMUD_state');
        if (savedState) {
            this.player = savedState;
        }

        this.world = {
            'nexus': {
                name: 'The Central Nexus',
                desc: 'You are standing in a glowing, octagonal room. Terminals hum with raw data streams. Exits lie to the NORTH and EAST.',
                exits: { north: 'server_room', east: 'archive' },
                items: ['datapad']
            },
            'server_room': {
                name: 'Main Server Cluster',
                desc: 'Towering racks of quantum servers emit a freezing mist. The noise is deafening. A heavy blast door is to the NORTH, and the Nexus is to the SOUTH.',
                exits: { north: 'vault', south: 'nexus' },
                items: ['security_key']
            },
            'archive': {
                name: 'Data Archives',
                desc: 'Dusty, forgotten hard drives line the walls. It feels abandoned. The Nexus is to the WEST.',
                exits: { west: 'nexus' },
                items: []
            },
            'vault': {
                name: 'The Core Vault',
                desc: 'You have breached the Core Vault. The raw source code of the Arcade floats in the center of the room.',
                exits: { south: 'server_room' },
                items: ['source_code'],
                locked: true,
                key: 'security_key'
            }
        };

        this.history = [];
        this.inputBuffer = '';
    }

    async init(container) {
        this.container = container;

        this.container.innerHTML = `
            <div class="relative w-full h-full bg-black overflow-hidden font-mono select-none flex flex-col" id="neonMUD-ui">
                <div class="w-full bg-slate-900 border-b border-green-500 p-2 flex justify-between items-center text-green-400 z-10">
                    <div class="font-bold">NeonMUD v1.0.4</div>
                    <button class="back-btn px-4 py-1 bg-red-900/80 hover:bg-red-700 text-red-200 border border-red-500 rounded text-xs uppercase pointer-events-auto">Disconnect</button>
                </div>

                <!-- Terminal Output -->
                <div id="mud-output" class="flex-1 overflow-y-auto p-4 text-green-400 pb-20 leading-relaxed font-mono whitespace-pre-wrap select-text crt-flicker"></div>

                <!-- Terminal Input -->
                <div class="absolute bottom-0 w-full bg-black border-t border-green-500 p-4 flex items-center gap-2">
                    <span class="text-green-500 font-bold">&gt;</span>
                    <input type="text" id="mud-input" class="flex-1 bg-transparent text-green-400 outline-none border-none uppercase caret-green-500" autocomplete="off" spellcheck="false" autofocus>
                </div>

                <!-- Scanline Overlay -->
                <div class="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20"></div>
            </div>

            <style>
                .crt-flicker { animation: textFlicker 0.15s infinite alternate; }
                @keyframes textFlicker {
                    0% { text-shadow: 0 0 2px #4ade80, 0 0 4px #4ade80; }
                    100% { text-shadow: 0 0 1px #4ade80, 0 0 3px #4ade80; }
                }
                #mud-output::-webkit-scrollbar { width: 8px; }
                #mud-output::-webkit-scrollbar-track { background: #000; }
                #mud-output::-webkit-scrollbar-thumb { background: #4ade80; border: 1px solid #000; }
            </style>
        `;

        this.inputEl = this.container.querySelector('#mud-input');
        this.outputEl = this.container.querySelector('#mud-output');

        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = this.inputEl.value.trim();
                if (cmd) {
                    this.processCommand(cmd);
                    this.inputEl.value = '';
                }
            }
        });

        // Ensure focus
        this.container.addEventListener('click', () => {
             this.inputEl.focus();
        });

        if (this.history.length === 0) {
            this.printLines([
                "CONNECTING TO MAINFRAME...",
                "AUTHENTICATING...",
                "ACCESS GRANTED.",
                "===========================================",
                "Type 'HELP' for a list of commands.",
                "===========================================\n"
            ], 'text-green-300');
            this.look();
        } else {
             // Restore history
             this.outputEl.innerHTML = this.history.join('');
             this.scrollToBottom();
        }
    }

    printLine(text, cssClass = 'text-green-400') {
        const line = `<div class="${cssClass} mb-1">${text}</div>`;
        this.history.push(line);
        // Keep history manageable
        if (this.history.length > 100) this.history.shift();

        if (this.outputEl) {
            this.outputEl.insertAdjacentHTML('beforeend', line);
            this.scrollToBottom();
        }
    }

    printLines(lines, cssClass = 'text-green-400') {
        lines.forEach(line => this.printLine(line, cssClass));
    }

    scrollToBottom() {
        if (this.outputEl) {
            this.outputEl.scrollTop = this.outputEl.scrollHeight;
        }
    }

    saveState() {
        this.saveSystem.setGameConfig('neonMUD_state', this.player);
    }

    processCommand(rawCmd) {
        this.printLine(`<span class="text-white">&gt; ${rawCmd.toUpperCase()}</span>`);
        this.soundManager.playSound('click'); // Keyboard clack

        const parts = rawCmd.toLowerCase().split(' ').filter(p => p.length > 0);
        if (parts.length === 0) return;

        const verb = parts[0];
        const args = parts.slice(1);

        switch (verb) {
            case 'help':
                this.printLines([
                    "AVAILABLE COMMANDS:",
                    "  LOOK        - Examine your surroundings",
                    "  GO [dir]    - Move (NORTH, SOUTH, EAST, WEST)",
                    "  TAKE [item] - Pick up an item",
                    "  INVENTORY   - Check what you are carrying",
                    "  CLEAR       - Clear the terminal screen"
                ], 'text-yellow-400');
                break;
            case 'look':
                this.look();
                break;
            case 'n': case 'north': this.go('north'); break;
            case 's': case 'south': this.go('south'); break;
            case 'e': case 'east': this.go('east'); break;
            case 'w': case 'west': this.go('west'); break;
            case 'go':
            case 'move':
                if (args.length === 0) this.printLine("Go where?");
                else this.go(args[0]);
                break;
            case 'take':
            case 'get':
                if (args.length === 0) this.printLine("Take what?");
                else this.take(args[0]);
                break;
            case 'i':
            case 'inv':
            case 'inventory':
                this.showInventory();
                break;
            case 'clear':
                this.history = [];
                this.outputEl.innerHTML = '';
                break;
            default:
                this.printLine(`ERROR: Command '${verb}' not recognized.`, 'text-red-400');
        }
    }

    look() {
        const room = this.world[this.player.room];
        this.printLine(`\\n[${room.name}]`, 'text-cyan-400 font-bold text-lg mt-2');
        this.printLine(room.desc);

        if (room.items && room.items.length > 0) {
            this.printLine(`You see: ${room.items.join(', ')}`, 'text-fuchsia-400');
        }
    }

    go(dir) {
        const room = this.world[this.player.room];

        // Handle shorthand
        if (dir === 'n') dir = 'north';
        if (dir === 's') dir = 'south';
        if (dir === 'e') dir = 'east';
        if (dir === 'w') dir = 'west';

        if (room.exits && room.exits[dir]) {
            const nextRoomId = room.exits[dir];
            const nextRoom = this.world[nextRoomId];

            if (nextRoom.locked) {
                 if (this.player.inventory.includes(nextRoom.key)) {
                      this.printLine(`You use the ${nextRoom.key} to unlock the door.`, 'text-green-300');
                      nextRoom.locked = false;
                      this.soundManager.playSound('powerup');
                 } else {
                      this.printLine(`The door to ${nextRoom.name} is LOCKED. You need a ${nextRoom.key}.`, 'text-red-400');
                      this.soundManager.playSound('error');
                      return;
                 }
            }

            this.player.room = nextRoomId;
            this.printLine(`You head ${dir.toUpperCase()}...`, 'text-slate-400 italic');
            this.look();
            this.saveState();
        } else {
            this.printLine("You cannot go that way.");
        }
    }

    take(item) {
        const room = this.world[this.player.room];
        if (room.items && room.items.includes(item)) {
            // Remove from room
            room.items = room.items.filter(i => i !== item);
            // Add to inv
            this.player.inventory.push(item);
            this.printLine(`Picked up: ${item}`, 'text-fuchsia-300');
            this.soundManager.playSound('coin');
            this.saveState();

            if (item === 'source_code') {
                 this.printLine("\\n*** YOU HAVE ACQUIRED THE SOURCE CODE! ***", "text-yellow-400 font-bold text-xl animate-pulse mt-4");
                 this.printLine("THE SIMULATION IS DECRYPTING...", "text-yellow-400");
                 this.soundManager.playSound('explosion');
            }
        } else {
            this.printLine(`I don't see any '${item}' here.`);
        }
    }

    showInventory() {
        if (this.player.inventory.length === 0) {
            this.printLine("You are carrying nothing.");
        } else {
            this.printLine("You are carrying:", 'text-cyan-400');
            this.player.inventory.forEach(item => {
                this.printLine(`  - ${item}`);
            });
        }
    }

    async shutdown() {
        this.saveState();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
