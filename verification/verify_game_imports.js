
async function verifyGameImports() {
    const gameRegistry = {
        // 3D Immersive
        'alpine-game': () => import('../js/games/alpine.js'),
        'neon-city-game': () => import('../js/games/neonCity.js'),
        'aetheria-game': () => import('../js/games/aetheria/aetheria.js'),
        'aetheria-classic': () => import('../js/games/aetheriaClassic.js'),
        'matterhorn-game': () => import('../js/games/matterhorn.js'),
        'lumina-game': () => import('../js/games/lumina.js'),
        'prism-realms-game': () => import('../js/games/prismRealms.js'),
        'rage-quit-game': () => import('../js/games/rageQuit.js'),
        'all-in-hole-game': () => import('../js/games/allInHole.js'),

        // New Games
        'tower-defense-game': () => import('../js/games/towerDefense.js'),
        'stacker-game': () => import('../js/games/physicsStacker.js'),
        'neon-2048': () => import('../js/games/neon2048.js'),
        'neon-flap': () => import('../js/games/neonFlap.js'),
        'neon-memory': () => import('../js/games/neonMemory.js'),
        'neon-flow-game': () => import('../js/games/neonFlow.js'),

        // Sports
        'neon-golf': () => import('../js/games/neonGolf.js'),
        'neon-hoops': () => import('../js/games/neonHoops.js'),

        // Action
        'neon-shooter': () => import('../js/games/neonShooter.js'),
        'neon-jump': () => import('../js/games/neonJump.js'),
        'neon-slice': () => import('../js/games/neonSlice.js'),
        'neon-galaga-game': () => import('../js/games/neonGalaga.js'),
        'neon-combat': () => import('../js/games/neonCombat.js'),
        'snack-hole-game': () => import('../js/games/snackHole.js'),

        // Simulation
        'work-game': () => import('../js/games/work.js'),
        'life-sim-game': () => import('../js/games/lifeSim.js'),
        'zen-garden-game': () => import('../js/games/zenGarden.js'),

        // Arcade Classics
        'matterhorn-arcade': () => import('../js/games/matterhornArcade.js'),
        'snake-game': () => import('../js/games/snake.js'),
        'pong-game': () => import('../js/games/pong.js'),
        'space-game': () => import('../js/games/space.js'),
        'breakout-game': () => import('../js/games/breakout.js'),
        'tetris-game': () => import('../js/games/tetris.js'),
        'solitaire-game': () => import('../js/games/solitaire.js'),
        'mahjong-game': () => import('../js/games/mahjong.js'),

        // Quick Minigames
        'maze-game': () => import('../js/games/maze.js'),
        'runner-game': () => import('../js/games/runner.js'),
        'typing-game': () => import('../js/games/typing.js'),
        'clicker-game': () => import('../js/games/clicker.js'),
        'neon-stack': () => import('../js/games/neonStack.js'),
        'neon-whack-game': () => import('../js/games/neonWhack.js'),

        // RPG & Logic
        'rpg-game': () => import('../js/games/rpg.js'),
        'eclipse-game': () => import('../js/games/eclipse.js'),
        'eclipse-puzzle-game': () => import('../js/games/eclipsePuzzle.js'),
        'eclipse-logic-puzzle-game': () => import('../js/games/eclipseLogicPuzzle.js'),
        'exiled-game': () => import('../js/games/exiled.js'),

        // Logic Puzzles
        'queens-game': () => import('../js/games/queens.js'),
        'neon-mines-game': () => import('../js/games/neonMines.js'),
        'neon-picross-game': () => import('../js/games/neonPicross.js'),
        'sudoku-game': () => import('../js/games/sudoku.js'),
        'neon-zip-game': () => import('../js/games/neonZip.js'),
        'neon-word-game': () => import('../js/games/neonWord.js'),

        // System Modules
        'trophy-room': () => import('../js/core/TrophyRoom.js'),
        'hall-of-fame': () => import('../js/games/hallOfFame.js'),
        'avatar-station': () => import('../js/games/avatarStation.js'),
        'tech-tree': () => import('../js/games/techTree.js'),
    };

    const results = {};
    for (const [key, importFn] of Object.entries(gameRegistry)) {
        try {
            const module = await importFn();
            if (module.default) {
                results[key] = "OK";
            } else {
                results[key] = "MISSING_DEFAULT_EXPORT";
            }
        } catch (error) {
            results[key] = `ERROR: ${error.message}`;
        }
    }
    window.results = results;
    // Log results to console for playwright to pick up
    console.log(JSON.stringify(results));
}

verifyGameImports();
