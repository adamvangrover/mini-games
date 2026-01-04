// Central Registry of Achievements
// Used by SaveSystem and HallOfFame

export const AchievementRegistry = {
    // --- Global / Hub ---
    'global-welcome': {
        id: 'global-welcome',
        title: 'Welcome to the Grid',
        description: 'Launch the Neon Arcade for the first time.',
        xp: 100,
        icon: 'fas fa-door-open'
    },
    'global-explorer': {
        id: 'global-explorer',
        title: 'Digital Tourist',
        description: 'Visit every game cabinet at least once.',
        xp: 500,
        icon: 'fas fa-map-marked-alt'
    },
    'global-rich': {
        id: 'global-rich',
        title: 'Crypto Miner',
        description: 'Amass 1000 total coins.',
        xp: 300,
        icon: 'fas fa-coins'
    },
    'big_spender': {
        id: 'big_spender',
        title: 'Big Spender',
        description: 'Spend over 1000 coins in the shop.',
        xp: 400,
        icon: 'fas fa-shopping-cart'
    },
    'ad_watcher_master': {
        id: 'ad_watcher_master',
        title: 'Sponsor Hero',
        description: 'Interact with 5 ads.',
        xp: 250,
        icon: 'fas fa-ad'
    },

    // --- Snake ---
    'snake-score-100': {
        id: 'snake-score-100',
        title: 'Snake Charmer',
        description: 'Score 100 points in Neon Snake.',
        xp: 200,
        icon: 'fas fa-staff-snake'
    },

    // --- Pong ---
    'pong-win-ai': {
        id: 'pong-win-ai',
        title: 'Paddle Master',
        description: 'Defeat the AI in Pong.',
        xp: 200,
        icon: 'fas fa-table-tennis'
    },

    // --- Space Shooter ---
    'space-wave-5': {
        id: 'space-wave-5',
        title: 'Star Fighter',
        description: 'Reach Wave 5 in Space Shooter.',
        xp: 300,
        icon: 'fas fa-rocket'
    },

    // --- Clicker ---
    'clicker-millionaire': {
        id: 'clicker-millionaire',
        title: 'Idle Tycoon',
        description: 'Earn 1,000,000 cash in Neon Idle.',
        xp: 1000,
        icon: 'fas fa-money-bill-wave'
    },

    // --- Runner ---
    'runner-score-1000': {
        id: 'runner-score-1000',
        title: 'Marathon Runner',
        description: 'Score 1000 in Neon Runner.',
        xp: 300,
        icon: 'fas fa-running'
    },

    // --- Tower Defense ---
    'td-wave-10': {
        id: 'td-wave-10',
        title: 'Strategist',
        description: 'Survive 10 waves in Tower Defense.',
        xp: 400,
        icon: 'fas fa-chess-rook'
    },

    // --- Neon City ---
    'city-hacker': {
        id: 'city-hacker',
        title: 'Netrunner',
        description: 'Hack 3 Data Nodes in Neon City.',
        xp: 500,
        icon: 'fas fa-laptop-code'
    }
};
