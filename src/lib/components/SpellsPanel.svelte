<script lang="ts">
  import { type Character } from '$lib/utils/character-store';
  import {
    abilityMod,
    formatMod,
    proficiencyBonus,
    levelText,
    derivedSpellcasting,
    sanitizeProficiencyText
  } from '$lib/utils/dnd';
  import spellsData from '$lib/data/spells.json';
  import equipmentData from '$lib/data/equipment.json';
  import ContentRenderer from '$lib/components/ContentRenderer.svelte';

  let { char, classData = null, edition = '2014' }: { char: Character; classData: any; edition?: string } = $props();

  const is2024 = $derived(edition === 'one');
  const pb = $derived(proficiencyBonus(char.level));
  const spell = $derived(classData ? derivedSpellcasting(classData, char.level, char.abilityScores) : null);

  const spellMeta = (name: string) =>
    (spellsData as any[]).find((s) => s.name.toLowerCase() === (name || '').toLowerCase()) || null;
  const equipMeta = (name: string) =>
    (equipmentData as any[]).find((x) => x.name.toLowerCase() === (name || '').toLowerCase()) || null;

  const SCHOOL_NAMES: Record<string, string> = {
    A: 'Abjuration', Ab: 'Abjuration', C: 'Conjuration', Cx: 'Conjuration',
    D: 'Divination', Dv: 'Divination', E: 'Enchantment', En: 'Enchantment',
    V: 'Evocation', Ev: 'Evocation', I: 'Illusion', Il: 'Illusion',
    N: 'Necromancy', Nc: 'Necromancy', T: 'Transmutation', Tr: 'Transmutation'
  };
  const DAMAGE_NAMES: Record<string, string> = {
    S: 'Slashing', P: 'Piercing', B: 'Bludgeoning', A: 'Acid', C: 'Cold',
    F: 'Fire', L: 'Lightning', N: 'Necrotic', O: 'Poison', Pc: 'Psychic', R: 'Radiant', T: 'Thunder'
  };
  const SAVE_NAMES: Record<string, string> = {
    str: 'Strength', dex: 'Dexterity', con: 'Constitution',
    int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma'
  };
  const PROP_NAMES: Record<string, string> = {
    F: 'Finesse', V: 'Versatile', A: 'Ammunition', L: 'Light', H: 'Heavy',
    T: 'Thrown', R: 'Reach', '2H': 'Two-Handed', S: 'Special', M: 'Martial'
  };

  const ACTIONS_2024 = [
    { name: 'Attack', short: '⚔', desc: 'Make a melee or ranged attack with a weapon, an unarmed strike, or one of the special attacks (Grapple, Shove).' },
    { name: 'Magic', short: '✦', desc: 'Cast a spell. Many spells (and cantrips) use the Magic action.' },
    { name: 'Dash', short: '»', desc: 'Move up to your speed again, in addition to the movement you already have.' },
    { name: 'Disengage', short: '↺', desc: 'Move freely — enemies can\'t make opportunity attacks against you this turn.' },
    { name: 'Dodge', short: '▣', desc: 'Until your next turn, attack rolls against you have disadvantage and you have advantage on Dexterity saves.' },
    { name: 'Help', short: '✊', desc: 'Give an ally within 5 ft advantage on their next ability check or attack roll (against a target you choose).' },
    { name: 'Hide', short: '⌁', desc: 'Make a Stealth check. If you beat a creature\'s Passive Perception, you\'re unseen and have advantage on your next attack.' },
    { name: 'Ready', short: '⚡', desc: 'Prepare an action + a trigger (e.g. "shoot when it moves"). It happens later using your reaction.' },
    { name: 'Study', short: '✦', desc: 'Make an Intelligence- or Wisdom-based check to recall information or figure something out.' },
    { name: 'Search', short: '⌕', desc: 'Make a Perception check to find something hidden or spot an ambush.' },
    { name: 'Influence', short: '☛', desc: 'Change how a creature acts or reacts — usually a Charisma check (Persuasion, Intimidation...).' },
    { name: 'Utilize', short: '◈', desc: 'Use an object or interact with the environment (open a door, drink a potion, stow a weapon).' },
    { name: 'Improvise', short: '…', desc: 'Do anything else your DM lets you try.' }
  ];

  const ACTIONS_2014 = [
    { name: 'Attack', short: '⚔', desc: 'Make one weapon attack, an unarmed strike, or a special melee attack (Grapple or Shove in place of an attack).' },
    { name: 'Cast a Spell', short: '✦', desc: 'Cast one of your spells with a casting time of 1 action, 1 bonus action, or a cantrip.' },
    { name: 'Dash', short: '»', desc: 'Gain extra movement equal to your speed this turn.' },
    { name: 'Disengage', short: '↺', desc: 'Move without provoking opportunity attacks for the rest of the turn.' },
    { name: 'Dodge', short: '▣', desc: 'Until your next turn, attack rolls against you have disadvantage and you have advantage on Dexterity saves.' },
    { name: 'Help', short: '✊', desc: 'Give an ally advantage on their next ability check or on attack rolls against a target within 5 ft of you.' },
    { name: 'Hide', short: '⌁', desc: 'Make a Stealth check. Succeeding makes you unseen, giving advantage on attacks you make from hiding.' },
    { name: 'Ready', short: '⚡', desc: 'Prepare an action and a trigger. You use your reaction to unleash it when the trigger fires.' },
    { name: 'Search', short: '⌕', desc: 'Make a Perception check to find something you missed, like a hidden creature or trap.' },
    { name: 'Use an Object', short: '◈', desc: 'Open a door, draw a weapon, drink a potion, use an item — anything the DM deems an action.' },
    { name: 'Improvise', short: '…', desc: 'Do anything else the DM allows.' }
  ];

  const actions = $derived(is2024 ? ACTIONS_2024 : ACTIONS_2014);

  const weapons = $derived(
    (char.equipment || [])
      .filter((e) => {
        const meta = equipMeta(e.name);
        return meta?.weaponCategory || meta?.dmg1;
      })
      .map((e) => {
        const meta = equipMeta(e.name);
        const ranged = (meta?.type || '').toString().startsWith('R');
        const finesse = (meta?.property || []).includes('F');
        const abilityScore = ranged ? char.abilityScores.dex || 10 : finesse
          ? Math.max(char.abilityScores.str || 10, char.abilityScores.dex || 10)
          : char.abilityScores.str || 10;
        const dmgType = DAMAGE_NAMES[meta?.dmgType] || meta?.dmgType || '';
        const dmg = meta?.dmg1 ? `${meta.dmg1}${dmgType ? ' ' + dmgType : ''}` : '';
        const props = (meta?.property || []).map((p: string) => PROP_NAMES[p] || p).filter(Boolean);
        return {
          name: e.name,
          melee: !ranged,
          toHit: pb + abilityMod(abilityScore),
          dmg,
          versatile: meta?.dmg2 ? `${meta.dmg2}${dmgType ? ' ' + dmgType : ''}` : '',
          props
        };
      })
  );

  const unarmed = $derived({
    toHit: pb + abilityMod(char.abilityScores.str || 10),
    dmg: `1 ${DAMAGE_NAMES.B}`
  });

  const bt = $derived.by(() => {
    const reaction: { name: string; meta: any }[] = [];
    const bonus: { name: string; meta: any }[] = [];
    for (const name of [...char.spellsCantrips, ...char.spellsKnown]) {
      const meta = spellMeta(name);
      if (!meta) continue;
      const unit = meta.time?.[0]?.unit;
      if (unit === 'reaction') reaction.push({ name: meta.name || name, meta });
      else if (unit === 'bonus') bonus.push({ name: meta.name || name, meta });
    }
    return { reaction, bonus };
  });

  const cantrips = $derived(
    char.spellsCantrips.map((name) => {
      const meta = spellMeta(name);
      return { name: meta?.name || name, meta };
    })
  );

  const spellsByLevel = $derived.by(() => {
    const map = new Map<number, { name: string; meta: any }[]>();
    for (const name of char.spellsKnown) {
      const meta = spellMeta(name);
      const lvl = meta?.level ?? 1;
      if (!map.has(lvl)) map.set(lvl, []);
      map.get(lvl)!.push({ name: meta?.name || name, meta });
    }
    return map;
  });

  function fmtTime(t: any): string {
    const n = t?.number ?? 1;
    const u = t?.unit || '';
    if (u === 'action') return n === 1 ? '1 action' : `${n} actions`;
    if (u === 'bonus') return 'Bonus action';
    if (u === 'reaction') return '1 reaction';
    if (u === 'minute') return n === 1 ? '1 minute' : `${n} minutes`;
    if (u === 'hour') return n === 1 ? '1 hour' : `${n} hours`;
    return `${n} ${u}`;
  }

  function fmtRange(r: any): string {
    if (!r) return '—';
    const d = r.distance;
    const am = d?.amount;
    const dt = d?.type;
    if (r.type !== 'point') {
      if (r.type === 'self' && !am) return 'Self';
      return am ? `Self (${r.type}, ${am} ft)` : r.type === 'spellAoE' ? 'AoE' : r.type;
    }
    if (dt === 'feet') return `${am} ft`;
    if (dt === 'mile') return am ? `${am} mi` : '1 mi';
    if (dt === 'touch') return 'Touch';
    if (dt === 'self') return 'Self';
    if (dt === 'sight') return 'Sight';
    if (dt === 'unlimited' || dt === 'unlimitedSamePlane') return 'Unlimited';
    return dt ? String(dt).replace(/-/g, ' ') : '—';
  }

  function fmtDuration(duration: any): string {
    if (!duration) return '—';
    if (duration.type === 'instant') return 'Instantaneous';
    if (duration.type === 'permanent') return 'Permanent';
    if (duration.type === 'special') return 'Special';
    const d = duration.duration || {};
    const am = d.amount ?? '';
    const u = d.type || '';
    if (u === 'round') return `${am} round${am > 1 ? 's' : ''}`;
    if (u === 'minute') return `${am} minute${am > 1 ? 's' : ''}`;
    if (u === 'hour') return `${am} hour${am > 1 ? 's' : ''}`;
    if (u === 'day') return `${am} day${am > 1 ? 's' : ''}`;
    return am ? `${am} ${u}` : '—';
  }

  function fmtComponents(c: any): string {
    if (!c) return '—';
    const parts: string[] = [];
    if (c.v) parts.push('V');
    if (c.s) parts.push('S');
    if (c.m) {
      let m = typeof c.m === 'string' ? c.m : (c.m as any)?.text || '';
      if ((c.m as any)?.cost) m = `${m} (${(c.m as any).cost} gp value)`;
      if ((c.m as any)?.consume) m = `${m} — consumed`;
      parts.push(`M${m ? ` (${m})` : ''}`);
    }
    return parts.join(', ');
  }

  function fmtSchool(code: string): string {
    return SCHOOL_NAMES[code] || code || '';
  }

  function fmtDamageTypes(list: string[]): string {
    return (list || [])
      .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
      .join(', ');
  }
</script>

<div class="space-y-5">
  {#if is2024}
    <div class="card p-3 text-[11px] leading-relaxed text-dnd-text-muted">
      <p class="font-semibold text-dnd-gold text-xs mb-1">On your turn, you get…</p>
      <p>
        <span class="text-dnd-text font-semibold">1 Action</span> — pick ONE from the list below ·
        <span class="text-dnd-text font-semibold">Movement</span> up to your speed (split it up, e.g. move 20 ft, act, move 10 ft) ·
        <span class="text-dnd-text font-semibold">1 Bonus action</span> only when an ability or spell grants one · <span class="text-dnd-text font-semibold">1 Reaction</span> per round.
      </p>
    </div>
  {/if}

  <div class="card p-3">
    <h3 class="sheet-heading">Combat Stats</h3>
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
      <div class="sheet-box cbox text-center">
        <p class="sheet-label">AC</p>
        <p class="text-xl font-bold text-dnd-text leading-none">{char.ac || '—'}</p>
      </div>
      <div class="sheet-box cbox text-center">
        <p class="sheet-label">HP</p>
        <p class="text-xl font-bold text-dnd-text leading-none">{char.currentHp}/{char.maxHp}</p>
      </div>
      <div class="sheet-box cbox text-center">
        <p class="sheet-label">Speed</p>
        <p class="text-xl font-bold text-dnd-text leading-none">{char.speed}<span class="text-xs">ft</span></p>
      </div>
      <div class="sheet-box cbox text-center">
        <p class="sheet-label">Init</p>
        <p class="text-xl font-bold text-dnd-gold leading-none">{formatMod(abilityMod(char.abilityScores.dex || 10) + (char.initiativeBonus || 0))}</p>
      </div>
      <div class="sheet-box cbox text-center">
        <p class="sheet-label">Spell DC</p>
        <p class="text-xl font-bold text-dnd-gold leading-none">{spell?.saveDC ?? '—'}</p>
      </div>
      <div class="sheet-box cbox text-center">
        <p class="sheet-label">Spell Atk</p>
        <p class="text-xl font-bold text-dnd-gold leading-none">{spell?.attackBonus != null ? formatMod(spell.attackBonus) : '—'}</p>
      </div>
    </div>
  </div>

  {#if weapons.length || spell?.isCaster}
    <div class="card p-3">
      <h3 class="sheet-heading">What can I hit with?</h3>
      <div class="space-y-1 text-xs">
        {#if spell?.attackBonus != null}
          <div class="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
            <span class="font-semibold text-dnd-text">Spell attack</span>
            <span class="font-mono font-bold text-dnd-gold">{formatMod(spell.attackBonus)}</span>
            <span class="text-dnd-text-muted">varies by spell</span>
          </div>
        {/if}
        {#each weapons as w}
          <div class="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
            <span class="font-semibold text-dnd-text truncate">
              {sanitizeProficiencyText(w.name)}
              <span class="text-dnd-text-muted text-[10px]">({w.melee ? 'melee' : 'ranged'}{w.props.length ? ' · ' + w.props.join(', ') : ''})</span>
            </span>
            <span class="font-mono font-bold text-dnd-gold">{formatMod(w.toHit)}</span>
            <span class="font-mono text-dnd-text-muted">{w.dmg}{w.versatile ? ` / ${w.versatile} (2H)` : ''}</span>
          </div>
        {/each}
        <div class="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
          <span class="font-semibold text-dnd-text">Unarmed strike</span>
          <span class="font-mono font-bold text-dnd-gold">{formatMod(unarmed.toHit)}</span>
          <span class="font-mono text-dnd-text-muted">{unarmed.dmg}</span>
        </div>
      </div>
      <p class="text-[10px] text-dnd-text-muted mt-2">Your attack bonus = Proficiency (<span class="text-dnd-gold">+{pb}</span>) + ability modifier. Roll the d20 and add that total when you attack.</p>
    </div>
  {/if}

  <div class="card p-3">
    <h3 class="sheet-heading">Actions on your turn</h3>
    <p class="text-[11px] text-dnd-text-muted mb-2">Pick <span class="text-dnd-text font-semibold">one</span> of these each turn, then move.</p>
    <div class="grid sm:grid-cols-2 gap-1.5">
      {#each actions as a}
        <div class="rounded-lg border border-dnd-border bg-dnd-card/40 px-2.5 py-2">
          <p class="text-xs font-bold text-dnd-text"><span class="text-dnd-gold mr-1">{a.short}</span>{a.name}</p>
          <p class="text-[11px] text-dnd-text-muted mt-0.5 leading-relaxed">{a.desc}</p>
        </div>
      {/each}
    </div>
    <div class="mt-2 text-[11px] text-dnd-text-muted">
      <p><span class="text-dnd-gold font-semibold">Bonus action:</span> you get one only when an ability or spell says so. Common ones: two-weapon fighting's extra attack, Rage, Cunning Action, Misty Step.</p>
      {#if bt.bonus.length}
        <p class="mt-1">Your spells cast this way: <span class="text-dnd-text">{bt.bonus.map((s) => s.name).join(', ')}</span></p>
      {/if}
      <p class="mt-1"><span class="text-dnd-gold font-semibold">Reaction:</span> one per <i>round</i> (usually on someone else's turn). Opportunity attack when an enemy leaves your reach, or the trigger of a Ready action.</p>
      {#if bt.reaction.length}
        <p class="mt-1">Your reaction spells: <span class="text-dnd-text">{bt.reaction.map((s) => s.name).join(', ')}</span></p>
      {/if}
    </div>
  </div>

  <div>
    {#if char.spellsCantrips.length || char.spellsKnown.length}
      <div class="flex items-baseline gap-2 mb-2">
        <h3 class="font-display text-lg font-semibold text-dnd-gold">Your Spells</h3>
        {#if spell?.ability}
          <p class="text-[11px] text-dnd-text-muted">
            {spell.ability.toUpperCase()} caster · DC {spell.saveDC} · +{spell.attackBonus ?? 0} to hit
          </p>
        {/if}
      </div>

      {#if cantrips.length}
        <div class="mb-3">
          <h4 class="sheet-heading mb-1.5">Cantrips <span class="text-dnd-text-muted font-normal">(at will — no slots)</span></h4>
          <div class="grid sm:grid-cols-2 gap-2">
            {#each cantrips as s}
              <details class="spell-card">
                <summary class="spell-summary">
                  <span class="font-semibold text-dnd-text">{s.name}</span>
                  <span class="text-[10px] text-dnd-text-muted shrink-0">
                    {fmtSchool(s.meta?.school)}{s.meta?.school ? ' · ' : ''}{fmtTime(s.meta?.time?.[0])}
                  </span>
                </summary>
                <div class="spell-det">
                  <div class="flex flex-wrap gap-1.5 mb-2">
                    {#if s.meta?.range}<span class="tag text-[10px]"><b>Range</b> {fmtRange(s.meta.range)}</span>{/if}
                    {#if s.meta?.components}<span class="tag text-[10px]"><b>Comp.</b> {fmtComponents(s.meta.components)}</span>{/if}
                    {#if s.meta?.duration}<span class="tag text-[10px]"><b>Duration</b> {fmtDuration(s.meta.duration[0])}</span>{/if}
                    {#if s.meta?.damageInflict?.length}<span class="tag text-[10px] text-red-300"><b>Damage</b> {fmtDamageTypes(s.meta.damageInflict)}</span>{/if}
                    {#if s.meta?.savingThrow?.length}<span class="tag text-[10px]"><b>Save</b> {SAVE_NAMES[s.meta.savingThrow[0]]}</span>{/if}
                  </div>
                  {#if s.meta?.entries?.length}
                    <div class="spell-body"><ContentRenderer entries={s.meta.entries} /></div>
                  {/if}
                </div>
              </details>
            {/each}
          </div>
        </div>
      {/if}

      {#each [...spellsByLevel.entries()] as [lvl, spells]}
        <div class="mb-3">
          <h4 class="sheet-heading mb-1.5">
            {levelText(lvl)}
            {#if spell?.slots?.[lvl - 1]}
              <span class="text-dnd-text-muted font-normal">({spell.slots[lvl - 1]} slot{spell.slots[lvl - 1] > 1 ? 's' : ''})</span>
            {/if}
          </h4>
          <div class="grid sm:grid-cols-2 gap-2">
            {#each spells as s}
              <details class="spell-card">
                <summary class="spell-summary">
                  <span class="font-semibold text-dnd-text">{s.name}</span>
                  <span class="text-[10px] text-dnd-text-muted shrink-0">
                    {fmtSchool(s.meta?.school)}{s.meta?.school ? ' · ' : ''}{fmtTime(s.meta?.time?.[0])}
                  </span>
                </summary>
                <div class="spell-det">
                  <div class="flex flex-wrap gap-1.5 mb-2">
                    {#if s.meta?.range}<span class="tag text-[10px]"><b>Range</b> {fmtRange(s.meta.range)}</span>{/if}
                    {#if s.meta?.components}<span class="tag text-[10px]"><b>Comp.</b> {fmtComponents(s.meta.components)}</span>{/if}
                    {#if s.meta?.duration}<span class="tag text-[10px]"><b>Duration</b> {fmtDuration(s.meta.duration[0])}</span>{/if}
                    {#if s.meta?.concentration}<span class="tag text-[10px] text-amber-300"><b>☉ Concentration</b></span>{/if}
                    {#if s.meta?.ritual}<span class="tag text-[10px]"><b>Ritual</b> (10 min extra, no slot)</span>{/if}
                    {#if s.meta?.damageInflict?.length}<span class="tag text-[10px] text-red-300"><b>Damage</b> {fmtDamageTypes(s.meta.damageInflict)}</span>{/if}
                    {#if s.meta?.savingThrow?.length}<span class="tag text-[10px]"><b>Save</b> {SAVE_NAMES[s.meta.savingThrow[0]]}</span>{/if}
                    {#if s.meta?.conditionInflict?.length}<span class="tag text-[10px]"><b>Inflicts</b> {fmtDamageTypes(s.meta.conditionInflict)}</span>{/if}
                  </div>
                  {#if s.meta?.entries?.length}
                    <div class="spell-body"><ContentRenderer entries={s.meta.entries} /></div>
                  {/if}
                  {#if s.meta?.entriesHigherLevel?.length}
                    <div class="mt-2 pt-2 border-t border-dnd-border">
                      <p class="sheet-label mb-1">{lvl === 0 ? 'Cantrip Upgrade' : 'At Higher Levels'}</p>
                      <div class="spell-body"><ContentRenderer entries={s.meta.entriesHigherLevel} /></div>
                    </div>
                  {/if}
                </div>
              </details>
            {/each}
          </div>
        </div>
      {/each}
    {:else}
      <div class="card p-4 text-center text-sm text-dnd-text-muted">
        No spells yet — add some in the <span class="text-dnd-gold font-semibold">Builder → Spells</span> step.
      </div>
    {/if}
  </div>
</div>

<style>
  .spell-card {
    background: var(--color-dnd-card);
    border: 1px solid var(--color-dnd-border);
    border-radius: 12px;
    overflow: hidden;
  }
  .spell-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    cursor: pointer;
    list-style: none;
    min-height: 44px;
  }
  .spell-summary::-webkit-details-marker { display: none; }
  .spell-card[open] .spell-summary {
    border-bottom: 1px solid var(--color-dnd-border);
  }
  .spell-det {
    padding: 10px 12px;
  }
  .spell-body {
    font-size: 12px;
    color: var(--color-dnd-text);
  }
  .spell-body :global(p) {
    margin: 6px 0;
    line-height: 1.55;
  }
</style>