const { chromium } = require('playwright');
const http = require('http');

async function makePage(browser, viewport) {
  const context = await browser.newContext({ viewport, colorScheme: 'dark' });
  const page = await context.newPage();
  await page.route('http://localhost:3100/**', (route) => {
    const url = new URL(route.request().url());
    const opts = {
      host: '127.0.0.1',
      port: 3100,
      path: url.pathname + url.search,
      method: route.request().method(),
      headers: route.request().headers(),
    };
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () =>
        route.fulfill({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) })
      );
    });
    req.on('error', () => route.abort());
    const body = route.request().postData();
    if (body) req.write(body);
    req.end();
  });
  return { context, page };
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/meta-chromium/chrome',
    args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });

  // ---- Desktop 1280x800 ----
  {
    const { context, page } = await makePage(browser, { width: 1280, height: 800 });
    await page.goto('http://localhost:3100/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.mouse.click(640, 700); // dismiss boot sequence
    await page.waitForTimeout(8000); // intro decode + settle
    await page.screenshot({ path: '/home/hatch/workspace/deliverables/v25c-hero-desktop.png', timeout: 60000 });
    console.log('hero done');

    // scroll to About (bust)
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: '/home/hatch/workspace/deliverables/v25c-about.png', timeout: 60000 });
    console.log('about done');

    // scroll to Experience (work mode)
    await page.mouse.wheel(0, 2400);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: '/home/hatch/workspace/deliverables/v25c-experience.png', timeout: 60000 });
    console.log('experience done');
    await context.close();
  }

  // ---- Mobile 390x844 ----
  {
    const { context, page } = await makePage(browser, { width: 390, height: 844 });
    await page.goto('http://localhost:3100/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.mouse.click(195, 700);
    await page.waitForTimeout(8000);
    await page.screenshot({ path: '/home/hatch/workspace/deliverables/v25c-hero-mobile.png', timeout: 60000 });
    console.log('mobile done');
    await context.close();
  }

  await browser.close();
  console.log('ALL DONE');
})();
