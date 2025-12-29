import os

games_path = "js/games/"
core_path = "js/core/"

files_to_check = [
    "js/core/SoundManager.js",
    "js/core/SaveSystem.js",
    "js/core/InputManager.js",
    "js/core/ArcadeHub.js",
    "js/core/Store.js",
    "js/core/MobileControls.js",
    "js/core/AdsManager.js",
    "js/core/DevConsole.js",
    "js/games/PlaceholderGame.js",
    "js/games/alpine.js",
    "js/games/neonCity.js",
    "js/games/aetheria/aetheria.js",
    "js/games/aetheriaClassic.js",
    "js/games/matterhorn.js",
    "js/games/lumina.js",
    "js/games/prismRealms.js",
    "js/games/towerDefense.js",
    "js/games/physicsStacker.js",
    "js/games/neon2048.js",
    "js/games/neonFlap.js",
    "js/games/neonMemory.js",
    "js/games/neonFlow.js",
    "js/games/neonGolf.js",
    "js/games/neonHoops.js",
    "js/games/neonShooter.js",
    "js/games/neonJump.js",
    "js/games/neonSlice.js",
    "js/games/neonGalaga.js",
    "js/games/work.js",
    "js/games/lifeSim.js",
    "js/games/zenGarden.js",
    "js/games/matterhornArcade.js",
    "js/games/snake.js",
    "js/games/pong.js",
    "js/games/space.js",
    "js/games/breakout.js",
    "js/games/tetris.js",
    "js/games/maze.js",
    "js/games/runner.js",
    "js/games/typing.js",
    "js/games/clicker.js",
    "js/games/neonStack.js",
    "js/games/rpg.js",
    "js/games/eclipse.js",
    "js/games/eclipsePuzzle.js",
    "js/games/eclipseLogicPuzzle.js",
    "js/games/queens.js",
    "js/games/neonMines.js",
    "js/games/neonPicross.js",
    "js/games/sudoku.js",
    "js/games/neonZip.js",
    "js/core/TrophyRoom.js",
    "js/games/hallOfFame.js",
    "js/games/avatarStation.js",
    "js/games/techTree.js"
]

missing = []
for f in files_to_check:
    if not os.path.exists(f):
        missing.append(f)

if missing:
    print(f"Missing files: {missing}")
else:
    print("All files exist.")
