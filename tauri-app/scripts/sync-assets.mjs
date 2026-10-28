/**
 * Copies large font assets that are not committed to the repository.
 *
 * MiSans ships in the Flutter project at <repo>/fonts/. The web build needs its
 * own copy under src/assets/fonts, so this script mirrors it before dev/build —
 * this keeps ~16 MB of TTF out of git while still producing an identical UI.
 *
 * The Material Icons woff2 files are committed (they are small) so they are only
 * synthesised from the npm package when missing.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, '..');
const destDir = join(app, 'src', 'assets', 'fonts');
mkdirSync(destDir, { recursive: true });

const repoRoot = resolve(app, '..');
const jobs = [
  [join(repoRoot, 'fonts', 'MiSans-Regular.ttf'), join(destDir, 'MiSans-Regular.ttf')],
  [join(repoRoot, 'fonts', 'MiSans-Demibold.ttf'), join(destDir, 'MiSans-Demibold.ttf')],
  // Fallback: material-icons ships these in its npm package.
  [
    join(app, 'node_modules', 'material-icons', 'iconfont', 'material-icons.woff2'),
    join(destDir, 'material-icons.woff2'),
  ],
  [
    join(app, 'node_modules', 'material-icons', 'iconfont', 'material-icons-outlined.woff2'),
    join(destDir, 'material-icons-outlined.woff2'),
  ],
];

let copied = 0;
for (const [src, dst] of jobs) {
  if (existsSync(dst)) continue;
  if (!existsSync(src)) {
    console.warn(`[sync-assets] missing source: ${src}`);
    continue;
  }
  copyFileSync(src, dst);
  copied += 1;
  console.log(`[sync-assets] ${dst.replace(app, '.')}`);
}

if (copied === 0) console.log('[sync-assets] assets already present');
