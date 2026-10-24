// Construction : esbuild → dist/, CSS, fichiers publics, service worker versionné.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

await build({
  entryPoints: [join(root, 'src/main.tsx')],
  bundle: true,
  minify: true,
  format: 'esm',
  target: ['es2020', 'chrome90', 'safari15'],
  outfile: join(dist, 'app.js'),
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
  logLevel: 'warning',
});

const css = ['tokens.css', 'app.css'].map((f) => readFileSync(join(root, 'src/styles', f), 'utf8')).join('\n');
writeFileSync(join(dist, 'app.css'), css);
cpSync(join(root, 'public'), dist, { recursive: true });
writeFileSync(join(dist, 'index.html'), readFileSync(join(root, 'index.html'), 'utf8'));
writeFileSync(join(dist, '.nojekyll'), '');

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = walk(dist).filter((f) => !f.endsWith('.nojekyll')).sort();
const hash = createHash('sha256');
for (const f of files) hash.update(relative(dist, f)).update(readFileSync(f));
const version = hash.digest('hex').slice(0, 10);
const list = ['./', ...files.map((f) => './' + relative(dist, f)).filter((f) => f !== './index.html')];
const sw = readFileSync(join(root, 'src/sw.template.js'), 'utf8')
  .replace('__VERSION__', version)
  .replace('__FILES__', JSON.stringify(list));
writeFileSync(join(dist, 'sw.js'), sw);
const kb = Math.round(statSync(join(dist, 'app.js')).size / 1024);
console.log(`dist/ prêt · version ${version} · app.js ${kb} Ko · ${list.length} fichiers en cache`);
