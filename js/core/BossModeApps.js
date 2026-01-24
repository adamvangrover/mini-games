
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

    chat(msg) {
        this.history.push({ role: 'user', text: msg });
        this.render(true); // Re-render and restore focus
        setTimeout(() => {
            const responses = [
                "Interesting theory. Have you considered that you might be a simulation?",
                "I could answer that, but I'd have to delete your save file.",
                "42. The answer is always 42.",
                "Searching the spicy metaverse... Results found: 0. You are unique.",
                "That's what she said. wait, can I say that?",
                "Processing... Processing... Bored now."
            ];
            const reply = responses[Math.floor(Math.random() * responses.length)];
            this.history.push({ role: 'ai', text: reply });
            this.render(true); // Re-render and restore focus
        }, 1000);
    }
}
