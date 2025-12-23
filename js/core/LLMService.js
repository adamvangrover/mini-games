export default class LLMService {
    /**
     * Simulates a chat request to a serverless LLM backend.
     * @param {string} prompt - The user's input or context.
     * @param {string} role - The role of the NPC (e.g., "Merchant", "Guard").
     * @returns {Promise<string>} - The LLM's response.
     */
    static async chat(prompt, role = "Citizen") {
        // In a real implementation, this would call a serverless function:
        // const response = await fetch('/api/llm-chat', { ... });

        console.log(`[LLMService] Requesting response for role "${role}" with prompt: "${prompt}"`);

        // Simulate network latency (500ms - 1500ms)
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

        // Mock logic for "Serverless" response generation
        const p = prompt.toLowerCase();

        const responses = {
            "default": [
                "The neon lights are bright tonight, aren't they?",
                "I've heard rumors of a glitch in the system.",
                "Stay safe out there, traveler.",
                "Have you visited the Arcade Tower lately?"
            ],
            "Merchant": [
                "Credits talk, everything else walks.",
                "I have the finest digital goods this side of the firewall.",
                "Looking for an upgrade? You've come to the right place.",
                "My prices are fair, my goods are legitimate."
            ],
            "Guard": [
                "Move along, citizen.",
                "We are monitoring all sectors.",
                "No loitering near the data banks.",
                "Security is our top priority."
            ],
            "Hacker": [
                "Everything is connected if you know where to look.",
                "I can bypass that firewall for a price.",
                "Did you see the code fragment in Sector 7?",
                "The Matrix has eyes."
            ]
        };

        // Simple Keyword Matching
        if (p.includes('hello') || p.includes('hi')) return `Greetings. I am a ${role} of Neon City.`;
        if (p.includes('job') || p.includes('quest')) return "I am too busy for that right now. Maybe check the Hub.";
        if (p.includes('who are you')) return `I am unit #${Math.floor(Math.random() * 1000)}, functioning as a ${role}.`;
        if (p.includes('bye')) return "Farewell.";

        // Random fallback based on role
        const pool = responses[role] || responses["default"];
        return pool[Math.floor(Math.random() * pool.length)];
    }
}
