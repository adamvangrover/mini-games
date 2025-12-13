import InputManager from './InputManager.js';

export default class MobileControls {
    constructor(container) {
        this.container = container;
        this.inputManager = InputManager.getInstance();
        this.elements = [];
        this.render();
    }

    render() {
        if (!('ontouchstart' in window) && !navigator.maxTouchPoints) {
            // Check for mobile width as fallback
            if (window.innerWidth > 768) return;
        }

        // D-Pad Container
        const dpad = document.createElement('div');
        dpad.id = 'mobile-dpad'; // Added ID for verification
        dpad.className = 'mobile-dpad';
        dpad.style.position = 'fixed';
        dpad.style.bottom = '40px';
        dpad.style.left = '40px';
        dpad.style.width = '150px';
        dpad.style.height = '150px';
        dpad.style.zIndex = '9999';
        dpad.style.pointerEvents = 'none'; // Buttons will have auto

        // Helper to create button
        const createBtn = (id, icon, top, left, key) => {
            const btn = document.createElement('div');
            btn.style.position = 'absolute';
            btn.style.top = top;
            btn.style.left = left;
            btn.style.width = '50px';
            btn.style.height = '50px';
            btn.style.background = 'rgba(255, 255, 255, 0.2)';
            btn.style.borderRadius = '50%';
            btn.style.display = 'flex';
            btn.style.justifyContent = 'center';
            btn.style.alignItems = 'center';
            btn.style.color = 'white';
            btn.style.pointerEvents = 'auto';
            btn.style.backdropFilter = 'blur(4px)';
            btn.style.border = '1px solid rgba(255,255,255,0.3)';
            btn.style.touchAction = 'none';
            btn.innerHTML = `<i class="fas ${icon}"></i>`;

            const press = (e) => {
                e.preventDefault();
                this.inputManager.keys[key] = true;
                btn.style.background = 'rgba(255, 0, 255, 0.5)';
            };
            const release = (e) => {
                e.preventDefault();
                this.inputManager.keys[key] = false;
                btn.style.background = 'rgba(255, 255, 255, 0.2)';
            };

            btn.addEventListener('touchstart', press, {passive: false});
            btn.addEventListener('touchend', release);
            btn.addEventListener('mousedown', press); // For testing on desktop
            btn.addEventListener('mouseup', release);

            dpad.appendChild(btn);
        };

        createBtn('up', 'fa-arrow-up', '0px', '50px', 'ArrowUp');
        createBtn('down', 'fa-arrow-down', '100px', '50px', 'ArrowDown');
        createBtn('left', 'fa-arrow-left', '50px', '0px', 'ArrowLeft');
        createBtn('right', 'fa-arrow-right', '50px', '100px', 'ArrowRight');

        this.container.appendChild(dpad);
        this.elements.push(dpad);

        // Action Button
        const actionBtn = document.createElement('div');
        actionBtn.id = 'mobile-action-btn'; // Added ID for verification
        actionBtn.style.position = 'fixed';
        actionBtn.style.bottom = '60px';
        actionBtn.style.right = '40px';
        actionBtn.style.width = '80px';
        actionBtn.style.height = '80px';
        actionBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        actionBtn.style.borderRadius = '50%';
        actionBtn.style.zIndex = '9999';
        actionBtn.style.border = '2px solid rgba(255,255,255,0.4)';
        actionBtn.style.display = 'flex';
        actionBtn.style.justifyContent = 'center';
        actionBtn.style.alignItems = 'center';
        actionBtn.style.pointerEvents = 'auto';
        actionBtn.style.touchAction = 'none';
        actionBtn.innerHTML = '<span style="color:white; font-weight:bold; font-family:sans-serif;">A</span>';

        const pressAction = (e) => {
            e.preventDefault();
            this.inputManager.keys['Space'] = true; // Map to Space
            this.inputManager.keys['Enter'] = true; // Map to Enter
            actionBtn.style.background = 'rgba(0, 255, 255, 0.5)';
        };
        const releaseAction = (e) => {
            e.preventDefault();
            this.inputManager.keys['Space'] = false;
            this.inputManager.keys['Enter'] = false;
            actionBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        };

        actionBtn.addEventListener('touchstart', pressAction, {passive: false});
        actionBtn.addEventListener('touchend', releaseAction);
        actionBtn.addEventListener('mousedown', pressAction);
        actionBtn.addEventListener('mouseup', releaseAction);

        this.container.appendChild(actionBtn);
        this.elements.push(actionBtn);
    }

    destroy() {
        this.elements.forEach(el => el.remove());
        this.elements = [];
    }
}
