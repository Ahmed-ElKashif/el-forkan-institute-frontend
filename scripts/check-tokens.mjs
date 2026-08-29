/* ---------------------------------------------------------------------------
   Design-token adherence check.

   The Claude Design handoff shipped `_adherence.oxlintrc.json`, whose
   `no-restricted-syntax` rules did three jobs: ban raw hex, ban raw px, and
   validate each component's props and enum values.

   Two of those are now handled better elsewhere:
     · prop and enum validation -> TypeScript. Every component's `.d.ts` was
       folded into its `.tsx`, so a wrong prop or a bad `tone` is a compile
       error, not a lint warning.
     · raw px -> meaningless under Tailwind, where `w-[68px]` is the documented
       escape hatch rather than a token bypass.

   What genuinely still matters is the first one: a raw hex colour anywhere
   outside tokens.css means a colour escaped the system. oxlint has no
   `no-restricted-syntax`, so that check lives here.
--------------------------------------------------------------------------- */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

/* tokens.css is where every literal colour is allowed to live — it is the
   single source of truth the rest of the system references. */
const ALLOWED = new Set(['src/styles/tokens.css']);

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const EXTENSIONS = /\.(tsx?|css)$/;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (EXTENSIONS.test(entry)) out.push(full);
  }
  return out;
}

let failures = 0;

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).split(sep).join('/');
  if (ALLOWED.has(rel)) continue;

  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const match of line.matchAll(HEX)) {
      console.error(
        `${rel}:${i + 1}  raw hex colour ${match[0]} — use a design token via a Tailwind class or var().`,
      );
      failures += 1;
    }
  });
}

if (failures > 0) {
  console.error(`\n${failures} raw colour${failures === 1 ? '' : 's'} outside tokens.css.`);
  process.exit(1);
}

console.log('check-tokens: no raw colours outside tokens.css.');
