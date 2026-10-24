// Génère les icônes de l'app (PNG) à partir d'un SVG, rendu par Chromium. Jamais publié.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { writeFileSync } from 'node:fs';

const roundel = (size, scale, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  ${bg ? `<rect width="100" height="100" fill="${bg}"/>` : ''}
  <g transform="translate(50 50) scale(${scale})">
    <circle r="36" fill="#FFFFFF"/>
    <circle r="33.5" fill="#23408F"/>
    <circle r="22" fill="#FFFFFF"/>
    <circle r="11" fill="#C8102E"/>
  </g>
</svg>`;

const out = new URL('../public/icons/', import.meta.url).pathname;
writeFileSync(out + 'favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#23408F"/><circle cx="12" cy="12" r="7.3" fill="#fff"/><circle cx="12" cy="12" r="3.7" fill="#C8102E"/></svg>`);
const browser = await chromium.launch();
const page = await browser.newPage();
const jobs = [
  ['icon-192.png', 192, 1.15, '#0D1726'],
  ['icon-512.png', 512, 1.15, '#0D1726'],
  ['maskable-512.png', 512, 0.95, '#0D1726'],
  ['apple-touch-icon.png', 180, 1.1, '#0D1726'],
];
for (const [name, size, scale, bg] of jobs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${roundel(size, scale, bg)}</body></html>`);
  await page.screenshot({ path: out + name, clip: { x: 0, y: 0, width: size, height: size } });
}
await browser.close();
console.log('icônes générées');
