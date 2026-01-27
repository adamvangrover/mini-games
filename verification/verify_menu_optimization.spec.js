
const { test, expect } = require('@playwright/test');

test.describe('Menu Grid Optimization', () => {
    test('should not repopulate menu grid unnecessarily', async ({ page }) => {
        // Capture console logs
        const logs = [];
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('[Performance]') || text.includes('Error') || text.includes('Calling')) {
                console.log("Console:", text);
                logs.push(text);
            }
        });

        page.on('pageerror', err => {
            console.log(`Page Error: ${err}`);
        });

        await page.goto('http://localhost:8080/index.html');

        // Wait for loader
        await page.locator('#app-loader').click();
        await page.waitForSelector('#app-loader', { state: 'hidden' });

        // Ensure Grid View
        await page.waitForTimeout(1000);

        const ensureGridView = async () => {
            const is3D = await page.evaluate(() => window.miniGameHub.is3DView);
            if (is3D) {
                console.log("3D View active, toggling to Grid View...");
                await page.evaluate(() => window.miniGameHub.toggleView());
                await page.waitForTimeout(500);
            }
        };

        await ensureGridView();
        await page.waitForSelector('#menu-grid', { state: 'visible', timeout: 5000 });

        // Find a card (e.g., Clicker)
        const clickerCard = page.locator('#menu-grid > div').filter({ hasText: 'Clicker' }).first();
        await clickerCard.click();

        // Wait for game container
        await page.waitForSelector('#clicker-game', { state: 'visible' });

        // Go back to menu
        console.log("Going back to menu...");
        await page.evaluate(() => {
            console.log("Calling transitionToState MENU");
            window.miniGameHub.transitionToState('MENU');
        });

        // Handle potential 3D view reset?
        await ensureGridView();
        await page.waitForSelector('#menu-grid', { state: 'visible', timeout: 5000 });

        // Go to game again
        console.log("Clicking card again...");
        await clickerCard.click();
        await page.waitForSelector('#clicker-game', { state: 'visible' });

        // Go back to menu again
        console.log("Going back to menu again...");
        await page.evaluate(() => {
            console.log("Calling transitionToState MENU");
            window.miniGameHub.transitionToState('MENU');
        });

        await ensureGridView();
        await page.waitForSelector('#menu-grid', { state: 'visible', timeout: 5000 });

        // Verify logs
        const cachedCalls = logs.filter(l => l.includes('Skipped (Cached)'));
        console.log("Cached calls:", cachedCalls.length);
        expect(cachedCalls.length).toBeGreaterThan(0);

        // Change Theme and verify rebuild
        console.log("Changing theme...");
        await page.evaluate(() => {
            window.miniGameHub.saveSystem.equipItem('theme', 'pink'); // Fixed method name
            window.miniGameHub.transitionToState('MENU');
        });

        // Check last log
        const perfLogs = logs.filter(l => l.includes('[Performance]'));
        const lastLog = perfLogs[perfLogs.length - 1];
        console.log("Last perf log:", lastLog);
        expect(lastLog).not.toContain('Skipped'); // Should have rebuilt
    });
});
