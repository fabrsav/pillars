import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

async function run() {
  const outDir = path.join(process.cwd(), 'tmp');
  try { fs.mkdirSync(outDir, { recursive: true }); } catch (_) {}

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => {
    logs.push({ type: 'console', text: msg.text(), location: msg.location() });
    console.log('[console]', msg.type(), msg.text());
  });
  page.on('pageerror', err => {
    logs.push({ type: 'pageerror', text: String(err) });
    console.error('[pageerror]', err);
  });

  const url = process.env.URL || 'http://localhost:3001/';
  console.log('Opening', url);
  await page.goto(url, { waitUntil: 'networkidle' });

  // Try to open the refunds panel by clicking the routine that contains "Gestione rimborsi"
  try {
    await page.locator('text=Gestione rimborsi').first().click({ timeout: 2000 });
    console.log('Clicked Gestione rimborsi');
  } catch (e) {
    console.warn('Could not click Gestione rimborsi:', e.message);
  }

  // Wait a bit for any async errors
  await page.waitForTimeout(1500);

  const screenshotPath = path.join(outDir, `diagnose_${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Saved screenshot to', screenshotPath);

  // Save logs
  const logsPath = path.join(outDir, `diagnose_logs_${Date.now()}.json`);
  fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2), 'utf8');
  console.log('Saved logs to', logsPath);

  await browser.close();
}

run().catch(e => { console.error(e); process.exit(1); });
