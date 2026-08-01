const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://jeju-live.com/lost.html');
  // wait for success stories to load
  await page.waitForTimeout(5000);
  
  // click the "진행상황" tab to render it
  try {
      await page.click('#btn-view-success');
      await page.waitForTimeout(2000);
  } catch (e) {
      console.log('could not click success tab', e);
  }

  await page.screenshot({path: 'live_test.png'});
  await browser.close();
})();
