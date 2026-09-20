#!/usr/bin/env node
/**
 * MoneyFlow #559 Redesign Mockup Renderer
 * Generates all 36 canonical screen mockups (3 territories × 6 screens × 2 viewports)
 * and 6 comparison boards using headless Chromium via Playwright.
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const TERRITORIES = ['territory-a', 'territory-b', 'territory-c'];
const SCREENS = ['today', 'activity', 'accounts', 'plan', 'capture', 'settings'];

const COMPARISON_WORKFLOWS = [
  { file: 'dashboard-desktop.png', workflow: 'today', mode: 'desktop' },
  { file: 'dashboard-mobile.png', workflow: 'today', mode: 'mobile' },
  { file: 'transactions-desktop.png', workflow: 'activity', mode: 'desktop' },
  { file: 'transactions-mobile.png', workflow: 'activity', mode: 'mobile' },
  { file: 'reconciliation.png', workflow: 'accounts', mode: 'desktop' },
  { file: 'system-samples.png', workflow: 'system', mode: 'desktop' },
];

async function main() {
  console.log('🚀 Starting MoneyFlow #559 Design Mockup Renderer...');

  const executablePath = process.env.CHROME_BIN || '/usr/bin/google-chrome';
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const rendersDir = path.join(REPO_ROOT, 'docs/design/559/renders');
  const comparisonDir = path.join(REPO_ROOT, 'docs/design/559/comparison');

  // Ensure directories exist
  for (const territory of TERRITORIES) {
    fs.mkdirSync(path.join(rendersDir, territory, 'desktop'), { recursive: true });
    fs.mkdirSync(path.join(rendersDir, territory, 'mobile'), { recursive: true });
  }
  fs.mkdirSync(comparisonDir, { recursive: true });

  let totalScreenshots = 0;

  // 1. Render individual territory screens (36 total)
  for (const territory of TERRITORIES) {
    console.log(`\n📸 Rendering ${territory}...`);
    for (const screen of SCREENS) {
      // Desktop: 1440x1024
      {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
        const url = `file://${REPO_ROOT}/docs/design/559/${territory}/prototype.html?screen=${screen}&device=desktop&standalone=true`;
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(100);
        const dest = path.join(rendersDir, territory, 'desktop', `${screen}.png`);
        await page.locator('#device-desktop').screenshot({ path: dest });
        await page.close();
        process.stdout.write(`  [D] ${territory}/${screen} `);
        totalScreenshots++;
      }

      // Mobile: 390x844
      {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const url = `file://${REPO_ROOT}/docs/design/559/${territory}/prototype.html?screen=${screen}&device=mobile&standalone=true`;
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(100);
        const dest = path.join(rendersDir, territory, 'mobile', `${screen}.png`);
        await page.locator('#device-mobile').screenshot({ path: dest });
        await page.close();
        process.stdout.write(`[M] ${territory}/${screen}\n`);
        totalScreenshots++;
      }
    }
  }

  // 2. Render comparison boards (6 total)
  console.log('\n📊 Rendering comparison boards...');
  for (const comp of COMPARISON_WORKFLOWS) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const url = `file://${REPO_ROOT}/docs/design/559/comparison/side-by-side.html?workflow=${comp.workflow}&mode=${comp.mode}&standalone=true`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    const dest = path.join(comparisonDir, comp.file);
    await page.locator('.comparison-grid').screenshot({ path: dest });
    await page.close();
    console.log(`  ✓ comparison/${comp.file} (workflow: ${comp.workflow}, mode: ${comp.mode})`);
    totalScreenshots++;
  }

  await browser.close();
  console.log(`\n✨ Done! Captured ${totalScreenshots} total screenshots successfully.`);
}

main().catch((err) => {
  console.error('Fatal error during rendering:', err);
  process.exit(1);
});
