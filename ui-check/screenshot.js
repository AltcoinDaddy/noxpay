const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
  } catch(e) {
    console.error(e);
  }
  await page.screenshot({ path: '/Users/daddy/Desktop/noxpay/screenshot.png', fullPage: true });
  await browser.close();
})();
