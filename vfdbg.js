const { chromium } = require('playwright');
const http = require('http');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const variants = ['', 'planets', 'nebulae', 'islands'];
  for (const v of variants) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
    const page = await context.newPage();
    await page.route('http://localhost:3100/**', (route) => {
      const url = new URL(route.request().url());
      const req = http.request(
        { host: '127.0.0.1', port: 3100, path: url.pathname + url.search, method: route.request().method(), headers: route.request().headers() },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => route.fulfill({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
        }
      );
      req.on('error', () => route.abort());
      const body = route.request().postData();
      if (body) req.write(body);
      req.end();
    });
    const qs = v ? `?cdbg=${v}` : '';
    await page.goto(`http://localhost:3100/${qs}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.mouse.click(640, 700);
    await page.waitForTimeout(7000);
    await page.screenshot({ path: `/tmp/cdbg-${v || 'base'}.png`, clip: { x: 440, y: 80, width: 480, height: 420 } });
    console.log('shot', v || 'base');
    await context.close();
  }
  await browser.close();
  console.log('DBG DONE');
})();
