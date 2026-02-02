const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function run() {
    console.log("Starting server...");
    const server = spawn('python3', ['-u', '-m', 'http.server', '0']);
    let port;

    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Server timeout")), 5000);

        server.stdout.on('data', (data) => {
             const str = data.toString();
             const match = str.match(/port (\d+)/);
             if (match) {
                 port = match[1];
                 clearTimeout(timeout);
                 resolve();
             }
        });

        server.stderr.on('data', (data) => {
             const str = data.toString();
             const match = str.match(/port (\d+)/);
             if (match) {
                 port = match[1];
                 clearTimeout(timeout);
                 resolve();
             }
        });
    });

    console.log(`Server started on port ${port}`);

    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        await page.goto(`http://localhost:${port}/index.html`);
        await page.click('body');

        await page.waitForFunction(() => window.miniGameHub && window.miniGameHub.soundManager);

        const result = await page.evaluate(() => {
            let createBufferCount = 0;
            const originalCreateBuffer = AudioContext.prototype.createBuffer;

            AudioContext.prototype.createBuffer = function() {
                createBufferCount++;
                return originalCreateBuffer.apply(this, arguments);
            };

            let startCount = 0;
            const originalStart = AudioBufferSourceNode.prototype.start;
            AudioBufferSourceNode.prototype.start = function() {
                startCount++;
                return originalStart.apply(this, arguments);
            }

            const sm = window.miniGameHub.soundManager;
            sm.muted = false;
            sm.audioCtx.resume();

            for (let i = 0; i < 100; i++) {
                sm.playHiHat(0);
                sm.playNoise(0.1);
            }

            return { createBufferCount, startCount };
        });

        console.log(`createBuffer calls: ${result.createBufferCount}`);
        console.log(`start calls: ${result.startCount}`);

    } catch (e) {
        console.error("Test failed:", e);
        process.exitCode = 1;
    } finally {
        await browser.close();
        server.kill();
    }
}

run();
