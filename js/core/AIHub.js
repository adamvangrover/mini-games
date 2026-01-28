import LLMService from './LLMService.js';
import SaveSystem from './SaveSystem.js';

export default class AIHub {
    constructor() {
        if (AIHub.instance) return AIHub.instance;
        AIHub.instance = this;

        this.saveSystem = SaveSystem.getInstance();
        this.currentSessionId = Date.now();
    }

    static getInstance() {
        if (!AIHub.instance) AIHub.instance = new AIHub();
        return AIHub.instance;
    }

    async generateDailyQuest() {
        const level = this.saveSystem.getLevel() || 1;
        // Mock interests based on achievements
        const interests = [];
        if (this.saveSystem.hasAchievement('clicker-millionaire')) interests.push('Tycoon');
        if (this.saveSystem.hasAchievement('snake-master')) interests.push('Arcade');

        try {
            const quest = await LLMService.generateQuest(level, interests);
            // Ensure unique ID
            quest.id = `daily_ai_${Date.now()}`;

            // Add to SaveSystem logic would typically go here,
            // but SaveSystem might handle daily quests internally.
            // We will return it for the caller to handle or inject it if SaveSystem exposes a method.

            // For now, let's just log it and assume the caller adds it.
            console.log("[AIHub] Generated Quest:", quest);
            return quest;
        } catch (e) {
            console.error("[AIHub] Quest Gen Failed:", e);
            return null;
        }
    }

    async getGreeting() {
        const hours = new Date().getHours();
        const timeContext = hours < 12 ? "morning" : hours < 18 ? "afternoon" : "evening";
        const user = "Player"; // Could fetch name from SaveSystem if available

        try {
            // Simulated "System" persona chat
            const response = await LLMService.chat(`Greeting for ${timeContext}`, [], "System");
            return response;
        } catch (e) {
            return "Welcome back, User.";
        }
    }
}
