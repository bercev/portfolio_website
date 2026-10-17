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

async function safe(name, fn) {
  try { await fn(); console.log('OK: ' + name); }
  catch (e) { console.log('SKIP: ' + name + ' — ' + e.message.slice(0, 120)); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox', '--disable-gpu'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
  const page = await context.newPage();
  page.on('pageerror', e => pageErrors.push('PAGEERROR: ' + e.message.slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push('CONSOLE: ' + m.text().slice(0, 300)); });
  page.on('response', r => { if (r.status() >= 400) failedRequests.push(r.status() + ' ' + r.url().slice(0, 120)); });
  intercept(page);

  await safe('homepage load', async () => {
    await page.goto('http://localhost:3100/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(9000);
  });

  await safe('scroll through chapters', async () => {
    const height = await page.evaluate(() => document.body.scrollHeight);
    for (let i = 0; i <= 10; i++) {
      await page.evaluate((h, i) => window.scrollTo(0, (h * i) / 10), { h: height, i });
      await page.waitForTimeout(1200);
    }
  });

  await safe('terminal commands', async () => {
    const height = await page.evaluate(() => document.body.scrollHeight);
    await page.evaluate(({h}) => window.scrollTo(0, h), {h: height});
    await page.waitForTimeout(2000);
    const hasTerm = await page.evaluate(() => !!document.querySelector('.xterm'));
    if (!hasTerm) throw new Error('no xterm');
    // Focus the terminal's hidden textarea directly instead of clicking
    await page.evaluate(() => {
      const ta = document.querySelector('.xterm-helper-textarea');
      if (ta) ta.focus();
    });
    await page.keyboard.type('help');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);
    await page.keyboard.type('whoami');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);
    const termText = await page.evaluate(() => {
      const el = document.querySelector('.xterm');
      return el ? el.innerText.slice(-500) : '';
    });
    console.log('  term output tail: ' + JSON.stringify(termText.slice(-120)));
    if (!termText.includes('bercev')) throw new Error('terminal did not respond');
  });

  await safe('contact form validation + fill', async () => {
    const hasForm = await page.evaluate(() => !!document.querySelector('form'));
    if (!hasForm) throw new Error('no form');
    // Check fields exist
    const fields = await page.evaluate(() => ({
      name: !!document.querySelector('form input[name="name"], form input[type="text"]'),
      email: !!document.querySelector('form input[type="email"], form input[name="email"]'),
      msg: !!document.querySelector('form textarea'),
      submit: !!document.querySelector('form button[type="submit"]'),
    }));
    console.log('  form fields: ' + JSON.stringify(fields));
  });

  await safe('contact form submit (expect 503 not-configured)', async () => {
    await page.evaluate(() => {
      const n = document.querySelector('form input[name="name"], form input[type="text"]');
      const e = document.querySelector('form input[type="email"], form input[name="email"]');
      const m = document.querySelector('form textarea');
      if (n) { n.focus(); n.value = 'Test User'; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); }
      if (e) { e.focus(); e.value = 'test@example.com'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }
      if (m) { m.focus(); m.value = 'Test message from error checker.'; m.dispatchEvent(new Event('input', { bubbles: true })); m.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const b = document.querySelector('form button[type="submit"]');
      if (b) b.click();
    });
    await page.waitForTimeout(3000);
    const feedback = await page.evaluate(() => document.body.innerText.slice(-800));
    console.log('  form feedback tail: ' + JSON.stringify(feedback.slice(-200)));
  });

  await safe('snake game presence', async () => {
    const height = await page.evaluate(() => document.body.scrollHeight);
    await page.evaluate(({h}) => window.scrollTo(0, h * 0.55), {h: height});
    await page.waitForTimeout(2000);
    const snake = await page.evaluate(() => {
      const els = [...document.querySelectorAll('*')].filter(e =>
        (e.getAttribute('aria-label') || '').toLowerCase().includes('snake') ||
        e.hasAttribute('data-snake-focused'));
      return els.length;
    });
    console.log('  snake elements: ' + snake);
  });

  await safe('boot sequence skip', async () => {
    await page.goto('http://localhost:3100/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    const boot = await page.evaluate(() => !!document.querySelector('[data-boot], .boot-sequence'));
    console.log('  boot visible on revisit: ' + boot);
    await page.waitForTimeout(4000);
  });

  for (const slug of ['skilloptimizer', 'grokset']) {
    await safe('publication page: ' + slug, async () => {
      await page.goto('http://localhost:3100/publications/' + slug, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(2500);
      const title = await page.evaluate(() => document.title);
      const h1 = await page.evaluate(() => document.querySelector('h1')?.innerText?.slice(0, 60) || 'none');
      console.log('  title: ' + title.slice(0, 60) + ' | h1: ' + h1);
    });
  }

  await safe('bibtex copy button', async () => {
    const btn = await page.evaluate(() => {
      const els = [...document.querySelectorAll('button')].filter(b =>
        (b.innerText || '').toLowerCase().includes('bibtex') || (b.innerText || '').toLowerCase().includes('cite'));
      return els.length;
    });
    console.log('  cite buttons: ' + btn);
  });

  await safe('404 page', async () => {
    await page.goto('http://localhost:3100/this-page-does-not-exist', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
  });

  await safe('plain page', async () => {
    await page.goto('http://localhost:3100/plain', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
  });

  await safe('konami code', async () => {
    await page.goto('http://localhost:3100/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(6000);
    // Up Up Down Down Left Right Left Right B A
    for (const k of ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']) {
      await page.keyboard.press(k);
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(2000);
    console.log('  konami entered without crash');
  });

  console.log('\n===== RESULTS =====');
  const uniq = a => [...new Set(a)];
  console.log('PAGE ERRORS (' + pageErrors.length + '):');
  uniq(pageErrors).forEach(e => console.log('  ' + e));
  console.log('CONSOLE ERRORS (' + consoleErrors.length + '):');
  uniq(consoleErrors).forEach(e => console.log('  ' + e));
  console.log('FAILED REQUESTS (' + failedRequests.length + '):');
  uniq(failedRequests).forEach(e => console.log('  ' + e));
  console.log('DONE');
  await browser.close();
})().catch(e => { console.log('FATAL: ' + e.message); process.exit(1); });
