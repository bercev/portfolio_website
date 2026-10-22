const { chromium } = require('playwright');
const http = require('http');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });
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
  await page.goto('http://localhost:3100/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.mouse.click(640, 700);
  await page.waitForTimeout(6000);

  const info = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('canvas').forEach((cv, i) => {
      const chain = [];
      let el = cv;
      for (let d = 0; d < 4 && el; d++) {
        chain.push(
          el.tagName.toLowerCase() +
            (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : '') +
            (el.getAttribute && el.getAttribute('data-journey-theme') ? '[journey-theme]' : '')
        );
        el = el.parentElement;
      }
      const r = cv.getBoundingClientRect();
      out.push({ i, w: Math.round(r.width), h: Math.round(r.height), chain: chain.join(' < ') });
    });
    return out;
  });
  for (const c of info) console.log(c.i, c.w + 'x' + c.h, '|', c.chain);
  await browser.close();
  console.log('DONE');
})();
