// Captures d'écran avec un jeu de données FICTIF (graine fixe) et une API Intervals.icu simulée. Jamais publié.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');

const dist = new URL('../dist/', import.meta.url).pathname;
const outDir = new URL('./out/', import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = join(dist, p);
  if (!existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[extname(f)] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(5178);

// jeu fictif : 50 jours jusqu'au 24/10/2026
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const days = [];
for (let i = 49; i >= 0; i--) {
  const d = new Date(Date.UTC(2026, 9, 24) - i * 86400000).toISOString().slice(0, 10);
  const low = i <= 1;
  days.push({ id: d, sleepScore: Math.round(70 + rnd() * 20), sleepSecs: Math.round((6.6 + rnd() * 1.3) * 3600), hrv: Math.round((low ? 39 : 50) + rnd() * 8), restingHR: Math.round(51 + rnd() * 4 + (low ? 4 : 0)), weight: i % 3 === 0 ? +(87.2 - (49 - i) * 0.035 + rnd() * 0.4).toFixed(1) : 0, ctl: 30 });
}
const acts = [
  { id: 'a1', start_date_local: '2026-10-20T16:20:00', type: 'Run', name: 'VMA 30/30', distance: 7400, moving_time: 2700, average_heartrate: 158, average_speed: 2.74 },
  { id: 'a2', start_date_local: '2026-10-21T16:20:00', type: 'Swim', name: 'Piscine', distance: 1500, moving_time: 2400, average_heartrate: 132 },
  { id: 'a3', start_date_local: '2026-10-23T16:25:00', type: 'Run', name: 'Seuil 2×9', distance: 8100, moving_time: 2580, average_heartrate: 162, average_speed: 3.14 },
  { id: 'a4', start_date_local: '2026-10-24T09:05:00', type: 'Run', name: 'Sortie longue', distance: 8600, moving_time: 3050, average_heartrate: 141, average_speed: 2.82 },
];

const browser = await chromium.launch();
const shots = [
  ['today', '#/aujourdhui'], ['plan', '#/plan'], ['health', '#/sante'], ['tests', '#/tests'], ['concours', '#/concours'], ['settings', '#/reglages'],
];
const which = process.argv[2] ?? 'all';
for (const [w, h, tag] of [[390, 844, 'mobile'], [1280, 900, 'desktop']]) {
  for (const scheme of ['light', 'dark']) {
    if (which !== 'all' && which !== `${tag}-${scheme}`) continue;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: tag === 'mobile' ? 2 : 1 });
    await ctx.addInitScript(() => {
      const fixed = new Date('2026-10-24T13:30:00').getTime();
      const RealDate = Date;
      class FakeDate extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } }
      globalThis.Date = FakeDate;
      localStorage.setItem('cocarde.icu', JSON.stringify({ athleteId: '0', apiKey: 'demo' }));
    });
    await ctx.route('https://intervals.icu/**', (route) => {
      const url = route.request().url();
      const body = url.includes('/wellness') ? days : acts;
      route.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://localhost:5178/#/aujourdhui');
    await page.waitForTimeout(1200);
    for (const [name, hash] of shots) {
      await page.evaluate((hh) => { location.hash = hh; }, hash);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${outDir}${tag}-${scheme}-${name}.png`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 0) errors.push(`${name}: débordement horizontal de ${overflow}px`);
    }
    console.log(`${tag}-${scheme}`, errors.length ? errors : 'OK');
    await ctx.close();
  }
}
await browser.close();
server.close();
