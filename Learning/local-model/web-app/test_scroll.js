const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/');
  
  await page.waitForSelector('textarea');
  await page.type('textarea', 'Output a very long story with lots of paragraphs.');
  await page.keyboard.press('Enter');
  
  // Wait for streaming to start and then wait a bit
  await page.waitForTimeout(5000);
  
  // take a screenshot
  await page.screenshot({ path: 'test_scroll_after.png' });
  
  await browser.close();
})();
