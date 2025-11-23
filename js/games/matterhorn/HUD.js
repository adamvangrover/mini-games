import State from "./State.js";

export default class HUD {
    constructor() {
        this.alt = document.getElementById("mh-hud-alt");
        this.temp = document.getElementById("mh-hud-temp");
        this.stamina = document.getElementById("mh-hud-stamina");
        this.money = document.getElementById("mh-hud-money");
        this.obj = document.getElementById("mh-hud-objective");

        // Keep references to bound functions for cleanup
        this.onAltitude = v => { if(this.alt) this.alt.innerText = `${v}m`; };
        this.onMoney = v => { if(this.money) this.money.innerText = v; };
        this.onObjective = v => { if(this.obj) this.obj.innerText = v; };
        this.onTemperature = v => this.updateTemp(v);
        this.onStamina = v => this.updateStamina(v);

        // Link State listeners
        State.on("altitude", this.onAltitude);
        State.on("money", this.onMoney);
        State.on("objective", this.onObjective);
        State.on("temperature", this.onTemperature);
        State.on("stamina", this.onStamina);
    }

    updateTemp(value) {
        if(this.temp) {
            this.temp.style.width = `${value}%`;
            this.temp.style.background = value < 20 ? "#38bdf8" : "#ef4444";
        }
    }

    updateStamina(value) {
        if(this.stamina) {
            this.stamina.style.width = `${value}%`;
        }
    }

    update() {}
}
