import { browser } from '$app/environment';
import { cleanLanguages, sanitizeProficiencyText } from './dnd';

export function cleanTextList(items: any[] | undefined): string[] {
  return (Array.isArray(items) ? items : [])
    .map((s) => sanitizeProficiencyText(String(s ?? '')))
    .filter(Boolean);
}

export interface SkillConfig {
  proficient?: boolean;
  expertise?: boolean;
  bonus?: number;
}

// A home-made Eldritch Invocation: uses a normal spell, with a rest
// requirement and a choice of whether it draws on the Warlock's pact magic
// slot (or is cast with a normal spell slot).
export interface CustomInvocation {
  id: string;
  name: string;
  spell: string;
  rest: string;
  usesSlot: boolean;
}

export interface EquipmentItem {
  name: string;
  quantity: number;
  equipped?: boolean;
}

export interface CoinPurse {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface Traits {
  personality: string;
  ideals: string;
  bonds: string;
  flaws: string;
}

export interface Character {
  id: string;
  name: string;
  level: number;
  class: string;
  classSource: string;
  subclass: string;
  subclassSource: string;
  race: string;
  raceSource: string;
  subrace: string;
  subraceSource: string;
  background: string;
  backgroundSource: string;
  alignment: string;
  playerName: string;
  experience: number;
  abilityScores: Record<string, number>;
  skillProficiencies: Record<string, SkillConfig>;
  saveProficiencies: string[];
  maxHp: number;
  currentHp: number;
  tempHp: number;
  hitDice: string;
  hitDiceUsed: number;
  ac: number;
  speed: number;
  initiativeBonus: number;
  passivePerceptionBonus: number;
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  languages: string[];
  feats: string[];
  equipment: EquipmentItem[];
  coins: CoinPurse;
  spellsCantrips: string[];
  spellsKnown: string[];
  spellsPrepared: string[];
  spellSaveDC: number;
  spellAttackBonus: number;
  traits: Traits;
  notes: string;
  inspiration: boolean;
  deathSaves: { successes: number; failures: number };
  invocations?: string[];
  customInvocations?: CustomInvocation[];
  layoutOrder?: string[];
  layoutPos?: Record<string, { x: number; y: number; w: string }>;
  maxHpAuto?: boolean;
  acAuto?: boolean;
  speedAuto?: boolean;
  updatedAt?: number;
}

export const SKILLS: { id: string; name: string; ability: string }[] = [
  { id: 'acrobatics', name: 'Acrobatics', ability: 'dex' },
  { id: 'animal-handling', name: 'Animal Handling', ability: 'wis' },
  { id: 'arcana', name: 'Arcana', ability: 'int' },
  { id: 'athletics', name: 'Athletics', ability: 'str' },
  { id: 'deception', name: 'Deception', ability: 'cha' },
  { id: 'history', name: 'History', ability: 'int' },
  { id: 'insight', name: 'Insight', ability: 'wis' },
  { id: 'intimidation', name: 'Intimidation', ability: 'cha' },
  { id: 'investigation', name: 'Investigation', ability: 'int' },
  { id: 'medicine', name: 'Medicine', ability: 'wis' },
  { id: 'nature', name: 'Nature', ability: 'int' },
  { id: 'perception', name: 'Perception', ability: 'wis' },
  { id: 'performance', name: 'Performance', ability: 'cha' },
  { id: 'persuasion', name: 'Persuasion', ability: 'cha' },
  { id: 'religion', name: 'Religion', ability: 'int' },
  { id: 'sleight-of-hand', name: 'Sleight of Hand', ability: 'dex' },
  { id: 'stealth', name: 'Stealth', ability: 'dex' },
  { id: 'survival', name: 'Survival', ability: 'wis' }
];

export function newId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  // crypto.randomUUID is unavailable outside secure contexts (e.g. LAN preview
  // over plain HTTP). getRandomValues still works there.
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function createDefaultCharacter(): Character {
  return {
    id: newId(),
    name: 'New Character',
    level: 1,
    class: '',
    classSource: '',
    subclass: '',
    subclassSource: '',
    race: '',
    raceSource: '',
    subrace: '',
    subraceSource: '',
    background: '',
    backgroundSource: '',
    alignment: '',
    playerName: '',
    experience: 0,
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    skillProficiencies: {},
    saveProficiencies: [],
    maxHp: 10,
    currentHp: 10,
    tempHp: 0,
    maxHpAuto: true,
    acAuto: true,
    speedAuto: true,
    hitDice: '',
    hitDiceUsed: 0,
    ac: 10,
    speed: 30,
    initiativeBonus: 0,
    passivePerceptionBonus: 0,
    armorProficiencies: [],
    weaponProficiencies: [],
    toolProficiencies: [],
    languages: [],
    feats: [],
    equipment: [],
    coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    spellsCantrips: [],
    spellsKnown: [],
    spellsPrepared: [],
    spellSaveDC: 0,
    spellAttackBonus: 0,
    traits: { personality: '', ideals: '', bonds: '', flaws: '' },
    notes: '',
    inspiration: false,
    deathSaves: { successes: 0, failures: 0 },
    invocations: [],
    customInvocations: [],
    layoutOrder: undefined,
    layoutPos: undefined,
    updatedAt: 0
  };
}

function asSkillMap(value: unknown): Record<string, SkillConfig> {
  const out: Record<string, SkillConfig> = {};
  for (const [key, raw] of Object.entries(asRecord(value))) {
    // Never let a crafted backup/cloud payload touch the prototype chain.
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (!raw || typeof raw !== 'object') continue;
    const cfg = raw as Record<string, unknown>;
    out[key] = {
      ...(typeof cfg.proficient === 'boolean' ? { proficient: cfg.proficient } : {}),
      ...(typeof cfg.expertise === 'boolean' ? { expertise: cfg.expertise } : {}),
      ...(Number.isFinite(Number(cfg.bonus)) ? { bonus: Number(cfg.bonus) } : {})
    };
  }
  return out;
}

function migrate(old: any): Character {
  const base = createDefaultCharacter();
  const src = asRecord(old);
  const scores = asRecord(src.abilityScores);
  const traits = asRecord(src.traits);
  const coins = asRecord(src.coins);
  const deathSaves = asRecord(src.deathSaves);

  const equipment: EquipmentItem[] = Array.isArray(src.equipment)
    ? src.equipment
        .map((e: any): EquipmentItem | null => {
          if (typeof e === 'string') {
            const name = sanitizeProficiencyText(e);
            return name ? { name, quantity: 1 } : null;
          }
          if (!e || typeof e !== 'object') return null;
          const name = sanitizeProficiencyText(e.name ?? '');
          return name ? { ...e, quantity: asNumber(e.quantity, 1), name } : null;
        })
        .filter((e): e is EquipmentItem => e !== null)
    : [];

  const customInvocations: CustomInvocation[] = Array.isArray(src.customInvocations)
    ? src.customInvocations
        .filter((x: any) => x && typeof x === 'object')
        .map((x: any, idx: number) => ({
          id: asString(x.id) || `ci-${idx}`,
          name: asString(x.name).slice(0, 200),
          spell: asString(x.spell).slice(0, 200),
          rest: asString(x.rest, 'Long rest').slice(0, 80),
          usesSlot: asBoolean(x.usesSlot)
        }))
        .filter((x) => x.name || x.spell)
    : [];

  return {
    ...base,
    ...src,
    id: asString(src.id) || base.id,
    name: asString(src.name) || base.name,
    level: Math.max(1, Math.min(30, asNumber(src.level, base.level))),
    class: asString(src.class),
    classSource: asString(src.classSource),
    subclass: asString(src.subclass),
    subclassSource: asString(src.subclassSource),
    race: asString(src.race),
    raceSource: asString(src.raceSource),
    subrace: asString(src.subrace),
    subraceSource: asString(src.subraceSource),
    background: asString(src.background),
    backgroundSource: asString(src.backgroundSource),
    alignment: asString(src.alignment),
    playerName: asString(src.playerName),
    experience: asNumber(src.experience, base.experience),
    abilityScores: {
      str: asNumber(scores.str, base.abilityScores.str),
      dex: asNumber(scores.dex, base.abilityScores.dex),
      con: asNumber(scores.con, base.abilityScores.con),
      int: asNumber(scores.int, base.abilityScores.int),
      wis: asNumber(scores.wis, base.abilityScores.wis),
      cha: asNumber(scores.cha, base.abilityScores.cha)
    },
    skillProficiencies: asSkillMap(src.skillProficiencies),
    saveProficiencies: asStringList(src.saveProficiencies),
    maxHp: asNumber(src.maxHp, base.maxHp),
    currentHp: asNumber(src.currentHp, base.currentHp),
    tempHp: asNumber(src.tempHp, base.tempHp),
    maxHpAuto: asBoolean(src.maxHpAuto, base.maxHpAuto),
    acAuto: asBoolean(src.acAuto, base.acAuto),
    speedAuto: asBoolean(src.speedAuto, base.speedAuto),
    hitDice: asString(src.hitDice),
    hitDiceUsed: asNumber(src.hitDiceUsed, base.hitDiceUsed),
    ac: asNumber(src.ac, base.ac),
    speed: asNumber(src.speed, base.speed),
    initiativeBonus: asNumber(src.initiativeBonus, base.initiativeBonus),
    passivePerceptionBonus: asNumber(src.passivePerceptionBonus, base.passivePerceptionBonus),
    armorProficiencies: cleanTextList(src.armorProficiencies),
    weaponProficiencies: cleanTextList(src.weaponProficiencies),
    toolProficiencies: cleanTextList(src.toolProficiencies),
    languages: cleanLanguages(src.languages),
    feats: cleanTextList(src.feats),
    equipment,
    coins: {
      cp: asNumber(coins.cp, base.coins.cp),
      sp: asNumber(coins.sp, base.coins.sp),
      ep: asNumber(coins.ep, base.coins.ep),
      gp: asNumber(coins.gp, base.coins.gp),
      pp: asNumber(coins.pp, base.coins.pp)
    },
    spellsCantrips: asStringList(src.spellsCantrips),
    spellsKnown: asStringList(src.spellsKnown),
    spellsPrepared: asStringList(src.spellsPrepared),
    spellSaveDC: asNumber(src.spellSaveDC, base.spellSaveDC),
    spellAttackBonus: asNumber(src.spellAttackBonus, base.spellAttackBonus),
    traits: {
      personality: asString(traits.personality),
      ideals: asString(traits.ideals),
      bonds: asString(traits.bonds),
      flaws: asString(traits.flaws)
    },
    notes: asString(src.notes),
    inspiration: asBoolean(src.inspiration, base.inspiration),
    deathSaves: {
      successes: asNumber(deathSaves.successes, base.deathSaves.successes),
      failures: asNumber(deathSaves.failures, base.deathSaves.failures)
    },
    invocations: asStringList(src.invocations),
    customInvocations,
    layoutOrder: Array.isArray(src.layoutOrder) ? asStringList(src.layoutOrder) : undefined,
    layoutPos:
      src.layoutPos && typeof src.layoutPos === 'object' && !Array.isArray(src.layoutPos)
        ? src.layoutPos
        : undefined,
    updatedAt: asNumber(src.updatedAt, 0)
  };
}

export function loadCharacters(): Character[] {
  if (!browser) return [];
  try {
    const data = localStorage.getItem('dnd-characters');
    const raw = data ? JSON.parse(data) : [];
    return Array.isArray(raw) ? raw.map(migrate) : [];
  } catch {
    return [];
  }
}

export function saveCharacters(chars: Character[]) {
  if (!browser) return chars;
  const now = Date.now();
  const stamped = chars.map((c) => ({ ...c, updatedAt: now }));
  localStorage.setItem('dnd-characters', JSON.stringify(stamped));
  return stamped;
}

export function migrateCharacter(old: any): Character {
  return migrate(old);
}

export { createDefaultCharacter };