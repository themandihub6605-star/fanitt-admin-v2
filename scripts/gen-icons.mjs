// npm run icons — builds src/icons/paths.ts: only the bold, duotone and fill SVG bodies of the
// Phosphor icons the panel uses (Phosphor ships 6 weights per icon).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const root = path.resolve(process.argv[2] || '.');
const require = createRequire(path.join(root, 'package.json'));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const src = fs.readFileSync(path.join(root, 'src/icons/index.tsx'), 'utf8');
// Every Phosphor name used in index.tsx: make('Wallet', ...)
const names = [...new Set([...src.matchAll(/make\('(\w+)'/g)].map((m) => m[1]))].sort();
const out = {};
for (const n of names) {
  const mod = await import(path.join(root, 'node_modules/@phosphor-icons/react/dist/defs', `${n}.es.js`));
  const map = mod.default;
  const body = (w) => renderToStaticMarkup(React.createElement('g', null, map.get(w))).replace(/^<g>|<\/g>$/g, '');
  out[n] = [body('bold'), body('duotone'), body('fill')];
}
const lines = Object.entries(out).map(([n, [b, d, f]]) => `  ${n}: [${JSON.stringify(b)}, ${JSON.stringify(d)}, ${JSON.stringify(f)}],`);
fs.writeFileSync(
  path.join(root, 'src/icons/paths.ts'),
  `/* Generated from @phosphor-icons/react (MIT) — bold, duotone and fill bodies only.\n * Regenerate with the script in the README if you add icons. */\n/* eslint-disable */\nexport const PATHS: Record<string, [string, string, string]> = {\n${lines.join('\n')}\n};\n`
);
console.log('icons', names.length);
