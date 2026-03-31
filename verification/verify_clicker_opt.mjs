import fs from 'fs';

const code = fs.readFileSync('js/games/clicker.js', 'utf-8');

const hasUIMemoization = code.includes('this.uiElements = {') && code.includes('this.uiValues = {}');
const hasUpdateThrottling = code.includes('const newMoney = Math.floor(this.moneyAccumulator);') && code.includes('if (newMoney !== this.money)');

console.log("UI Memoization:", hasUIMemoization);
console.log("Update Throttling:", hasUpdateThrottling);

if (hasUIMemoization && hasUpdateThrottling) {
    console.log("Verification Passed!");
} else {
    console.log("Verification Failed!");
    process.exit(1);
}
