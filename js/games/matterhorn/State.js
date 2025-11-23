class GameState {
    constructor() {
        this.data = {
            altitude: 0,
            temperature: 100,
            stamina: 100,
            money: 0,

            objective: "Explore Zermatt",

            inventory: {
                chocolate: 0,
                fondue: 0,
                photos: 0
            },

            player: null,
            world: null,
            ui: null
        };

        this.listeners = {};
    }

    on(key, fn) {
        if (!this.listeners[key]) this.listeners[key] = [];
        this.listeners[key].push(fn);
    }

    set(key, value) {
        this.data[key] = value;
        if (this.listeners[key]) {
            for (const fn of this.listeners[key]) fn(value);
        }
    }

    get(key) {
        return this.data[key];
    }

    addMoney(amount) {
        this.data.money += amount;
        if (this.listeners["money"]) {
            for (const fn of this.listeners["money"]) fn(this.data.money);
        }
    }

    reset() {
        this.data.altitude = 0;
        this.data.temperature = 100;
        this.data.stamina = 100;
        this.data.money = 0;
        this.data.objective = "Explore Zermatt";
        this.data.inventory = { chocolate: 0, fondue: 0, photos: 0 };
        // Force update listeners
        this.set('altitude', 0);
        this.set('money', 0);
        this.set('stamina', 100);
    }
}

const State = new GameState();
export default State;
