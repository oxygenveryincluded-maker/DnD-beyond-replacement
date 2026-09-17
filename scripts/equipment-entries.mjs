const DMG_TYPE_NAME = {
	S: 'slashing',
	P: 'piercing',
	B: 'bludgeoning',
};

const PROPERTY_LABELS = {
	A: 'Ammunition',
	F: 'Finesse',
	H: 'Heavy',
	L: 'Light',
	LD: 'Loading',
	R: 'Reach',
	S: 'Special',
	T: 'Thrown',
	'2H': 'Two-Handed',
	V: 'Versatile',
};

export function generateEquipmentEntries(e) {
	if (!e || (e.entries && e.entries.length)) return e.entries || [];
	const list = [];

	if (e.weaponCategory) {
		const range = e.weaponRange ? ` (range ${e.weaponRange})` : '';
		const cat = String(e.weaponCategory).charAt(0).toUpperCase() + String(e.weaponCategory).slice(1);
		list.push({
			type: 'item',
			name: 'Category',
			entry: `${cat} ${e.type === 'R' ? 'ranged' : 'melee'} weapon`,
		});
	}

	if (e.dmg1) {
		const type = DMG_TYPE_NAME[e.dmgType] || String(e.dmgType || '').toLowerCase();
		list.push({ type: 'item', name: 'Damage', entry: `${e.dmg1} ${type}${type ? '' : ''}`.replace(/\s+$/, '') });
		if (e.dmg2) {
			const type2 = DMG_TYPE_NAME[e.dmgType] || String(e.dmgType || '').toLowerCase();
			list.push({ type: 'item', name: 'Alternate Damage', entry: `${e.dmg2} ${type2} when used with two hands` });
		}
	}

	if (e.property && e.property.length) {
		const props = e.property.map((p) => {
			const label = PROPERTY_LABELS[p] || p;
			if (p === 'A' && e.weaponRange) return `Ammunition (range ${e.weaponRange})`;
			if (p === 'T' && e.weaponRange) return `Thrown (range ${e.weaponRange})`;
			if (p === 'V' && e.dmg2) return `Versatile (${e.dmg2})`;
			return label;
		});
		list.push({ type: 'item', name: 'Properties', entry: props.join(', ') });
	}

	if (e.armorCategory) {
		let acDesc = `AC ${e.ac}`;
		if (e.armorCategory === 'Light') acDesc = `AC ${e.ac} + Dexterity modifier`;
		else if (e.armorCategory === 'Medium') acDesc = `AC ${e.ac} + Dexterity modifier (maximum 2)`;
		else if (e.armorCategory === 'Shield') acDesc = `AC ${e.ac} while equipped`;
		list.push({ type: 'item', name: 'Armor Class', entry: acDesc });
	}

	if (e.stealthDisadvantage) {
		list.push({ type: 'item', name: 'Stealth', entry: 'Disadvantage on Dexterity (Stealth) checks' });
	}

	if (e.strMinimum) {
		list.push({ type: 'item', name: 'Strength', entry: `Requires Strength ${e.strMinimum} to wear` });
	}

	const cost = e.value ? `${e.value / 100} gp` : '';
	const weight = e.weight ? `${e.weight} lb.` : '';
	if (cost || weight) {
		list.push({ type: 'item', name: 'Cost and Weight', entry: [cost, weight].filter(Boolean).join(', ') });
	}

	if (!list.length) return [];
	return [{ type: 'list', items: list }];
}