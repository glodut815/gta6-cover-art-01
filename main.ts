import { buildDossier } from './vendor/makefun-app.ts';
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Neon Vice Cover Studio — entry program for make.fun's
// "Make GTA 6 Cover Art" bounty (gta6-cover-art-01).
// Copies the web app and its screenshots into the output directory,
// then writes dossier.json for the entry.

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });

const appSrc = join(repoRoot, 'app');
const appDst = join(outDir, 'app');
mkdirSync(appDst, { recursive: true });
cpSync(appSrc, appDst, { recursive: true });

const shotsSrc = join(repoRoot, 'screenshots');
const shotsDst = join(outDir, 'screenshots');
if (existsSync(shotsSrc)) {
  mkdirSync(shotsDst, { recursive: true });
  cpSync(shotsSrc, shotsDst, { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`Neon Vice Cover Studio: dossier.json written to ${outDir} (${dossier.length} bytes)`);
