import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { generateEquipmentEntries } from './equipment-entries.mjs';
import { buildSearchIndex } from './build-search-index.mjs';

const BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data';
const OUT = join(import.meta.dirname, '..', 'src', 'lib', 'data');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

async function fetchJSON(url) {
	console.log(`Fetching ${url}...`);
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
	return res.json();
}

function strip5eTags(text) {
	if (typeof text !== 'string') return text;
	return text
		.replace(/\{@spell ([^}|]+?)(?:\|[^}]*)?\}/g, '<a href="/spells?search=$1" class="text-dnd-gold hover:underline">$1</a>')
		.replace(/\{@item ([^}|]+?)(?:\|[^}]*)?\}/g, '<b>$1</b>')
		.replace(/\{@creature ([^}|]+?)(?:\|[^}]*)?\}/g, '<b>$1</b>')
		.replace(/\{@feat ([^}|]+?)(?:\|[^}]*)?\}/g, '<a href="/feats?search=$1" class="text-dnd-gold hover:underline">$1</a>')
		.replace(/\{@skill ([^}|]+?)(?:\|[^}]*)?\}/g, '<i>$1</i>')
		.replace(/\{@action ([^}|]+?)(?:\|[^}]*)?\}/g, '<b>$1</b>')
		.replace(/\{@damage ([^}|]+?)(?:\|[^}]*)?\}/g, '<span class="text-red-400 font-semibold">$1</span>')
		.replace(/\{@dice ([^}|]+?)(?:\|[^}]*)?\}/g, '<span class="text-green-400 font-mono">$1</span>')
		.replace(/\{@dc ([^}|]+?)(?:\|[^}]*)?\}/g, 'DC $1')
		.replace(/\{@condition ([^}|]+?)(?:\|[^}]*)?\}/g, '<i class="text-dnd-gold">$1</i>')
		.replace(/\{@variantrule ([^}|]+?)(?:\|[^}]*)?\}/g, '<i>$1</i>')
		.replace(/\{@filter ([^}|]+?)(?:\|[^}]*)?\}/g, '<i>$1</i>')
		.replace(/\{@book ([^}|]+?)(?:\|[^}]*)?\}/g, '<i>$1</i>')
		.replace(/\{@sense ([^}|]+?)(?:\|[^}]*)?\}/g, '<i>$1</i>')
		.replace(/\{@5etools ([^}|]+?)(?:\|[^}]*)?\}/g, '<i>$1</i>')
		.replace(/\{@chance ([^}|]+?)(?:\|[^}]*)?\}/g, '$1%')
		.replace(/\{@status ([^}|]+?)(?:\|[^}]*)?\}/g, '<i>$1</i>')
		.replace(/\{@scaledamage ([^}|]+?)(?:\|[^}]*)?\}/g, '$1')
		.replace(/\{@quickref ([^}|]+?)(?:\|[^}]*)?\}/g, '$1')
		.replace(/\{@class ([^}|]+?)(?:\|[^}]*)?\}/g, '<b>$1</b>')
		.replace(/\{@background ([^}|]+?)(?:\|[^}]*)?\}/g, '<b>$1</b>')
		.replace(/\{@race ([^}|]+?)(?:\|[^}]*)?\}/g, '<b>$1</b>')
		.replace(/\{@table ([^}|]+?)(?:\|[^}]*)?\}/g, '<i>$1</i>')
		.replace(/\{@itemProperty ([^}|]+?)(?:\|[^}]*)?\}/g, '<i>$1</i>')
		.replace(/\{@filter ([^}|]+?)(?:\|[^}]*)?\}/g, '<i>$1</i>')
		.replace(/\{@scenario ([^}|]+?)(?:\|[^}]*)?\}/g, '<i>$1</i>')
		.replace(/\{@b ([^}]+)\}/g, '<b>$1</b>')
		.replace(/\{@i ([^}]+)\}/g, '<i>$1</i>')
		.replace(/\{@h ([^}]+)\}/g, '$1')
		.replace(/\{@at ([^}]+)\}/g, '$1')
		.replace(/\{@u ([^}]+)\}/g, '$1')
		.replace(/\{@sup ([^}]+)\}/g, '<sup>$1</sup>')
		.replace(/\{@homebrew ([^}]+)\}/g, '$1')
		.replace(/\{@monic ([^}]+)\}/g, '$1')
		.replace(/\{@code ([^}]+)\}/g, '<code>$1</code>')
		.replace(/\{@footnote ([^}]+)\}/g, '')
		.replace(/\{@2014 ([^}]+)\}/g, '$1')
		.replace(/\{@2024 ([^}]+)\}/g, '$1')
		.replace(/\{@filter ([^}|]+?)(?:\|[^}]*)?\}/g, '$1')
		.replace(/\{@amt ([^}|]+?)(?:\|[^}]*)?\}/g, '$1')
		.replace(/\{@hit ([^}|]+?)(?:\|[^}]*)?\}/g, '$1')
		.replace(/\{@ammo ([^}|]+?)(?:\|[^}]*)?\}/g, '$1')
		.replace(/\{@srd52 ([^}]+)\}/g, '$1')
		.replace(/\{@objectId ([^}]+)\}/g, '$1')
		.replace(/\{@rand ([^}]+)\}/g, '$1')
		.replace(/\{@physicalsave ([^}|]+?)(?:\|[^}]*)?\}/g, '$1 saving throw')
		.replace(/\{@immersivemode ([^}]+)\}/g, '$1')
		.replace(/\{@empower ([^}]+)\}/g, '$1')
		.replace(/\{@lang ([^}|]+?)(?:\|[^}]*)?\}/g, '$1')
		.replace(/\{@currency ([^}|]+?)(?:\|[^}]*)?\}/g, '$1')
		.replace(/\{@R ([^}]+)\}/g, '$1')
		.replace(/\{@Compulse ([^}]+)\}/g, '$1')
		.replace(/\{@T ([^}]+)\}/g, '$1')
		.replace(/\{@[a-z]+ ([^}|]+?)(?:\|[^}]*)?\}/g, '$1');
}

function processEntries(entries) {
	if (!entries) return [];
	return entries.map(e => {
		if (typeof e === 'string') return { type: 'text', content: strip5eTags(e) };
		if (e.type === 'entries' || e.type === 'section') {
			return {
				type: 'section',
				name: e.name || '',
				entries: processEntries(e.entries)
			};
		}
		if (e.type === 'list') {
			return {
				type: 'list',
				items: (e.items || []).map(item => {
					if (typeof item === 'string') return strip5eTags(item);
					if (item.type === 'item') {
						return {
							type: 'item',
							name: item.name || '',
							entry: strip5eTags(item.entry || item.entries?.join('\n') || '')
						};
					}
					return strip5eTags(item.name || item.entry || JSON.stringify(item));
				})
			};
		}
		if (e.type === 'table') {
			return {
				type: 'table',
				caption: e.caption || '',
				colLabels: e.colLabels || [],
				rows: (e.rows || []).map(row => row.map(cell => strip5eTags(String(cell))))
			};
		}
		return { type: 'text', content: strip5eTags(JSON.stringify(e)) };
	});
}

// Resolves 5etools `_copy` inheritance. Variant entries (e.g. "Baldur's Gate
// Acolyte" copying the PHB "Acolyte") carry no data of their own; merge the
// base record in and apply any `_mod` to the resulting entries.
function applyEntriesMod(variantEntries, baseEntries, mod) {
	let out = (variantEntries && variantEntries.length) ? variantEntries : baseEntries;
	if (!Array.isArray(out)) out = [];
	out = out.slice();
	if (!mod || !Array.isArray(out)) return out;
	const items = Array.isArray(mod.items) ? mod.items : (mod.items ? [mod.items] : []);
	const mode = mod.mode;
	if (mode === 'insertArr') {
		const idx = Math.min(mod.index ?? out.length, out.length);
		out.splice(idx, 0, ...items);
	} else if (mode === 'appendArr') {
		out.push(...items);
	} else if (mode === 'prependArr') {
		out.unshift(...items);
	} else if (mode === 'replaceArr') {
		const matcher = mod.replace;
		const findIdx = (arr) => {
			if (typeof matcher === 'string') return arr.findIndex((e) => e && e.name === matcher);
			if (matcher && typeof matcher === 'object' && Array.isArray(matcher.name)) {
				return arr.findIndex((e) => e && matcher.name.includes(e.name));
			}
			if (matcher && typeof matcher === 'object') return arr.findIndex((e) => e && e.name === matcher.name);
			return -1;
		};
		const idx = findIdx(out);
		if (idx !== -1) out.splice(idx, 1, ...items);
		else out.push(...items);
	}
	return out;
}

function resolveCopy(record, pool, seen = new Set()) {
	if (!record || !record._copy) return record;
	const key = `${record.source}/${record.name}`;
	if (seen.has(key)) return record;
	seen.add(key);
	const base = pool.find((x) => x.source === record._copy.source && x.name === record._copy.name);
	if (!base) return record;
	const baseRec = resolveCopy(base, pool, seen);
	const mod = record._copy._mod || {};
	const merged = structuredClone(baseRec);
	for (const k of Object.keys(record)) {
		if (k === '_copy') continue;
		if (k === 'entries' && mod.entries) {
			merged.entries = applyEntriesMod(
				Array.isArray(record.entries) ? record.entries : [],
				Array.isArray(baseRec.entries) ? baseRec.entries : [],
				mod.entries
			);
		} else {
			merged[k] = record[k];
		}
	}
	if (mod.entries && Array.isArray(merged.entries)) {
		merged.entries = applyEntriesMod(Array.isArray(record.entries) ? record.entries : [], merged.entries, mod.entries);
	}
	return merged;
}

function cellToText(cell) {
	if (typeof cell === 'string' || typeof cell === 'number') return strip5eTags(String(cell));
	if (!cell || typeof cell !== 'object') return '';
	if (cell.type === 'bonus') return `${cell.value >= 0 ? '+' : ''}${cell.value}`;
	if (cell.type === 'dice' && cell.value != null) return strip5eTags(String(cell.value));
	if (cell.value != null) return String(cell.value);
	if (cell.dice) return strip5eTags(JSON.stringify(cell.dice));
	if (cell.dmg1) return strip5eTags(String(cell.dmg1));
	return strip5eTags(JSON.stringify(cell));
}

function processStartingEquipment(se) {
	if (!se || typeof se !== 'object') return null;
	const items = new Set();
	const rawStr = JSON.stringify(se);
	const re = /\{@item ([^}|]+?)(?:\|[^}]*)?\}/g;
	let m;
	while ((m = re.exec(rawStr)) !== null) items.add(m[1].trim());
	return {
		default: Array.isArray(se.default) ? se.default.map(x => strip5eTags(String(x))) : [],
		goldAlternative: typeof se.goldAlternative === 'number'
			? String(se.goldAlternative)
			: strip5eTags(String(se.goldAlternative || '')),
		items: [...items]
	};
}

function convertClassTables(groups) {
	if (!groups) return [];
	return groups.map(g => ({
		title: g.title ? strip5eTags(g.title) : '',
		colLabels: (g.colLabels || []).map(cellToText),
		rows: (g.rows || []).map((row, i) => [String(i + 1), ...row.map(cellToText)])
	}));
}

async function main() {
	// 1. Spells
	console.log('\n=== SPELLS ===');
	const spellIndex = await fetchJSON(`${BASE}/spells/index.json`);
	const spellFiles = Object.values(spellIndex);
	const allSpells = [];
	for (const file of spellFiles) {
		const data = await fetchJSON(`${BASE}/spells/${file}`).catch(() => ({ spell: [] }));
		allSpells.push(...data.spell);
	}
	const spellSources = Object.keys(spellIndex);
	const preferred = ['XPHB', 'PHB'];
	const spellPriority = new Map(spellSources.map((s, i) => [s, i]));
	for (let i = 0; i < preferred.length; i++) spellPriority.set(preferred[i], i);
	const spellDedup = new Map();
	for (const s of allSpells) {
		const key = s.name.toLowerCase();
		const existing = spellDedup.get(key);
		const prio = spellPriority.get(s.source);
		const existingPrio = existing ? spellPriority.get(existing.source) : Infinity;
		if (!existing || prio < existingPrio) spellDedup.set(key, s);
	}
	const processedSpells = [...spellDedup.values()].map(s => ({
		name: s.name,
		source: s.source,
		level: s.level,
		school: s.school,
		time: s.time,
		range: s.range,
		components: s.components,
		duration: s.duration,
		entries: processEntries(s.entries),
		entriesHigherLevel: processEntries(s.entriesHigherLevel),
		damageInflict: s.damageInflict || [],
		conditionInflict: s.conditionInflict || [],
		savingThrow: s.savingThrow || [],
		castingTime: s.time?.[0]?.unit || 'action',
		ritual: !!s.meta?.ritual,
		concentration: s.duration?.[0]?.concentration || false,
		srd: !!s.srd,
		srd52: !!s.srd52,
		basicRules: !!s.basicRules,
		basicRules2024: !!s.basicRules2024,
		reprintedAs: s.reprintedAs || [],
		page: s.page
	}));
	writeFileSync(join(OUT, 'spells.json'), JSON.stringify(processedSpells, null, '\t'));
	console.log(`Processed ${processedSpells.length} spells (deduped)`);

	// 2. Classes & Subclasses
	console.log('\n=== CLASSES ===');
	const classNames = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard', 'artificer'];
	const allClasses = [];
	const allSubclasses = [];
	const allClassFeatures = [];
	const allSubclassFeatures = [];
	const classEditionMap = new Map();

	for (const cls of classNames) {
		try {
			const data = await fetchJSON(`${BASE}/class/class-${cls}.json`);
			if (data.class) {
				allClasses.push(...data.class);
				for (const c of data.class) {
					classEditionMap.set(`${c.name}|${c.source}`, c.edition || 'classic');
				}
			}
			if (data.subclass) allSubclasses.push(...data.subclass);
			if (data.classFeature) allClassFeatures.push(...data.classFeature);
			if (data.subclassFeature) allSubclassFeatures.push(...data.subclassFeature);
		} catch (e) {
			console.log(`Skipping ${cls}: ${e.message}`);
		}
	}

	const processedClasses = allClasses.map(c => ({
		name: c.name,
		source: c.source,
		edition: c.edition || 'classic',
		hitDice: c.hd,
		proficiency: c.proficiency,
		startingProficiencies: c.startingProficiencies,
		savingThrows: c.proficiency,
		spellcastingAbility: c.spellcastingAbility || null,
		preparedSpells: c.preparedSpells || null,
		cantripProgression: c.cantripProgression || null,
		spellsKnownProgression: c.spellsKnownProgressionFixed || null,
		startingEquipment: processStartingEquipment(c.startingEquipment),
		classTableGroups: c.classTableGroups,
		tables: convertClassTables(c.classTableGroups),
		subclassTitle: c.subclassTitle,
		features: (c.classFeatures || []).map(f => {
			if (typeof f === 'string') {
				const match = f.match(/^(.+?)\|(.+?)(?:\|([^|]*))?\|(\d+)$/);
				if (match) {
					const [, name, cls, edition, level] = match;
					const resolved = allClassFeatures.find(cf =>
						cf.name === name && cf.className === cls && String(cf.level) === level &&
						(edition ? cf.source === edition : true)
					);
					if (resolved) {
						return {
							name: resolved.name,
							level: resolved.level,
							entries: processEntries(resolved.entries),
							source: resolved.source
						};
					}
				}
				return { name: f, level: 0, entries: [] };
			}
			if (f.classFeature) {
				return { name: f.classFeature, level: 0, entries: [], gainSubclassFeature: true };
			}
			return f;
		})
	}));
	writeFileSync(join(OUT, 'classes.json'), JSON.stringify(processedClasses, null, '\t'));
	console.log(`Processed ${processedClasses.length} classes`);

	const processedSubclasses = allSubclasses.map(sc => ({
		name: sc.name,
		shortName: sc.shortName,
		source: sc.source,
		className: sc.className,
		classSource: sc.classSource,
		edition: sc.edition || classEditionMap.get(`${sc.className}|${sc.classSource}`) || 'classic',
		features: (sc.subclassFeatures || []).map(f => {
			if (typeof f === 'string') {
				const match = f.match(/^(.+?)\|(.+?)(?:\|([^|]*))?\|(.+?)(?:\|([^|]*))?\|(\d+)$/);
				if (match) {
					const [, name, cls, edition, sub, subEdition, level] = match;
					const resolved = allSubclassFeatures.find(sf =>
						sf.name === name && sf.className === cls &&
						sf.subclassShortName === sub && String(sf.level) === level
					);
					if (resolved) {
						return {
							name: resolved.name,
							level: resolved.level,
							entries: processEntries(resolved.entries),
							source: resolved.source
						};
					}
				}
				return { name: f, level: 0, entries: [] };
			}
			return f;
		})
	}));
	writeFileSync(join(OUT, 'subclasses.json'), JSON.stringify(processedSubclasses, null, '\t'));
	console.log(`Processed ${processedSubclasses.length} subclasses`);

	// 3. Equipment & Magic Items
	console.log('\n=== ITEMS ===');
	const itemsData = await fetchJSON(`${BASE}/items.json`);
	const processedItems = (itemsData.item || []).map(i => ({
		name: i.name,
		source: i.source,
		type: i.type,
		rarity: i.rarity,
		weight: i.weight,
		value: i.value,
		entries: processEntries(i.entries),
		dmg1: i.dmg1,
		dmg2: i.dmg2,
		dmgType: i.dmgType,
		weaponCategory: i.weaponCategory,
		armorCategory: i.armorCategory,
		ac: i.ac,
		reqAttune: i.reqAttune,
		wondrous: i.wondrous,
		techLevel: i.techLevel,
		cluster: i.cluster,
		charges: i.charges,
		recharge: i.recharge,
		page: i.page
	}));
	writeFileSync(join(OUT, 'items.json'), JSON.stringify(processedItems, null, '\t'));
	console.log(`Processed ${processedItems.length} items`);

	const equipData = await fetchJSON(`${BASE}/items-base.json`);
	const ARMOR_CAT = { LA: 'Light', MA: 'Medium', HA: 'Heavy', S: 'Shield' };
	const processedEquipment = (equipData.baseitem || []).map(e => {
		const t = String(e.type || '').split('|')[0];
		const raw = {
			entries: [],
			name: e.name,
			source: e.source,
			edition: e.edition === 'one' || e.source === 'XPHB' || e.source === 'XDMG' ? 'one' : 'classic',
			type: t,
			weight: e.weight,
			value: e.value,
			dmg1: e.dmg1,
			dmg2: e.dmg2,
			dmgType: e.dmgType,
			weaponCategory: e.weaponCategory,
			weaponRange: e.range,
			property: e.property || [],
			armorCategory: ARMOR_CAT[t] || null,
			ac: e.ac || null,
			strMinimum: e.strength,
			stealthDisadvantage: !!e.stealth,
			page: e.page
		};
		raw.entries = e.entries && e.entries.length
			? processEntries(e.entries)
			: generateEquipmentEntries(raw);
		return raw;
	});
	writeFileSync(join(OUT, 'equipment.json'), JSON.stringify(processedEquipment, null, '\t'));
	console.log(`Processed ${processedEquipment.length} equipment`);

	// 4. Feats
	console.log('\n=== FEATS ===');
	const featsData = await fetchJSON(`${BASE}/feats.json`);
	const processedFeats = (featsData.feat || []).map(f => ({
		name: f.name,
		source: f.source,
		category: f.category,
		ability: f.ability,
		prerequisite: f.prerequisite,
		entries: processEntries(f.entries),
		page: f.page
	}));
	writeFileSync(join(OUT, 'feats.json'), JSON.stringify(processedFeats, null, '\t'));
	console.log(`Processed ${processedFeats.length} feats`);

	// 5. Races/Species
	console.log('\n=== RACES ===');
	const racesData = await fetchJSON(`${BASE}/races.json`);
	const racePool = racesData.race || [];
	const subracePool = racePool.flatMap((r) => (r.subraces || []).map((sr) => ({ ...sr, _parent: r.name })));
	const processedRaces = racePool.map(r => {
		const resolved = resolveCopy(r, racePool);
		return {
			name: resolved.name,
			source: resolved.source,
			edition: resolved.edition || 'classic',
			size: resolved.size,
			speed: resolved.speed,
			ability: resolved.ability,
			skillProficiencies: resolved.skillProficiencies || null,
			entries: processEntries(resolved.entries),
			subraces: (resolved.subraces || []).map(sr => {
				const res = resolveCopy(sr, subracePool);
				return {
					name: res.name,
					source: res.source,
					entries: processEntries(res.entries)
				};
			}),
			traits: resolved.traitTags || [],
			languages: resolved.languageProficiencies,
			page: resolved.page
		};
	});
	writeFileSync(join(OUT, 'races.json'), JSON.stringify(processedRaces, null, '\t'));
	console.log(`Processed ${processedRaces.length} races`);

	// Languages: inherit Common + racial language for subrace/lineage records
	// (e.g. FTD "Dragonborn (Metallic)" or XPHB "Dragonborn") that omit the field.
	const fullRaces = [...processedRaces];
	const withLangs = fullRaces.filter((x) => (x.languages?.length || 0) > 0);
	const inheritFor = (r) => {
		if ((r.languages?.length || 0) > 0) return r;
		const prefix = (r.name.match(/^(.*?)\s*\(.*?\)$/) || [])[1];
		const pool = r.name !== prefix && withLangs.filter((x) => x.name === prefix);
		const sameName = pool?.length ? pool : withLangs.filter((x) => x.name === r.name);
		if (!sameName.length) return r;
		const sameEdition = sameName.filter((x) => x.edition === r.edition);
		const pick = (sameEdition.length ? sameEdition : sameName).sort((a, b) =>
			(a.source === 'PHB' ? 0 : 1) - (b.source === 'PHB' ? 0 : 1)
		)[0];
		return pick?.languages?.length ? { ...r, languages: pick.languages } : r;
	};
	const inheritedRaces = fullRaces.map(inheritFor);
	writeFileSync(join(OUT, 'races.json'), JSON.stringify(inheritedRaces, null, '\t'));
	console.log(`Inherited languages for ${inheritedRaces.filter((x, i) => x.languages !== fullRaces[i].languages).length} races`);

	// 6. Backgrounds
	console.log('\n=== BACKGROUNDS ===');
	const bgData = await fetchJSON(`${BASE}/backgrounds.json`);
	const bgPool = bgData.background || [];
	const processedBGs = bgPool.map(b => {
		const resolved = resolveCopy(b, bgPool);
		return {
			name: resolved.name,
			source: resolved.source,
			skillProficiencies: resolved.skillProficiencies,
			toolProficiencies: resolved.toolProficiencies,
			languageProficiencies: resolved.languageProficiencies,
			feats: resolved.feats,
			startingEquipment: resolved.startingEquipment,
			entries: processEntries(resolved.entries),
			page: resolved.page
		};
	});
	writeFileSync(join(OUT, 'backgrounds.json'), JSON.stringify(processedBGs, null, '\t'));
	console.log(`Processed ${processedBGs.length} backgrounds`);

	// 7. Optional Features (Eldritch Invocations, Fighting Styles, Metamagic, Pact Boons, Epic Boons)
	console.log('\n=== OPTIONAL FEATURES ===');
	const optData = await fetchJSON(`${BASE}/optionalfeatures.json`).catch(() => ({ optionalfeature: [] }));
	const ftLabels = {
		EI: 'Eldritch Invocation',
		'FS:F': 'Fighting Style',
		'FS:B': 'Fighting Style',
		'FS:P': 'Fighting Style',
		'FS:R': 'Fighting Style',
		MM: 'Metamagic',
		PB: 'Pact Boon',
		ED: 'Epic Boon',
		AI: 'Arcane Invocation'
	};
	const processedOptional = (optData.optionalfeature || []).map(f => ({
		name: f.name,
		source: f.source,
		featureType: f.featureType || [],
		category: (f.featureType || []).map((t) => ftLabels[t] || t).filter((v, i, a) => a.indexOf(v) === i)[0] || 'Optional Feature',
		prerequisite: f.prerequisite,
		entries: processEntries(f.entries),
		page: f.page
	}));
	const optDedup = new Map();
	for (const f of processedOptional) {
		const key = f.name.toLowerCase();
		const existing = optDedup.get(key);
		if (!existing || (f.source === 'XPHB' && existing.source !== 'XPHB')) optDedup.set(key, f);
	}
	const processedOptionalClean = [...optDedup.values()];
	writeFileSync(join(OUT, 'optional-features.json'), JSON.stringify(processedOptionalClean, null, '\t'));
	console.log(`Processed ${processedOptionalClean.length} optional features`);
	const processedInvocations = processedOptionalClean.filter(f => f.featureType.includes('EI'));
	writeFileSync(join(OUT, 'invocations.json'), JSON.stringify(processedInvocations, null, '\t'));
	console.log(`  -> ${processedInvocations.length} eldritch invocations`);

	// 8. Conditions
	console.log('\n=== CONDITIONS ===');
	const condData = await fetchJSON(`${BASE}/conditionsdiseases.json`).catch(() => ({ condition: [] }));
	const processedConditions = (condData.condition || []).map(c => ({
		name: c.name,
		source: c.source,
		entries: processEntries(c.entries),
		page: c.page
	}));
	writeFileSync(join(OUT, 'conditions.json'), JSON.stringify(processedConditions, null, '\t'));
	console.log(`Processed ${processedConditions.length} conditions`);

	// 8. Build search index (deduped, homebrew-flagged) from the data files
	console.log('\n=== SEARCH INDEX ===');
	const indexEntries = buildSearchIndex();
	writeFileSync(join(OUT, 'search-index.json'), JSON.stringify(indexEntries, null, '\t'));
	console.log(`Search index: ${indexEntries.length} entries`);

	console.log('\n=== DONE ===');
}

main().catch(console.error);
