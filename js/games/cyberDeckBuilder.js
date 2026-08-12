import SoundManager from '../core/SoundManager.js';

export default class CyberDeckBuilder {
    constructor() {
        this.soundManager = SoundManager.getInstance();
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        // Game State
        this.state = 'MENU'; // MENU, BATTLE
        this.player = {
            hp: 100,
            maxHp: 100,
            ram: 3,
            maxRam: 3,
            block: 0,
            deck: [],
            hand: [],
            discard: [],
        };
        this.enemy = {
            name: "ICE_NODE_01",
            hp: 50,
            maxHp: 50,
            intent: "ATTACK",
            intentValue: 10
        };

        this.cards = [
            { id: 1, name: "STRIKE", cost: 1, damage: 10, block: 0, type: "ATTACK" },
            { id: 2, name: "DEFLECT", cost: 1, damage: 0, block: 10, type: "DEFENSE" },
            { id: 3, name: "OVERCLOCK", cost: 0, damage: 0, block: 0, draw: 2, type: "SKILL" }
        ];

        this.mouse = { x: 0, y: 0, clicked: false, isDown: false };

        // Timers & visual
        this.particles = [];
        this.lastTime = 0;
        this.hoveredCardIndex = -1;

        this.boundGameLoop = this.gameLoop.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleMouseDown = this.handleMouseDown.bind(this);
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);
        this.boundHandleContextMenu = this.handleContextMenu.bind(this);
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = '';
        this.container.className = 'game-container flex flex-col items-center justify-center bg-black relative';

        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.maxHeight = '100%';
        this.canvas.style.border = '2px solid #0f0';
        this.canvas.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.3)';

        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.container.appendChild(this.canvas);

        // Setup initial deck
        for (let i = 0; i < 5; i++) this.player.deck.push({...this.cards[0]}); // 5 strikes
        for (let i = 0; i < 4; i++) this.player.deck.push({...this.cards[1]}); // 4 blocks
        this.player.deck.push({...this.cards[2]}); // 1 overclock

        this.shuffleDeck();

        this.isActive = true;
        this.bindEvents();
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }

    bindEvents() {
        this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);
        this.canvas.addEventListener('mousedown', this.boundHandleMouseDown);
        this.canvas.addEventListener('mouseup', this.boundHandleMouseUp);
        this.canvas.addEventListener('contextmenu', this.boundHandleContextMenu);
    }

    removeEvents() {
        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
            this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown);
            this.canvas.removeEventListener('mouseup', this.boundHandleMouseUp);
            this.canvas.removeEventListener('contextmenu', this.boundHandleContextMenu);
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        this.mouse.y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    }

    handleMouseDown(e) {
        if (e.button === 0) {
            this.mouse.isDown = true;
            this.mouse.clicked = true;
        }
    }

    handleMouseUp(e) {
        if (e.button === 0) {
            this.mouse.isDown = false;
        }
    }

    handleContextMenu(e) {
        e.preventDefault();
    }

    shuffleDeck() {
        for (let i = this.player.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.player.deck[i], this.player.deck[j]] = [this.player.deck[j], this.player.deck[i]];
        }
    }

    drawCards(count) {
        for(let i=0; i<count; i++) {
            if (this.player.deck.length === 0) {
                // reshuffle discard
                this.player.deck = [...this.player.discard];
                this.player.discard = [];
                this.shuffleDeck();
            }
            if (this.player.deck.length > 0) {
                this.player.hand.push(this.player.deck.pop());
            }
        }
    }

    /**
     * Initializes the battle state, resetting stats and drawing the first hand.
     */
    startBattle() {
        this.state = 'BATTLE';
        this.player.hp = this.player.maxHp;
        this.player.ram = this.player.maxRam;
        this.player.block = 0;
        this.player.hand = [];
        this.player.discard = [];

        this.player.deck = [];
        for (let i = 0; i < 5; i++) this.player.deck.push({...this.cards[0]});
        for (let i = 0; i < 4; i++) this.player.deck.push({...this.cards[1]});
        this.player.deck.push({...this.cards[2]});
        this.shuffleDeck();

        this.enemy = {
            name: "ICE_NODE_01",
            hp: 50,
            maxHp: 50,
            intent: "ATTACK",
            intentValue: 10
        };
        this.drawCards(5);
    }

    gameLoop(time) {
        if (!this.isActive) return;

        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        this.update(dt);
        this.draw();

        this.mouse.clicked = false; // Reset click

        this.animationFrameId = requestAnimationFrame(this.boundGameLoop);
    }

    update(dt) {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        if (this.state === 'MENU') {
            const btnW = 200, btnH = 50;
            const btnX = this.canvas.width / 2 - btnW / 2;
            const btnY = this.canvas.height / 2 - btnH / 2;

            if (this.mouse.x > btnX && this.mouse.x < btnX + btnW &&
                this.mouse.y > btnY && this.mouse.y < btnY + btnH) {
                if (this.mouse.clicked) {
                    this.soundManager.playSound('click');
                    this.startBattle();
                }
            }
        } else if (this.state === 'BATTLE') {
            // Check hand hover and clicks
            const cardW = 100;
            const cardH = 150;
            const spacing = 20;
            const totalW = this.player.hand.length * cardW + (this.player.hand.length - 1) * spacing;
            const startX = (this.canvas.width - totalW) / 2;
            const y = this.canvas.height - cardH - 20;

            this.hoveredCardIndex = -1;

            for (let i = this.player.hand.length - 1; i >= 0; i--) {
                const x = startX + i * (cardW + spacing);
                if (this.mouse.x > x && this.mouse.x < x + cardW &&
                    this.mouse.y > y && this.mouse.y < y + cardH) {
                    this.hoveredCardIndex = i;

                    if (this.mouse.clicked) {
                        this.playCard(i);
                        this.mouse.clicked = false; // Consume click
                    }
                    break;
                }
            }

            // End Turn Button
            const btnW = 120, btnH = 40;
            const btnX = this.canvas.width - btnW - 20;
            const btnY = this.canvas.height - btnH - 20;
            if (this.mouse.x > btnX && this.mouse.x < btnX + btnW &&
                this.mouse.y > btnY && this.mouse.y < btnY + btnH) {
                if (this.mouse.clicked) {
                    this.soundManager.playSound('click');
                    this.endTurn();
                }
            }
        }
    }

    playCard(index) {
        const card = this.player.hand[index];
        if (this.player.ram >= card.cost) {
            this.player.ram -= card.cost;
            this.player.hand.splice(index, 1);
            this.player.discard.push(card);

            if (card.type === 'ATTACK') {
                this.enemy.hp -= card.damage;
                this.soundManager.playSound('shoot');
                this.spawnParticles(this.canvas.width/2, 200, '#0f0');
            } else if (card.type === 'DEFENSE') {
                this.player.block += card.block;
                this.soundManager.playSound('jump');
            } else if (card.type === 'SKILL') {
                this.drawCards(card.draw || 1);
                this.soundManager.playSound('powerup');
            }

            if (this.enemy.hp <= 0) {
                this.enemy.hp = 0;
                setTimeout(() => {
                    this.state = 'MENU';
                    if (window.miniGameHub) {
                        window.miniGameHub.showGameOver(100, () => this.startBattle());
                    }
                }, 1000);
            }
        } else {
            this.soundManager.playSound('error');
        }
    }

    /**
     * Ends the player's turn, resolves enemy actions, and prepares the next round.
     */
    endTurn() {
        if (this.enemy.intent === 'ATTACK') {
            let dmg = this.enemy.intentValue;
            if (this.player.block > 0) {
                if (this.player.block >= dmg) {
                    this.player.block -= dmg;
                    dmg = 0;
                } else {
                    dmg -= this.player.block;
                    this.player.block = 0;
                }
            }
            if (dmg > 0) {
                this.player.hp -= dmg;
            }
            this.spawnParticles(this.canvas.width/2, 400, '#f00');
            this.soundManager.playSound('explosion');

            if (this.player.hp <= 0) {
                this.player.hp = 0;
                this.state = 'MENU';
                if (window.miniGameHub) {
                    window.miniGameHub.showGameOver(0, () => this.startBattle());
                }
            }
        }

        this.player.ram = this.player.maxRam;
        this.player.block = 0; // reset block at end of turn (or start of next, same effect)
        while(this.player.hand.length > 0) {
            this.player.discard.push(this.player.hand.pop());
        }
        this.drawCards(5);
    }

    spawnParticles(x, y, color) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 400,
                vy: (Math.random() - 0.5) * 400,
                life: 0.5 + Math.random() * 0.5,
                color: color
            });
        }
    }

    draw() {
        this.ctx.fillStyle = '#050505';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid lines
        this.ctx.strokeStyle = '#020';
        this.ctx.lineWidth = 1;
        for(let i=0; i<this.canvas.width; i+=40) {
            this.ctx.beginPath(); this.ctx.moveTo(i, 0); this.ctx.lineTo(i, this.canvas.height); this.ctx.stroke();
        }
        for(let i=0; i<this.canvas.height; i+=40) {
            this.ctx.beginPath(); this.ctx.moveTo(0, i); this.ctx.lineTo(this.canvas.width, i); this.ctx.stroke();
        }

        if (this.state === 'MENU') {
            this.ctx.fillStyle = '#0f0';
            this.ctx.font = '40px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('CYBER DECK BUILDER', this.canvas.width / 2, this.canvas.height / 3);

            const btnW = 200, btnH = 50;
            const btnX = this.canvas.width / 2 - btnW / 2;
            const btnY = this.canvas.height / 2 - btnH / 2;

            this.ctx.strokeStyle = '#0f0';
            this.ctx.lineWidth = 2;

            if (this.mouse.x > btnX && this.mouse.x < btnX + btnW &&
                this.mouse.y > btnY && this.mouse.y < btnY + btnH) {
                this.ctx.fillStyle = '#0a0';
                this.ctx.fillRect(btnX, btnY, btnW, btnH);
            }
            this.ctx.strokeRect(btnX, btnY, btnW, btnH);
            this.ctx.fillStyle = '#0f0';
            this.ctx.font = '20px monospace';
            this.ctx.fillText('INITIALIZE', this.canvas.width / 2, this.canvas.height / 2 + 7);

        } else if (this.state === 'BATTLE') {
            // Draw Enemy
            this.ctx.fillStyle = '#f00';
            this.ctx.fillRect(this.canvas.width/2 - 50, 100, 100, 100);
            this.ctx.font = '16px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.enemy.name, this.canvas.width/2, 80);
            this.ctx.fillText(`HP: ${this.enemy.hp}/${this.enemy.maxHp}`, this.canvas.width/2, 230);
            this.ctx.fillText(`Intent: ${this.enemy.intent} ${this.enemy.intentValue}`, this.canvas.width/2, 60);

            // Draw Player Stats
            this.ctx.fillStyle = '#0f0';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`SYS_HP: ${this.player.hp}/${this.player.maxHp}`, 20, 30);
            if (this.player.block > 0) {
                this.ctx.fillStyle = '#00f';
                this.ctx.fillText(`BLOCK: ${this.player.block}`, 200, 30);
                this.ctx.fillStyle = '#0f0';
            }
            this.ctx.fillText(`RAM: ${this.player.ram}/${this.player.maxRam}`, 20, 60);
            this.ctx.fillText(`DECK: ${this.player.deck.length} | DISCARD: ${this.player.discard.length}`, 20, 90);

            // Draw End Turn
            const btnW = 120, btnH = 40;
            const btnX = this.canvas.width - btnW - 20;
            const btnY = this.canvas.height - btnH - 20;
            this.ctx.strokeStyle = '#0f0';
            this.ctx.strokeRect(btnX, btnY, btnW, btnH);
            this.ctx.fillText('END TURN', btnX + 15, btnY + 25);

            // Draw Hand
            const cardW = 100;
            const cardH = 150;
            const spacing = 20;
            const totalW = this.player.hand.length * cardW + (this.player.hand.length - 1) * spacing;
            const startX = (this.canvas.width - totalW) / 2;
            const y = this.canvas.height - cardH - 20;

            for (let i = 0; i < this.player.hand.length; i++) {
                const card = this.player.hand[i];
                const x = startX + i * (cardW + spacing);
                const isHovered = (i === this.hoveredCardIndex);

                const drawY = isHovered ? y - 20 : y;

                this.ctx.fillStyle = '#111';
                this.ctx.fillRect(x, drawY, cardW, cardH);
                this.ctx.strokeStyle = isHovered ? '#0f0' : '#050';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x, drawY, cardW, cardH);

                this.ctx.fillStyle = '#0f0';
                this.ctx.font = '14px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(card.name, x + cardW/2, drawY + 20);
                this.ctx.fillText(`RAM ${card.cost}`, x + cardW/2, drawY + 40);

                if (card.damage > 0) this.ctx.fillText(`DMG ${card.damage}`, x + cardW/2, drawY + 80);
                if (card.block > 0) this.ctx.fillText(`BLK ${card.block}`, x + cardW/2, drawY + 80);
                if (card.draw > 0) this.ctx.fillText(`DRAW ${card.draw}`, x + cardW/2, drawY + 80);
            }
        }

        // Draw Particles
        for (const p of this.particles) {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = Math.max(0, p.life * 2); // fade out
            this.ctx.fillRect(p.x, p.y, 4, 4);
        }
        this.ctx.globalAlpha = 1;

        // Scanline overlay
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.03)';
        for(let i=0; i<this.canvas.height; i+=4) {
            this.ctx.fillRect(0, i, this.canvas.width, 1);
        }
    }

    async shutdown() {
        this.isActive = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.removeEvents();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}
