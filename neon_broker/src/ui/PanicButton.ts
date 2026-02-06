import { MarketEngine } from '../core/MarketEngine';

export class PanicButton {
    element: HTMLButtonElement;
    engine: MarketEngine;

    constructor(engine: MarketEngine) {
        this.engine = engine;
        this.element = document.createElement('button');
        this.element.innerText = "PANIC";
        this.element.className = "panic-btn";
        // Append to app container if possible, else body
        const app = document.getElementById('app');
        if (app) app.appendChild(this.element);
        else document.body.appendChild(this.element);

        this.element.onclick = () => {
            this.engine.activatePanic();
        };

        // Bind Spacebar
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                this.engine.activatePanic();
            }
        });
    }

    update() {
        if (this.engine.isFrozen) {
            this.element.disabled = true;
            this.element.innerText = `MARKET FROZEN (${this.engine.freezeTimer.toFixed(1)})`;
            this.element.classList.add('frozen');
        } else if (this.engine.freezeCooldown > 0) {
            this.element.disabled = true;
            this.element.innerText = `RECHARGING (${this.engine.freezeCooldown.toFixed(1)})`;
            this.element.classList.remove('frozen');
        } else {
            this.element.disabled = false;
            this.element.innerText = "PANIC [SPACE]";
            this.element.classList.remove('frozen');
        }
    }
}
