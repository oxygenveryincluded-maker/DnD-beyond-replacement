import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'src', 'lib', 'data');
const WIKIDOT = join(__dirname, 'wikidot-out');
const EXISTING_HOMEBREW_SOURCES = new Set(['HB', 'UA', 'UAMM']);

function readJson(p) {
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : [];
}

function hasEntries(obj) {
  return Array.isArray(obj?.entries) && obj.entries.length > 0;
}

// ── Load existing 5etools data ──────────────────────────────────
const classes = readJson(join(DATA, 'classes.json'));
const subclasses = readJson(join(DATA, 'subclasses.json'));
const spells = readJson(join(DATA, 'spells.json'));
const feats = readJson(join(DATA, 'feats.json'));
const backgrounds = readJson(join(DATA, 'backgrounds.json'));
const races = readJson(join(DATA, 'races.json'));
const items = readJson(join(DATA, 'items.json'));

// ── Load parsed wikidot data ────────────────────────────────────
const wk = Object.fromEntries(
  ['classes', 'subclasses', 'spells', 'feats', 'backgrounds', 'lineages', 'items'].map((key) => [
    key,
    readJson(join(WIKIDOT, `${key}.json`)),
  ])
);

let added = { classes: 0, subclasses: 0, spells: 0, feats: 0, backgrounds: 0, lineages: 0, items: 0 };
let filled = { spells: 0, feats: 0, backgrounds: 0, races: 0, items: 0 };

// ── Classes: append homebrew classes + their subclasses ─────────
const classNames = new Set(classes.map((c) => c.name.toLowerCase()));
for (const c of wk.classes) {
  if (classNames.has(c.name.toLowerCase())) continue;
  c.homebrew = true;
  if (!c.source || c.source === 'SRD' || EXISTING_HOMEBREW_SOURCES.has(c.source)) c.source = 'HB';
  classes.push(c);
  added.classes++;
  classNames.add(c.name.toLowerCase());
}

// ── Subclasses: append missing ──────────────────────────────────
const existingSubKeys = new Set(
  subclasses.map((s) => `${s.className}|${s.name.toLowerCase()}`)
);
const homebrewClassNames = new Set(
  classes.filter((c) => c.homebrew).map((c) => c.name.toLowerCase())
);
for (const s of wk.subclasses) {
  const key = `${s.className}|${s.name.toLowerCase()}`;
  if (existingSubKeys.has(key)) continue;
  // If it's for a homebrew class or flagged homebrew, add it
  s.homebrew = true;
  if (!s.source || s.source === 'SRD' || EXISTING_HOMEBREW_SOURCES.has(s.source)) s.source = 'HB';
  // align classSource with the class record
  const cls = classes.find((c) => c.name.toLowerCase() === (s.className || '').toLowerCase());
  if (cls) s.classSource = cls.source;
  if (jsFeatures(s)) {
    subclasses.push(s);
    existingSubKeys.add(key);
    added.subclasses++;
  }
}

function jsFeatures(s, f) {
  return !!s;
}

// ── Spells ─────────────────────────────────────────────────────
const spellKeys = new Map();
for (const sp of spells) {
  const k = sp.name.toLowerCase();
  if (!spellKeys.has(k)) spellKeys.set(k, sp);
}
for (const sp of wk.spells) {
  const existing = spellKeys.get(sp.name.toLowerCase());
  if (existing) {
    if (!hasEntries(existing) && sp.entries?.length) {
      existing.entries = sp.entries;
      filled.spells++;
    }
    continue;
  }
  sp.homebrew = true;
  if (!sp.source || sp.source === 'SRD' || EXISTING_HOMEBREW_SOURCES.has(sp.source)) sp.source = 'HB';
  spells.push(sp);
  spellKeys.set(sp.name.toLowerCase(), sp);
  added.spells++;
}

// ── Feats ──────────────────────────────────────────────────────
const featKeys = new Map();
for (const f of feats) {
  const k = f.name.toLowerCase();
  if (!featKeys.has(k)) featKeys.set(k, f);
}
for (const f of wk.feats) {
  const existing = featKeys.get(f.name.toLowerCase());
  if (existing) {
    if (!hasEntries(existing) && f.entries?.length) {
      existing.entries = f.entries;
      filled.feats++;
    }
    continue;
  }
  f.homebrew = true;
  if (!f.source || f.source === 'SRD' || EXISTING_HOMEBREW_SOURCES.has(f.source)) f.source = 'HB';
  feats.push(f);
  featKeys.set(f.name.toLowerCase(), f);
  added.feats++;
}

// ── Backgrounds ────────────────────────────────────────────────
const bgKeys = new Map();
for (const b of backgrounds) {
  const k = b.name.toLowerCase();
  if (!bgKeys.has(k)) bgKeys.set(k, b);
}
for (const b of wk.backgrounds) {
  const existing = bgKeys.get(b.name.toLowerCase());
  if (existing) {
    if (!hasEntries(existing) && b.entries?.length) {
      existing.entries = b.entries;
      filled.backgrounds++;
    }
    continue;
  }
  b.homebrew = true;
  if (!b.source || b.source === 'SRD' || EXISTING_HOMEBREW_SOURCES.has(b.source)) b.source = 'HB';
  backgrounds.push(b);
  bgKeys.set(b.name.toLowerCase(), b);
  added.backgrounds++;
}

// ── Races / lineages ───────────────────────────────────────────
const raceKeys = new Map();
for (const r of races) {
  const k = r.name.toLowerCase();
  if (!raceKeys.has(k)) raceKeys.set(k, r);
}
for (const r of wk.lineages) {
  const existing = raceKeys.get(r.name.toLowerCase());
  if (existing) {
    if (!hasEntries(existing) && r.entries?.length) {
      existing.entries = r.entries;
      filled.races++;
    }
    continue;
  }
  r.homebrew = true;
  if (!r.source || r.source === 'SRD' || EXISTING_HOMEBREW_SOURCES.has(r.source)) r.source = 'HB';
  races.push(r);
  raceKeys.set(r.name.toLowerCase(), r);
  added.lineages++;
}

// ── Magic items ────────────────────────────────────────────────
const itemKeys = new Map();
for (const it of items) {
  const k = it.name.toLowerCase();
  if (!itemKeys.has(k)) itemKeys.set(k, it);
}
for (const it of wk.items) {
  const existing = itemKeys.get(it.name.toLowerCase());
  if (existing) {
    if (!hasEntries(existing) && it.entries?.length) {
      existing.entries = it.entries;
      filled.items++;
    }
    continue;
  }
  it.homebrew = true;
  if (!it.source || it.source === 'SRD' || EXISTING_HOMEBREW_SOURCES.has(it.source)) it.source = 'HB';
  it.type = it.type || 'Wondrous item';
  items.push(it);
  itemKeys.set(it.name.toLowerCase(), it);
  added.items++;
}

// ── Write merged data ──────────────────────────────────────────
mkdirSync(DATA, { recursive: true });
const write = (file, data) => writeFileSync(join(DATA, file), JSON.stringify(data, null, '\t') + '\n');
write('classes.json', classes);
write('subclasses.json', subclasses);
write('spells.json', spells);
write('feats.json', feats);
write('backgrounds.json', backgrounds);
write('races.json', races);
write('items.json', items);

// ── Rebuild search index (mirrors fetch-data.mjs logic) ────────
const searchIndex = [];
for (const s of spells) searchIndex.push({ type: 'spell', name: s.name, source: s.source, path: '/spells', extra: `Level ${s.level}` });
for (const c of classes) searchIndex.push({ type: 'class', name: c.name, source: c.source, path: `/classes/${c.name.toLowerCase()}`, extra: c.edition });
for (const sc of subclasses) searchIndex.push({ type: 'subclass', name: sc.name, source: sc.source, path: `/classes/${sc.className.toLowerCase()}`, extra: sc.className });
for (const i of items.filter((i) => i.rarity && i.rarity !== 'none')) searchIndex.push({ type: 'magic-item', name: i.name, source: i.source, path: '/magic-items', extra: i.rarity });
for (const e of readJson(join(DATA, 'equipment.json'))) searchIndex.push({ type: 'equipment', name: e.name, source: e.source, path: '/equipment', extra: e.type });
for (const f of feats) searchIndex.push({ type: 'feat', name: f.name, source: f.source, path: '/feats', extra: f.category || '' });
for (const r of races) searchIndex.push({ type: 'race', name: r.name, source: r.source, path: '/races', extra: r.edition });
for (const b of backgrounds) searchIndex.push({ type: 'background', name: b.name, source: b.source, path: '/backgrounds' });
for (const c of readJson(join(DATA, 'conditions.json'))) searchIndex.push({ type: 'condition', name: c.name, source: c.source, path: '/rules' });
for (const o of readJson(join(DATA, 'optional-features.json'))) searchIndex.push({ type: 'optional-feature', name: o.name, source: o.source, path: '/invocations', extra: o.category });
write('search-index.json', searchIndex);

console.log('ADDED:', JSON.stringify(added));
console.log('FILLED (missing prose on existing records):', JSON.stringify(filled));
console.log('Totals:');
console.log('  classes', classes.length, '| subclasses', subclasses.length, '| spells', spells.length);
console.log('  feats', feats.length, '| backgrounds', backgrounds.length, '| races', races.length, '| items', items.length);
console.log('Search index:', searchIndex.length);