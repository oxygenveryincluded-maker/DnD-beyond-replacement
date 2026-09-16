import { readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  readFilesRecursive, readTxt, writeJson,
  parseClass, parseSubclass, parseSpell, parseFeat, parseBackground,
  parseLineage, parseMagicItem, parseTitleSource, normalizeSource,
} from './wikidot/convert.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = process.env.WIKIDOT_SRC || join(__dirname, 'wikidot-src', 'ExampleRepo2');
const OUT = join(__dirname, 'wikidot-out');

const CORE_CLASSES = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard', 'artificer'];

// Homebrew / extra classes we want to parse into real class records.
// The txt lives at <SRC>/<file> and subclasses (if any) in <SRC>/<dir>.
const EXTRA_CLASSES = [
  { file: 'blood-hunter.txt', dir: 'blood-hunter', name: 'Blood Hunter', classNameKey: 'Blood Hunter' },
  { file: 'mystic.txt', dir: 'mystic', name: 'Mystic', classNameKey: 'Mystic' },
  { file: 'ranger-revised.txt', dir: 'ranger-revised', name: 'Ranger (Revised)', classNameKey: 'Ranger (Revised)' },
  { file: 'ranger-ambuscade-ua.txt', dir: 'ranger-ambuscade-ua', name: 'Ranger (UA Ambuscade)', classNameKey: 'Ranger (UA Ambuscade)' },
  { file: 'rune-scribe.txt', dir: null, name: 'Rune Scribe', classNameKey: 'Rune Scribe' },
  { file: 'sidekicks.txt', dir: 'sidekick', name: 'Sidekick', classNameKey: 'Sidekick' },
  { file: '7pack-barbarian.txt', dir: '7pack-barbarian', name: '7 Pack Barbarian', classNameKey: '7 Pack Barbarian' },
  { file: '7pack-bard.txt', dir: null, name: '7 Pack Bard', classNameKey: '7 Pack Bard' },
  { file: '7pack-ranger.txt', dir: null, name: '7 Pack Ranger', classNameKey: '7 Pack Ranger' },
  { file: '7pack-rogue.txt', dir: null, name: '7 Pack Rogue', classNameKey: '7 Pack Rogue' },
  { file: '7pack-sorcerer.txt', dir: null, name: '7 Pack Sorcerer', classNameKey: '7 Pack Sorcerer' },
  { file: '7pack-warlock.txt', dir: '7pack-warlock', name: '7 Pack Warlock', classNameKey: '7 Pack Warlock' },
  { file: '7pack-wizard.txt', dir: null, name: '7 Pack Wizard', classNameKey: '7 Pack Wizard' },
];

// Map class folder name → canonical class name (so subclass parsing works for core + extra classes)
const CLASS_DIR_MAP = {
  barbarian: 'Barbarian', bard: 'Bard', cleric: 'Cleric', druid: 'Druid', fighter: 'Fighter',
  monk: 'Monk', paladin: 'Paladin', ranger: 'Ranger', rogue: 'Rogue', sorcerer: 'Sorcerer',
  warlock: 'Warlock', wizard: 'Wizard', artificer: 'Artificer',
  'blood-hunter': 'Blood Hunter', mystic: 'Mystic', 'ranger-revised': 'Ranger (Revised)',
  'ranger-ambuscade-ua': 'Ranger (UA Ambuscade)', sidekick: 'Sidekick',
  '7pack-barbarian': '7 Pack Barbarian', '7pack-warlock': '7 Pack Warlock',
};

function cleanSubName(s) {
  return s
    .replace(/^[^:]+:\s*/, '')
    .replace(/\bthe the\b/i, 'the')
    .trim();
}

function load() {
  const out = { classes: [], subclasses: [], spells: [], feats: [], backgrounds: [], lineages: [], items: [] };
  const p = (f) => join(SRC, f);

  // Some class folders contain supporting pages (feature lists) that are NOT subclasses.
const DIR_EXCLUDE = {
  'blood-hunter': new Set(['blood-curse', 'mutagens']),
  mystic: new Set(['disciplines', 'talents']),
};

// ── Extra classes ───────────────────────────────────────────────
  for (const cls of EXTRA_CLASSES) {
    const txt = readTxt(p(cls.file));
    const parsed = parseClass(txt, cls.name);
    // if the parsed name came back as the generic one, keep our name
    parsed.name = cls.name;
    parsed.classNameKey = cls.classNameKey;
    out.classes.push(parsed);

    // Parse subclasses from the class folder
    if (cls.dir) {
      const dirPath = join(SRC, cls.dir);
      const exclude = DIR_EXCLUDE[cls.dir] || new Set();
      try {
        for (const file of readdirSync(dirPath)) {
          if (!file.endsWith('.txt')) continue;
          const stem = file.slice(0, -4);
          if (exclude.has(stem)) continue;
          const subTxt = readTxt(join(dirPath, file));
          const { name: subName } = parseTitleSource(subTxt);
          const cleanSubNameV = cleanSubName(subName);
          if (!cleanSubNameV || cleanSubNameV === cls.name) continue;
          const sub = parseSubclass(subTxt, cleanSubNameV, cls.name, parsed.source);
          sub._homebrew = true;
          out.subclasses.push(sub);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`No subclass dir for ${cls.name}: ${e.message}`);
      }
    }
  }

  // ── Core-class subclasses (only those missing from 5etools will survive merge) ──
  for (const dirName of CORE_CLASSES) {
    const dirPath = join(SRC, dirName);
    try {
      for (const file of readdirSync(dirPath)) {
        if (!file.endsWith('.txt')) continue;
        const subTxt = readTxt(join(dirPath, file));
        const { name: subName, source: subSource } = parseTitleSource(subTxt);
        const cleanSubNameV = cleanSubName(subName);
        if (!cleanSubNameV) continue;
        const className = CLASS_DIR_MAP[dirName];
        if (!className) continue;
        const sub = parseSubclass(subTxt, cleanSubNameV, className, 'PHB');
        sub._homebrew = !normalizeSource(subSource) || !['PHB', 'XGE', 'TCE', 'VGM', 'MToF', 'DMG', 'FToD', 'SAiG', 'EGW', 'ERftLW', 'GGtR', 'MOoT', 'TftYP', 'GoS', 'CoS', 'SKT', 'HotDQ', 'PotA', 'WDH', 'AI', 'VRGR', 'CM', 'WBtW', 'IDRotF', 'EEPC', 'MPMM', 'BGG', 'TBoMT', 'SAiS', 'DSotDQ', 'KftGV', 'JttRC', 'PAitM', 'VEoR'].includes(sub.source);
        out.subclasses.push(sub);
      }
    } catch (e) { /* skip */ }
  }

  // ── Spells ──────────────────────────────────────────────────────
  for (const f of readdirSync(join(SRC, 'spell'))) {
    if (!f.endsWith('.txt')) continue;
    const txt = readTxt(join(SRC, 'spell', f));
    const { name } = parseTitleSource(txt);
    const spell = parseSpell(txt, name);
    out.spells.push(spell);
  }

  // ── Feats ───────────────────────────────────────────────────────
  for (const f of readdirSync(join(SRC, 'feat'))) {
    if (!f.endsWith('.txt')) continue;
    const txt = readTxt(join(SRC, 'feat', f));
    const { name } = parseTitleSource(txt);
    out.feats.push(parseFeat(txt, name));
  }

  // ── Backgrounds ────────────────────────────────────────────────
  for (const f of readdirSync(join(SRC, 'background'))) {
    if (!f.endsWith('.txt')) continue;
    const txt = readTxt(join(SRC, 'background', f));
    const { name } = parseTitleSource(txt);
    out.backgrounds.push(parseBackground(txt, name));
  }

  // ── Lineages / races ────────────────────────────────────────────
  for (const f of readdirSync(join(SRC, 'lineage'))) {
    if (!f.endsWith('.txt')) continue;
    const txt = readTxt(join(SRC, 'lineage', f));
    // Skip stub pages (only include links to other pages)
    const meaningful = txt.replace(/\[\[include[^\]]*\]\]/g, '').replace(/\+.*\n/g, '').trim();
    // console.log(f, 'meaningful', meaningful.length);
    const { name } = parseTitleSource(txt);
    // Normalize (MMotM)→(MPMM) and similar
    const cleanName = name.replace(/\s*\(MMotM\)/, ' (MPMM)').replace(/\s*\(MM\s*\)/, ' (MPMM)');
    if (!cleanName || meaningful.length < 30) continue;
    const lineage = parseLineage(txt, cleanName);
    if (!lineage.entries.length && !lineage.traits.length) continue;
    out.lineages.push(lineage);
  }

  // ── Magic items ────────────────────────────────────────────────
  for (const f of readdirSync(join(SRC, 'wondrous-items'))) {
    if (!f.endsWith('.txt')) continue;
    const txt = readTxt(join(SRC, 'wondrous-items', f));
    const { name } = parseTitleSource(txt);
    if (!name) continue;
    out.items.push(parseMagicItem(txt, name));
  }

  return out;
}

mkdirSync(OUT, { recursive: true });

const data = load();
for (const [key, val] of Object.entries(data)) {
  writeJson(join(OUT, `${key}.json`), val);
  // eslint-disable-next-line no-console
  console.log(`${key}: ${val.length}`);
}