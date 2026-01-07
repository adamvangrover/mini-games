// verify_boss_modules.js
import * as Content from '../js/core/BossModeContent.js';
import * as Apps from '../js/core/BossModeApps.js';
import * as Games from '../js/core/BossModeGames.js';

try {
    console.log("BossModeContent keys:", Object.keys(Content));
    console.log("BossModeApps keys:", Object.keys(Apps));
    console.log("BossModeGames keys:", Object.keys(Games));
    console.log("BOSS_MODULES_SUCCESS");
} catch (e) {
    console.error("BOSS_MODULES_FAILED:", e);
}
