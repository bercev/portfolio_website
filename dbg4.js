const { chromium } = require('playwright');
const http = require('http');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message.slice(0,150)));
  await page.route('http://localhost:3100/**', route => {
    const url = route.request().url().replace('http://localhost:3100', '');
    const req = http.request({ host: 'localhost', port: 3100, path: url || '/', method: 'GET' }, res => {
      let data = [];
      res.on('data', c => data.push(c));
      res.on('end', () => { try { route.fulfill({ status: res.statusCode, body: Buffer.concat(data) }); } catch(e) {} });
    });
    req.on('error', () => { try { route.abort(); } catch(e) {} });
    req.end();
  });
  await page.goto('http://localhost:3100/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  const boot = await page.evaluate(() => {
    const el = document.querySelector('[data-boot-sequence]');
    if (!el) return 'no boot element';
    const s = getComputedStyle(el);
    return `display:${s.display} opacity:${s.opacity} z:${s.zIndex}`;
  });
  console.log('BOOT:', boot);
  console.log('JS ERRORS:', jsErrors.slice(0,5).join(' | '));
  await browser.close();
})();
