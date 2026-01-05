export default class SaveSystem {
    constructor() {
        if (SaveSystem.instance) {
            return SaveSystem.instance;
        }

        this.storageKey = 'miniGameHub_v1';
        this.currentVersion = 1.3; // Schema Version
        this.data = this.load();

        SaveSystem.instance = this;
    }

    static getInstance() {
        if (!SaveSystem.instance) {
            SaveSystem.instance = new SaveSystem();
        }
        return SaveSystem.instance;
    }

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

        let data = null;
        try {
            const json = this.decrypt(raw);
            data = JSON.parse(json);
        } catch (e) {
            console.warn("SaveSystem: Primary save corrupted or legacy. Attempting backup...");
            const backup = localStorage.getItem(this.storageKey + '_backup');
            if (backup) {
                try {
                    const json = this.decrypt(backup);
                    data = JSON.parse(json);
                    console.log("SaveSystem: Backup restored.");
                } catch (backupErr) {
                    console.error("SaveSystem: Backup also corrupted.", backupErr);
                }
            }

            if (!data) {
                // Try legacy raw JSON
                try {
                    data = JSON.parse(raw);
                    console.log("SaveSystem: Legacy raw JSON detected and loaded.");
                } catch (legacyErr) {
                    console.error("SaveSystem: Critical failure. Resetting.");
                    return this.getDefaultData();
                }
            }
        }

        // Migration Logic
        if (data) {
             return this.migrate(data);
        }
        return this.getDefaultData();
    }

    migrate(data) {
        // Ensure version exists
        if (!data.version) {
            data.version = 1.0;
        }

        // Migration 1.0 -> 1.1 (Example: Add Tech Tree Upgrades)
        if (data.version < 1.1) {
            console.log("SaveSystem: Migrating to 1.1...");
            if (!data.upgrades) {
                data.upgrades = { coinMultiplier: 1, xpBoost: 1 };
            }
            data.version = 1.1;
        }

        // Migration 1.1 -> 1.2 (Add Trophy Room specific data)
        if (data.version < 1.2) {
            console.log("SaveSystem: Migrating to 1.2...");
            // Ensure settings structure
            if (!data.settings) data.settings = {};
            if (data.settings.crt === undefined) data.settings.crt = true;
            data.version = 1.2;
        }

        // Migration 1.2 -> 1.3 (Add Daily Quests)
        if (data.version < 1.3) {
            console.log("SaveSystem: Migrating to 1.3...");
            data.dailyQuests = { date: 0, quests: [] };
            data.version = 1.3;
        }

        // Always merge with default to ensure all fields exist (Schema Enforcement)
        return { ...this.getDefaultData(), ...data, version: this.currentVersion };
    }

    /**
     * Explicit check for save data integrity.
     * Can be called on load to verify crucial fields.
     */
    verifyIntegrity() {
        if (!this.data || typeof this.data !== 'object') {
             console.error("SaveSystem: Integrity Check Failed. resetting.");
             this.data = this.getDefaultData();
             this.save();
             return false;
        }
        return true;
    }

    createBackup() {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
            localStorage.setItem(this.storageKey + '_backup', raw);
        }
    }

    getDefaultData() {
        return {
            version: this.currentVersion,
            highScores: {},
            totalCurrency: 0,
            achievements: [],
            inventory: [],
            unlockedGames: [],
            unlockedItems: [],
            settings: {
                muted: false,
                adsEnabled: true,
                crt: true,
                volume: 0.1 // Default volume
            },
            gameConfigs: {}, // Per-game persistent data
            profile: {
                name: "Player 1",
                avatar: "fas fa-user-astronaut",
                color: "#ff00ff"
            },
            equipped: {
                theme: 'theme_neon_blue',
                avatar: 'fas fa-user-astronaut',
                cabinet: 'default'
            },
            stats: {},
            xp: 0,
            level: 1,
            upgrades: {
                coinMultiplier: 1,
                xpBoost: 1,
                startHealth: 0
            },
            dailyQuests: {
                date: 0,
                quests: []
            }
        };
    }

    getSettings() {
        if (!this.data.settings) {
            this.data.settings = this.getDefaultData().settings;
        }
        return this.data.settings;
    }

    getSetting(key) {
        return this.getSettings()[key];
    }

    setSetting(key, value) {
        if (!this.data.settings) {
            this.data.settings = { muted: false, adsEnabled: true };
        }
        this.data.settings[key] = value;
        this.save();
    }

    getProfile() {
        if (!this.data.profile) {
            this.data.profile = this.getDefaultData().profile;
        }
        return this.data.profile;
    }

    setProfile(profileData) {
        this.data.profile = { ...this.getProfile(), ...profileData };
        this.save();
    }

    // ... (Rest of the getters/setters remain largely the same, but saving logic needs to be robust)

    incrementStat(key, amount = 1) {
        if (!this.data.stats) this.data.stats = {};
        this.data.stats[key] = (this.data.stats[key] || 0) + amount;
        this.save();
    }

    getStat(key) {
        return (this.data.stats && this.data.stats[key]) || 0;
    }

    save() {
        try {
            // Update timestamp
            this.data.timestamp = Date.now();

            const json = JSON.stringify(this.data);
            const encrypted = this.encrypt(json);

            // Create backup before overwriting
            if (localStorage.getItem(this.storageKey)) {
                this.createBackup();
            }

            localStorage.setItem(this.storageKey, encrypted);
        } catch (e) {
            console.error("SaveSystem: Write failed.", e);
        }
    }

    getHighScore(gameId) {
        return (this.data.highScores && this.data.highScores[gameId]) || 0;
    }

    setHighScore(gameId, score) {
        if (!this.data.highScores) this.data.highScores = {};
        if (score > (this.data.highScores[gameId] || 0)) {
            this.data.highScores[gameId] = score;
            this.save();
            return true;
        }
        return false;
    }

    equipItem(category, value) {
        if (!this.data.equipped) this.data.equipped = {};
        this.data.equipped[category] = value;
        this.save();
    }

    getEquippedItem(category) {
        return (this.data.equipped && this.data.equipped[category]) || null;
    }

    addCurrency(amount) {
        this.data.totalCurrency = (this.data.totalCurrency || 0) + amount;
        this.save();
    }

    spendCurrency(amount) {
        if ((this.data.totalCurrency || 0) >= amount) {
            this.data.totalCurrency -= amount;
            this.save();
            return true;
        }
        return false;
    }

    getCurrency() {
        return this.data.totalCurrency || 0;
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

    // Inventory & Store
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
        return this.data.unlockedItems && this.data.unlockedItems.includes(itemId);
    }

    buyItem(itemId, cost) {
        if (this.isItemUnlocked(itemId)) return true;
        if (this.spendCurrency(cost)) {
            this.unlockItem(itemId);
            return true;
        }
        return false;
    }

    unlockAchievement(achievementId) {
        if (!this.data.achievements) this.data.achievements = [];
        if (!this.data.achievements.includes(achievementId)) {
            this.data.achievements.push(achievementId);
            this.save();
            return true;
        }
        return false;
    }

    // Export/Import
    exportData() {
        // Just return the raw encrypted string from memory to ensure it matches state
        const json = JSON.stringify(this.data);
        return this.encrypt(json);
    }

    importData(encodedStr) {
        try {
            const json = this.decrypt(encodedStr);
            let data = JSON.parse(json);

            // Validation: Must have at least a version or highScores/currency
            if (!data.highScores && !data.totalCurrency && !data.version) {
                console.error("SaveSystem: Import data validation failed.");
                return false;
            }

            // Run migration on imported data too
            data = this.migrate(data);

            this.data = data;
            this.save();
            return true;
        } catch (e) {
            console.error("SaveSystem: Import failed.", e);
            return false;
        }
    }

    getFormattedStats() {
        let text = "🏆 Neon Arcade High Scores 🏆\n\n";
        const scores = Object.entries(this.data.highScores || {}).sort((a, b) => b[1] - a[1]);
        if (scores.length === 0) text += "No high scores yet!\n";
        scores.forEach(([id, score]) => {
            const name = id.replace(/-game|-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim();
            text += `${name}: ${score}\n`;
        });
        text += `\n💰 Coins: ${this.data.totalCurrency || 0}`;
        return text;
    }

    getGameConfig(gameId) {
        if (!this.data.gameConfigs) this.data.gameConfigs = {};
        return this.data.gameConfigs[gameId] || {};
    }

    saveGameConfig(gameId, config) {
        if (!this.data.gameConfigs) this.data.gameConfigs = {};
        this.data.gameConfigs[gameId] = config;
        this.save();
    }

    setGameConfig(gameId, config) {
        this.saveGameConfig(gameId, config);
    }

    addXP(amount) {
        this.data.xp = (this.data.xp || 0) + amount;
        // Level up logic (simplified)
        const nextLevelXP = this.data.level * 1000;
        if (this.data.xp >= nextLevelXP) {
             this.data.level++;
             this.data.xp -= nextLevelXP; // Or keep accumulating, depending on design.
             // Usually accumulative is better, but here simple rollover.
             // Better: total XP. But for now let's just increment level.
        }
        this.save();
    }

    getLevel() {
        return this.data.level || 1;
    }

    getXP() {
        return this.data.xp || 0;
    }

    checkDailyLogin() {
        if (!this.data.login) {
            this.data.login = {
                lastLogin: 0,
                streak: 0
            };
        }

        const now = new Date();
        // Use time zone offset to ensure we are comparing local calendar days properly
        // Or simply compare year/month/date integers
        const getDayIndex = (d) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);

        const currentDayIndex = getDayIndex(now);
        const lastLoginDate = new Date(this.data.login.lastLogin);
        const lastLoginDayIndex = this.data.login.lastLogin === 0 ? -1 : getDayIndex(lastLoginDate);

        if (currentDayIndex === lastLoginDayIndex) {
            // Already logged in today
            return 0;
        } else if (currentDayIndex === lastLoginDayIndex + 1) {
            // Consecutive login
            this.data.login.streak++;
        } else {
            // Streak broken
            this.data.login.streak = 1;
        }

        this.data.login.lastLogin = now.getTime();

        // Reward Calculation
        const baseReward = 50;
        const streakBonus = Math.min(this.data.login.streak * 10, 200);
        const totalReward = baseReward + streakBonus;

        this.addCurrency(totalReward);
        this.save();

        return {
            reward: totalReward,
            streak: this.data.login.streak
        };
    }

    // --- Daily Quests System ---

    getDailyQuests() {
        const now = new Date();
        const getDayIndex = (d) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
        const today = getDayIndex(now);

        if (!this.data.dailyQuests || this.data.dailyQuests.date !== today) {
            this.generateDailyQuests(today);
        }
        return this.data.dailyQuests.quests;
    }

    generateDailyQuests(dateIndex) {
        const questTypes = [
            { id: 'play_games', desc: 'Play 3 different games', target: 3, reward: 50 },
            { id: 'earn_coins', desc: 'Earn 100 coins', target: 100, reward: 75 },
            { id: 'high_score', desc: 'Set a new High Score', target: 1, reward: 100 },
            { id: 'clicker', desc: 'Click 500 times in Clicker', target: 500, reward: 50 },
            { id: 'spend', desc: 'Spend 50 coins in Store', target: 50, reward: 25 },
            { id: 'boss_mode', desc: 'Find the Boss Mode', target: 1, reward: 200 } // Special
        ];

        // Shuffle and pick 3
        const shuffled = questTypes.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3).map(q => ({
            ...q,
            progress: 0,
            claimed: false
        }));

        this.data.dailyQuests = {
            date: dateIndex,
            quests: selected
        };
        this.save();
    }

    updateQuestProgress(type, amount = 1) {
        if (!this.data.dailyQuests) return;
        let updated = false;

        // Special logic for generic 'play_games' or 'earn_coins' could be handled here or by caller passing specific ID
        // But our IDs are specific enough.

        this.data.dailyQuests.quests.forEach(q => {
            if (q.id === type && !q.claimed && q.progress < q.target) {
                q.progress += amount;
                if (q.progress > q.target) q.progress = q.target;
                updated = true;
            }
        });

        if (updated) this.save();
    }

    claimQuestReward(questId) {
        const quest = this.data.dailyQuests.quests.find(q => q.id === questId);
        if (quest && quest.progress >= quest.target && !quest.claimed) {
            quest.claimed = true;
            this.addCurrency(quest.reward);
            this.save();
            return quest.reward;
        }
        return 0;
    }
}