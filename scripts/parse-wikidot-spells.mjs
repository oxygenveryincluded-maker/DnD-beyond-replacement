#!/usr/bin/env node
// Parses a dnd5e.wikidot.com page dump (ExampleRepo2/spell/*.txt, one file per
// spell) into src/lib/data/spell-classes.json: per-spell class spell lists.
//
// File format per spell:
//   line 1:            title:<Name>
//   descriptor line:   //Conjuration cantrip// | //1st-level abjuration (ritual)//
//   spell lists line:  **//Spell Lists.//** [http://.../spells:wizard Wizard], ...
//   structured ====-fields after the description mirror the same data.
//
// Usage:
//   node scripts/parse-wikidot-spells.mjs [dumpDir] [outFile]
// Defaults: dumpDir = <repo>/../ExampleRepo2/spell, outFile = src/lib/data/spell-classes.json
//
// spells/wizard.txt-style files are ListPages queries, not spell data, and are
// never read (only spell/*.txt is parsed). UA/homebrew files in the dump are
// included as-is; consumers filter via the existing homebrew flag.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const dumpDir = process.argv[2] ?? join(here, '..', 'ExampleRepo2', 'spell');
const outFile = process.argv[3] ?? join(here, '..', 'src', 'lib', 'data', 'spell-classes.json');

function parseLevel(descriptor) {
  if (!descriptor) return null;
  if (/\bcantrip\b/i.test(descriptor)) return 0;
  const m = descriptor.match(/(\d+)(?:st|nd|rd|th)-level/i);
  return m ? Number(m[1]) : null;
}

function parseSchool(descriptor) {
  if (!descriptor) return null;
  let d = descriptor.replace(/\(.*?\)/g, '').trim();
  d = d.replace(/\bcantrip\b/i, '').replace(/\d+(?:st|nd|rd|th)-level/i, '').trim();
  return d ? d.charAt(0).toUpperCase() + d.slice(1).toLowerCase() : null;
}

// Display text is everything after the URL: "[http://.../spells:wizard Wizard (Dunamancy)]"
// -> "Wizard (Dunamancy)". Wikidot links come as [[[target|Text]]] or
// [[[target | Text (Optional)]]] (Tasha's optional lists - still valid class
// entries). Base class strips parentheticals for matching.
function parseClasses(spellListsLine) {
  const out = [];
  if (!spellListsLine) return out;
  const idx = spellListsLine.indexOf('Spell Lists');
  const rest = idx >= 0 ? spellListsLine.slice(idx) : spellListsLine;
  for (const m of rest.matchAll(/\[{1,3}([^\]]*)\]{1,3}/g)) {
    let inner = m[1].trim();
    if (inner.includes('|')) inner = inner.slice(inner.lastIndexOf('|') + 1);
    else if (/^https?:\S+\s+\S/.test(inner)) inner = inner.replace(/^\S+\s+/, '');
    let display = inner.replace(/[\[\]|]/g, '').trim();
    display = display.replace(/\s*\(Optional\)\s*/i, '').trim();
    if (!display || /^https?:/i.test(display)) continue;
    const base = display.split(' (')[0].trim();
    if (base && !out.includes(base)) out.push(base);
  }
  return out;
}

const files = readdirSync(dumpDir).filter((f) => f.endsWith('.txt'));
const spells = [];
const warnings = [];

for (const file of files) {
  const text = readFileSync(join(dumpDir, file), 'utf8');
  const lines = text.split(/\r?\n/);
  const titleLine = lines[0] || '';
  const name = titleLine.startsWith('title:') ? titleLine.slice('title:'.length).trim() : null;
  if (!name) {
    warnings.push(`${file}: no title: line`);
    continue;
  }
  const descriptorLine = lines.find((l) => /^\/\/.+\/\/\s*$/.test(l));
  const descriptor = descriptorLine ? descriptorLine.replace(/^\/\//, '').replace(/\/\/\s*$/, '').trim() : null;
  const level = parseLevel(descriptor);
  const school = parseSchool(descriptor);
  const listsLine = lines.find((l) => l.includes('Spell Lists'));
  const classes = parseClasses(listsLine);
  if (level == null) warnings.push(`${file}: could not parse level from "${descriptorLine || '(none)'}"`);
  if (!listsLine) warnings.push(`${file}: no Spell Lists line`);
  spells.push({ name, level, school, classes });
}

spells.sort((a, b) => a.name.localeCompare(b.name));

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(
  outFile,
  JSON.stringify({ source: 'dnd5e.wikidot.com page dump (ExampleRepo2/spell)', count: spells.length, spells }, null, '\t') + '\n'
);

console.log(`Parsed ${spells.length} spells from ${files.length} files -> ${outFile}`);
const withLists = spells.filter((s) => s.classes.length > 0).length;
console.log(`Spells with class lists: ${withLists}, without: ${spells.length - withLists}`);
const classCounts = {};
for (const s of spells) for (const c of s.classes) classCounts[c] = (classCounts[c] || 0) + 1;
console.log('Per-class counts:', JSON.stringify(classCounts, null, 1));
if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`);
  for (const w of warnings.slice(0, 20)) console.log('  ' + w);
}
