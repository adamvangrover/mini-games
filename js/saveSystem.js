class SaveSystem {
    constructor() {
        this.storageKey = 'miniGameHub_v1';
        this.data = this.load();
    }

    load() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : {
            highScores: {},
            totalCurrency: 0,
            achievements: [],
            settings: {
                muted: false
            }
        };
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
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
}

window.saveSystem = new SaveSystem();
