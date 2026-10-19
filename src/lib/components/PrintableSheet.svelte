<script lang="ts">
  // A standard 5e character sheet, laid out like the official PDF sheet.
  // Rendered off-screen and shown only when printing / saving as PDF.
  import { type Character, SKILLS } from '$lib/utils/character-store';
  import {
    abilityMod,
    formatMod,
    proficiencyBonus,
    saveModifier,
    skillModifier,
    levelText,
    derivedSpellcasting,
    derivedMaxHp,
    armorClassFromEquipment,
    sanitizeProficiencyText
  } from '$lib/utils/dnd';
  import classesData from '$lib/data/classes.json';
  import subclassesData from '$lib/data/subclasses.json';
  import spellsData from '$lib/data/spells.json';
  import equipmentData from '$lib/data/equipment.json';
  import invocationsData from '$lib/data/invocations.json';

  let { char }: { char: Character } = $props();

  const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
  const ABILITY_LONG: Record<string, string> = {
    str: 'Strength', dex: 'Dexterity', con: 'Constitution',
    int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma'
  };
  const ABILITY_SHORT: Record<string, string> = {
    str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA'
  };

  const classData = $derived(
    (classesData as any[]).find(
      (c) => c.name === char.class && (!char.classSource || c.source === char.classSource)
    ) || (classesData as any[]).find((c) => c.name === char.class)
  );
  const subclassData = $derived.by(() => {
    const list = (subclassesData as any[]).filter(
      (s) => s.className === char.class && s.name === char.subclass
    );
    if (!list.length) return null;
    const withEdition = classData ? list.filter((s) => s.edition === classData.edition) : [];
    return withEdition[0] || list[0];
  });

  const pb = $derived(proficiencyBonus(char.level));
  const spell = $derived(derivedSpellcasting(classData, char.level, char.abilityScores));
  const hpMax = $derived(
    char.hitDice ? derivedMaxHp(char.hitDice, char.level, abilityMod(char.abilityScores.con || 10)) : null
  );

  const armorPieces = $derived(
    (char.equipment || []).filter((e) => e.equipped).map((e) => {
      const meta = (equipmentData as any[]).find((x) => x.name.toLowerCase() === (e.name || '').toLowerCase());
      return { name: e.name, ac: meta?.ac ?? null, armorCategory: meta?.armorCategory ?? null };
    })
  );
  const acFromEquipment = $derived(armorClassFromEquipment(armorPieces, abilityMod(char.abilityScores.dex || 10)));
  const acFinal = $derived(char.ac || acFromEquipment);

  const weapons = $derived(
    (char.equipment || [])
      .filter((e) => {
        const meta = (equipmentData as any[]).find((x) => x.name.toLowerCase() === (e.name || '').toLowerCase());
        return meta?.weaponCategory || meta?.dmg1;
      })
      .map((e) => {
        const meta = (equipmentData as any[]).find((x) => x.name.toLowerCase() === (e.name || '').toLowerCase());
        const ranged = String(meta?.type || '').startsWith('R');
        const finesse = (meta?.property || []).includes('F');
        const score = ranged
          ? char.abilityScores.dex || 10
          : finesse
            ? Math.max(char.abilityScores.str || 10, char.abilityScores.dex || 10)
            : char.abilityScores.str || 10;
        return {
          name: e.name,
          bonus: pb + abilityMod(score),
          damage: meta?.dmg1
            ? `${meta.dmg1}${meta?.dmgType ? ' ' + (DAMAGE_NAMES[meta.dmgType] || meta.dmgType) : ''}`
            : '',
          ranged
        };
      })
  );

  const DAMAGE_NAMES: Record<string, string> = {
    S: 'Slashing', P: 'Piercing', B: 'Bludgeoning', A: 'Acid', C: 'Cold',
    F: 'Fire', L: 'Lightning', N: 'Necrotic', O: 'Poison', Pc: 'Psychic',
    R: 'Radiant', T: 'Thunder'
  };

  const spellMeta = (name: string) =>
    (spellsData as any[]).find((s) => s.name.toLowerCase() === String(name || '').toLowerCase()) || null;

  const cantrips = $derived(char.spellsCantrips.map((n) => ({ name: spellMeta(n)?.name || n })));
  const leveledSpells = $derived.by(() => {
    const map = new Map<number, string[]>();
    for (const n of char.spellsKnown) {
      const meta = spellMeta(n);
      const lvl = meta?.level ?? 1;
      if (!map.has(lvl)) map.set(lvl, []);
      map.get(lvl)!.push(meta?.name || n);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  });
  const invocations = $derived(
    (char.invocations || []).map((n) => ({
      name: (invocationsData as any[]).find((i) => i.name.toLowerCase() === n.toLowerCase())?.name || n
    }))
  );
  const customInvocations = $derived(
    (char.customInvocations || []).map((inv: any) => ({
      name: inv.name,
      spell: inv.spell,
      rest: inv.rest,
      usesSlot: inv.usesSlot
    }))
  );

  const passivePerception = $derived(
    10 + skillModifier(char.abilityScores.wis || 10, char.skillProficiencies?.perception || {}, char.level)
  );

  const proficiencyList = (list: string[]) => (list || []).map(sanitizeProficiencyText);
</script>

<div class="sheet" id="dnd-print-sheet">
  <header class="head">
    <h1>{char.name || 'Character'}</h1>
    <div class="head-meta">
      <span>Class: {char.class || '—'}{char.subclass ? ` (${char.subclass})` : ''}</span>
      <span>Level {char.level} {char.class ? `(${char.class})` : ''}</span>
      <span>Race: {char.race || '—'}{char.subrace ? ` / ${char.subrace}` : ''}</span>
      <span>Background: {char.background || '—'}</span>
      <span>Alignment: {char.alignment || '—'}</span>
      <span>Player: {char.playerName || '—'}</span>
      <span>XP: {char.experience || 0}</span>
    </div>
  </header>

  <section class="row">
    <div class="box abilities">
      <h2>Ability Scores</h2>
      <table>
        <thead>
          <tr><th>Ability</th><th>Score</th><th>Mod</th><th>Save</th></tr>
        </thead>
        <tbody>
          {#each ABILITY_KEYS as key}
            {@const score = char.abilityScores[key] ?? 10}
            {@const proficient = char.saveProficiencies?.includes(key)}
            <tr>
              <td>{ABILITY_LONG[key]}</td>
              <td class="num">{score}</td>
              <td class="num">{formatMod(abilityMod(score))}</td>
              <td class="num">{formatMod(saveModifier(score, proficient, char.level))}{proficient ? ' *' : ''}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="hint">Proficiency Bonus {formatMod(pb)}</p>
    </div>

    <div class="box">
      <h2>Combat</h2>
      <table class="kv">
        <tbody>
          <tr><td>Armor Class</td><td class="num">{acFinal}</td><td>Hit Points</td><td class="num">{char.currentHp} / {char.maxHp}</td></tr>
          <tr><td>Speed</td><td class="num">{char.speed} ft</td><td>Temp HP</td><td class="num">{char.tempHp}</td></tr>
          <tr><td>Initiative</td><td class="num">{formatMod(abilityMod(char.abilityScores.dex || 10) + (char.initiativeBonus || 0))}</td><td>Hit Dice</td><td class="num">{char.hitDice || '—'} ({char.hitDiceUsed || 0}/{char.level})</td></tr>
          <tr><td>Passive Perception</td><td class="num">{passivePerception}</td><td>Prof. Bonus</td><td class="num">{formatMod(pb)}</td></tr>
        </tbody>
      </table>
      {#if hpMax != null && hpMax !== char.maxHp}
        <p class="hint">Recommended max HP from {char.hitDice} + CON: {hpMax}</p>
      {/if}
      <h2 class="mt">Saving Throws</h2>
      <p class="small">
        {#each ABILITY_KEYS as key}
          {@const score = char.abilityScores[key] ?? 10}
          {@const proficient = char.saveProficiencies?.includes(key)}
          {ABILITY_SHORT[key]} {formatMod(saveModifier(score, proficient, char.level))}{proficient ? '*' : ''}{' '}
        {/each}
      </p>
    </div>
  </section>

  <section class="row">
    <div class="box skills">
      <h2>Skills</h2>
      <table>
        <tbody>
          {#each SKILLS as skill}
            {@const cfg = char.skillProficiencies?.[skill.id] || {}}
            <tr>
              <td>{skill.name}</td>
              <td class="num">{formatMod(skillModifier(char.abilityScores[skill.ability] || 10, cfg, char.level))}</td>
              <td class="marks">
                {cfg.proficient ? 'P' : ''}{cfg.expertise ? 'E' : ''}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="box">
      <h2>Proficiencies &amp; Languages</h2>
      <p class="small"><b>Armor:</b> {proficiencyList(char.armorProficiencies).join(', ') || '—'}</p>
      <p class="small"><b>Weapons:</b> {proficiencyList(char.weaponProficiencies).join(', ') || '—'}</p>
      <p class="small"><b>Tools:</b> {proficiencyList(char.toolProficiencies).join(', ') || '—'}</p>
      <p class="small"><b>Languages:</b> {proficiencyList(char.languages).join(', ') || '—'}</p>

      <h2 class="mt">Attacks</h2>
      <table>
        <thead><tr><th>Name</th><th>Bonus</th><th>Damage</th></tr></thead>
        <tbody>
          {#each weapons as w}
            <tr>
              <td>{w.name}{w.ranged ? ' (ranged)' : ''}</td>
              <td class="num">{formatMod(w.bonus)}</td>
              <td class="num">{w.damage || '—'}</td>
            </tr>
          {/each}
          <tr>
            <td>Unarmed strike</td>
            <td class="num">{formatMod(pb + abilityMod(char.abilityScores.str || 10))}</td>
            <td class="num">1 bludgeoning</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  {#if spell?.isCaster}
    <section class="row">
      <div class="box">
        <h2>Spellcasting</h2>
        <table class="kv">
          <tbody>
            <tr><td>Spellcasting Ability</td><td class="num">{spell.ability ? spell.ability.toUpperCase() : '—'}</td><td>Save DC</td><td class="num">{spell.saveDC ?? '—'}</td></tr>
            <tr><td>Spell Attack</td><td class="num">{spell.attackBonus != null ? formatMod(spell.attackBonus) : '—'}</td><td>Prepared</td><td class="num">{spell.preparedCount ?? '—'}</td></tr>
          </tbody>
        </table>
        <p class="small">
          <b>Spell Slots:</b>
          {#if spell.slots.some((n) => n > 0)}
            {#each spell.slots as n, i}
              {#if n > 0}{levelText(i + 1)}: {n} &nbsp;{/if}
            {/each}
          {:else}
            —
          {/if}
        </p>
        <p class="small"><b>Cantrips ({char.spellsCantrips.length}):</b> {cantrips.map((c) => c.name).join(', ') || '—'}</p>
        {#each leveledSpells as [lvl, names]}
          <p class="small"><b>{levelText(lvl)}:</b> {names.join(', ') || '—'}</p>
        {/each}
      </div>

      {#if invocations.length || customInvocations.length}
        <div class="box">
          <h2>Eldritch Invocations</h2>
          <p class="small">
            {#each invocations as inv, i}{inv.name}{i < invocations.length - 1 ? ', ' : ''}{/each}
          </p>
          {#each customInvocations as inv}
            <p class="small"><b>{inv.name}</b> — {inv.spell} · {inv.rest} · {inv.usesSlot ? 'pact slot' : 'no slot'}</p>
          {/each}
        </div>
      {/if}
    </section>
  {/if}

  <section class="row">
    <div class="box">
      <h2>Features &amp; Traits</h2>
      <p class="small">
        {#each classData?.features || [] as f}
          {#if f.level <= char.level}<b>{f.name}</b>{/if}
        {/each}
        {#each subclassData?.features || [] as f}
          {#if f.level <= char.level}<b>{f.name}</b>{/if}
        {/each}
      </p>
      <h2 class="mt">Feats</h2>
      <p class="small">{char.feats.map(sanitizeProficiencyText).join(', ') || '—'}</p>
    </div>

    <div class="box">
      <h2>Inventory &amp; Coins</h2>
      <table>
        <tbody>
          {#each char.equipment as item}
            <tr>
              <td>{sanitizeProficiencyText(item.name)}{item.quantity > 1 ? ` x${item.quantity}` : ''}</td>
              <td class="num">{item.equipped ? 'equipped' : ''}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="small">
        <b>Coins:</b> {char.coins.pp} pp · {char.coins.gp} gp · {char.coins.ep} ep · {char.coins.sp} sp · {char.coins.cp} cp
      </p>
    </div>
  </section>

  <section class="row">
    <div class="box">
      <h2>Personality</h2>
      <p class="small">{char.traits.personality || '—'}</p>
      <h2 class="mt">Ideals</h2>
      <p class="small">{char.traits.ideals || '—'}</p>
      <h2 class="mt">Bonds</h2>
      <p class="small">{char.traits.bonds || '—'}</p>
      <h2 class="mt">Flaws</h2>
      <p class="small">{char.traits.flaws || '—'}</p>
    </div>
    <div class="box">
      <h2>Notes</h2>
      <p class="small pre">{char.notes || '—'}</p>
    </div>
  </section>
</div>

<style>
  .sheet {
    display: none;
    color: #111;
    background: #fff;
    font-family: Inter, system-ui, sans-serif;
    font-size: 11px;
    line-height: 1.35;
  }
  .head { border-bottom: 2px solid #111; padding-bottom: 4px; margin-bottom: 6px; }
  .head h1 { font-size: 18px; font-weight: 700; margin: 0 0 2px; }
  .head-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 10px; }
  .row { display: flex; gap: 8px; margin-bottom: 6px; align-items: stretch; }
  .box { border: 1px solid #444; padding: 5px 6px; flex: 1; }
  .box h2 {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
    border-bottom: 1px solid #666; margin: 0 0 3px; padding-bottom: 1px;
  }
  .box h2.mt { margin-top: 6px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 1px 3px; }
  th { font-size: 9px; text-transform: uppercase; border-bottom: 1px solid #999; }
  td.num { text-align: right; }
  .marks { text-align: right; width: 22px; font-weight: 700; }
  .small { font-size: 10px; margin: 2px 0; }
  .pre { white-space: pre-wrap; }
  .hint { font-size: 9px; color: #555; margin: 2px 0 0; }
  .abilities { flex: 0 0 34%; }
  .skills { flex: 0 0 40%; }

  @media print {
    .sheet { display: block !important; }
    @page { margin: 12mm; }
  }
</style>
