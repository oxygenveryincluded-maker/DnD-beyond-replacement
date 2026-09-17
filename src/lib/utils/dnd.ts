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
  slots: number[]; // one slot count per spell level, index 0 = level 1
}

export function spellSlotsAtLevel(
  tables: {
    title: string;
    colLabels: string[];
    rows: string[][];
  }[],
  characterLevel: number
): SpellSlots {
  const result: SpellSlots = { cantripsKnown: 0, spellsKnown: 0, slots: [] };
  if (!tables?.length) return result;

  for (const table of tables) {
    const title = (table.title || '').toLowerCase();
    const labels = (table.colLabels || []).map((c) => c.replace(/<[^>]*>/g, '').toLowerCase());
    const rowCells = table.rows[characterLevel - 1] || [];
    if (!rowCells.length) continue;

    if (title.includes('cantrip') || labels.some((l) => l.includes('cantrip'))) {
      result.cantripsKnown = parseInt(rowCells[rowCells.length - 1], 10) || 0;
    }
    if (title.includes('spells known') || labels.some((l) => l.includes('spells known'))) {
      result.spellsKnown = parseInt(rowCells[rowCells.length - 1], 10) || 0;
    }
    if (title.includes('spell slots') || labels.some((l) => l.match(/^[1-9](st|nd|rd|th)?$/))) {
      result.slots = rowCells.map((c) => parseInt(c, 10) || 0);
    }
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

export interface DerivedSpellcasting {
  isCaster: boolean;
  ability: string | null;
  saveDC: number | null;
  attackBonus: number | null;
  preparedCount: number | null;
  preparedFormula: string | null;
  cantripsKnown: number;
  spellsKnown: number;
  slots: number[];
}

export function derivedSpellcasting(
  classData: any,
  level: number,
  abilities: Record<string, number>
): DerivedSpellcasting {
  const slotData = spellSlotsAtLevel(classData?.tables, level);
  const hasCasting = !!(classData?.spellcastingAbility || slotData.slots.length || slotData.cantripsKnown);
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
  let cantripsKnown = slotData.cantripsKnown;
  let spellsKnown = slotData.spellsKnown;
  if (!cantripsKnown && classData?.cantripProgression) {
    cantripsKnown = classData.cantripProgression[level - 1] ?? 0;
  }
  if (!spellsKnown && classData?.spellsKnownProgression) {
    spellsKnown = classData.spellsKnownProgression
      .slice(0, level)
      .reduce((a: number, b: number) => a + (Number(b) || 0), 0);
  }
  const preparedFormula: string | null = classData?.preparedSpells || null;
  const preparedCount = preparedFormula ? evaluateFormula(preparedFormula, level, abilities) : null;
  return {
    isCaster,
    ability,
    saveDC,
    attackBonus,
    preparedCount,
    preparedFormula,
    cantripsKnown,
    spellsKnown,
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
