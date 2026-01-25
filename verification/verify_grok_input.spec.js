const { test, expect } = require('@playwright/test');

test('Verify Grok App Input', async ({ page }) => {
  test.setTimeout(60000); // Increase timeout to 60s
  console.log('Navigating...');
  await page.goto('http://localhost:8080/index.html');

  // Clear localStorage
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  console.log('Dismissing loader...');
  await page.click('body');
  await page.waitForTimeout(1000);

  console.log('Toggling Boss Mode...');
  await page.keyboard.press('Alt+b');

  // Wait for Login Screen
  console.log('Waiting for login...');
  const loginInput = page.locator('#boss-login-input');
  await loginInput.waitFor({ state: 'visible', timeout: 10000 });

  // Login
  console.log('Logging in...');
  await loginInput.fill('123');
  await page.keyboard.press('Enter');

  // Wait for Desktop
  console.log('Waiting for desktop...');
  await page.locator('#boss-desktop-icons').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(1000);

  // Click Grok icon in taskbar
  console.log('Clicking Grok icon...');
  const grokIcon = page.locator('div[onclick*="openApp(\'grok\')"]');
  await grokIcon.waitFor({ state: 'visible' });
  await grokIcon.click();

  // Wait for Grok Window
  console.log('Waiting for Grok window...');
  const grokWindow = page.locator('.os-window', { hasText: 'Grok xAI' });
  await grokWindow.waitFor({ state: 'visible' });

  // Find Input
  console.log('Finding input...');
  const input = grokWindow.locator('input');
  await input.waitFor({ state: 'visible' });

  // Type Message
  const testMessage = `Test Message ${Date.now()}`;
  console.log(`Typing: ${testMessage}`);
  await input.fill(testMessage);
  await page.keyboard.press('Enter');

  // Verify Message in Chat
  console.log('Verifying chat...');
  const chatArea = grokWindow.locator('#grok-chat-area');
  await expect(chatArea).toContainText(testMessage);

  // Take screenshot
  console.log('Taking screenshot...');
  await page.screenshot({ path: 'verification/grok_verified.png' });
  console.log('Success!');
});
