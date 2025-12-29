
export const AchievementRegistry = {
    'snake-score-10': {
        id: 'snake-score-10',
        title: 'Snake Beginner',
        description: 'Score 10 points in Snake',
        icon: 'fa-snake',
        xp: 100,
        gameId: 'snake-game'
    },
    'snake-score-50': {
        id: 'snake-score-50',
        title: 'Snake Master',
        description: 'Score 50 points in Snake',
        icon: 'fa-crown',
        xp: 500,
        gameId: 'snake-game'
    },
    'pong-score-5': {
        id: 'pong-score-5',
        title: 'Pong Victor',
        description: 'Score 5 points in Pong',
        icon: 'fa-table-tennis-paddle-ball',
        xp: 200,
        gameId: 'pong-game'
    },
    'neon-jump-50': {
        id: 'neon-jump-50',
        title: 'High Jumper',
        description: 'Reach a height of 50 in Neon Jump',
        icon: 'fa-arrow-up',
        xp: 300,
        gameId: 'neon-jump'
    },
    'neon-jump-100': {
        id: 'neon-jump-100',
        title: 'Stratosphere',
        description: 'Reach a height of 100 in Neon Jump',
        icon: 'fa-rocket',
        xp: 600,
        gameId: 'neon-jump'
    },
    'collector-100': {
        id: 'collector-100',
        title: 'Coin Collector',
        description: 'Accumulate 100 coins total',
        icon: 'fa-coins',
        xp: 150,
        gameId: 'global'
    },
    'rich-1000': {
        id: 'rich-1000',
        title: 'Neon Tycoon',
        description: 'Accumulate 1000 coins total',
        icon: 'fa-sack-dollar',
        xp: 1000,
        gameId: 'global'
    },
    'first-play': {
        id: 'first-play',
        title: 'Insert Coin',
        description: 'Play your first game',
        icon: 'fa-gamepad',
        xp: 50,
        gameId: 'global'
    },
    'clicker-millionaire': {
        id: 'clicker-millionaire',
        title: 'Tycoon',
        description: 'Earn $1,000,000 in Neon Idle',
        icon: 'fa-money-bill-wave',
        xp: 500,
        gameId: 'clicker-game'
    },
    'runner-coins-50': {
        id: 'runner-coins-50',
        title: 'Scavenger',
        description: 'Collect 50 coins in one run',
        icon: 'fa-coins',
        xp: 200,
        gameId: 'runner-game'
    },
    'runner-score-1000': {
        id: 'runner-score-1000',
        title: 'Marathon',
        description: 'Run 1000m in Neon Runner',
        icon: 'fa-person-running',
        xp: 300,
        gameId: 'runner-game'
    }
};

export function getAchievement(id) {
    return AchievementRegistry[id];
}
