const { chromium } = require('playwright');
const http = require('http');

const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];

function intercept(page) {
  page.route('http://localhost:3100/**', route => {
    const url = route.request().url().replace('http://localhost:3100', '');
    const req = http.request({ host: 'localhost', port: 3100, path: url || '/', method: route.request().method(), headers: { 'content-type': 'application/json' } }, res => {
      let data = [];
      res.on('data', c => data.push(c));
      res.on('end', () => { try { route.fulfill({ status: res.statusCode, body: Buffer.concat(data) }); } catch(e) {} });
    });
    req.on('error', () => { try { route.abort(); } catch(e) {} });
    req.end();
  });
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-gpu'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
  const page = await context.newPage();
  page.on('pageerror', e => pageErrors.push('PAGEERROR: ' + e.message.slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push('CONSOLE: ' + m.text().slice(0, 300)); });
  page.on('response', r => { if (r.status() >= 400) failedRequests.push(r.status() + ' ' + r.url().slice(0, 120)); });
  intercept(page);

  // 1. Homepage load
  console.log('== HOMEPAGE ==');
  await page.goto('http://localhost:3100/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(9000);

  // 2. Scroll through all chapters slowly
  console.log('== SCROLL THROUGH ==');
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let i = 0; i <= 10; i++) {
    await page.evaluate((h, i) => window.scrollTo(0, (h * i) / 10), { h: height, i });
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(2000);

  // 3. Terminal interaction — find xterm and type commands
  console.log('== TERMINAL ==');
  await page.evaluate(({h}) => window.scrollTo(0, h), {h: height});
  await page.waitForTimeout(2000);
  const termVisible = await page.evaluate(() => !!document.querySelector('.xterm'));
  console.log('terminal visible:', termVisible);
  if (termVisible) {
    await page.click('.xterm');
    await page.keyboard.type('help');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await page.keyboard.type('whoami');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await page.keyboard.type('ls projects/');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
  }

  // 4. Contact form — fill and check validation (don't actually need successful send)
  console.log('== CONTACT FORM ==');
  const formVisible = await page.evaluate(() => !!document.querySelector('form'));
  console.log('form visible:', formVisible);
  if (formVisible) {
    // Test empty submit -> validation errors
    const submitBtn = await page.$('form button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }
    // Fill fields
    const nameInput = await page.$('form input[name="name"], form input[type="text"]');
    const emailInput = await page.$('form input[type="email"], form input[name="email"]');
    const msgInput = await page.$('form textarea');
    if (nameInput) await nameInput.fill('Test User');
    if (emailInput) await emailInput.fill('test@example.com');
    if (msgInput) await msgInput.fill('This is a test message from the error checker.');
    await page.waitForTimeout(500);
  }

  // 5. Snake game — find and focus
  console.log('== SNAKE ==');
  const snakeVisible = await page.evaluate(() => !!document.querySelector('[data-snake-focused], canvas[data-snake], [aria-label*="snake" i]'));
  console.log('snake element found:', snakeVisible);
  // Try scrolling back up to projects where snake lives
  await page.evaluate(({h}) => window.scrollTo(0, h * 0.6), {h: height});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/play-projects.png' });

  // 6. Publication pages
  for (const slug of ['skilloptimizer', 'grokset']) {
    console.log('== PUB: ' + slug + ' ==');
    await page.goto('http://localhost:3100/publications/' + slug, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
  }

  // 7. 404 page
  console.log('== 404 ==');
  await page.goto('http://localhost:3100/this-page-does-not-exist', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  // 8. Plain page
  console.log('== PLAIN ==');
  await page.goto('http://localhost:3100/plain', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  console.log('\n===== RESULTS =====');
  console.log('PAGE ERRORS (' + pageErrors.length + '):');
  [...new Set(pageErrors)].forEach(e => console.log('  ' + e));
  console.log('CONSOLE ERRORS (' + consoleErrors.length + '):');
  [...new Set(consoleErrors)].forEach(e => console.log('  ' + e));
  console.log('FAILED REQUESTS (' + failedRequests.length + '):');
  [...new Set(failedRequests)].forEach(e => console.log('  ' + e));
  console.log('DONE');
  await browser.close();
})();
