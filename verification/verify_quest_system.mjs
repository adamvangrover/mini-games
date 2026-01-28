
import SaveSystem from '../js/core/SaveSystem.js';

// Mock Browser Environment
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => store[key] = value.toString(),
        removeItem: (key) => delete store[key],
        clear: () => store = {}
    };
})();

global.window = {
    dispatchEvent: (event) => console.log(`[Event Dispatched] ${event.type}`)
};
global.localStorage = localStorageMock;
global.btoa = (str) => Buffer.from(str).toString('base64');
global.atob = (str) => Buffer.from(str, 'base64').toString();
global.CustomEvent = class CustomEvent { constructor(type) { this.type = type; } };

async function verify() {
    console.log("--- Verifying Quest System ---");

    const saveSystem = SaveSystem.getInstance();

    // 1. Initial State
    console.log("1. Fetching Quests (First Load)...");
    const questsInitial = saveSystem.getDailyQuests();

    if (questsInitial.length !== 2) {
        console.error(`FAIL: Expected 2 initial quests, got ${questsInitial.length}`);
        process.exit(1);
    } else {
        console.log("PASS: Got 2 initial basic quests.");
    }

    // 2. Wait for AI Quest
    console.log("2. Waiting for AI Quest Generation...");
    await new Promise(resolve => setTimeout(resolve, 2500)); // Wait for async operations (approx 1000ms total)

    const questsUpdated = saveSystem.data.dailyQuests.quests;
    if (questsUpdated.length !== 3) {
        console.error(`FAIL: Expected 3 quests after AI generation, got ${questsUpdated.length}`);
        // Debug: what do we have?
        console.log(JSON.stringify(questsUpdated, null, 2));
        process.exit(1);
    } else {
        const aiQuest = questsUpdated[2];
        if (aiQuest.type !== 'generic') {
             console.error("FAIL: Third quest is not the AI generic type.");
             process.exit(1);
        }
        console.log("PASS: AI Quest added successfully.");
        console.log(`   Flavor Text: "${aiQuest.flavorText}"`);
        console.log(`   Description: "${aiQuest.desc}"`);
    }

    console.log("--- Verification Complete ---");
}

verify().catch(e => {
    console.error(e);
    process.exit(1);
});
