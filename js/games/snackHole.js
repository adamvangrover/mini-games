
import SoundManager from '../core/SoundManager.js';
import SaveSystem from '../core/SaveSystem.js';

export default class SnackHoleGame {
    constructor() {
        this.game = null;
        this.container = null;
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = ''; // Clear container

        // Ensure Phaser is loaded
        if (typeof Phaser === 'undefined') {
            this.container.innerHTML = '<div class="text-white text-center pt-20">Error: Phaser not loaded. Refresh.</div>';
            return;
        }

        const width = window.innerWidth;
        const height = window.innerHeight;

        const config = {
            type: Phaser.AUTO,
            parent: container,
            width: width,
            height: height,
            backgroundColor: '#0f172a', // Slate 900 to match theme
            physics: {
                default: 'matter',
                matter: {
                    gravity: { y: 0 },
                    debug: false
                }
            },
            scene: [AssetGenerator, MainMenu, GameScene, UIScene, CakeScene],
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        };

        this.game = new Phaser.Game(config);

        // Pass core systems to the game registry or global scope for scenes to access
        // We can attach them to the game config or a global object the scenes read
        // For simplicity, let's attach to the window temporarily or pass via registry in scenes
        this.game.registry.set('soundManager', SoundManager.getInstance());
        this.game.registry.set('saveSystem', SaveSystem.getInstance());
    }

    update(dt) {
        // Phaser handles its own loop
    }

    draw() {
        // Phaser handles rendering
    }

    async shutdown() {
        if (this.game) {
            this.game.destroy(true);
            this.game = null;
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// --- CONFIGURATION & GAME DATA ---

const GAME_CONFIG = {
    holeStartSize: 40,
    holeGrowthPerItem: 1.5,
    colors: {
        bg: 0x222222,
        floor: 0x0f172a, // Slate 900
        ui: 0xffffff,
        accent: 0xd946ef // Fuchsia 500
    }
};

const LEVEL_TIERS = [
    { tier: 1, targets: 5, fillers: 15, time: 60, scale: 0.8, color: 0xFF5733, name: "Cookie Crumble" },
    { tier: 2, targets: 8, fillers: 25, time: 55, scale: 0.9, color: 0x33FF57, name: "Donut Delight" },
    { tier: 3, targets: 10, fillers: 35, time: 50, scale: 1.0, color: 0x3357FF, name: "Macaron Mountain" },
    { tier: 4, targets: 12, fillers: 45, time: 45, scale: 1.1, color: 0xF3FF33, name: "Pretzel Park" },
    { tier: 5, targets: 15, fillers: 55, time: 40, scale: 1.2, color: 0xFF33F3, name: "Sourdough Summit" }
];

// --- ASSET GENERATION ---

class AssetGenerator extends Phaser.Scene {
    constructor() { super('AssetGenerator'); }

    preload() {
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });

        // 1. The Floor Pattern (Neon Grid)
        graphics.lineStyle(2, 0x1e293b); // Slate 800
        graphics.fillStyle(0x0f172a); // Slate 900
        graphics.fillRect(0, 0, 64, 64);
        graphics.strokeRect(0, 0, 64, 64);
        graphics.generateTexture('floor_tile', 64, 64);
        graphics.clear();

        // 2. The Hole (Soft brush for erasing)
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(50, 50, 50);
        graphics.generateTexture('hole_brush', 100, 100);
        graphics.clear();

        // 3. Treats (Targets) - Neon Glow Style

        // Cookie (Neon Orange)
        graphics.lineStyle(2, 0xffa500);
        graphics.fillStyle(0xffa500, 0.2);
        graphics.fillCircle(20, 20, 18);
        graphics.strokeCircle(20, 20, 18);
        graphics.fillStyle(0xffa500, 0.8);
        graphics.fillCircle(12, 12, 3);
        graphics.fillCircle(25, 25, 3);
        graphics.fillCircle(15, 28, 3);
        graphics.generateTexture('treat_cookie', 40, 40);
        graphics.clear();

        // Donut (Neon Pink)
        graphics.lineStyle(2, 0xff00ff);
        graphics.fillStyle(0xff00ff, 0.2);
        graphics.fillCircle(20, 20, 18);
        graphics.strokeCircle(20, 20, 18);
        graphics.fillStyle(0x000000, 1); // Hole center (black to blend with bg if not on top of floor)
        // Actually for donut hole transparency is better if we want to see through, but Matter body is circle.
        // Visually:
        graphics.strokeCircle(20, 20, 6);
        graphics.generateTexture('treat_donut', 40, 40);
        graphics.clear();

        // 4. Fillers (Generic physics objects) - Neon Blue/Green

        // Square box
        graphics.lineStyle(2, 0x00ffff);
        graphics.fillStyle(0x00ffff, 0.1);
        graphics.fillRect(1, 1, 30, 30);
        graphics.strokeRect(1, 1, 30, 30);
        graphics.generateTexture('filler_box', 32, 32);
        graphics.clear();

        // Triangle
        graphics.lineStyle(2, 0x00ff00);
        graphics.fillStyle(0x00ff00, 0.1);
        graphics.beginPath();
        graphics.moveTo(16, 2);
        graphics.lineTo(30, 30);
        graphics.lineTo(2, 30);
        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();
        graphics.generateTexture('filler_tri', 32, 32);
        graphics.clear();

        // 5. Coin (Gold)
        graphics.lineStyle(2, 0xffd700);
        graphics.fillStyle(0xffd700, 0.3);
        graphics.fillCircle(15, 15, 12);
        graphics.strokeCircle(15, 15, 12);
        graphics.fillStyle(0xffd700, 0.8);
        graphics.fillCircle(15, 15, 4);
        graphics.generateTexture('coin', 30, 30);
        graphics.clear();

        // 6. Particle (Glow)
        graphics.fillStyle(0xffffff);
        graphics.fillCircle(4,4,4);
        graphics.generateTexture('particle', 8, 8);

        this.scene.start('MainMenu');
    }
}

// --- SCENES ---

class MainMenu extends Phaser.Scene {
    constructor() { super('MainMenu'); }

    create() {
        const cw = this.cameras.main.width;
        const ch = this.cameras.main.height;

        // Title
        this.add.text(cw/2, ch * 0.25, "NEON SNACKS", {
            fontSize: '64px',
            fontFamily: 'Arial Black',
            color: '#d946ef', // Fuchsia
            stroke: '#ffffff',
            strokeThickness: 2,
            shadow: { offsetX: 0, offsetY: 0, color: '#d946ef', blur: 20, stroke: true, fill: true }
        }).setOrigin(0.5);

        this.add.text(cw/2, ch * 0.35, "Devour Everything!", {
            fontSize: '24px',
            color: '#06b6d4', // Cyan
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Level Select
        const saveSystem = this.game.registry.get('saveSystem');
        // We can use saveSystem.getGameConfig('snack-hole-game') if we want specific data,
        // or just use global coins. Let's assume we store level in game config.
        const gameConfig = saveSystem.getGameConfig('snack-hole-game') || { level: 0, unlockedToppings: 0 };
        const currentTier = Math.min(gameConfig.level, LEVEL_TIERS.length - 1);

        // Play Button
        const btnColor = 0x22c55e; // Green
        const btn = this.add.rectangle(cw/2, ch/2, 240, 70, btnColor).setInteractive();
        btn.setStrokeStyle(4, 0xffffff);

        const btnText = this.add.text(cw/2, ch/2, "PLAY LVL " + (currentTier + 1), {
            fontSize: '32px', color: '#fff', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Hover effects
        btn.on('pointerover', () => {
            btn.setScale(1.1);
            btnText.setScale(1.1);
            this.game.registry.get('soundManager').playSound('hover');
        });
        btn.on('pointerout', () => {
            btn.setScale(1);
            btnText.setScale(1);
        });
        btn.on('pointerdown', () => {
            this.game.registry.get('soundManager').playSound('click');
            this.scene.start('GameScene', { levelIndex: currentTier });
            this.scene.start('UIScene');
        });

        // Cake Shop (Meta Game) Button
        const cakeBtn = this.add.rectangle(cw/2, ch * 0.7, 240, 60, 0xd946ef).setInteractive(); // Fuchsia
        cakeBtn.setStrokeStyle(2, 0xffffff);
        this.add.text(cw/2, ch * 0.7, "CAKE COLLECTION", {
            fontSize: '20px', color: '#fff'
        }).setOrigin(0.5);

        cakeBtn.on('pointerdown', () => {
            this.game.registry.get('soundManager').playSound('click');
            this.scene.start('CakeScene');
        });

        // Back Button
        const backBtn = this.add.text(40, 40, "BACK", {
            fontSize: '20px', color: '#fff', backgroundColor: '#333', padding: { x: 10, y: 5 }
        }).setInteractive();
        backBtn.on('pointerdown', () => {
             // Go back to hub
             window.miniGameHub.goBack();
        });
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    init(data) {
        this.levelIndex = data.levelIndex || 0;
        this.levelData = LEVEL_TIERS[this.levelIndex % LEVEL_TIERS.length];
        this.score = 0;
        this.targetCollected = 0;
        this.holeSize = GAME_CONFIG.holeStartSize;
        this.isGameOver = false;
        this.isVictory = false;
        this.timeLeft = this.levelData.time;
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. Physics Setup (Top Down)
        this.matter.world.setBounds(0, 0, width, height, 50); // Thick walls
        this.matter.world.setGravity(0, 0);

        // 2. The Underground (Layer 0) - Visible through the hole
        // Dark void with some distant stars or grid?
        this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0);
        // Maybe some faint particles in the void
        const starGraphics = this.make.graphics({x:0, y:0, add:false});
        starGraphics.fillStyle(0xffffff, 0.5);
        starGraphics.fillCircle(2,2,2);
        starGraphics.generateTexture('void_star', 4, 4);

        this.add.particles(0, 0, 'void_star', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            quantity: 50,
            scale: { min: 0.5, max: 1.5 },
            alpha: { min: 0.1, max: 0.5 },
            lifespan: -1 // Persist
        });


        // 3. Falling Objects Container (Layer 1) - Objects move here when falling
        this.fallingLayer = this.add.container(0, 0);

        // 4. The Floor (Layer 2) - Uses RenderTexture for masking
        this.floorTexture = this.add.renderTexture(0, 0, width, height);
        // Draw the initial floor
        this.floorBrush = this.add.tileSprite(width/2, height/2, width, height, 'floor_tile');
        // this.floorBrush.setTint(this.levelData.color); // Level based color - maybe keep it neon grid style (dark blue)
        this.floorTexture.draw(this.floorBrush, width/2, height/2);

        // The eraser brush (The Hole Visual)
        this.eraser = this.make.image({ key: 'hole_brush', add: false });

        // 5. Active Objects (Layer 3)
        this.objectsGroup = [];
        this.spawnObjects();

        // 6. The Hole Logic
        this.holePos = new Phaser.Math.Vector2(width/2, height/2);

        // Input Handling
        this.input.on('pointermove', (pointer) => {
            if (this.isGameOver) return;
            this.holePos.x = pointer.x;
            this.holePos.y = pointer.y;
        });

        // Timer
        this.timeEvent = this.time.addEvent({
            delay: 1000,
            callback: this.onSecondTick,
            callbackScope: this,
            loop: true
        });

        // Update UI initially
        this.events.emit('updateUI', {
            targets: this.targetCollected,
            total: this.levelData.targets,
            time: this.timeLeft
        });

        // Visual Ring for Hole
        this.holeRing = this.add.circle(this.holePos.x, this.holePos.y, this.holeSize, 0x000000, 0);
        this.holeRing.setStrokeStyle(4, 0xffffff); // Neon rim
        this.holeRing.setDepth(100);
    }

    spawnObjects() {
        const bounds = { x: 50, y: 50, w: this.scale.width - 100, h: this.scale.height - 100 };

        // Helper to spawn physics body
        const spawn = (x, y, key, isTarget, scaleVal) => {
            const obj = this.matter.add.image(x, y, key);
            obj.setCircle(obj.width * scaleVal / 2);
            obj.setScale(scaleVal);
            obj.setFriction(0.1);
            obj.setBounce(0.5);
            obj.isTarget = isTarget;
            obj.activeRef = true; // Custom flag
            this.objectsGroup.push(obj);
            return obj;
        };

        // Spawn Targets
        for(let i=0; i<this.levelData.targets; i++) {
            const x = Phaser.Math.Between(bounds.x, bounds.x + bounds.w);
            const y = Phaser.Math.Between(bounds.y, bounds.y + bounds.h);
            const key = (i % 2 === 0) ? 'treat_cookie' : 'treat_donut';
            spawn(x, y, key, true, this.levelData.scale);
        }

        // Spawn Fillers
        for(let i=0; i<this.levelData.fillers; i++) {
            const x = Phaser.Math.Between(bounds.x, bounds.x + bounds.w);
            const y = Phaser.Math.Between(bounds.y, bounds.y + bounds.h);
            const key = (i % 2 === 0) ? 'filler_box' : 'filler_tri';
            spawn(x, y, key, false, this.levelData.scale * 0.8);
        }
    }

    onSecondTick() {
        if(this.isGameOver) return;
        this.timeLeft--;
        this.events.emit('updateUI', { time: this.timeLeft });

        if (this.timeLeft <= 0) {
            this.gameOver(false);
        }
    }

    update() {
        if (this.isGameOver) return;

        // Update Ring
        this.holeRing.setPosition(this.holePos.x, this.holePos.y);
        this.holeRing.setRadius(this.holeSize);
        // Pulse effect
        this.holeRing.setStrokeStyle(4 + Math.sin(this.time.now/200)*2, 0xd946ef); // Pulse Fuchsia

        // 1. Redraw Floor: Clear, Draw Floor, Erase Hole
        this.floorTexture.clear();
        this.floorTexture.draw(this.floorBrush, this.scale.width/2, this.scale.height/2);

        // Scale the eraser based on hole size
        this.eraser.setDisplaySize(this.holeSize * 2, this.holeSize * 2);
        this.floorTexture.erase(this.eraser, this.holePos.x, this.holePos.y);

        // 2. Physics & Logic Check
        // We iterate backwards so we can remove safely
        for (let i = this.objectsGroup.length - 1; i >= 0; i--) {
            const obj = this.objectsGroup[i];

            if (!obj.activeRef) continue;

            const dx = obj.x - this.holePos.x;
            const dy = obj.y - this.holePos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            // Interaction Radius (slightly smaller than visual hole)
            const eatRadius = this.holeSize * 0.8;
            // Pull Radius (Gravity well)
            const pullRadius = this.holeSize * 1.5;

            // Simple Gravity Well Physics
            if (dist < pullRadius) {
                const angle = Math.atan2(dy, dx);
                // Apply force towards center
                obj.applyForce({ x: -Math.cos(angle) * 0.005, y: -Math.sin(angle) * 0.005 });
            }

            // The "Fall"
            if (dist < eatRadius) {
                // Check if object is small enough to fit
                const objRadius = (obj.width * obj.scaleX) / 2;

                if (objRadius < this.holeSize * 0.9) {
                    this.consumeObject(obj, i);
                }
            }
        }
    }

    consumeObject(obj, index) {
        // Remove from physics world immediately so it doesn't collide
        this.matter.world.remove(obj.body);
        obj.activeRef = false;

        // Remove from list
        this.objectsGroup.splice(index, 1);

        // Visual: Move to falling layer (behind floor)
        // Note: Containers in Phaser 3 affect rendering order.
        // We want to remove from main Scene display list and add to fallingLayer which is below floorTexture?
        // Actually fallingLayer was created first (index 2 in create: bg, falling, floor).
        // So simply moving it to fallingLayer should put it behind the floorTexture (which is drawn on top).

        // But obj is currently in the Scene's display list.
        this.children.remove(obj);
        this.fallingLayer.add(obj);

        // Tween: Shrink and move to center
        this.tweens.add({
            targets: obj,
            scaleX: 0,
            scaleY: 0,
            x: this.holePos.x,
            y: this.holePos.y,
            duration: 300,
            onComplete: () => {
                obj.destroy();
            }
        });

        const soundManager = this.game.registry.get('soundManager');
        soundManager.playSound('pop', 0.5); // Use existing 'pop' or similar

        // Gameplay Logic
        if (obj.isTarget) {
            this.targetCollected++;
            this.holeSize += GAME_CONFIG.holeGrowthPerItem * 2;
            this.events.emit('updateUI', { targets: this.targetCollected });

            // Spawn +10 text
            this.showFloatingText(this.holePos.x, this.holePos.y, "+1 TREAT!");
            soundManager.playSound('score');

            if (this.targetCollected >= this.levelData.targets) {
                this.gameOver(true);
            }
        } else {
            this.holeSize += GAME_CONFIG.holeGrowthPerItem;
        }
    }

    showFloatingText(x, y, text) {
        const t = this.add.text(x, y, text, {
            fontSize: '20px', color: '#fff', stroke: '#d946ef', strokeThickness: 4
        }).setOrigin(0.5);
        this.tweens.add({
            targets: t,
            y: y - 50,
            alpha: 0,
            duration: 800,
            onComplete: () => t.destroy()
        });
    }

    gameOver(isWin) {
        this.isGameOver = true;
        this.isVictory = isWin;
        const soundManager = this.game.registry.get('soundManager');
        const saveSystem = this.game.registry.get('saveSystem');

        if (isWin) {
            soundManager.playSound('win');

            // Update Save Data
            let gameConfig = saveSystem.getGameConfig('snack-hole-game') || { level: 0, unlockedToppings: 0 };
            gameConfig.level = Math.max(gameConfig.level, this.levelIndex + 1);
            gameConfig.unlockedToppings = (gameConfig.unlockedToppings || 0) + 1;
            saveSystem.setGameConfig('snack-hole-game', gameConfig);

            saveSystem.addCurrency(50);

            // Victory Particles
            const particles = this.add.particles(0, 0, 'particle', {
                x: this.cameras.main.width / 2,
                y: this.cameras.main.height / 2,
                speed: { min: 100, max: 300 },
                angle: { min: 0, max: 360 },
                scale: { start: 1, end: 0 },
                lifespan: 1000,
                blendMode: 'ADD',
                quantity: 20
            });
            particles.explode(50);
        } else {
            soundManager.playSound('lose');
        }

        // Delay then show Cake scene (for win) or Restart (for lose)
        this.time.delayedCall(1500, () => {
            this.scene.stop('UIScene');
            if (isWin) {
                this.scene.start('CakeScene', { isWin: true });
            } else {
                this.scene.start('MainMenu');
            }
        });
    }
}

class UIScene extends Phaser.Scene {
    constructor() { super('UIScene'); }

    create() {
        const w = this.cameras.main.width;

        // Counters
        this.targetText = this.add.text(20, 20, "Treats: 0/0", {
            fontSize: '24px', fontFamily: 'Arial', color: '#ffffff', stroke: '#000', strokeThickness: 4
        });

        this.timeText = this.add.text(w - 20, 20, "Time: 60", {
            fontSize: '24px', fontFamily: 'Arial', color: '#ffffff', stroke: '#000', strokeThickness: 4
        }).setOrigin(1, 0);

        // Listen to GameScene
        const gameScene = this.scene.get('GameScene');
        gameScene.events.on('updateUI', (data) => {
            if (data.targets !== undefined) {
                this.targetText.setText(`Treats: ${data.targets}/${gameScene.levelData.targets}`);
            }
            if (data.time !== undefined) {
                this.timeText.setText(`Time: ${data.time}`);
                if(data.time < 10) this.timeText.setColor('#ff0000');
            }
        });
    }
}

class CakeScene extends Phaser.Scene {
    constructor() { super('CakeScene'); }

    init(data) {
        this.isWin = data.isWin || false;
    }

    create() {
        const cw = this.cameras.main.width;
        const ch = this.cameras.main.height;

        this.add.rectangle(0, 0, cw, ch, 0x0f172a).setOrigin(0);

        const title = this.isWin ? "LEVEL COMPLETE!" : "CAKE BAKERY";
        this.add.text(cw/2, 50, title, {
            fontSize: '40px', color: '#d946ef', fontStyle: 'bold', stroke: '#fff', strokeThickness: 2
        }).setOrigin(0.5);

        if (this.isWin) {
            this.add.text(cw/2, 100, "New Topping Unlocked!", { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
        }

        // Draw Procedural Cake based on unlocked level
        this.drawCake(cw/2, ch/2 + 50);

        // Home Button
        const btn = this.add.rectangle(cw/2, ch - 80, 200, 60, 0x3b82f6).setInteractive(); // Blue
        this.add.text(cw/2, ch - 80, "MAIN MENU", { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
        btn.on('pointerdown', () => this.scene.start('MainMenu'));
    }

    drawCake(x, y) {
        const g = this.add.graphics();
        const saveSystem = this.game.registry.get('saveSystem');
        const gameConfig = saveSystem.getGameConfig('snack-hole-game') || { level: 0, unlockedToppings: 0 };
        const unlocked = gameConfig.unlockedToppings;

        // Plate
        g.fillStyle(0xFFFFFF);
        g.fillEllipse(x, y + 100, 300, 100);

        // Cake Base layers
        const layers = Math.min(3, 1 + Math.floor(unlocked / 2));
        const colors = [0x795548, 0xF8BBD0, 0xFFE0B2]; // Chocolate, Strawberry, Vanilla

        for(let i=0; i<layers; i++) {
            const width = 200 - (i*30);
            const height = 60;
            const yPos = y + 50 - (i * height);

            g.fillStyle(colors[i % 3]);
            g.fillRect(x - width/2, yPos - height, width, height);
            // Shade
            g.fillStyle(0x000000, 0.1);
            g.fillRect(x - width/2, yPos - height, width, 10);
        }

        // Toppings (based on progress)
        // Candles
        if (unlocked > 0) {
            g.fillStyle(0xFF0000);
            g.fillRect(x - 5, y - (layers*60) + 40, 10, 30);
            g.fillStyle(0xFFEB3B); // Flame
            g.fillCircle(x, y - (layers*60) + 35, 5);
        }

        // Sprinkles/Berries
        if (unlocked > 3) {
            for(let k=0; k<10; k++) {
                const sx = x + Phaser.Math.Between(-80, 80);
                const sy = y + 50 - Phaser.Math.Between(0, layers*60);
                g.fillStyle(Phaser.Utils.Array.GetRandom([0xFF0000, 0x00FF00, 0x0000FF]));
                g.fillCircle(sx, sy, 4);
            }
        }
    }
}
