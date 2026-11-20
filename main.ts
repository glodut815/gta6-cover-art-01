/**
 * Neon Vice Cover Studio — entry program (Node 22, stdlib only).
 *
 * Copies app/ and screenshots/ into the output directory, then writes
 * dossier.json by calling buildDossier(out, caps) from the vendor file.
 * The dossier must be byte-for-byte what the scorer's own copy writes,
 * so vendor/makefun-app.ts is used exactly as shipped.
 */

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const out = process.env.MAKEFUN_OUTPUT_DIR
    ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
    : "/output";
  mkdirSync(out, { recursive: true });

  for (const dir of ["app", "screenshots"]) {
    const src = join(here, dir);
    const dst = join(out, dir);
    if (!existsSync(src)) continue;
    rmSync(dst, { recursive: true, force: true });
    cpSync(src, dst, { recursive: true });
  }

  const dossier = buildDossier(out, CAPS);
  writeFileSync(join(out, "dossier.json"), dossier);
  console.log(`wrote ${join(out, "dossier.json")} (${dossier.length} bytes)`);
}

main();
