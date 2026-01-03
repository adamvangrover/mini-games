export const CHARACTERS = {
    'cyber-01': {
        id: 'cyber-01',
        name: 'CYBER-01',
        description: 'Balanced Fighter. The standard prototype.',
        stats: { speed: 350, power: 10, health: 100 },
        color: '#22d3ee', // Cyan
        gradient: ['#22d3ee', '#0891b2'],
        scale: 1.0,
        moveset: 'balanced'
    },
    'viper-7': {
        id: 'viper-7',
        name: 'VIPER-7',
        description: 'Speed Specialist. Fast but fragile.',
        stats: { speed: 500, power: 8, health: 80 },
        color: '#4ade80', // Green
        gradient: ['#4ade80', '#16a34a'],
        scale: 0.9,
        moveset: 'speed'
    },
    'titan-x': {
        id: 'titan-x',
        name: 'TITAN-X',
        description: 'Heavy Tank. Slow but hits like a truck.',
        stats: { speed: 200, power: 20, health: 150 },
        color: '#f87171', // Red
        gradient: ['#f87171', '#dc2626'],
        scale: 1.2,
        moveset: 'power'
    },
    'neon-ninja': {
        id: 'neon-ninja',
        name: 'SHADOW',
        description: 'Stealth Unit. Invisible dashes.',
        stats: { speed: 450, power: 12, health: 90 },
        color: '#a855f7', // Purple
        gradient: ['#a855f7', '#7e22ce'],
        scale: 0.95,
        unlockCondition: 'win_5_games',
        moveset: 'stealth'
    },
    'glitch-god': {
        id: 'glitch-god',
        name: 'MISSINGNO',
        description: 'Corruption Entity. Unstable.',
        stats: { speed: 400, power: 25, health: 500 },
        color: '#ffffff', // White
        gradient: ['#ffffff', '#000000'],
        scale: 1.1,
        unlockCondition: 'cheat_code',
        moveset: 'god'
    }
};

export const STAGES = {
    'rooftop': {
        id: 'rooftop',
        name: 'Neo-Tokyo Rooftop',
        colors: { sky: '#020617', grid: '#06b6d4', accent: '#d946ef' }
    },
    'dojo': {
        id: 'dojo',
        name: 'Digital Dojo',
        colors: { sky: '#1a0505', grid: '#ef4444', accent: '#fca5a5' }
    },
    'sewers': {
        id: 'sewers',
        name: 'Toxic Underpass',
        colors: { sky: '#051a05', grid: '#22c55e', accent: '#84cc16' }
    },
    'void': {
        id: 'void',
        name: 'Null Space',
        colors: { sky: '#000000', grid: '#ffffff', accent: '#888888' },
        unlockCondition: 'flawless_victory'
    }
};
