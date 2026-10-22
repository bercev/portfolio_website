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

  const table = await page.evaluate(() => {
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
    if (!js) return { error: 'scene not found' };
    window.__js = js;
    const cam = js.camera;
    cam.updateMatrixWorld();
    const vw = cam.matrixWorldInverse.elements;
    const pr = cam.projectionMatrix.elements;
    const project = (x, y, z) => {
      const vx = vw[0] * x + vw[4] * y + vw[8] * z + vw[12];
      const vy = vw[1] * x + vw[5] * y + vw[9] * z + vw[13];
      const vz = vw[2] * x + vw[6] * y + vw[10] * z + vw[14];
      const w = vw[3] * x + vw[7] * y + vw[11] * z + vw[15];
      const cx = pr[0] * vx + pr[4] * vy + pr[8] * vz + pr[12] * w;
      const cy = pr[1] * vx + pr[5] * vy + pr[9] * vz + pr[13] * w;
      const cw = pr[3] * vx + pr[7] * vy + pr[11] * vz + pr[15] * w;
      if (!cw || cw <= 0) return null;
      return { x: Math.round((cx / cw * 0.5 + 0.5) * 1280), y: Math.round((1 - (cy / cw * 0.5 + 0.5)) * 800), d: Math.round(-vz) };
    };
    const out = [];
    let idx = 0;
    js.scene.traverse((o) => {
      if (!(o.isMesh || o.isSprite || o.isPoints || o.isLine)) return;
      o.userData.__pid = idx++;
      const e = o.matrixWorld.elements;
      const p = project(e[12], e[13], e[14]);
      if (!p) return;
      // world scale approx
      const sx = Math.hypot(e[0], e[1], e[2]);
      let r = 0;
      if (o.isSprite) r = 0.5 * Math.max(o.scale.x, o.scale.y);
      else if (o.geometry) {
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        r = (o.geometry.boundingSphere ? o.geometry.boundingSphere.radius : 0) * sx;
      }
      const px = p.d > 0 ? Math.round((r / (p.d * 0.65)) * 800) : 0; // approx screen diameter-ish
      out.push({
        pid: o.userData.__pid,
        type: o.isSprite ? 'Sprite' : o.isMesh ? 'Mesh' : o.isPoints ? 'Points' : 'Line',
        geo: o.geometry ? o.geometry.type : '-',
        mat: o.material ? o.material.type : '-',
        blend: o.material ? o.material.blending : '-',
        op: o.material ? o.material.opacity : '-',
        wire: o.material ? !!o.material.wireframe : false,
        x: p.x, y: p.y, dist: p.d, worldR: Math.round(r * 10) / 10, pxApprox: px,
      });
    });
    return { count: out.length, items: out.filter((i) => i.x > 380 && i.x < 900 && i.y > 60 && i.y < 520 && i.pxApprox > 40) };
  });
  console.log(JSON.stringify(table, null, 1));
  await browser.close();
  console.log('PROBE3 DONE');
})();
