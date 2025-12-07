export default class LifeSimGame {
    constructor() {
        this.container = null;
        this.state = {
            name: "Player",
            money: 100,
            happiness: 50,
            energy: 100,
            location: 'home', // home, mall, work
            inventory: [],
            socialFeed: [],
            tvChannel: 0,
            tvShows: [],
            isPlaying: false
        };

        // Generated Content
        this.movies = [
            "The Cybernetic Hamster", "Space Romance 3000", "Attack of the 50ft Influencer",
            "Neon Nights", "The Great Spreadsheet", "Zombie Barista", "My Neighbor Totoro's Lawyer"
        ];
        this.socialUsers = ["cool_guy99", "pixel_queen", "crypto_bro", "cat_lover_x", "neon_drifter"];
        this.socialPosts = [
            "Just ate a digital burger. #yum", "Why is the sky neon today?", "Buying more stonks!",
            "Anyone see that new movie?", "My avatar looks fresh.", "Grinding levels...", "LFG!!!"
        ];
    }

    async init(container) {
        this.container = container;
        this.container.innerHTML = this.getHTML();
        this.addStyles();

        this.state.isPlaying = true;

        // Generate initial content
        this.generateSocialFeed();
        this.generateTVShows();

        this.updateUI();
        this.bindEvents();

        // Start Loops
        this.gameLoop = setInterval(() => this.update(1), 1000); // 1 sec tick
    }

    getHTML() {
        return `
        <div id="ls-wrapper">
            <div id="ls-sidebar">
                <div class="ls-profile">
                    <div class="ls-avatar">👤</div>
                    <div class="ls-name" id="ls-name-display">Player</div>
                    <div class="ls-stats">
                        <div>💰 $<span id="ls-money">0</span></div>
                        <div>😊 <span id="ls-happiness">0</span>%</div>
                        <div>⚡ <span id="ls-energy">0</span>%</div>
                    </div>
                </div>

                <div class="ls-nav">
                    <button id="btn-home" class="active">🏠 Home</button>
                    <button id="btn-mall">🛍️ Mall</button>
                    <button id="btn-work">💼 Work</button>
                    <button id="btn-social">📱 Social</button>
                    <button id="btn-exit" style="margin-top:auto; color:red; border-color:red;">EXIT</button>
                </div>
            </div>

            <div id="ls-main">
                <!-- HOME VIEW -->
                <div id="view-home" class="ls-view">
                    <h2>My Apartment</h2>
                    <div class="ls-room">
                        <div class="ls-tv-container">
                            <div class="ls-tv-screen" id="ls-tv-screen">
                                <div id="ls-tv-content">OFF</div>
                            </div>
                            <div class="ls-tv-controls">
                                <button id="btn-tv-toggle">Power</button>
                                <button id="btn-tv-next">Ch+</button>
                            </div>
                        </div>
                        <div class="ls-actions">
                            <button id="btn-sleep">Sleep (+Energy)</button>
                            <button id="btn-snack">Eat Snack (-$10, +Energy)</button>
                        </div>
                    </div>
                </div>

                <!-- MALL VIEW -->
                <div id="view-mall" class="ls-view hidden">
                    <h2>Neon Mall</h2>
                    <div class="ls-grid" id="ls-shop-grid">
                        <!-- Items injected here -->
                    </div>
                    <div id="ls-movie-theater">
                        <h3>Cinema 4D</h3>
                        <p>Now Showing: <span id="ls-movie-title">...</span></p>
                        <button id="btn-watch-movie">Watch Ticket ($15)</button>
                    </div>
                </div>

                <!-- WORK VIEW -->
                <div id="view-work" class="ls-view hidden">
                    <h2>Office Job</h2>
                    <p>Click the button to work hard!</p>
                    <div class="ls-work-area">
                        <button id="btn-do-work" class="pulse-btn">WORK WORK WORK</button>
                        <div id="ls-work-feedback"></div>
                    </div>
                </div>

                <!-- SOCIAL VIEW -->
                <div id="view-social" class="ls-view hidden">
                    <h2>Social Feed</h2>
                    <div class="ls-feed" id="ls-feed-container">
                        <!-- Posts -->
                    </div>
                    <div class="ls-post-box">
                        <input type="text" id="ls-post-input" placeholder="What's on your mind?">
                        <button id="btn-post">Post</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #ls-wrapper {
                display: flex;
                width: 100%;
                height: 100%;
                background: #1a1a2e;
                color: #e0e0e0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            #ls-sidebar {
                width: 250px;
                background: #16213e;
                display: flex;
                flex-direction: column;
                padding: 20px;
                border-right: 2px solid #0f3460;
            }
            .ls-profile {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid #0f3460;
            }
            .ls-avatar {
                font-size: 4rem;
                background: #0f3460;
                width: 100px;
                height: 100px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 10px;
                border: 2px solid #e94560;
            }
            .ls-name { font-size: 1.5rem; font-weight: bold; margin-bottom: 10px; }
            .ls-stats { text-align: left; background: #0f3460; padding: 10px; border-radius: 5px; }
            .ls-nav { display: flex; flex-direction: column; gap: 10px; flex-grow: 1; }
            .ls-nav button {
                padding: 12px;
                text-align: left;
                background: transparent;
                border: 1px solid #0f3460;
                color: #aaa;
                cursor: pointer;
                transition: 0.2s;
                border-radius: 5px;
            }
            .ls-nav button:hover, .ls-nav button.active {
                background: #e94560;
                color: white;
                border-color: #e94560;
            }

            #ls-main { flex-grow: 1; padding: 30px; overflow-y: auto; }
            .ls-view { height: 100%; display: flex; flex-direction: column; }
            .ls-view.hidden { display: none; }

            h2 { color: #e94560; border-bottom: 2px solid #e94560; padding-bottom: 10px; margin-bottom: 20px; }

            /* Home */
            .ls-room { display: flex; flex-direction: column; gap: 20px; align-items: center; }
            .ls-tv-container { background: #000; padding: 10px; border-radius: 10px; border: 2px solid #333; width: 400px; }
            .ls-tv-screen {
                width: 100%; height: 225px; background: #111; margin-bottom: 10px;
                display: flex; align-items: center; justify-content: center;
                color: #333; font-family: monospace; font-size: 1.2rem; text-align: center;
                overflow: hidden; position: relative;
            }
            .ls-tv-screen.on {
                background: white;
                animation: tvFlicker 0.1s infinite;
            }
            @keyframes tvFlicker { 0% { opacity: 0.95; } 100% { opacity: 1; } }

            /* Social */
            .ls-feed { flex-grow: 1; background: #16213e; border-radius: 10px; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; }
            .ls-post { background: #0f3460; padding: 15px; border-radius: 8px; border-left: 4px solid #e94560; }
            .ls-post-user { font-weight: bold; color: #4cc9f0; margin-bottom: 5px; font-size: 0.9rem; }
            .ls-post-box { display: flex; gap: 10px; }
            .ls-post-box input { flex-grow: 1; padding: 10px; background: #0f3460; border: none; color: white; border-radius: 5px; }
            .ls-post-box button { background: #e94560; color: white; border: none; padding: 0 20px; border-radius: 5px; cursor: pointer; }

            /* Shop */
            .ls-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
            .ls-item { background: #16213e; padding: 15px; border-radius: 8px; text-align: center; cursor: pointer; transition: 0.2s; border: 1px solid transparent; }
            .ls-item:hover { border-color: #e94560; transform: translateY(-5px); }

            /* Work */
            .ls-work-area { text-align: center; margin-top: 50px; }
            .pulse-btn {
                padding: 20px 40px; font-size: 1.5rem; background: #4cc9f0; border: none; color: #000; font-weight: bold; border-radius: 50px; cursor: pointer;
                transition: transform 0.1s;
                box-shadow: 0 0 20px rgba(76, 201, 240, 0.5);
            }
            .pulse-btn:active { transform: scale(0.95); }
        `;
        this.container.appendChild(style);
    }

    updateUI() {
        this.container.querySelector('#ls-money').innerText = this.state.money;
        this.container.querySelector('#ls-happiness').innerText = this.state.happiness;
        this.container.querySelector('#ls-energy').innerText = this.state.energy;
        this.container.querySelector('#ls-name-display').innerText = this.state.name;
    }

    bindEvents() {
        const setView = (view) => {
            this.container.querySelectorAll('.ls-view').forEach(el => el.classList.add('hidden'));
            this.container.querySelector(`#view-${view}`).classList.remove('hidden');
            this.container.querySelectorAll('.ls-nav button').forEach(el => el.classList.remove('active'));
            this.container.querySelector(`#btn-${view}`).classList.add('active');
            this.state.location = view;

            if(view === 'mall') this.renderShop();
            if(view === 'social') this.renderSocial();
        };

        this.container.querySelector('#btn-home').onclick = () => setView('home');
        this.container.querySelector('#btn-mall').onclick = () => setView('mall');
        this.container.querySelector('#btn-work').onclick = () => setView('work');
        this.container.querySelector('#btn-social').onclick = () => setView('social');
        this.container.querySelector('#btn-exit').onclick = () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        };

        // Home
        this.container.querySelector('#btn-sleep').onclick = () => {
            this.state.energy = 100;
            this.state.happiness += 5;
            this.notify("You slept well. Energy restored.");
            this.updateUI();
        };
        this.container.querySelector('#btn-snack').onclick = () => {
            if(this.state.money >= 10) {
                this.state.money -= 10;
                this.state.energy = Math.min(100, this.state.energy + 20);
                this.notify("Yummy snack!");
                this.updateUI();
            } else this.notify("Too poor for snacks!");
        };

        // TV
        let tvOn = false;
        const tvScreen = this.container.querySelector('#ls-tv-screen');
        const tvContent = this.container.querySelector('#ls-tv-content');

        this.container.querySelector('#btn-tv-toggle').onclick = () => {
            tvOn = !tvOn;
            if(tvOn) {
                tvScreen.classList.add('on');
                this.updateTV();
            } else {
                tvScreen.classList.remove('on');
                tvContent.innerHTML = "OFF";
                tvScreen.style.backgroundImage = 'none';
            }
        };
        this.container.querySelector('#btn-tv-next').onclick = () => {
            if(tvOn) {
                this.state.tvChannel = (this.state.tvChannel + 1) % this.state.tvShows.length;
                this.updateTV();
            }
        };

        // Work
        this.container.querySelector('#btn-do-work').onclick = () => {
            if(this.state.energy >= 10) {
                this.state.energy -= 10;
                const pay = Math.floor(Math.random() * 20) + 10;
                this.state.money += pay;
                this.state.happiness -= 2;
                this.notify(`Worked hard! Earned $${pay}`);
                this.updateUI();
            } else this.notify("Too tired to work...");
        };

        // Social
        this.container.querySelector('#btn-post').onclick = () => {
            const input = this.container.querySelector('#ls-post-input');
            const text = input.value.trim();
            if(text) {
                this.addPost(this.state.name, text);
                input.value = '';
                this.state.happiness += 5;
                this.notify("Posted to social media!");
                this.updateUI();
            }
        };

        // Mall
        this.container.querySelector('#btn-watch-movie').onclick = () => {
            if(this.state.money >= 15) {
                this.state.money -= 15;
                this.state.happiness += 20;
                this.notify("Enjoyed the movie!");
                this.updateUI();
            } else this.notify("Not enough money.");
        };
    }

    // --- TV SYSTEM ---
    generateTVShows() {
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff'];
        for(let i=0; i<10; i++) {
            this.state.tvShows.push({
                name: `Channel ${i+1}`,
                color: colors[i % colors.length],
                program: this.movies[Math.floor(Math.random() * this.movies.length)]
            });
        }
    }

    updateTV() {
        const show = this.state.tvShows[this.state.tvChannel];
        const tvContent = this.container.querySelector('#ls-tv-content');
        const tvScreen = this.container.querySelector('#ls-tv-screen');

        tvContent.innerHTML = `<div style="font-weight:bold; font-size:1.5rem">${show.name}</div><div>${show.program}</div>`;
        tvScreen.style.backgroundColor = show.color;
        // Generate random gradient
        tvScreen.style.backgroundImage = `linear-gradient(${Math.random()*360}deg, transparent, rgba(0,0,0,0.5))`;
    }

    // --- SOCIAL SYSTEM ---
    generateSocialFeed() {
        for(let i=0; i<5; i++) {
            this.addPost(
                this.socialUsers[Math.floor(Math.random() * this.socialUsers.length)],
                this.socialPosts[Math.floor(Math.random() * this.socialPosts.length)]
            );
        }
    }

    addPost(user, text) {
        this.state.socialFeed.unshift({ user, text, time: new Date().toLocaleTimeString() });
        if(this.state.location === 'social') this.renderSocial();
    }

    renderSocial() {
        const container = this.container.querySelector('#ls-feed-container');
        container.innerHTML = '';
        this.state.socialFeed.forEach(post => {
            const el = document.createElement('div');
            el.className = 'ls-post';
            el.innerHTML = `<div class="ls-post-user">${post.user} <span style="color:#666; font-weight:normal">${post.time}</span></div><div>${post.text}</div>`;
            container.appendChild(el);
        });
    }

    // --- SHOP SYSTEM ---
    renderShop() {
        const items = [
            { name: "Coffee", cost: 5, icon: "☕" },
            { name: "Hat", cost: 25, icon: "🧢" },
            { name: "Sneakers", cost: 80, icon: "👟" },
            { name: "Guitar", cost: 200, icon: "🎸" },
            { name: "Plant", cost: 15, icon: "🪴" },
            { name: "Game Console", cost: 300, icon: "🎮" }
        ];

        const grid = this.container.querySelector('#ls-shop-grid');
        grid.innerHTML = '';
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'ls-item';
            el.innerHTML = `<div style="font-size:2rem">${item.icon}</div><div>${item.name}</div><div style="color:#e94560">$${item.cost}</div>`;
            el.onclick = () => {
                if(this.state.money >= item.cost) {
                    this.state.money -= item.cost;
                    this.state.inventory.push(item);
                    this.state.happiness += 10;
                    this.notify(`Bought ${item.name}!`);
                    this.updateUI();
                } else this.notify("Can't afford that.");
            };
            grid.appendChild(el);
        });

        // Movie Title
        this.container.querySelector('#ls-movie-title').innerText = this.movies[Math.floor(Math.random() * this.movies.length)];
    }

    notify(msg) {
        // Simple toast
        const toast = document.createElement('div');
        toast.innerText = msg;
        toast.style.position = 'absolute';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = '#e94560';
        toast.style.color = 'white';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '5px';
        toast.style.boxShadow = '0 5px 15px rgba(0,0,0,0.5)';
        toast.style.zIndex = 100;
        this.container.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    update(dt) {
        if(!this.state.isPlaying) return;

        // Random social posts
        if(Math.random() < 0.05) {
            this.addPost(
                this.socialUsers[Math.floor(Math.random() * this.socialUsers.length)],
                this.socialPosts[Math.floor(Math.random() * this.socialPosts.length)]
            );
        }
    }

    shutdown() {
        this.state.isPlaying = false;
        clearInterval(this.gameLoop);
    }
}
