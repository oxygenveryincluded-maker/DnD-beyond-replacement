import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const DATA = join(import.meta.dirname, '..', 'src', 'lib', 'data');

const SRCPREF = ['PHB', 'XPHB', 'XDMG', 'MPMM', 'DMG', 'EEPC', 'VGM', 'TCE', 'XGE', 'SCAG', 'VRGR', 'ERLW', 'EFA', 'RHW', 'ToA', 'LFL', 'WttHC'];

function load(name) {
	return JSON.parse(readFileSync(join(DATA, name + '.json'), 'utf8'));
}

function isHomebrew(r) {
	return !!(r && (r.homebrew || r.source === 'HB'));
}

export function buildSearchIndex() {
	const spells = load('spells');
	const classes = load('classes');
	const subclasses = load('subclasses');
	const magicItems = load('items').filter(i => i.rarity && i.rarity !== 'none');
	const equipment = load('equipment');
	const feats = load('feats');
	const races = load('races');
	const backgrounds = load('backgrounds');
	const conditions = load('conditions');
	const optionalFeatures = load('optional-features');

	const searchIndex = [];
	for (const s of spells) searchIndex.push({ type: 'spell', name: s.name, source: s.source, path: '/spells', extra: `Level ${s.level}`, homebrew: isHomebrew(s) });
	for (const c of classes) searchIndex.push({ type: 'class', name: c.name, source: c.source, path: `/classes/${c.name.toLowerCase()}`, extra: c.edition, homebrew: isHomebrew(c) });
	for (const sc of subclasses) searchIndex.push({ type: 'subclass', name: sc.name, source: sc.source, path: `/classes/${sc.className.toLowerCase()}`, extra: sc.className, homebrew: isHomebrew(sc) });
	for (const i of magicItems) searchIndex.push({ type: 'magic-item', name: i.name, source: i.source, path: '/magic-items', extra: i.rarity, homebrew: isHomebrew(i) });
	for (const e of equipment) searchIndex.push({ type: 'equipment', name: e.name, source: e.source, path: '/equipment', extra: e.type, homebrew: isHomebrew(e) });
	for (const f of feats) searchIndex.push({ type: 'feat', name: f.name, source: f.source, path: '/feats', extra: f.category || '', homebrew: isHomebrew(f) });
	for (const r of races) searchIndex.push({ type: 'race', name: r.name, source: r.source, path: '/races', extra: r.edition, homebrew: isHomebrew(r) });
	for (const b of backgrounds) searchIndex.push({ type: 'background', name: b.name, source: b.source, path: '/backgrounds', homebrew: isHomebrew(b) });
	for (const c of conditions) searchIndex.push({ type: 'condition', name: c.name, source: c.source, path: '/rules', homebrew: isHomebrew(c) });
	for (const o of optionalFeatures) searchIndex.push({ type: 'optional-feature', name: o.name, source: o.source, path: '/invocations', extra: o.category, homebrew: isHomebrew(o) });

	const prefOrder = new Map(SRCPREF.map((s, i) => [s, i]));
	const best = new Map();
	const score = (x) => (!x.homebrew ? 1 : 0) + Math.max(0, SRCPREF.length - (prefOrder.get(x.source) ?? 999));
	for (const e of searchIndex) {
		const key = `${e.type}|${String(e.name).trim().toLowerCase()}`;
		const cur = best.get(key);
		if (!cur) { best.set(key, e); continue; }
		if (score(e) > score(cur)) best.set(key, e);
	}
	return Array.from(best.values());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const out = buildSearchIndex();
	writeFileSync(join(DATA, 'search-index.json'), JSON.stringify(out, null, '\t'));
	console.log(`Search index: ${out.length} entries`);
}