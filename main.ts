// main.ts — the hand-in program for makefun-frontend-01 (Node 22+, standard
// library only). The product is the static frontend in app/ beside this file:
// it copies app/ and screenshots/ into the output directory and writes
// dossier.json there with the kit's vendored buildDossier, under the
// scorer's own caps, so the dossier is byte for byte what the scorer's copy
// of the library produces from the same files.
//
// Run it:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (In the grader's container the output directory is /output, which is the
// default when MAKEFUN_OUTPUT_DIR is not set.)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(root, 'app'), join(outDir, 'app'), { recursive: true });

mkdirSync(join(outDir, 'screenshots'), { recursive: true });
const shotsDir = join(root, 'screenshots');
if (existsSync(shotsDir)) cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// The caps come from the competition's gate (kit reference/gate.json). Only
// text_max_bytes shapes the dossier bytes; the rest make this program refuse
// exactly what the scorer would refuse — more than 3 screenshots, one over
// 256 KiB, more than 993 files and directories under app/, or over 16 MiB of
// app files.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
