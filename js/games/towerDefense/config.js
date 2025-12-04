// Balancing constants
export const CONFIG = {
    TILE_SIZE: 64,
    MAP_COLS: 12,
    MAP_ROWS: 10,
    INITIAL_MONEY: 250,
    INITIAL_LIVES: 20,

    // Tower balancing
    TOWERS: {
        BASIC: {
            name: 'Basic',
            cost: 50,
            range: 150,
            damage: 15,
            fireRate: 0.8,
            color: '#3b82f6',
            description: 'Standard turret. Good for early waves.',
            type: 'basic'
        },
        SNIPER: {
            name: 'Sniper',
            cost: 150,
            range: 400,
            damage: 80,
            fireRate: 2.0,
            color: '#22c55e',
            description: 'Long range, high damage, slow fire.',
            type: 'sniper'
        },
        RAPID: {
            name: 'Rapid',
            cost: 250,
            range: 120,
            damage: 5,
            fireRate: 0.1,
            color: '#a855f7',
            description: 'Fast firing, low damage.',
            type: 'rapid'
        },
        FROST: {
            name: 'Frost',
            cost: 300,
            range: 180,
            damage: 5,
            fireRate: 1.0,
            color: '#06b6d4',
            description: 'Slows enemies down.',
            type: 'frost'
        },
        SPLASH: {
            name: 'Splash',
            cost: 400,
            range: 200,
            damage: 30,
            fireRate: 1.5,
            color: '#ef4444',
            description: 'Area of effect damage.',
            type: 'splash'
        }
    },

    // Wave Config
    WAVES: {
        DIFFICULTY_MULTIPLIER: 1.2,
        BASE_HP: 30,
        BASE_REWARD: 10
    }
};
