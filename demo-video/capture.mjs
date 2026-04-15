import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'fs';

(async () => {
  console.log("Launching browser to capture screenshots...");
  if (!existsSync('./public')) mkdirSync('./public');
  
  const browser = await puppeteer.launch({ 
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-crash-reporter', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    console.log("Navigating to Homepage...");
    await page.goto('http://localhost:3333', { waitUntil: 'networkidle0', timeout: 15000 });
    await page.screenshot({ path: 'public/home.jpeg', type: 'jpeg', quality: 90 });
    console.log("Captured home.jpeg");

    console.log("Navigating to Marketplace...");
    await page.goto('http://localhost:3333/marketplace', { waitUntil: 'networkidle0', timeout: 15000 });
    await page.screenshot({ path: 'public/marketplace.jpeg', type: 'jpeg', quality: 90 });
    console.log("Captured marketplace.jpeg");

    console.log("Navigating to Dashboard...");
    await page.goto('http://localhost:3333/dashboard', { waitUntil: 'networkidle0', timeout: 15000 });
    await page.screenshot({ path: 'public/dashboard.jpeg', type: 'jpeg', quality: 90 });
    console.log("Captured dashboard.jpeg");

  } catch(e) {
    console.error("Failed to capture some screenshots:", e);
  } finally {
    await browser.close();
  }
})();
