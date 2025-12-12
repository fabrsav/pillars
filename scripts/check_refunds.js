// headless check using Playwright to capture console errors and screenshot
(async () => {
  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const logs = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.message || String(err) }));

    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

    // Click sidebar entry labeled "Gestione rimborsi"
    await page.locator('text=Gestione rimborsi').first().click().catch(() => {});

    // wait a moment for any runtime errors and rendering
    await page.waitForTimeout(1500);

    const screenshotPath = process.env.SCREENSHOT_PATH || 'tmp/refunds.png';
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

    console.log('--- console logs ---');
    console.log(JSON.stringify(logs, null, 2));
    console.log('screenshot saved to', screenshotPath);

    await browser.close();
  } catch (e) {
    console.error('Headless check failed:', e);
    process.exit(2);
  }
})();