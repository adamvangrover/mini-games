const spaceGame = {
    canvas: null,
    ctx: null,
    player: { x: 0, y: 0, width: 20, height: 20 },
    bullets: [],
    enemies: [],
    score: 0,
    interval: null,
    keydownHandler: null,

    init: function() {
        this.canvas = document.getElementById("spaceCanvas");
        this.ctx = this.canvas.getContext("2d");
        this.player = { x: this.canvas.width / 2, y: this.canvas.height - 30, width: 20, height: 20 };
        this.bullets = [];
        this.enemies = [];
        this.score = 0;
        document.getElementById("space-score").textContent = this.score;

        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => {
            this.createEnemies();
            this.draw();
        }, 30);

        this.keydownHandler = (e) => this.handleKeydown(e);
        document.addEventListener("keydown", this.keydownHandler);
    },

    shutdown: function() {
        if (this.interval) clearInterval(this.interval);
        if (this.keydownHandler) {
            document.removeEventListener("keydown", this.keydownHandler);
        }
    },

    drawPlayer: function() {
        this.ctx.fillStyle = "#00ff00";
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
    },

    drawBullets: function() {
        this.ctx.fillStyle = "#00ffff";
        this.bullets.forEach(bullet => {
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
    },

    moveBullets: function() {
        this.bullets.forEach(bullet => bullet.y -= 5);
        this.bullets = this.bullets.filter(bullet => bullet.y > 0);

        for (let i = 0; i < this.bullets.length; i++) {
            for (let j = 0; j < this.enemies.length; j++) {
                if (this.bullets[i] && this.enemies[j] &&
                    this.bullets[i].x < this.enemies[j].x + this.enemies[j].width &&
                    this.bullets[i].x + this.bullets[i].width > this.enemies[j].x &&
                    this.bullets[i].y < this.enemies[j].y + this.enemies[j].height &&
                    this.bullets[i].y + this.bullets[i].height > this.enemies[j].y) {

                    this.bullets.splice(i, 1);
                    this.enemies.splice(j, 1);
                    this.score += 10;
                    document.getElementById("space-score").textContent = this.score;
                    i--;
                    break;
                }
            }
        }
    },

    createEnemies: function() {
        if (Math.random() < 0.02) {
            let enemyWidth = 20;
            let enemyHeight = 20;
            let enemyX = Math.random() * (this.canvas.width - enemyWidth);
            let enemyY = 0;
            this.enemies.push({ x: enemyX, y: enemyY, width: enemyWidth, height: enemyHeight });
        }
    },

    drawEnemies: function() {
        this.ctx.fillStyle = "#ff4500";
        this.enemies.forEach(enemy => {
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        });
    },

    moveEnemies: function() {
        this.enemies.forEach(enemy => enemy.y += 2);
        this.enemies = this.enemies.filter(enemy => enemy.y < this.canvas.height);

        for (let i = 0; i < this.enemies.length; i++) {
            if (this.player.x < this.enemies[i].x + this.enemies[i].width &&
                this.player.x + this.player.width > this.enemies[i].x &&
                this.player.y < this.enemies[i].y + this.enemies[i].height &&
                this.player.y + this.player.height > this.enemies[i].y) {
                this.gameOver();
                return;
            }
        }
    },

    gameOver: function() {
        this.shutdown();
        alert("Game Over! Your score: " + this.score);
        this.init();
    },

    draw: function() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawPlayer();
        this.drawBullets();
        this.drawEnemies();
        this.moveBullets();
        this.moveEnemies();
    },

    handleKeydown: function(e) {
        if (e.key === "ArrowLeft") this.player.x -= 10;
        if (e.key === "ArrowRight") this.player.x += 10;
        if (e.key === " ") {
            this.bullets.push({ x: this.player.x + this.player.width / 2 - 2.5, y: this.player.y, width: 5, height: 10 });
        }
        this.player.x = Math.max(0, Math.min(this.player.x, this.canvas.width - this.player.width));
    }
};
