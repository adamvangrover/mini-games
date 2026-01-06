
// Mock Game Registry
const gameRegistry = {
    'game1': { category: 'Action' },
    'game2': { category: 'Puzzle' },
    'system1': { category: 'System' },
    'system2': { category: 'System' },
    'game3': { category: 'Action' }
};

let dailyChallengeGameId = null;

function runSelection() {
    // Reset
    dailyChallengeGameId = null;

    // The Logic from js/main.js
    if (!dailyChallengeGameId) {
        const validGameKeys = Object.keys(gameRegistry).filter(key => gameRegistry[key].category !== 'System');
        if (validGameKeys.length > 0) {
            dailyChallengeGameId = validGameKeys[Math.floor(Math.random() * validGameKeys.length)];
        }
    }
    return dailyChallengeGameId;
}

// Test
console.log("Running 1000 iterations...");
for (let i = 0; i < 1000; i++) {
    const selected = runSelection();
    if (gameRegistry[selected].category === 'System') {
        console.error(`FAILURE: Selected System game: ${selected}`);
        process.exit(1);
    }
}
console.log("SUCCESS: No System games selected.");
