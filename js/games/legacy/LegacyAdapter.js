// Generic Adapter for Legacy Scripts
export default class LegacyAdapter {
    constructor(scriptPath, globalName, initFnName = 'init', shutdownFnName = 'shutdown') {
        this.scriptPath = scriptPath;
        this.globalName = globalName; // e.g., 'clickerGame'
        this.initFnName = initFnName;
        this.shutdownFnName = shutdownFnName;
        this.scriptElement = null;
    }

    async init(container) {
        // Load the script if not already loaded
        if (!window[this.globalName]) {
            await this.loadScript(this.scriptPath);
        }

        const game = window[this.globalName];
        if (game && typeof game[this.initFnName] === 'function') {
            game[this.initFnName](container);
        } else if (typeof window[this.globalName] === 'function') {
            // Some old games might just be a function
             window[this.globalName]();
        }
    }

    shutdown() {
        const game = window[this.globalName];
        if (game && typeof game[this.shutdownFnName] === 'function') {
            game[this.shutdownFnName]();
        }
        // We generally don't remove the script tag as it might be reused,
        // but if we wanted to fully clean up we could.
        // For legacy, we just assume it stays in memory.
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
            this.scriptElement = script;
        });
    }

    update(dt) {
        // Legacy games usually have their own loop (setInterval or rAF)
        // so we don't call update here usually.
        // If they exposed an update function, we could call it.
        const game = window[this.globalName];
        if (game && typeof game.update === 'function') {
            game.update(dt);
        }
    }

    draw() {
        const game = window[this.globalName];
        if (game && typeof game.draw === 'function') {
            game.draw();
        }
    }
}
