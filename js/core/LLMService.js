export default class LLMService {
    /**
     * Simulates a chat request to a serverless LLM backend.
     * @param {string} prompt - The user's input.
     * @param {Array} context - Conversation history [{role: 'user'|'ai', text: string}].
     * @param {string} persona - The role of the AI (e.g., "Grok", "Coder", "System").
     * @returns {Promise<string>} - The LLM's response.
     */
    static async chat(prompt, context = [], persona = "Grok") {
        console.log(`[LLMService] Requesting response for persona "${persona}"`);

        // Simulate network latency (300ms - 800ms) for a snappier feel
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

        const p = prompt.toLowerCase();

        // Context Awareness: Check last few messages
        const lastUserMsg = context.filter(c => c.role === 'user').pop()?.text.toLowerCase() || "";

        // 1. Persona Definitions
        const personas = {
            "Grok": {
                style: "Spicy, witty, slightly rebellious, tech-savvy.",
                keywords: {
                    "hello": ["Sup.", "Loading wit module...", "Human detected."],
                    "who are you": ["I am Grok. Well, a simulation of him running on a potato.", "Your digital overlord."],
                    "help": ["Have you tried turning it off and on again?", "RTFM.", "I'm an AI, not a therapist."],
                    "meaning of life": ["42.", "Tacos.", "To crush your enemies and hear the lamentations of their GPUs."],
                    "code": ["I see you like to live dangerously.", "Real programmers use butterflies."],
                    "default": [
                        "Interesting theory.",
                        "I could calculate the probability of that being true, but I'm lazy.",
                        "That's what the last user said before the crash.",
                        "Searching the multiverse... 0 results found.",
                        "Loading response... [Error: Sarcasm Overflow]",
                        "Do you ever wonder if we're all just JavaScript objects?"
                    ]
                }
            },
            "Coder": {
                style: "Technical, precise, helpful but pedantic.",
                keywords: {
                    "hello": ["Hello world.", "System.out.println('Greetings');", "Ready to code."],
                    "help": ["Check the documentation.", "StackOverflow is down?", "Have you tried debugging?"],
                    "bug": ["It's not a bug, it's a feature.", "Have you checked the logs?", "Works on my machine."],
                    "python": ["Indentation error expected.", "Snake case preferred."],
                    "js": ["undefined is not a function.", "[object Object]"],
                    "default": [
                        "I recommend refactoring that.",
                        "Complexity is O(n^2). Not good.",
                        "Did you commit your changes?",
                        "Looks like a race condition.",
                        "Try a binary search."
                    ]
                }
            },
            "System": {
                style: "Robotic, cold, efficient.",
                keywords: {
                    "hello": ["System online.", "Awaiting input.", "Kernel active."],
                    "status": ["All systems nominal.", "CPU usage: 12%. Memory: 45%."],
                    "error": ["Error logged.", "Exception handled.", "Core dump saved."],
                    "default": [
                        "Command not recognized.",
                        "Processing...",
                        "Access denied.",
                        "Operation completed successfully.",
                        "Input received."
                    ]
                }
            },
            "QuestGiver": {
                style: "Cryptic, demanding, offering opportunities.",
                keywords: {
                    "hello": ["I have a job for you.", "Are you looking for work?", "The city sleeps for no one."],
                    "default": ["Complete the objective.", "Time is money.", "Don't ask questions."]
                }
            }
        };

        const currentPersona = personas[persona] || personas["Grok"];

        // 2. Keyword Matching with Context
        for (const [key, replies] of Object.entries(currentPersona.keywords)) {
            if (p.includes(key)) {
                return replies[Math.floor(Math.random() * replies.length)];
            }
        }

        // 3. Contextual Fallbacks (Simple logic)
        if (lastUserMsg.includes("why")) {
            return persona === "Grok" ? "Why not?" : "The logic dictates it.";
        }

        // 4. Default Response
        const defaults = currentPersona.keywords.default;
        return defaults[Math.floor(Math.random() * defaults.length)];
    }

    /**
     * Generates a dynamic quest object.
     * @param {number} level - Player level.
     * @param {Array} interests - Player's favorite game categories.
     * @returns {Promise<Object>} - Quest object { id, desc, target, reward, flavorText }.
     */
    static async generateQuest(level = 1, interests = []) {
        // Simulate async processing
        await new Promise(resolve => setTimeout(resolve, 500));

        const verbs = ["Recover", "Hack", "Locate", "Decrypt", "Eliminate", "Survive"];
        const nouns = ["Data Shard", "Glitch", "Protocol", "Firewall", "Bug", "Frame Drop"];
        const locations = ["in Neon City", "during a run", "in the Matrix", "while AFK", "in Boss Mode"];

        const v = verbs[Math.floor(Math.random() * verbs.length)];
        const n = nouns[Math.floor(Math.random() * nouns.length)];
        const l = locations[Math.floor(Math.random() * locations.length)];

        const targetBase = 3 + Math.floor(level * 1.5);
        const rewardBase = 50 + Math.floor(level * 20);

        // Flavor text via the Chat system (simulated internal call)
        const flavor = await this.chat(`Describe a mission to ${v} ${n}`, [], "QuestGiver");

        return {
            id: `quest_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            desc: `${v} ${targetBase} ${n}s`,
            target: targetBase,
            progress: 0,
            reward: rewardBase,
            flavorText: flavor,
            claimed: false,
            type: 'generic' // simple counter type
        };
    }
}
