// Build-time guard for {@html} sinks. Content is rendered as raw HTML in
// ContentRenderer/LevelTables, so refuse to ship a dataset that contains
// script-capable markup. Runs automatically before `npm run build`.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/lib/data';
const PATTERNS = [
  [/<\s*script\b/i, 'script tag'],
  [/<\s*iframe\b/i, 'iframe'],
  [/<\s*object\b/i, 'object'],
  [/<\s*embed\b/i, 'embed'],
  [/<\s*style\b/i, 'style tag'],
  [/<\s*link\b/i, 'link tag'],
  [/<\s*meta\b/i, 'meta tag'],
  [/<\s*base\b/i, 'base tag'],
  [/\ssrcdoc\s*=/i, 'srcdoc attribute'],
  [/\son[a-z]+\s*=/i, 'inline event handler'],
  [/javascript\s*:/i, 'javascript: URL'],
  [/data\s*:\s*text\/html/i, 'data:text/html URL']
];

let failures = 0;
for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
  const text = readFileSync(join(DIR, file), 'utf8');
  for (const [pattern, label] of PATTERNS) {
    const match = pattern.exec(text);
    if (!match) continue;
    const line = text.slice(0, match.index).split('\n').length;
    console.error(`${DIR}/${file}:${line}: ${label}`);
    failures++;
  }
}

if (failures) {
  console.error(`\nData safety check failed (${failures} issue${failures === 1 ? '' : 's'}).`);
  process.exit(1);
}
console.log('Data safety check passed.');
