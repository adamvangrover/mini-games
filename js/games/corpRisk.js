import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class CorpRisk {
    constructor() {
        this.soundManager = SoundManager.getInstance();
        this.saveSystem = SaveSystem.getInstance();
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        // Basic map of corporate sectors (nodes)
        this.nodes = [
            { id: 0, x: 0.2, y: 0.2, owner: 'Player', troops: 5, name: 'R&D' },
            { id: 1, x: 0.5, y: 0.2, owner: 'CPU', troops: 3, name: 'Marketing' },
            { id: 2, x: 0.8, y: 0.3, owner: 'CPU', troops: 2, name: 'Sales' },
            { id: 3, x: 0.3, y: 0.5, owner: 'Player', troops: 1, name: 'HR' },
            { id: 4, x: 0.6, y: 0.6, owner: 'CPU', troops: 4, name: 'Legal' },
            { id: 5, x: 0.4, y: 0.8, owner: 'CPU', troops: 2, name: 'Finance' },
            { id: 6, x: 0.8, y: 0.7, owner: 'CPU', troops: 3, name: 'Executive' }
        ];

        this.edges = [
            [0, 1], [0, 3], [1, 2], [1, 4], [2, 6], [3, 4], [3, 5], [4, 5], [4, 6]
        ];

        this.selectedNode = null;
        this.turn = 'Player';
        this.message = "SELECT A SECTOR TO ATTACK FROM";

        this.boundResize = this.resize.bind(this);
        this.boundClick = this.handleClick.bind(this);
    }

    async init(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        window.addEventListener('resize', this.boundResize);
        this.canvas.addEventListener('click', this.boundClick);

        this.resize();
        this.isActive = true;
        this.lastTime = performance.now();
        this.gameLoop = requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        if (!this.container || !this.canvas) return;
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
        this.draw();
    }

    handleClick(e) {
        if (this.turn !== 'Player') return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let clickedNode = null;
        for (const node of this.nodes) {
            const nx = node.x * this.canvas.width;
            const ny = node.y * this.canvas.height;
            const dist = Math.sqrt((mouseX - nx) ** 2 + (mouseY - ny) ** 2);
            if (dist < 40) { // 40px radius click target
                clickedNode = node;
                break;
            }
        }

        if (!clickedNode) {
            this.selectedNode = null;
            this.message = "SELECT A SECTOR TO ATTACK FROM";
            return;
        }

        if (!this.selectedNode) {
            if (clickedNode.owner === 'Player' && clickedNode.troops > 1) {
                this.selectedNode = clickedNode;
                this.soundManager.playSound('click');
                this.message = "SELECT ADJACENT TARGET TO ATTACK";
            } else {
                this.soundManager.playSound('error');
            }
        } else {
            if (clickedNode.owner === 'CPU' && this.isAdjacent(this.selectedNode.id, clickedNode.id)) {
                this.attack(this.selectedNode, clickedNode);
            } else {
                this.selectedNode = null;
                this.soundManager.playSound('error');
                this.message = "INVALID TARGET. SELECT A SECTOR TO ATTACK FROM";
            }
        }
    }

    isAdjacent(id1, id2) {
        return this.edges.some(e => (e[0] === id1 && e[1] === id2) || (e[0] === id2 && e[1] === id1));
    }

    attack(attacker, defender) {
        // Simplified risk math: attacker loses 1, defender loses 1 until someone dies
        // Just raw probability for visual prototype
        const aRoll = Math.random() * attacker.troops;
        const dRoll = Math.random() * defender.troops;

        if (aRoll > dRoll) {
            defender.troops -= 1;
            this.soundManager.playSound('hit');
            if (defender.troops <= 0) {
                defender.owner = attacker.owner;
                defender.troops = attacker.troops - 1;
                attacker.troops = 1;
                this.message = `TAKEOVER SUCCESSFUL: ${defender.name}`;
                this.soundManager.playSound('coin');
            }
        } else {
            attacker.troops -= 1;
            this.soundManager.playSound('error');
            if (attacker.troops <= 1) {
                this.message = `ATTACK FAILED. TROOPS DEPLETED.`;
            }
        }

        this.selectedNode = null;

        // Check win condition
        if (this.nodes.every(n => n.owner === 'Player')) {
            this.message = "GLOBAL DOMINATION ACHIEVED";
            this.turn = 'GameOver';
        }
    }

    loop(timestamp) {
        if (!this.isActive) return;
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // No real time updates needed unless CPU turn logic is added

        this.draw();
        this.gameLoop = requestAnimationFrame((t) => this.loop(t));
    }

    draw() {
        if (!this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.fillStyle = '#051015'; // Dark blue-black
        this.ctx.fillRect(0, 0, w, h);

        // Draw Edges
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
        this.edges.forEach(edge => {
            const n1 = this.nodes[edge[0]];
            const n2 = this.nodes[edge[1]];
            this.ctx.beginPath();
            this.ctx.moveTo(n1.x * w, n1.y * h);
            this.ctx.lineTo(n2.x * w, n2.y * h);
            this.ctx.stroke();
        });

        // Draw Nodes
        this.nodes.forEach(node => {
            const nx = node.x * w;
            const ny = node.y * h;
            const radius = 30 + (node.troops * 2);

            this.ctx.beginPath();
            this.ctx.arc(nx, ny, radius, 0, Math.PI * 2);

            if (node.owner === 'Player') {
                this.ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
                this.ctx.strokeStyle = '#00ffff';
            } else {
                this.ctx.fillStyle = 'rgba(255, 0, 100, 0.8)';
                this.ctx.strokeStyle = '#ff0064';
            }

            if (this.selectedNode === node) {
                 this.ctx.lineWidth = 4;
                 this.ctx.strokeStyle = '#ffffff';
                 this.ctx.shadowBlur = 15;
                 this.ctx.shadowColor = '#ffffff';
            } else {
                 this.ctx.lineWidth = 2;
                 this.ctx.shadowBlur = 0;
            }

            this.ctx.fill();
            this.ctx.stroke();

            // Text
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '14px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(node.name, nx, ny - 5);

            this.ctx.font = 'bold 20px monospace';
            this.ctx.fillText(node.troops.toString(), nx, ny + 15);
        });

        // UI
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.message, w/2, h - 40);
    }

    async shutdown() {
        this.isActive = false;
        if (this.gameLoop) cancelAnimationFrame(this.gameLoop);

        window.removeEventListener('resize', this.boundResize);
        if(this.canvas) this.canvas.removeEventListener('click', this.boundClick);

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
