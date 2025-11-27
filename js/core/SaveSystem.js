export default class SaveSystem {
    constructor() {
        if (SaveSystem.instance) {
            return SaveSystem.instance;
        }

        this.storageKey = 'miniGameHub_v1';
        this.data = this.load();

        SaveSystem.instance = this;
    }

    static getInstance() {
        if (!SaveSystem.instance) {
            SaveSystem.instance = new SaveSystem();
        }
        return SaveSystem.instance;
    }

    load() {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) {
            return this.getDefaultData();
        }

        try {
            // Attempt to decode (Base64)
            const json = atob(raw);
            return JSON.parse(json);
        } catch (e) {
            console.warn('Failed to load save data, resetting.', e);
            return this.getDefaultData();
        }
    }

    getDefaultData() {
        return {
            highScores: {},
            totalCurrency: 0,
            achievements: [],
            settings: {
                muted: false
            },
            gameConfigs: {}
        };
    }

    save() {
        const json = JSON.stringify(this.data);
        const encoded = btoa(json); // Base64 encoding
        localStorage.setItem(this.storageKey, encoded);
    }

    getHighScore(gameId) {
        return this.data.highScores[gameId] || 0;
    }

    setHighScore(gameId, score) {
        if (score > this.getHighScore(gameId)) {
            this.data.highScores[gameId] = score;
            this.save();
            return true; // New high score!
        }
        return false;
    }

    addCurrency(amount) {
        this.data.totalCurrency += amount;
        this.save();
    }

    getCurrency() {
        return this.data.totalCurrency;
    }

    unlockAchievement(achievementId) {
        if (!this.data.achievements.includes(achievementId)) {
            this.data.achievements.push(achievementId);
            this.save();
            return true;
        }
        return false;
    }

    // New: Game specific configs
    getGameConfig(gameId) {
        return this.data.gameConfigs[gameId] || {};
    }

    setGameConfig(gameId, config) {
        this.data.gameConfigs[gameId] = config;
        this.save();
    }
}
