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
            inventory: [],
            unlockedGames: [],
            settings: {
                muted: false
            },
            gameConfigs: {},
            profile: {
                name: "Player 1",
                avatar: "fas fa-user-astronaut",
                color: "#ff00ff"
            },
            equipped: {
                theme: 'theme_neon_blue',
                avatar: 'fas fa-user-astronaut'
            }
        };
    }

    save() {
        try {
            const json = JSON.stringify(this.data);
            const encrypted = this.encrypt(json);
            localStorage.setItem(this.storageKey, encrypted);
        } catch (e) {
            console.error("SaveSystem: Failed to save data to localStorage.", e);
        }
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

    equipItem(category, value) {
        this.setEquippedItem(category, value);
    }

    getEquipped(category) {
        return this.getEquippedItem(category);
    }

    setEquippedItem(type, itemId) {
        if (!this.data.equipped) this.data.equipped = {};
        this.data.equipped[type] = itemId;
        this.save();
    }

    getEquippedItem(type) {
        if (!this.data.equipped) return null;
        return this.data.equipped[type];
    }

    setProfileName(name) {
        if (!this.data.profile) this.data.profile = {};
        this.data.profile.name = name;
        this.save();
    }

    getProfile() {
        if (!this.data.profile) {
            this.data.profile = this.getDefaultData().profile;
        }
        return this.data.profile;
    }

    addCurrency(amount) {
        this.data.totalCurrency += amount;
        this.save();
    }

    spendCurrency(amount) {
        if (this.data.totalCurrency >= amount) {
            this.data.totalCurrency -= amount;
            this.save();
            return true;
        }
        return false;
    }

    getCurrency() {
        return this.data.totalCurrency;
    }

    unlockGame(gameId) {
        if (!this.data.unlockedGames) this.data.unlockedGames = [];
        if (!this.data.unlockedGames.includes(gameId)) {
            this.data.unlockedGames.push(gameId);
            this.save();
            return true;
        }
        return false;
    }

    isGameUnlocked(gameId) {
        if (!this.data.unlockedGames) return false;
        return this.data.unlockedGames.includes(gameId);
    }

    // --- Item / Store System ---

    unlockItem(itemId) {
        if (!this.data.unlockedItems) this.data.unlockedItems = [];
        if (!this.data.unlockedItems.includes(itemId)) {
            this.data.unlockedItems.push(itemId);
            this.save();
            return true;
        }
        return false;
    }

    isItemUnlocked(itemId) {
        if (!this.data.unlockedItems) return false;
        return this.data.unlockedItems.includes(itemId);
    }

    // Helper to transact: returns true if successful, false if not enough funds
    buyItem(itemId, cost) {
        if (this.isItemUnlocked(itemId)) return true; // Already owned

        if (this.getCurrency() >= cost) {
            this.spendCurrency(cost);
            this.unlockItem(itemId);
            return true;
        }
        return false;
    }

    addItem(item) {
        if (!this.data.inventory) this.data.inventory = [];
        // Check if unique item? Let's assume yes for now
        this.data.inventory.push(item);
        this.save();
    }

    getInventory() {
        return this.data.inventory || [];
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

    // Export current data as a Base64 encoded string
    exportData() {
        const json = JSON.stringify(this.data);
        return this.encrypt(json);
    }

    // Import data from a Base64 encoded string
    importData(encodedStr) {
        try {
            const json = this.decrypt(encodedStr);
            const data = JSON.parse(json);

            // Basic validation
            if (!data.highScores || !data.achievements) {
                return false;
            }

            this.data = data;
            this.save();
            return true;
        } catch (e) {
            console.error("Failed to import data:", e);
            return false;
        }
    }

    // Get a formatted string of stats for sharing
    getFormattedStats() {
        let text = "🏆 Neon Arcade High Scores 🏆\n\n";

        const scores = Object.entries(this.data.highScores)
            .sort((a, b) => b[1] - a[1]); // Sort by score descending (though different games have different scales)

        if (scores.length === 0) {
            text += "No high scores yet! Play some games to earn your place.";
        } else {
            scores.forEach(([gameId, score]) => {
                // Format game ID to name (simple replace)
                const name = gameId.replace(/-game|-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim();
                text += `${name}: ${score}\n`;
            });
        }

        text += `\n💰 Total Currency: ${this.data.totalCurrency}`;
        text += `\n🏅 Achievements: ${this.data.achievements.length}`;

        return text;
    }
}
