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
  await page.waitForTimeout(7000);

  await page.evaluate(() => {
    const canvas = document.querySelector('canvas.journey-scene');
    const key = Object.keys(canvas).find((k) => k.startsWith('__reactFiber'));
    let f = canvas[key];
    let js = null;
    while (f && !js) {
      let hook = f.memoizedState;
      let guard = 0;
      while (hook && guard++ < 60) {
        const cur = hook.memoizedState && hook.memoizedState.current;
        if (cur && cur.scene && cur.renderer && cur.camera) { js = cur; break; }
        hook = hook.next;
      }
      if (!js && f.stateNode && f.stateNode.scene && f.stateNode.camera) js = f.stateNode;
      f = f.return;
    }
    window.__objs = [];
    js.scene.traverse((o) => {
      if (o.isMesh || o.isSprite || o.isPoints || o.isLine) window.__objs.push(o);
    });
    window.__setGroup = (mode) => {
      for (const o of window.__objs) {
        let hide = false;
        const geo = o.geometry ? o.geometry.type : '';
        if (mode === 'sprites') hide = !!o.isSprite;
        else if (mode === 'planets') hide = o.isMesh && (geo === 'IcosahedronGeometry' || geo === 'SphereGeometry' || geo === 'RingGeometry');
        else if (mode === 'points') hide = !!o.isPoints;
        else if (mode === 'instanced') hide = !!o.isInstancedMesh;
        else if (mode === 'meshes') hide = o.isMesh && !o.isInstancedMesh && geo !== 'IcosahedronGeometry' && geo !== 'SphereGeometry' && geo !== 'RingGeometry' && geo !== 'PlaneGeometry';
        o.visible = !hide;
      }
    };
  });

  const clip = { x: 400, y: 120, width: 480, height: 380 };
  await page.screenshot({ path: '/tmp/grp-base.png', clip });
  for (const mode of ['sprites', 'planets', 'points', 'instanced', 'meshes']) {
    await page.evaluate((m) => window.__setGroup(m), mode);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `/tmp/grp-${mode}.png`, clip });
    console.log('hid group', mode);
  }
  await page.evaluate(() => { window.__objs.forEach((o) => { o.visible = true; }); });
  await browser.close();
  console.log('GRP DONE');
})();
