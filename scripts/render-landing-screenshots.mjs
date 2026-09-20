import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = '/home/thunder/Code/MoneyFlow/app';

const ARTIFACT_DIR = '/home/thunder/.gemini/antigravity/brain/7e2d1acc-6ad9-4fe4-85ce-bf290a6067f7/images/559';
const DOCS_DIR = path.join(REPO_ROOT, 'docs/design/559/renders/landing');

async function main() {
  console.log('🚀 Starting MoneyFlow Landing Page Renderer...');
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.mkdirSync(DOCS_DIR, { recursive: true });

  const executablePath = process.env.CHROME_BIN || '/usr/bin/google-chrome';
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const url = 'http://localhost:3456/landing';

  // 1. Desktop 1440x1024
  console.log('📸 Capturing Desktop 1440px...');
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1024 },
      deviceScaleFactor: 2,
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // Auto-scroll to trigger any lazy elements and wait for images to load
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 40);
      });

      const imgs = Array.from(document.querySelectorAll('img'));
      await Promise.all(
        imgs.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          });
        })
      );
    });
    await page.waitForTimeout(600);

    // Full page
    const fullDesktop = path.join(DOCS_DIR, 'landing-desktop-full.png');
    await page.screenshot({ path: fullDesktop, fullPage: true });
    fs.copyFileSync(fullDesktop, path.join(ARTIFACT_DIR, 'landing-desktop-full.png'));

    // Hero viewport (first screen)
    const heroDesktop = path.join(DOCS_DIR, 'landing-desktop-hero.png');
    await page.screenshot({ path: heroDesktop, fullPage: false });
    fs.copyFileSync(heroDesktop, path.join(ARTIFACT_DIR, 'landing-desktop-hero.png'));

    // Product Hero Window specifically
    const productWindow = await page.$('div[class*="productWindow"]');
    if (productWindow) {
      const windowImg = path.join(DOCS_DIR, 'landing-desktop-product-window.png');
      await productWindow.screenshot({ path: windowImg });
      fs.copyFileSync(windowImg, path.join(ARTIFACT_DIR, 'landing-desktop-product-window.png'));
    }

    // Walkthrough section
    const walkthrough = await page.$('section[aria-label="Khám phá chi tiết sản phẩm"]');
    if (walkthrough) {
      const walkImg = path.join(DOCS_DIR, 'landing-desktop-walkthrough.png');
      await walkthrough.screenshot({ path: walkImg });
      fs.copyFileSync(walkImg, path.join(ARTIFACT_DIR, 'landing-desktop-walkthrough.png'));
    }

    // Trust section
    const trust = await page.$('section[aria-label="Cam kết bảo mật và minh bạch"]');
    if (trust) {
      const trustImg = path.join(DOCS_DIR, 'landing-desktop-trust.png');
      await trust.screenshot({ path: trustImg });
      fs.copyFileSync(trustImg, path.join(ARTIFACT_DIR, 'landing-desktop-trust.png'));
    }

    // Mobile section
    const mobileSec = await page.$('section[aria-label="Quy trình ghi chép di động"]');
    if (mobileSec) {
      const mobileSecImg = path.join(DOCS_DIR, 'landing-desktop-mobile-section.png');
      await mobileSec.screenshot({ path: mobileSecImg });
      fs.copyFileSync(mobileSecImg, path.join(ARTIFACT_DIR, 'landing-desktop-mobile-section.png'));
    }

    // Final CTA
    const cta = await page.$('section[aria-label="Kêu gọi hành động bắt đầu"]');
    if (cta) {
      const ctaImg = path.join(DOCS_DIR, 'landing-desktop-final-cta.png');
      await cta.screenshot({ path: ctaImg });
      fs.copyFileSync(ctaImg, path.join(ARTIFACT_DIR, 'landing-desktop-final-cta.png'));
    }

    await page.close();
  }

  // 2. Mobile iPhone 390x844
  console.log('📸 Capturing Mobile 390px...');
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    // Full page
    const fullMobile = path.join(DOCS_DIR, 'landing-mobile-full.png');
    await page.screenshot({ path: fullMobile, fullPage: true });
    fs.copyFileSync(fullMobile, path.join(ARTIFACT_DIR, 'landing-mobile-full.png'));

    // Hero viewport
    const heroMobile = path.join(DOCS_DIR, 'landing-mobile-hero.png');
    await page.screenshot({ path: heroMobile, fullPage: false });
    fs.copyFileSync(heroMobile, path.join(ARTIFACT_DIR, 'landing-mobile-hero.png'));

    // Mobile proof section
    const mobileProof = await page.$('section[aria-label="Quy trình ghi chép di động"]');
    if (mobileProof) {
      const mobileProofImg = path.join(DOCS_DIR, 'landing-mobile-proof-section.png');
      await mobileProof.screenshot({ path: mobileProofImg });
      fs.copyFileSync(mobileProofImg, path.join(ARTIFACT_DIR, 'landing-mobile-proof-section.png'));
    }

    await page.close();
  }

  // 3. Mobile Narrow 360x740 (Android narrow viewport)
  console.log('📸 Capturing Mobile Narrow 360px...');
  {
    const page = await browser.newPage({
      viewport: { width: 360, height: 740 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const narrowMobile = path.join(DOCS_DIR, 'landing-mobile-360-hero.png');
    await page.screenshot({ path: narrowMobile, fullPage: false });
    fs.copyFileSync(narrowMobile, path.join(ARTIFACT_DIR, 'landing-mobile-360-hero.png'));

    await page.close();
  }

  await browser.close();
  console.log('✅ All landing screenshots successfully captured and saved!');
}

main().catch((err) => {
  console.error('❌ Failed to capture landing screenshots:', err);
  process.exit(1);
});
