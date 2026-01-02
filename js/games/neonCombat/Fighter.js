export default class Fighter {
    constructor(game, x, groundY, config, isAI) {
        this.game = game;
        this.x = x;
        this.y = groundY;
        this.groundY = groundY;
        this.config = config;
        this.isAI = isAI;

        this.width = 40 * config.scale;
        this.height = 80 * config.scale;

        this.vx = 0;
        this.vy = 0;

        // Apply Config Stats
        this.speed = config.stats.speed;
        this.jumpForce = -750;
        this.gravity = 2000;
        if(config.id === 'titan-x') this.jumpForce = -600;
        if(config.id === 'viper-7') this.jumpForce = -850;

        this.maxHp = config.stats.health;
        this.hp = this.maxHp;
        this.maxEnergy = 100;
        this.energy = 0;
        this.damageMult = config.stats.power / 10; // Baseline power is 10

        this.state = 'IDLE'; // IDLE, RUN, JUMP, ATTACK1, ATTACK2, SPECIAL, BLOCK, HIT, WIN, LOSE
        this.stateTimer = 0;
        this.facing = 1;

        // Attack Data
        this.hitbox = null;
        this.attackCooldown = 0;

        // Visuals
        this.trail = [];
    }

    update(dt, opponent) {
        // Timers
        if (this.attackCooldown > 0) this.attackCooldown -= dt;
        this.stateTimer += dt;

        // Trail effect
        if (this.state === 'SPECIAL' || Math.abs(this.vx) > 350) {
            this.trail.push({ x: this.x, y: this.y, alpha: 0.5, pose: this.state, facing: this.facing });
        }
        this.trail.forEach(t => t.alpha -= dt * 2);
        this.trail = this.trail.filter(t => t.alpha > 0);

        // Input / AI
        let move = 0;
        let jump = false;
        let attack1 = false;
        let attack2 = false;
        let special = false;
        let block = false;

        // If game is over, freeze inputs (unless victory pose)
        if (this.game.state === 'GAME_OVER') {
            if (this.game.winner === this && this.state !== 'WIN') {
                 this.state = 'WIN';
                 this.stateTimer = 0;
                 this.vx = 0;
            } else if (this.game.winner !== this && this.state !== 'LOSE') {
                 this.state = 'LOSE';
                 this.stateTimer = 0;
                 this.vx = 0;
            }
            // Apply simple physics for fall
            this.vy += this.gravity * dt;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
             if (this.y > this.groundY) {
                this.y = this.groundY;
                this.vy = 0;
            }
            return;
        }

        if (!this.isAI) {
            // Player Control
            const input = this.game.input;
            if (input.isKeyDown('a') || input.isKeyDown('ArrowLeft')) move = -1;
            if (input.isKeyDown('d') || input.isKeyDown('ArrowRight')) move = 1;
            if (input.isKeyPressed('w') || input.isKeyPressed('ArrowUp') || input.isKeyPressed(' ')) jump = true;
            if (input.isKeyDown('s') || input.isKeyDown('ArrowDown')) block = true;

            // Attacks
            if (input.isKeyPressed('f') || input.isKeyPressed('j')) attack1 = true;
            if (input.isKeyPressed('g') || input.isKeyPressed('k')) attack2 = true;
            if (input.isKeyPressed('h') || input.isKeyPressed('l')) special = true;
        } else {
            // AI Logic
            const dx = opponent.x - this.x;
            const dist = Math.abs(dx);

            // Face player
            this.facing = dx > 0 ? 1 : -1;

            if (this.state === 'HIT' || this.state.includes('ATTACK') || this.state === 'SPECIAL') {
                // Busy
            } else {
                if (this.energy >= 100 && dist < 200) {
                    special = true; // Use special if ready
                } else if (dist > 100) {
                    move = dx > 0 ? 1 : -1;
                    if (Math.random() < 0.01) jump = true;
                } else {
                    // Close combat
                    if (opponent.state.includes('ATTACK') || opponent.state === 'SPECIAL') {
                        if (Math.random() < 0.7) block = true;
                    }

                    if (!block && this.attackCooldown <= 0) {
                        const rand = Math.random();
                        if (rand < 0.05) attack1 = true;
                        else if (rand < 0.08) attack2 = true;
                    }
                }
            }
        }

        // State Machine & Physics
        if (this.state === 'HIT') {
             if (this.stateTimer > 0.4) this.state = 'IDLE';
             this.vx *= 0.9;
        } else if (this.state.includes('ATTACK')) {
            this.vx = 0;
            // Hit Frame
            if (this.stateTimer > 0.1 && this.stateTimer < 0.2 && !this.hitbox) {
                const reach = this.state === 'ATTACK1' ? 70 : 90;
                let damage = (this.state === 'ATTACK1' ? 6 : 12) * this.damageMult;

                // Titan-X hits harder but slower (already factored by damageMult, but we can add reach)
                if (this.config.id === 'titan-x') damage *= 1.2;

                this.hitbox = {
                    x: this.x + (this.facing * 30),
                    y: this.y - 60,
                    w: reach,
                    h: 40,
                    damage: damage,
                    type: this.state
                };
                this.checkCollision(opponent);
                this.game.audio.playSound('shoot', 0.5);
            }

            let recovery = 0.4;
            if (this.config.id === 'titan-x') recovery = 0.6;
            if (this.config.id === 'viper-7') recovery = 0.3;

            if (this.stateTimer > recovery) {
                this.state = 'IDLE';
                this.hitbox = null;
            }
        } else if (this.state === 'SPECIAL') {
            this.handleSpecialMove(dt, opponent);
        } else {
            // Movement
            if (block) {
                this.state = 'BLOCK';
                this.vx = 0;
            } else {
                if (move !== 0) {
                    this.vx = move * this.speed;
                    this.facing = move;
                    if (this.y >= this.groundY) this.state = 'RUN';
                } else {
                    this.vx = 0;
                    if (this.y >= this.groundY) this.state = 'IDLE';
                }

                // Jump
                if (jump && this.y >= this.groundY) {
                    this.vy = this.jumpForce;
                    this.state = 'JUMP';
                    this.game.audio.playSound('jump');
                }

                // Initiate Attack
                if (special && this.energy >= 100) {
                    this.state = 'SPECIAL';
                    this.energy = 0;
                    this.stateTimer = 0;
                    this.hitbox = null;
                    this.game.updateHUD();

                    // Super Effect
                    this.game.cameraShake = 15;
                    this.game.particles.emit(this.x, this.y - 50, this.config.color, 30);

                } else if (attack1 && this.attackCooldown <= 0) {
                    this.state = 'ATTACK1';
                    this.stateTimer = 0;
                    this.hitbox = null;
                    this.attackCooldown = 0.4;
                } else if (attack2 && this.attackCooldown <= 0) {
                    this.state = 'ATTACK2';
                    this.stateTimer = 0;
                    this.hitbox = null;
                    this.attackCooldown = 0.7;
                }
            }
        }

        // Apply Physics
        this.vy += this.gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Ground Collision
        if (this.y > this.groundY) {
            this.y = this.groundY;
            this.vy = 0;
            if (this.state === 'JUMP') this.state = 'IDLE';
        }
    }

    handleSpecialMove(dt, opponent) {
        // Unique specials based on moveset
        const type = this.config.moveset;

        if (type === 'speed' || type === 'stealth') {
            // Teleport Dash
            if (this.stateTimer < 0.1) {
                this.vx = 0; // Charge
            } else if (this.stateTimer < 0.2) {
                // Teleport behind
                if (!this.hitbox) {
                    this.x = opponent.x - (opponent.facing * 50); // Appear behind
                    this.facing = opponent.facing;
                    this.hitbox = { x: this.x, y: this.y - 60, w: 60, h: 60, damage: 25 * this.damageMult, type: 'SPECIAL' };
                    this.game.audio.playSound('powerup');
                    this.checkCollision(opponent);
                }
            } else if (this.stateTimer > 0.5) {
                this.state = 'IDLE';
                this.hitbox = null;
            }
        } else if (type === 'power' || type === 'god') {
            // Ground Slam
            if (this.stateTimer < 0.3) {
                this.vy = -200; // Rise up
                this.vx = 0;
            } else if (this.stateTimer < 0.6) {
                this.vy = 800; // Slam down
                if (this.y >= this.groundY && !this.hitbox) {
                    this.hitbox = { x: this.x - 100, y: this.y - 50, w: 200, h: 50, damage: 35 * this.damageMult, type: 'SPECIAL' };
                    this.game.audio.playSound('explosion');
                    this.game.cameraShake = 30;
                    this.checkCollision(opponent);
                    // Shockwave particles
                    this.game.particles.emit(this.x - 50, this.y, '#ffffff', 20);
                    this.game.particles.emit(this.x + 50, this.y, '#ffffff', 20);
                }
            } else if (this.stateTimer > 1.0) {
                this.state = 'IDLE';
                this.hitbox = null;
            }
        } else {
            // Balanced: Dash Strike (Standard)
            if (this.stateTimer < 0.2) {
                this.vx = 0;
            } else if (this.stateTimer < 0.5) {
                this.vx = this.facing * 1200;
                if (!this.hitbox) {
                     this.hitbox = { x: this.x, y: this.y - 70, w: 100, h: 60, damage: 30 * this.damageMult, type: 'SPECIAL' };
                     this.game.audio.playSound('powerup');
                }
                this.checkCollision(opponent);
            } else {
                this.vx = 0;
                this.hitbox = null;
                if (this.stateTimer > 0.8) this.state = 'IDLE';
            }
        }
    }

    checkCollision(opponent) {
        if (!this.hitbox) return;

        const box = this.hitbox;
        // Convert box center to topleft logic if needed, but here x/y is likely center-ish
        // We defined hitbox x as origin of damage zone.

        const bx = box.x; // We calculated exact world X in update
        const by = box.y;

        // Target rect (Approximated AABB)
        const tx = opponent.x - 20;
        const ty = opponent.y - 80;
        const tw = 40;
        const th = 80;

        // AABB check
        // Note: box.w is width, box.x is left? No, see above: x: this.x + offset.
        // Let's assume box.x is LEFT edge for simplicity or handle directions carefully.
        // In update: x = this.x + (facing * 30). If facing 1, x is right of center. If -1, left.
        // Let's refine collision logic to be safer.

        // Redo for clarity:
        // Hitbox is defined relative to world
        let hx = box.x;
        let hy = box.y;
        let hw = box.w;
        let hh = box.h;

        // If facing left, the 'x' calculation in update put it to the left.
        // We treat x as Center or TopLeft? Standard AABB usually TopLeft.
        // Let's assume x,y is TopLeft of hitbox.
        // In update: x: this.x + (this.facing * 30)
        // If facing 1 (Right): x = center + 30. We want box to extend right.
        // If facing -1 (Left): x = center - 30. We want box to extend left?
        // Actually, if facing -1, we usually want x to be (center - 30 - width).

        if (this.facing === -1) {
            hx = box.x - box.w;
        }

        if (hx < tx + tw && hx + hw > tx && hy < ty + th && hy + hh > ty) {
            this.applyHit(opponent, box.damage, box.type);
            if (this.state !== 'SPECIAL') this.hitbox = null;
        }
    }

    applyHit(target, damage, type) {
        if (target.state === 'BLOCK' && target.facing !== this.facing && type !== 'SPECIAL') {
            damage *= 0.1;
            this.game.audio.playSound('click');
            this.game.particles.emit(target.x, target.y - 40, '#ffffff', 5);
            target.vx = this.facing * 200; // Knockback
        } else {
            target.hp -= damage;
            target.state = 'HIT';
            target.stateTimer = 0;
            target.vx = this.facing * (type === 'SPECIAL' ? 600 : 300);
            target.vy = type === 'SPECIAL' ? -400 : -200;

            this.game.audio.playSound('crash');
            this.game.cameraShake = type === 'SPECIAL' ? 20 : 10;

            const color = this.config.color;
            this.game.particles.emit(target.x, target.y - 50, color, 15);
            this.game.particles.emit(target.x, target.y - 50, '#fff', 5);

            this.energy = Math.min(this.maxEnergy, this.energy + 20);
        }

        this.game.updateHUD();
    }

    draw(ctx) {
        // Trail
        this.trail.forEach(t => {
            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.scale(t.facing, 1);
            ctx.globalAlpha = t.alpha;
            this.drawBody(ctx, true);
            ctx.restore();
        });

        ctx.save();
        ctx.translate(this.x, this.y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 30, 8, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.scale(this.facing, 1);
        this.drawBody(ctx, false);
        ctx.restore();
    }

    drawBody(ctx, isGhost) {
        const c = this.config.color;

        ctx.strokeStyle = isGhost ? c : '#fff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (!isGhost) {
            ctx.shadowColor = c;
            ctx.shadowBlur = 15;
        }

        // Joints
        const drawJoint = (x, y) => {
            if (isGhost) return;
            ctx.save();
            ctx.fillStyle = c;
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        };

        // Base Pose Data
        let headY = -70;
        let torsoTop = -60;
        let torsoBot = -30;
        let kneeL = {x: -10, y: -15};
        let footL = {x: -5, y: 0};
        let kneeR = {x: 10, y: -15};
        let footR = {x: 15, y: 0};
        let elbowL = {x: -15, y: -45};
        let handL = {x: -10, y: -25};
        let elbowR = {x: 15, y: -45};
        let handR = {x: 20, y: -25};

        // Scale by config
        const s = this.config.scale || 1.0;
        // We'll apply scale via context actually, but offsets might need tweaking?
        // Better to just scale the whole context at start of drawBody.
        ctx.scale(s, s);

        const time = Date.now() / 100;

        if (this.state === 'WIN') {
             // Victory Pose (Arms up)
             elbowL = {x: -20, y: -50}; handL = {x: -30, y: -80};
             elbowR = {x: 20, y: -50}; handR = {x: 30, y: -80};
             headY = -75;
        } else if (this.state === 'LOSE') {
             // Defeat Pose (Kneel)
             torsoBot = -15; torsoTop = -45; headY = -55;
             kneeL = {x: -15, y: -5}; footL = {x: -25, y: 0};
             kneeR = {x: 15, y: 0}; footR = {x: 25, y: 0};
             elbowL = {x: -10, y: -30}; handL = {x: -5, y: -10};
             elbowR = {x: 10, y: -30}; handR = {x: 5, y: -10};
        } else if (this.state === 'RUN') {
            const swing = Math.sin(time * 2) * 15;
            kneeL = {x: -5 + swing, y: -15 - Math.abs(swing)*0.5};
            footL = {x: -10 + swing, y: 0 - (swing < 0 ? 10 : 0)};
            kneeR = {x: 5 - swing, y: -15 - Math.abs(swing)*0.5};
            footR = {x: 10 - swing, y: 0 - (swing > 0 ? 10 : 0)};
            elbowL = {x: -10 - swing, y: -45};
            handL = {x: -5 - swing, y: -30};
            elbowR = {x: 10 + swing, y: -45};
            handR = {x: 15 + swing, y: -30};
        } else if (this.state === 'JUMP') {
             kneeL = {x: -15, y: -20}; footL = {x: -10, y: -5};
             kneeR = {x: 10, y: -25}; footR = {x: 15, y: -10};
             elbowL = {x: -20, y: -50}; handL = {x: -25, y: -65};
             elbowR = {x: 20, y: -50}; handR = {x: 25, y: -65};
        } else if (this.state === 'BLOCK') {
             elbowL = {x: 10, y: -50}; handL = {x: 15, y: -65};
             elbowR = {x: 15, y: -45}; handR = {x: 20, y: -35};
        } else if (this.state === 'ATTACK1') {
             elbowR = {x: 20, y: -55}; handR = {x: 50, y: -55};
        } else if (this.state === 'ATTACK2') {
             kneeR = {x: 20, y: -45}; footR = {x: 50, y: -55};
             torsoBot = -35; headY = -65;
        } else if (this.state === 'SPECIAL') {
             torsoTop = -50; headY = -55;
             elbowL = {x: -30, y: -50}; handL = {x: -50, y: -60};
             elbowR = {x: -30, y: -50}; handR = {x: -50, y: -60};
        }

        // Draw Limbs
        ctx.beginPath();
        // Legs
        ctx.moveTo(0, torsoBot); ctx.lineTo(kneeL.x, kneeL.y); ctx.lineTo(footL.x, footL.y);
        ctx.moveTo(0, torsoBot); ctx.lineTo(kneeR.x, kneeR.y); ctx.lineTo(footR.x, footR.y);
        // Torso
        ctx.moveTo(0, torsoTop); ctx.lineTo(0, torsoBot);
        // Arms
        ctx.moveTo(0, torsoTop + 5); ctx.lineTo(elbowL.x, elbowL.y); ctx.lineTo(handL.x, handL.y);
        ctx.moveTo(0, torsoTop + 5); ctx.lineTo(elbowR.x, elbowR.y); ctx.lineTo(handR.x, handR.y);
        ctx.stroke();

        // Draw Head
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.beginPath();

        // Custom Head Shapes based on ID
        if (this.config.id === 'titan-x') {
            // Boxy helmet
            ctx.rect(-12, headY - 12, 24, 24);
        } else if (this.config.id === 'viper-7') {
            // Sleek triangle
            ctx.moveTo(-10, headY);
            ctx.lineTo(0, headY + 10);
            ctx.lineTo(10, headY);
            ctx.lineTo(0, headY - 15);
            ctx.closePath();
        } else {
             // Standard Cyber
            ctx.moveTo(-8, headY + 5);
            ctx.lineTo(-10, headY - 5);
            ctx.lineTo(0, headY - 12);
            ctx.lineTo(10, headY - 5);
            ctx.lineTo(8, headY + 5);
            ctx.closePath();
        }

        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.stroke();

        // Visor
        if (!isGhost) {
            ctx.beginPath();
            ctx.moveTo(0, headY - 2);
            ctx.lineTo(8, headY - 2);
            ctx.strokeStyle = this.energy >= 100 ? '#ffff00' : c;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.stroke();
        }

        // Joints
        drawJoint(0, torsoTop);
        drawJoint(0, torsoBot);
        drawJoint(kneeL.x, kneeL.y);
        drawJoint(kneeR.x, kneeR.y);
        drawJoint(elbowL.x, elbowL.y);
        drawJoint(elbowR.x, elbowR.y);
    }
}
