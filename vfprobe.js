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
  await page.waitForTimeout(8000);

  const info = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('canvas').forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      out.push({
        i,
        cls: c.className,
        parentCls: c.parentElement ? c.parentElement.className : '',
        parentData: c.parentElement ? Array.from(c.parentElement.attributes).map(a => a.name).join(',') : '',
        w: Math.round(r.width), h: Math.round(r.height),
        x: Math.round(r.x), y: Math.round(r.y),
        z: cs.zIndex, pos: cs.position,
      });
    });
    return out;
  });
  console.log(JSON.stringify(info, null, 1));

  // Hide canvases one at a time; screenshot the bust region after each hide.
  const count = info.length;
  for (let i = 0; i < count; i++) {
    await page.evaluate((idx) => {
      document.querySelectorAll('canvas').forEach((c, j) => {
        c.style.visibility = j === idx ? 'hidden' : '';
      });
    }, i);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `/tmp/probe-hide-${i}.png`, clip: { x: 480, y: 120, width: 420, height: 380 } });
    console.log('hid canvas', i);
  }
  await browser.close();
  console.log('PROBE DONE');
})();
