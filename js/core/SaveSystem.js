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

    // Helper to encode/decode data (base64) as requested
    encrypt(text) {
        return btoa(text);
    }

    decrypt(text) {
        return atob(text);
    }

    load() {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) {
            return this.getDefaultData();
        }

        try {
            // Attempt to decrypt
            const json = this.decrypt(raw);
            return JSON.parse(json);
        } catch (e) {
            console.warn("Failed to decrypt save data, or data is legacy/unencrypted. Resetting or trying legacy parse.");
            try {
                return JSON.parse(raw); // Fallback for transition
            } catch (e2) {
                return this.getDefaultData();
            }
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
        const encrypted = this.encrypt(json);
        localStorage.setItem(this.storageKey, encrypted);
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

    getGameConfig(gameId) {
        return this.data.gameConfigs[gameId] || {};
    }

    setGameConfig(gameId, config) {
        this.data.gameConfigs[gameId] = config;
        this.save();
    }
}
