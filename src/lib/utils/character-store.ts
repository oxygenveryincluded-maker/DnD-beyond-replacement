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

function createDefaultCharacter(): Character {
  return {
    id: crypto.randomUUID(),
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
    layoutOrder: undefined,
    layoutPos: undefined,
    updatedAt: 0
  };
}

function migrate(old: any): Character {
  const base = createDefaultCharacter();
  return {
    ...base,
    ...old,
    abilityScores: { ...base.abilityScores, ...(old.abilityScores || {}) },
    skillProficiencies: old.skillProficiencies || {},
    traits: { ...base.traits, ...(old.traits || {}) },
    coins: { ...base.coins, ...(old.coins || {}) },
    deathSaves: { ...base.deathSaves, ...(old.deathSaves || {}) },
    equipment: Array.isArray(old.equipment)
      ? old.equipment.map((e: any) =>
          typeof e === 'string' ? { name: sanitizeProficiencyText(e), quantity: 1 } : { quantity: 1, ...e, name: sanitizeProficiencyText(e.name ?? '') }
        )
      : base.equipment,
    armorProficiencies: cleanTextList(old.armorProficiencies),
    weaponProficiencies: cleanTextList(old.weaponProficiencies),
    toolProficiencies: cleanTextList(old.toolProficiencies),
    languages: cleanLanguages(old.languages),
    feats: cleanTextList(old.feats)
  };
}

export function loadCharacters(): Character[] {
  if (!browser) return [];
  try {
    const data = localStorage.getItem('dnd-characters');
    const raw = data ? JSON.parse(data) : [];
    return raw.map(migrate);
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