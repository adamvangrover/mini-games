// Matterhorn Arcade (Arcade Edition Port)
import SaveSystem from '../core/SaveSystem.js';

export default class MatterhornArcade {
    constructor() {
        this.container = null;
        this.iframe = null;
        this.saveSystem = SaveSystem.getInstance();
    }

    async init(container) {
        // Since Matterhorn Arcade (matterhorn.html) is a standalone file with its own engine loop and DOM structure,
        // and rewriting it to a module entirely might be complex due to its single-file nature,
        // we will adapt it by injecting the JS logic but scoping it properly, OR serve it via iframe if we want strict isolation.
        // However, the user wants it INTEGRATED.
        
        // Strategy: Use an iframe to host the standalone game but style it to look integrated.
        // This is the safest way to "include" a legacy HTML game without rewriting it from scratch,
        // especially since it might use global variables.
        // But for "accumulate coins", we need to bridge it.

        container.innerHTML = `
            <div class="w-full h-full relative bg-black">
                <iframe id="matterhorn-frame" src="matterhorn.html" class="w-full h-full border-0 block" style="overflow:hidden;"></iframe>
                <button class="back-btn absolute top-4 left-4 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded z-[9999]">Back to Hub</button>
            </div>
        `;

        this.iframe = container.querySelector('#matterhorn-frame');
        
        container.querySelector('.back-btn').addEventListener('click', () => {
             if (window.miniGameHub) window.miniGameHub.goBack();
        });

        // We can attempt to inject code into the iframe to hook up the score?
        // Cross-origin might not apply since it's same domain.
        this.iframe.onload = () => {
            const win = this.iframe.contentWindow;
            
            // Hook into "showMessage" or create a new hook for winning/scoring if possible.
            // In matterhorn.html, 'flag planted' seems to be the win condition.
            // Let's look at matterhorn.html code...
            // It has `showMessage("FLAG PLANTED! YOU CONQUERED THE MATTERHORN!", 8000);`
            
            // We can overwrite showMessage to detect this string.
            if(win && win.showMessage) {
                const originalShowMessage = win.showMessage;
                win.showMessage = (msg, duration) => {
                    originalShowMessage(msg, duration);
                    if (msg.includes("CONQUERED")) {
                        // Award coins
                        this.saveSystem.addCurrency(1000); // Big reward!
                        // Maybe show a hub notification?
                        // For now, just save.
                    }
                };
            }
            
            // Also styling overrides if needed
            const style = win.document.createElement('style');
            style.innerHTML = `
                body { overflow: hidden; }
                /* Hide internal restart buttons if we want to handle it externally? No, let them be. */
            `;
            win.document.head.appendChild(style);
        };
    }

    update(dt) {
        // Iframe handles its own loop
    }

    draw() {}

    shutdown() {
        if(this.iframe) {
            this.iframe.src = 'about:blank';
            this.iframe = null;
        }
    }
}
