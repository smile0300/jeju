const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Create 192x192
  await page.setViewport({ width: 192, height: 192 });
  await page.setContent(`
    <div style="width: 192px; height: 192px; background-color: #FFFFFF; display: flex; align-items: center; justify-content: center; color: #000000; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 34px; font-weight: bold; margin: 0; padding: 0; box-sizing: border-box; letter-spacing: -1px;">
      jeju-live
    </div>
  `);
  // Remove default body margin
  await page.addStyleTag({ content: 'body { margin: 0; padding: 0; }' });
  await page.screenshot({ path: 'public/img/icon-192.png' });
  
  // Create 512x512
  await page.setViewport({ width: 512, height: 512 });
  await page.setContent(`
    <div style="width: 512px; height: 512px; background-color: #FFFFFF; display: flex; align-items: center; justify-content: center; color: #000000; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 92px; font-weight: bold; margin: 0; padding: 0; box-sizing: border-box; letter-spacing: -2px;">
      jeju-live
    </div>
  `);
  await page.addStyleTag({ content: 'body { margin: 0; padding: 0; }' });
  await page.screenshot({ path: 'public/img/icon-512.png' });

  await browser.close();
  console.log('Icons generated successfully.');
})();
