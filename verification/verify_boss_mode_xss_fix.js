const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8085;

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';

    // query params handling
    if(filePath.includes('?')) {
        filePath = filePath.split('?')[0];
    }

    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': contentType = 'image/jpg'; break;
        case '.wav': contentType = 'audio/wav'; break;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code == 'ENOENT'){
                res.writeHead(404);
                res.end('File not found');
            }
            else {
                res.writeHead(500);
                res.end('Server error: '+error.code);
            }
        }
        else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}/`);

    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        // Setup console listener to catch errors
        page.on('console', msg => {
            if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
        });

        // Test V1
        console.log("Testing BossModeV1 XSS fix...");
        await page.goto(`http://localhost:${PORT}/index.html?2d=true`);

        await page.evaluate(() => {
            return new Promise(resolve => {
                const interval = setInterval(() => {
                    if (window.BossMode && window.BossMode.instance && window.BossMode.instance.currentGuest) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
            });
        });

        await page.evaluate(() => {
            // Force V1 and inject malicious payload
            window.BossMode.instance.changeSkin('v1');
            window.BossMode.instance.currentGuest.user.name = "<img src='x' onerror='window.XSS_V1_TRIGGERED=true'>";
            window.BossMode.instance.currentGuest.systemState = 'login';
            window.BossMode.instance.currentGuest.renderLogin();
        });

        // Wait a tiny bit for render
        await page.waitForTimeout(500);

        const v1_xss = await page.evaluate(() => window.XSS_V1_TRIGGERED === true);
        if (v1_xss) {
            console.error("❌ BossModeV1 XSS STILL VULNERABLE");
        } else {
            console.log("✅ BossModeV1 XSS fixed");
        }

        // Test V2
        console.log("Testing BossModeV2 XSS fix...");
        await page.evaluate(() => {
            window.BossMode.instance.changeSkin('v2');
            window.BossMode.instance.currentGuest.user.name = "<img src='x' onerror='window.XSS_V2_TRIGGERED=true'>";
            window.BossMode.instance.currentGuest.systemState = 'login';
            window.BossMode.instance.currentGuest.renderLogin();
        });

        await page.waitForTimeout(500);

        const v2_xss = await page.evaluate(() => window.XSS_V2_TRIGGERED === true);
        if (v2_xss) {
            console.error("❌ BossModeV2 XSS STILL VULNERABLE");
        } else {
            console.log("✅ BossModeV2 XSS fixed");
        }

        // Test V3
        console.log("Testing BossModeV3 XSS fix...");
        await page.evaluate(() => {
            window.BossMode.instance.changeSkin('v3');
            window.BossMode.instance.currentGuest.user.name = "<img src='x' onerror='window.XSS_V3_NAME_TRIGGERED=true'>";
            window.BossMode.instance.currentGuest.user.initials = "<img src='x' onerror='window.XSS_V3_INITIALS_TRIGGERED=true'>";
            window.BossMode.instance.currentGuest.systemState = 'login';
            window.BossMode.instance.currentGuest.renderLogin();
        });

        await page.waitForTimeout(500);

        const v3_name_xss = await page.evaluate(() => window.XSS_V3_NAME_TRIGGERED === true);
        const v3_initials_xss = await page.evaluate(() => window.XSS_V3_INITIALS_TRIGGERED === true);

        if (v3_name_xss || v3_initials_xss) {
            console.error("❌ BossModeV3 XSS STILL VULNERABLE");
            if(v3_name_xss) console.error("  - Name vulnerable");
            if(v3_initials_xss) console.error("  - Initials vulnerable");
        } else {
            console.log("✅ BossModeV3 XSS fixed");
        }

        if (v1_xss || v2_xss || v3_name_xss || v3_initials_xss) {
            process.exit(1);
        } else {
            console.log("🎉 All BossMode XSS vulnerabilities fixed!");
        }

    } catch (e) {
        console.error("Error running tests:", e);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
        server.close();
    }
});
