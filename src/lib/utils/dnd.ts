export const SCHOOL_MAP: Record<string, string> = {
  'A': 'Abjuration', 'C': 'Conjuration', 'D': 'Divination',
  'E': 'Enchantment', 'V': 'Evocation', 'I': 'Illusion',
  'N': 'Necromancy', 'T': 'Transmutation'
};

export const SCHOOL_COLORS: Record<string, string> = {
  'A': 'tag-school-abj', 'C': 'tag-school-con', 'D': 'tag-school-div',
  'E': 'tag-school-ench', 'V': 'tag-school-evo', 'I': 'tag-school-ill',
  'N': 'tag-school-nec', 'T': 'tag-school-trans'
};

import { SOURCE_NAMES } from './sources';

export const SOURCE_SHORT: Record<string, string> = {
  'PHB': "Player's Handbook", 'XPHB': "Player's Handbook (2024)",
  'DMG': "Dungeon Master's Guide", 'XDMG': "DMG (2024)",
  'TCE': "Tasha's Cauldron", 'XGE': "Xanathar's Guide",
  'BGG': "Bigby Presents", 'MM': "Monster Manual",
  'SCAG': "Sword Coast", 'VGTM': "Volo's Guide",
  'MTOF': "Mordenkainen's", 'ERLW': "Eberron", 'GGTR': "Ravnica",
  'FTF': "Fizban's", 'LRDT': "Locathah Rising",
  'CoA': "Chronicles of Avernus", 'SatO': "Setting of the Orb"
};

export function formatSource(source: string): string {
  const name = SOURCE_NAMES[source];
  return name ? `${source} — ${name}` : source;
}

export function formatSourceShort(source: string): string {
  return SOURCE_SHORT[source] || SOURCE_NAMES[source] || source;
}

export const EQUIP_TYPE: Record<string, string> = {
  A: 'Ammunition',
  AF: 'Ammunition (Firearm)',
  AT: "Artisan's Tools",
  GS: 'Gaming Set',
  G: 'Adventuring Gear',
  HA: 'Heavy Armor',
  MA: 'Medium Armor',
  LA: 'Light Armor',
  S: 'Shield',
  M: 'Melee Weapon',
  R: 'Ranged Weapon',
  INS: 'Musical Instrument',
  SCF: 'Spellcasting Focus',
  RD: 'Rod',
  ST: 'Staff',
  WD: 'Wand',
  T: 'Tools'
};

export function formatEquipType(type: string): string {
  return EQUIP_TYPE[type] || type;
}

export function editionOf(entry: any): 'classic' | 'one' {
  if (entry.edition === 'one' || entry.edition === 'classic') return entry.edition;
  if (entry.source === 'XPHB' || entry.source === 'XDMG') return 'one';
  return 'classic';
}

const SOURCE_PREFERENCE = ['PHB', 'XPHB', 'XDMG', 'MPMM', 'DMG', 'EEPC', 'VGM', 'TCE', 'XGE', 'SCAG', 'VRGR', 'ERLW', 'EFA', 'RHW', 'ToA', 'LFL', 'WttHC', 'HB'];
const MODERN_SOURCES = new Set(['XPHB', 'XDMG']);

function preferredOver(a: any, b: any, edition: 'classic' | 'one' | undefined): boolean {
  const ah = !!a.homebrew;
  const bh = !!b.homebrew;
  if (ah !== bh) return !ah;
  const modern = (s: string) => edition === 'one' && MODERN_SOURCES.has(s);
  const modDiff = (modern(a.source) ? 1 : 0) - (modern(b.source) ? 1 : 0);
  if (modDiff !== 0) return modDiff > 0;
  const order = new Map(SOURCE_PREFERENCE.map((s, i) => [s, i]));
  const ai = order.get(a.source) ?? 999;
  const bi = order.get(b.source) ?? 999;
  if (ai !== bi) return ai < bi;
  return (a.entries?.length || 0) + JSON.stringify(a).length > (b.entries?.length || 0) + JSON.stringify(b).length;
}

export function isHomebrew(entry: any): boolean {
  return !!entry?.homebrew || entry?.source === 'HB';
}

export function dedupeRecords(records: any[], edition: 'classic' | 'one' | undefined = undefined): any[] {
  const best = new Map<string, any>();
  for (const r of records) {
    const key = String(r.name || '').trim().toLowerCase();
    if (!key) continue;
    const cur = best.get(key);
    if (!cur || preferredOver(r, cur, edition)) best.set(key, r);
  }
  return Array.from(best.values());
}

export function formatTableTags(text: string): string {
  return String(text || '')
    .replace(/\{@([a-z]+)\s([^}|]*?)(?:\|[^}]*)?\}/gi, '$2');
}

export function formatSchool(code: string): string {
  return SCHOOL_MAP[code] || code;
}

export function getSchoolColor(code: string): string {
  return SCHOOL_COLORS[code] || '';
}

export function levelText(level: number): string {
  if (level === 0) return 'Cantrip';
  if (level === 1) return '1st Level';
  if (level === 2) return '2nd Level';
  if (level === 3) return '3rd Level';
  return `${level}th Level`;
}

export function formatTime(time: any[]): string {
  if (!time || !time.length) return '';
  return time.map(t => `${t.number || 1} ${t.unit || 'action'}`).join(', ');
}

export function formatRange(range: any): string {
  if (!range) return '';
  if (range.type === 'self') return 'Self';
  if (range.type === 'touch') return 'Touch';
  if (range.type === 'point' || range.type === 'radius' || range.type === 'sphere' || range.type === 'cylinder' || range.type === 'cone' || range.type === 'line') {
    return `${range.distance?.amount || ''} ${range.distance?.type || ''}`.trim();
  }
  return String(range);
}

export function formatComponents(comp: any): string {
  if (!comp) return '';
  const parts: string[] = [];
  if (comp.v) parts.push('V');
  if (comp.s) parts.push('S');
  if (comp.m) parts.push(typeof comp.m === 'string' ? `M (${comp.m})` : comp.m?.text ? `M (${comp.m.text})` : 'M');
  return parts.join(', ');
}

export function formatDuration(dur: any[]): string {
  if (!dur || !dur.length) return '';
  return dur.map(d => {
    if (d.type === 'instant') return 'Instantaneous';
    if (d.type === 'permanent') return 'Until dispelled';
    if (d.type === 'special') return 'Special';
    if (d.type === 'timed') {
      const conc = d.concentration ? ' (Concentration)' : '';
      return `${d.duration?.amount || 1} ${d.duration?.type || 'round'}${d.duration?.amount !== 1 ? 's' : ''}${conc}`;
    }
    return String(d.type);
  }).join(', ');
}

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : String(mod);
}

export function proficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

export function skillModifier(
  abilityScore: number,
  config: { proficient?: boolean; expertise?: boolean; bonus?: number },
  level: number
): number {
  const pb = proficiencyBonus(level);
  const prof = config.proficient ? pb : 0;
  const exp = config.expertise ? pb : 0;
  return abilityMod(abilityScore) + prof + exp + (config.bonus || 0);
}

export function saveModifier(
  abilityScore: number,
  proficient: boolean,
  level: number
): number {
  const pb = proficiencyBonus(level);
  return abilityMod(abilityScore) + (proficient ? pb : 0);
}

export interface SpellSlots {
  cantripsKnown: number;
  spellsKnown: number;
  preparedSpells: number | null;
  invocationsKnown: number;
  slots: number[]; // one slot count per spell level, index 0 = level 1
}

interface ProgressionTable {
  labels: string[];
  rows: (string | number)[][];
}

// 5etools labels look like "{@filter Cantrips|spells|level=0|class=Warlock}" or
// "<i>Cantrips</i>". Reduce them to the human-readable part.
function cleanColumnLabel(raw: unknown): string {
  let l = String(raw ?? '');
  const filter = l.match(/\{@filter ([^|}]+)/);
  if (filter) return filter[1].trim();
  l = l.replace(/<[^>]*>/g, ' ');
  l = l.replace(/\{@[^}]*\}/g, ' ');
  return l.trim();
}

// "{@filter 1st|spells|level=1|class=Warlock}" / "1st" / "1" -> 1
function parseSpellLevelValue(raw: unknown): number | null {
  const s = cleanColumnLabel(raw);
  if (!s) return null;
  const ordinal = s.match(/(\d+)\s*(?:st|nd|rd|th)/i);
  if (ordinal) return Number(ordinal[1]);
  const filter = String(raw ?? '').match(/level=(\d+)/);
  if (filter) return Number(filter[1]);
  const plain = s.match(/^(\d+)$/);
  if (plain) return Number(plain[1]);
  return null;
}

function toNumber(raw: unknown): number {
  const n = parseInt(String(raw ?? '').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

// Class progression tables live in `classTableGroups` (rows have no leading
// level cell) and `tables` (rows start with the level). Collect both, keeping
// only tables whose row length lines up with the column labels.
function collectProgressionTables(classData: any): ProgressionTable[] {
  const out: ProgressionTable[] = [];
  const push = (t: any) => {
    if (!t) return;
    const labels = (t.colLabels || []).map(cleanColumnLabel);
    if (!labels.length) return;
    const rawRows: any[] = t.rowsSpellProgression || t.rows || [];
    if (!rawRows.length) return;
    const rows: (string | number)[][] = [];
    for (const raw of rawRows) {
      if (!Array.isArray(raw) || !raw.length) continue;
      const cells = raw.length === labels.length + 1 ? raw.slice(1) : raw;
      if (cells.length !== labels.length) continue;
      rows.push(cells);
    }
    if (rows.length) out.push({ labels, rows });
  };
  for (const g of classData?.classTableGroups || []) push(g);
  for (const t of classData?.tables || []) push(t);
  return out;
}

export function classSpellProgression(classData: any, characterLevel: number): SpellSlots {
  const result: SpellSlots = {
    cantripsKnown: 0,
    spellsKnown: 0,
    preparedSpells: null,
    invocationsKnown: 0,
    slots: []
  };
  if (!classData) return result;
  const level = Math.max(1, Math.min(20, characterLevel || 1));
  const tables = collectProgressionTables(classData);
  if (!tables.length) return result;

  let warlockSlotCount = 0;
  let warlockSlotLevel: number | null = null;

  for (const table of tables) {
    const row = table.rows[level - 1];
    if (!row) continue;
    const labels = table.labels.map((l) => l.toLowerCase());

    // Table of spell levels: "1st | 2nd | ... | 9th" -> slot matrix.
    const numericCols = labels
      .map((l, i) => ({ l, i, lvl: parseSpellLevelValue(table.labels[i]) }))
      .filter((c) => c.lvl != null && c.lvl >= 1 && c.lvl <= 9);
    if (numericCols.length >= 3 && numericCols.length === labels.length) {
      const slots = Array(9).fill(0);
      for (const c of numericCols) slots[c.lvl! - 1] = toNumber(row[c.i]);
      if (slots.some((n) => n > 0)) result.slots = slots;
      continue;
    }

    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const cell = row[i];
      if (label.includes('cantrip')) {
        result.cantripsKnown = toNumber(cell);
      } else if (label.includes('spells known') || label === 'spells known') {
        result.spellsKnown = toNumber(cell);
      } else if (label.includes('prepared spells')) {
        result.preparedSpells = toNumber(cell);
      } else if (label.includes('invocation')) {
        result.invocationsKnown = toNumber(cell);
      } else if (label === 'spell slots') {
        warlockSlotCount = toNumber(cell);
      } else if (label.includes('slot level')) {
        warlockSlotLevel = parseSpellLevelValue(cell);
      }
    }
  }

  // Pact Magic style: all slots sit at a single level (Warlock).
  if (warlockSlotCount > 0 && !result.slots.some((n) => n > 0)) {
    const slots = Array(9).fill(0);
    const slotLevel = warlockSlotLevel && warlockSlotLevel >= 1 ? warlockSlotLevel : 1;
    slots[Math.min(8, slotLevel - 1)] = warlockSlotCount;
    result.slots = slots;
  }
  return result;
}

const SKILL_NAME_TO_ID: Record<string, string> = {
  'acrobatics': 'acrobatics', 'animal handling': 'animal-handling', 'arcana': 'arcana',
  'athletics': 'athletics', 'deception': 'deception', 'history': 'history',
  'insight': 'insight', 'intimidation': 'intimidation', 'investigation': 'investigation',
  'medicine': 'medicine', 'nature': 'nature', 'perception': 'perception',
  'performance': 'performance', 'persuasion': 'persuasion', 'religion': 'religion',
  'sleight of hand': 'sleight-of-hand', 'stealth': 'stealth', 'survival': 'survival'
};

export function skillIdFromName(name: string): string | null {
  const key = String(name || '').trim().toLowerCase();
  return SKILL_NAME_TO_ID[key] || null;
}

export function skillIdsFromProficiencies(list: any[]): string[] {
  const out: string[] = [];
  for (const entry of list || []) {
    if (!entry || typeof entry !== 'object') continue;
    for (const [skillName, val] of Object.entries(entry)) {
      if (val && skillName !== 'choose') {
        const id = skillIdFromName(skillName);
        if (id) out.push(id);
      }
    }
    // nested shape: { choose: { from: ['animal handling', ...], count: N } }
    if (entry.choose?.from && Array.isArray(entry.choose.from)) {
      for (const s of entry.choose.from) {
        const id = skillIdFromName(s);
        if (id) out.push(id);
      }
    }
  }
  return [...new Set(out)];
}

export function derivedMaxHp(hitDice: string, level: number, conMod: number): number | null {
  const m = /d(\d+)/.exec(hitDice || '');
  if (!m) return null;
  const faces = Number(m[1]);
  const avg = Math.floor((faces + 1) / 2);
  return faces + conMod + (level - 1) * (avg + conMod);
}

function evaluateFormula(formula: string, level: number, abilities: Record<string, number>): number | null {
  const pb = proficiencyBonus(level);
  let expr = String(formula || '')
    .replace(/<\$level\$>/g, String(level))
    .replace(/<\$prof_bonus\$>/g, String(pb))
    .replace(/<\$proficiency_bonus\$>/g, String(pb))
    .replace(/<\$([a-z]+)_mod\$>/g, (_m, key: string) => String(abilityMod(abilities[key] ?? 10)))
    .replace(/<\$([a-z]+)\$>/g, (_m, key: string) => String(abilities[key] ?? 10));
  if (!/^[0-9 .+\-*/(),Mathceilfloorroundmaxmin]+$/.test(expr)) return null;
  try {
    const val = new Function('Math', `return (${expr})`)(Math);
    return typeof val === 'number' && isFinite(val) ? Math.floor(val) : null;
  } catch {
    return null;
  }
}

// Turn a 5etools prepared-spells formula into readable text.
export function preparedFormulaText(formula: string | null): string {
  if (!formula) return '';
  return String(formula)
    .replace(/<\$level\$>/g, 'level')
    .replace(/<\$prof_bonus\$>/g, 'proficiency bonus')
    .replace(/<\$proficiency_bonus\$>/g, 'proficiency bonus')
    .replace(/<\$([a-z]+)_mod\$>/g, (_m, k: string) => `${k.toUpperCase()} modifier`)
    .replace(/<\$([a-z]+)\$>/g, (_m, k: string) => k.toUpperCase())
    .replace(/\s*\+\s*/g, ' + ')
    .trim();
}

export interface DerivedSpellcasting {
  isCaster: boolean;
  ability: string | null;
  saveDC: number | null;
  attackBonus: number | null;
  preparedCount: number | null;
  preparedFormula: string | null;
  cantripsKnown: number;
  spellsKnown: number;
  invocationsKnown: number;
  slots: number[];
}

export function derivedSpellcasting(
  classData: any,
  level: number,
  abilities: Record<string, number>
): DerivedSpellcasting {
  const slotData = classSpellProgression(classData, level);
  const hasCasting = !!(
    classData?.spellcastingAbility ||
    slotData.slots.some((n) => n > 0) ||
    slotData.cantripsKnown
  );
  const isCaster = hasCasting;
  const ability: string | null = classData?.spellcastingAbility || null;
  const pb = proficiencyBonus(level);
  let saveDC: number | null = null;
  let attackBonus: number | null = null;
  if (isCaster && ability && abilities[ability] != null) {
    const mod = abilityMod(abilities[ability]);
    saveDC = 8 + pb + mod;
    attackBonus = pb + mod;
  }
  const preparedFormula: string | null = classData?.preparedSpells || null;
  // 2014 classes use a formula (level + ability mod); 2024 classes have a
  // "Prepared Spells" column in the class progression table.
  const preparedCount = preparedFormula
    ? evaluateFormula(preparedFormula, level, abilities)
    : slotData.preparedSpells;
  const usesPrepared = preparedFormula != null || slotData.preparedSpells != null;

  let cantripsKnown = slotData.cantripsKnown;
  let spellsKnown = slotData.spellsKnown;
  if (!cantripsKnown && classData?.cantripProgression) {
    cantripsKnown = classData.cantripProgression[level - 1] ?? 0;
  }
  // "Spells known" only applies to classes that keep a spell list; prepared
  // casters (cleric/druid/wizard/...) track prepared spells instead.
  if (!spellsKnown && !usesPrepared && classData?.spellsKnownProgression) {
    spellsKnown = classData.spellsKnownProgression
      .slice(0, level)
      .reduce((a: number, b: number) => a + (Number(b) || 0), 0);
  }
  return {
    isCaster,
    ability,
    saveDC,
    attackBonus,
    preparedCount,
    preparedFormula,
    cantripsKnown,
    spellsKnown,
    invocationsKnown: slotData.invocationsKnown,
    slots: slotData.slots
  };
}

export interface ArmorPiece {
  name: string;
  ac: number | null;
  armorCategory?: string | null;
}

export function armorClassFromEquipment(armorPieces: ArmorPiece[], dexMod: number): number {
  const worn = armorPieces.filter((p) => p && p.ac != null);
  const armor = worn.find((p) => p.armorCategory && p.armorCategory !== 'Shield');
  const shields = worn.filter((p) => p.armorCategory === 'Shield').length;
  let ac = armor
    ? armor.armorCategory === 'Light'
      ? (armor.ac ?? 0) + dexMod
      : armor.armorCategory === 'Medium'
        ? (armor.ac ?? 0) + Math.max(0, Math.min(dexMod, 2))
        : (armor.ac ?? 0)
    : 10 + dexMod;
  return ac + shields * 2;
}

const PROF_READABLE: Record<string, string> = {
  simple: 'Simple Weapons', martial: 'Martial Weapons',
  light: 'Light Armor', medium: 'Medium Armor', heavy: 'Heavy Armor',
  shield: 'Shields'
};

export interface ExpandableProficiencies {
  armor: string[];
  weapons: string[];
  tools: string[];
  languages: string[];
}

export function sanitizeProficiencyText(text: string): string {
  return String(text || '')
    .replace(/\{@item ([^}|]+?)\|([^}|]+?)\|([^}]*)\}/g, (_m, _name, _src, disp) => disp)
    .replace(/\{@([a-zA-Z0-9]+) ([^}|]+?)(?:\|[^}]*)?\}/g, (_m, _tag, arg) => arg)
    .replace(/\{@([a-zA-Z0-9]+)\}/g, '')
    .trim();
}

const LANGUAGE_JUNK = /^(any(?:standard)?|standard|choose(?:$|\s)|one of your choice|any of your choice|any \(1\))/i;

export function cleanLanguages(langs: (string | any)[] | undefined): string[] {
  if (!Array.isArray(langs)) return [];
  const out = new Set<string>();
  for (const l of langs) {
    const key = typeof l === 'object' && l !== null ? Object.keys(l)[0] : null;
    const name = key ?? String(l ?? '');
    if (!name || LANGUAGE_JUNK.test(name)) continue;
    out.add(sanitizeProficiencyText(name));
  }
  return [...out].filter(Boolean);
}

export function raceSpeed(race: any): number | null {
  const s = race?.speed;
  if (s == null) return null;
  if (typeof s === 'number') return s;
  if (typeof s.walk === 'number') return s.walk;
  if (typeof s.speed === 'number') return s.speed;
  return null;
}

export function expandProficiencies(sp: any): ExpandableProficiencies {
  const result: ExpandableProficiencies = { armor: [], weapons: [], tools: [], languages: [] };
  const cats: (keyof ExpandableProficiencies)[] = ['armor', 'weapons', 'tools', 'languages'];
  for (const cat of cats) {
    const arr = sp?.[cat] || [];
    const out: string[] = [];
    for (const p of arr) {
      if (typeof p === 'string') {
        out.push(sanitizeProficiencyText(PROF_READABLE[p] || p));
      } else if (p?.choose?.from) {
        out.push(...p.choose.from.map((s: string) => sanitizeProficiencyText(PROF_READABLE[s] || s)));
      } else if (p?.proficiencies) {
        out.push(...p.proficiencies.map((s: string) => sanitizeProficiencyText(PROF_READABLE[s] || s)));
      }
    }
    result[cat] = [...new Set(out.map((s) => String(s).replace(/^[0-9]+ /, '')))];
  }
  return result;
}

export function backgroundFeatNames(bg: any): string[] {
  const feats = bg?.feats || [];
  const out: string[] = [];
  for (const entry of feats) {
    if (typeof entry === 'string') {
      out.push(entry.split(';')[0].trim());
    } else if (entry && typeof entry === 'object') {
      for (const key of Object.keys(entry)) {
        if (key !== 'choose') out.push(key.split(';')[0].trim());
      }
      if (entry.choose?.from) {
        for (const f of entry.choose.from) {
          if (typeof f === 'string') out.push(f.split('|')[0].split(';')[0].trim());
        }
      }
    }
  }
  return [...new Set(out.filter(Boolean))];
}

export function raceBackgroundLanguages(race: any, background: any): string[] {
  const out = new Set<string>();
  const add = (item: any) => {
    if (!item) return;
    if (typeof item === 'string') out.add(item);
    else if (Array.isArray(item)) item.forEach(add);
    else if (typeof item === 'object') {
      for (const key of Object.keys(item)) {
        if (['any', 'anyStandard', 'standard', 'choose', 'custom'].includes(key)) continue;
        if (item[key]) out.add(key);
      }
    }
  };
  add(race?.languages);
  add(background?.languageProficiencies);
  const norm = (s: string) => (s.charAt(0).toUpperCase() + s.slice(1)).replace(/\|.*$/, '');
  return [...out].map(norm).filter((s) => s && s !== 'Any (1)');
}

export function equipmentNamesFromEntries(se: any): string[] {
  const out = new Set<string>();
  const re = /\{@item ([^}|]+?)(?:\|[^}]*)?\}/g;
  let m;
  let raw;
  try {
    raw = JSON.stringify(se || '');
  } catch {
    raw = '';
  }
  while ((m = re.exec(raw)) !== null) out.add(m[1].trim());
  return [...out].map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

// ---------------------------------------------------------------------------
// Eldritch Invocations (Warlock)
// ---------------------------------------------------------------------------

export interface InvocationInfo {
  name: string;
  level: number; // minimum warlock level required (0 = no level requirement)
  prereq: string; // human readable prerequisite (spell/other)
  entries: any[];
  source: string;
}

// Minimum warlock level required to learn an invocation, plus any other
// prerequisite text (e.g. "a Warlock cantrip that deals damage").
export function invocationInfo(invocation: any): InvocationInfo {
  const prereqs = Array.isArray(invocation?.prerequisite) ? invocation.prerequisite : [];
  let level = 0;
  const notes: string[] = [];
  for (const p of prereqs) {
    if (!p || typeof p !== 'object') continue;
    const lv = p?.level?.level;
    if (typeof lv === 'number' && lv > level) level = lv;
    const spells = Array.isArray(p.spell) ? p.spell : p.spell ? [p.spell] : [];
    for (const s of spells) {
      if (typeof s === 'string') {
        const label = s.split('#')[0].replace(/[-_]/g, ' ');
        notes.push(label.charAt(0).toUpperCase() + label.slice(1));
      } else if (s && typeof s === 'object') {
        const entry = s.entrySummary || s.entry;
        if (entry) notes.push(String(entry));
      }
    }
  }
  return {
    name: String(invocation?.name ?? ''),
    level,
    prereq: notes.join('; '),
    entries: Array.isArray(invocation?.entries) ? invocation.entries : [],
    source: String(invocation?.source ?? '')
  };
}

export function isInvocationAvailable(invocation: any, characterLevel: number): boolean {
  return invocationInfo(invocation).level <= characterLevel;
}
