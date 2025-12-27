// Generic Adapter for Legacy Scripts
export default class LegacyAdapter {
    constructor(scriptPath, globalName, initFnName = 'init', shutdownFnName = 'shutdown') {
        this.scriptPath = scriptPath;
        this.globalName = globalName; // e.g., 'clickerGame'
        this.initFnName = initFnName;
        this.shutdownFnName = shutdownFnName;
        this.scriptElement = null;
        this.canvas = null;
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

        // Apply Neon Filter to Canvas
        this.applyNeonFilter(container);
    }

    applyNeonFilter(container) {
        // Find canvas inside container
        // Sometimes legacy games append to body, so we might need to search globally if container is empty
        // But ideally they should use the container passed.
        let canvas = container.querySelector('canvas');

        // If not found in container, check if the game object has a reference
        const game = window[this.globalName];
        if (!canvas && game && game.canvas) {
            canvas = game.canvas;
        }

        if (canvas) {
            this.canvas = canvas;
            // Add class for CSS styling if not present
            canvas.classList.add('neon-legacy-canvas');

            // Or force style directly
            canvas.style.filter = "drop-shadow(0 0 10px rgba(0, 255, 255, 0.7)) contrast(1.2) brightness(1.2)";
            canvas.style.boxShadow = "0 0 20px rgba(0, 255, 255, 0.2)";
            canvas.style.border = "2px solid rgba(255, 255, 255, 0.1)";
            canvas.style.borderRadius = "8px";
        }
    }

    shutdown() {
        const game = window[this.globalName];
        if (game && typeof game[this.shutdownFnName] === 'function') {
            game[this.shutdownFnName]();
        }

        // Clean up filter effects if needed (though container destruction handles most)
        if (this.canvas) {
            this.canvas.style.filter = "";
            this.canvas.style.boxShadow = "";
            this.canvas = null;
        }
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
