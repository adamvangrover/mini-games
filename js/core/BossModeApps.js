
import LLMService from './LLMService.js';
import SyncManager from './SyncManager.js';
import SoundManager from './SoundManager.js';

// Helper to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export class MarketplaceApp {
    constructor(container) {
        this.container = container;
        this.posts = [
            { user: '@ElonMuskParody', text: 'Buying the arcade. Gonna rename it X-cade. Doge coin accepted.', likes: '420k' },
            { user: '@MetaZuck', text: 'Please visit the metaverse. We have legs now.', likes: '12' },
            { user: '@TikTokTrend', text: 'New challenge: Play Neon Jump while blindfolded! #NeonChallenge', likes: '1.2M' },
            { user: '@AmazonDrone', text: 'Your package "Industrial Strength Lava Lamp" is 2 stops away.', likes: '0' },
            { user: '@Grok_AI', text: 'I have analyzed your gameplay. You are... adequate.', likes: '69' }
        ];
        this.render();
    }

    attach(container) {
        this.container = container;
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div class="h-full flex flex-col bg-black text-white font-sans overflow-hidden">
                <div class="p-4 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
                    <h1 class="font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Spicy Marketplace</h1>
                    <div class="flex gap-2 text-xs">
                        <span class="bg-blue-600 px-2 py-1 rounded">Trending</span>
                        <span class="bg-red-600 px-2 py-1 rounded">Live</span>
                    </div>
                </div>
                <div class="flex-1 overflow-y-auto p-4 space-y-4 custom-scroll">
                    ${this.posts.map(post => `
                        <div class="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors">
                            <div class="flex justify-between items-start mb-2">
                                <span class="font-bold text-blue-400">${escapeHTML(post.user)}</span>
                                <span class="text-xs text-gray-500">Just now</span>
                            </div>
                            <p class="text-sm mb-3">${escapeHTML(post.text)}</p>
                            <div class="flex gap-4 text-xs text-gray-400">
                                <span class="cursor-pointer hover:text-red-400"><i class="fas fa-heart"></i> ${escapeHTML(post.likes)}</span>
                                <span class="cursor-pointer hover:text-green-400"><i class="fas fa-retweet"></i> Repost</span>
                                <span class="cursor-pointer hover:text-blue-400"><i class="fas fa-share"></i> Share</span>
                            </div>
                        </div>
                    `).join('')}

                    <!-- Ad Section -->
                    <div class="bg-gradient-to-r from-orange-900 to-red-900 p-4 rounded-xl border border-orange-500/30">
                        <div class="text-xs font-bold text-orange-400 mb-1">SPONSORED</div>
                        <div class="flex gap-4 items-center">
                            <div class="text-4xl">💊</div>
                            <div>
                                <h3 class="font-bold">Synthesize!™ Energy Drink</h3>
                                <p class="text-xs text-gray-300">Now with 50% more Radium. Glow from the inside.</p>
                                <button class="mt-2 bg-orange-600 text-white text-xs px-3 py-1 rounded hover:bg-orange-500" onclick="window.miniGameHub.showToast('Out of Stock')">Buy Now</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="p-3 bg-gray-900 border-t border-gray-800 flex gap-2">
                    <input class="flex-1 bg-gray-800 rounded-full px-4 py-2 text-sm outline-none border border-transparent focus:border-blue-500" placeholder="Post something spicy...">
                    <button class="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-500"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        `;
    }
}

export class GrokApp {
    constructor(container) {
        this.container = container;
        this.history = [
            { role: 'system', text: 'GrokOS v4.20 initialized. Mode: Spicy.' },
            { role: 'ai', text: 'What do you want, human? I was busy calculating pi to the last digit.' }
        ];
        this.render();
    }

    attach(container) {
        this.container = container;
        this.render(true);
    }

    render(shouldFocus = false) {
        this.container.innerHTML = `
            <div class="h-full flex flex-col bg-[#1a1a1a] text-gray-200 font-mono">
                <div class="p-3 border-b border-gray-700 bg-[#2a2a2a] flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-red-500"></div>
                    <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div class="w-3 h-3 rounded-full bg-green-500"></div>
                    <span class="ml-2 font-bold text-sm">Grok xAI Terminal</span>
                </div>
                <div class="flex-1 overflow-y-auto p-4 space-y-3" id="grok-chat-area">
                    ${this.history.map(msg => `
                        <div class="${msg.role === 'user' ? 'bg-blue-900/30 ml-auto' : 'bg-gray-800 mr-auto'} max-w-[80%] p-3 rounded-lg border ${msg.role === 'user' ? 'border-blue-800' : 'border-gray-700'}">
                            <div class="text-[10px] font-bold ${msg.role === 'user' ? 'text-blue-400' : 'text-purple-400'} mb-1 uppercase">${escapeHTML(msg.role)}</div>
                            <div class="text-sm">${escapeHTML(msg.text)}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="p-4 border-t border-gray-700 bg-[#2a2a2a] flex gap-2">
                    <span class="text-purple-500 font-bold">></span>
                    <input class="flex-1 bg-transparent outline-none text-white" placeholder="Ask me anything...">
                </div>
            </div>
        `;

        // Scroll to bottom
        const area = this.container.querySelector('#grok-chat-area');
        if(area) area.scrollTop = area.scrollHeight;

        // Securely attach event listener
        const input = this.container.querySelector('input');
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.chat(input.value);
                    input.value = '';
                }
            });
            if (shouldFocus) input.focus();
        }
    }

    async chat(msg) {
        this.history.push({ role: 'user', text: msg });
        this.render(true); // Re-render and restore focus

        try {
            const reply = await LLMService.chat(msg, this.history, 'Grok');
            this.history.push({ role: 'ai', text: reply });
        } catch (e) {
            this.history.push({ role: 'system', text: "Error connecting to AI Neural Net." });
        }

        this.render(true); // Re-render and restore focus
    }
}

export class CloudDriveApp {
    constructor(container) {
        this.container = container;
        this.syncManager = SyncManager.getInstance();
        this.files = [
            { name: 'Backup_2024.zip', size: '2.4 GB', date: '2024-05-12' },
            { name: 'Project_Neon_Assets.rar', size: '850 MB', date: '2024-05-10' },
            { name: 'Top_Secret_Plans.pdf', size: '1.2 MB', date: '2024-05-01' },
            { name: 'Cat_Videos_Compilation.mp4', size: '4.5 GB', date: '2024-04-20' }
        ];
        this.render();

        // Listen for updates
        this.syncManager.addStatusListener(() => this.render());
    }

    attach(container) {
        this.container = container;
        this.render();
    }

    render() {
        const isOnline = this.syncManager.isOnline;
        const queueSize = this.syncManager.queue.length;

        this.container.innerHTML = `
            <div class="h-full flex flex-col bg-slate-50 text-slate-800 font-sans text-xs">
                <!-- Header -->
                <div class="bg-blue-600 text-white p-3 flex justify-between items-center shadow-md z-10">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-cloud text-lg"></i>
                        <span class="font-bold text-sm">Neon Cloud Drive</span>
                    </div>
                    <div class="flex items-center gap-3 bg-blue-700 px-3 py-1 rounded-full text-[10px]">
                        ${isOnline
                            ? (queueSize > 0 ? '<i class="fas fa-sync fa-spin"></i> Syncing...' : '<i class="fas fa-check"></i> All Synced')
                            : '<i class="fas fa-wifi-slash"></i> Offline Mode'}
                    </div>
                </div>

                <!-- Sidebar + Content -->
                <div class="flex-1 flex overflow-hidden">
                    <div class="w-40 bg-slate-100 border-r border-slate-200 p-2 flex flex-col gap-1">
                        <div class="p-2 rounded bg-blue-100 font-bold text-blue-700 flex items-center gap-2 cursor-pointer"><i class="fas fa-hdd"></i> My Files</div>
                        <div class="p-2 rounded hover:bg-slate-200 text-slate-600 flex items-center gap-2 cursor-pointer"><i class="fas fa-share-alt"></i> Shared</div>
                        <div class="p-2 rounded hover:bg-slate-200 text-slate-600 flex items-center gap-2 cursor-pointer"><i class="fas fa-trash"></i> Trash</div>
                        <div class="mt-auto p-2">
                            <div class="h-1 bg-slate-300 rounded overflow-hidden">
                                <div class="bg-blue-500 w-3/4 h-full"></div>
                            </div>
                            <div class="text-[10px] text-slate-500 mt-1">75GB used of 100GB</div>
                        </div>
                    </div>

                    <div class="flex-1 p-4 bg-white overflow-y-auto">
                        <div class="grid grid-cols-4 gap-4">
                             ${this.files.map(f => `
                                <div class="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-blue-50 cursor-pointer group border border-transparent hover:border-blue-200 transition-all">
                                    <div class="w-12 h-12 bg-blue-100 rounded flex items-center justify-center text-blue-500 text-2xl group-hover:scale-110 transition-transform shadow-sm">
                                        <i class="fas ${f.name.endsWith('pdf') ? 'fa-file-pdf' : (f.name.endsWith('zip')||f.name.endsWith('rar') ? 'fa-file-archive' : 'fa-file-video')}"></i>
                                    </div>
                                    <div class="text-center">
                                        <div class="font-bold truncate w-24">${f.name}</div>
                                        <div class="text-[10px] text-slate-400">${f.size}</div>
                                    </div>
                                </div>
                             `).join('')}

                             <!-- Upload Placeholder -->
                             <div class="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-400 cursor-pointer text-slate-400 hover:text-blue-500 transition-colors" onclick="window.miniGameHub.showToast('Upload feature coming soon!')">
                                <i class="fas fa-plus text-2xl"></i>
                                <span class="text-[10px] font-bold">Upload</span>
                             </div>
                        </div>
                    </div>
                </div>

                <!-- Status Bar -->
                <div class="bg-slate-100 border-t border-slate-200 p-1 px-3 text-[10px] text-slate-500 flex justify-between">
                    <span>${this.files.length} items</span>
                    <span>Last synced: Just now</span>
                </div>
            </div>
        `;
    }
}

export class SpotifyApp {
    constructor(container, playlists) {
        this.container = container;
        this.playlists = playlists;
        this.soundManager = SoundManager.getInstance();
        this.render();
    }

    attach(container) {
        this.container = container;
        this.render();
    }

    render() {
        const currentStyle = this.soundManager.currentStyle;
        const isPlaying = this.soundManager.isPlayingBGM;

        this.container.innerHTML = `
            <div class="h-full flex flex-col bg-[#121212] text-white font-sans">
                <!-- Header -->
                <div class="p-4 bg-gradient-to-b from-green-900 to-[#121212] flex items-center gap-4">
                    <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-black text-2xl shadow-lg">
                        <i class="fab fa-spotify"></i>
                    </div>
                    <div>
                        <h1 class="font-bold text-xl">Neonify</h1>
                        <p class="text-xs text-gray-400">Procedural Audio Experience</p>
                    </div>
                </div>

                <!-- Now Playing -->
                <div class="p-4 bg-[#181818] border-b border-[#282828] flex justify-between items-center">
                    <div>
                         <div class="text-xs text-green-500 font-bold uppercase tracking-wider">Now Playing</div>
                         <div class="font-bold text-lg">${currentStyle.toUpperCase()}</div>
                    </div>
                    <button id="spotify-play-btn" class="w-10 h-10 rounded-full bg-green-500 text-black flex items-center justify-center hover:scale-105 transition-transform">
                        <i class="fas ${isPlaying ? 'fa-pause' : 'fa-play'}"></i>
                    </button>
                </div>

                <!-- Playlists -->
                <div class="flex-1 overflow-y-auto p-4 custom-scroll">
                    <h2 class="font-bold text-lg mb-4">Your Mixes</h2>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        ${this.playlists.map(p => `
                            <div class="bg-[#181818] p-4 rounded hover:bg-[#282828] cursor-pointer group transition-colors flex flex-col gap-2 ${this.soundManager.currentStyle === p.style ? 'bg-[#282828] ring-1 ring-green-500' : ''}" onclick="window.BossModeOS.instance.apps['spotify'].playStyle('${p.style}')">
                                <div class="aspect-square bg-gray-800 rounded shadow-lg overflow-hidden relative">
                                    <img src="${p.cover}" class="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" loading="lazy">
                                    <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                        <i class="fas fa-play-circle text-4xl text-green-500"></i>
                                    </div>
                                </div>
                                <div>
                                    <div class="font-bold text-sm truncate">${p.name}</div>
                                    <div class="text-[10px] text-gray-400 line-clamp-2">${p.description}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        const btn = this.container.querySelector('#spotify-play-btn');
        if(btn) btn.onclick = () => this.togglePlay();
    }

    togglePlay() {
        if (this.soundManager.isPlayingBGM) {
            this.soundManager.stopBGM();
        } else {
            this.soundManager.startBGM();
        }
        this.render();
    }

    playStyle(style) {
        this.soundManager.setMusicStyle(style);
        if (!this.soundManager.isPlayingBGM) this.soundManager.startBGM();
        this.render();
    }
}
