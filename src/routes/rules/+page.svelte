<script lang="ts">
  import ContentRenderer from '$lib/components/ContentRenderer.svelte';
  import SourceLegend from '$lib/components/SourceLegend.svelte';
  import conditionsData from '$lib/data/conditions.json';
  import { formatSource, formatSourceShort } from '$lib/utils/dnd';

  const conditions = conditionsData as any[];

  const abilities = [
    { abbr: 'STR', name: 'Strength', desc: 'Melee attacks and athletic feats — breaking, lifting, pushing, climbing, and grappling.', skills: 'Athletics' },
    { abbr: 'DEX', name: 'Dexterity', desc: 'Reflexes, balance, and coordination — ranged and finesse attacks, stealth, and quick reactions.', skills: 'Acrobatics, Sleight of Hand, Stealth' },
    { abbr: 'CON', name: 'Constitution', desc: 'Health, stamina, and endurance — a higher score grants more hit points and steadier concentration saving throws.', skills: 'Endurance & vitality' },
    { abbr: 'INT', name: 'Intelligence', desc: 'Reasoning and memory — recalling lore, investigating clues, and solving puzzles.', skills: 'Arcana, History, Investigation, Nature, Religion' },
    { abbr: 'WIS', name: 'Wisdom', desc: 'Perception and intuition — reading situations, insight into others, and resisting mental effects.', skills: 'Animal Handling, Insight, Medicine, Perception, Survival' },
    { abbr: 'CHA', name: 'Charisma', desc: 'Force of personality — influencing others, performing, and projecting presence or deception.', skills: 'Deception, Intimidation, Performance, Persuasion' },
  ];

  const combatRules = [
    {
      name: 'Attack Roll',
      entries: [
        { type: 'text', content: 'To make an attack, roll a <b>d20</b> and add the relevant ability modifier plus your proficiency bonus if you are proficient with the weapon. If the result equals or exceeds the target\'s Armor Class, the attack hits.' },
        { type: 'list', items: ['A natural 20 is a <b>critical hit</b> — the attack hits and deals extra damage.', 'A natural 1 always misses.', 'Advantage: roll twice, take the higher result. Disadvantage: roll twice, take the lower result.'] },
      ],
    },
    {
      name: 'Damage',
      entries: [
        { type: 'text', content: 'When an attack hits, roll the weapon\'s or spell\'s damage dice and add the same ability modifier used for the attack roll.' },
        { type: 'list', items: ['Damage types (bludgeoning, piercing, slashing, fire, and so on) interact with resistances and immunities.', 'Resistance halves the damage, immunity negates it entirely, and vulnerability doubles it.'] },
      ],
    },
    {
      name: 'Armor Class (AC)',
      entries: [
        { type: 'text', content: 'Your Armor Class represents how hard you are to hit. Most creatures have an unarmored AC of <b>10 + Dexterity modifier</b>.' },
        { type: 'list', items: ['Wearing armor replaces the base calculation (for example, leather is 11 + Dex and plate is 18).', 'A shield grants a +2 bonus to AC.', 'Cover, magic items, and certain spells can modify AC further.'] },
      ],
    },
    {
      name: 'Hit Points (HP)',
      entries: [
        { type: 'text', content: 'Hit points measure how much damage you can take before falling unconscious or dying. Your maximum is set by your class and Constitution modifier.' },
        { type: 'list', items: ['A <b>short rest</b> (1 hour or more) lets you spend Hit Dice to heal.', 'A <b>long rest</b> (8 hours) restores hit points and refreshes Hit Dice.', 'Reaching 0 HP makes you fall unconscious and begin making death saving throws.'] },
      ],
    },
    {
      name: 'Saving Throws',
      entries: [
        { type: 'text', content: 'When a foe forces you to resist an effect, you make a saving throw: roll a d20 and add the relevant ability modifier, plus your proficiency bonus if you are proficient in that saving throw.' },
        { type: 'list', items: ['Compare your result to the effect\'s <b>difficulty class (DC)</b>. A success often halves damage or negates the effect.', 'Each class grants proficiency in two signature saving throws (typically Strength/Constitution and one other).'] },
      ],
    },
    {
      name: 'Concentration',
      entries: [
        { type: 'text', content: 'Many spells require concentration. You can concentrate on only one spell at a time: casting another concentration spell instantly ends the first.' },
        { type: 'list', items: ['Whenever you take damage while concentrating, make a Constitution saving throw. The DC is 10 or half the damage taken, whichever is higher.', 'Being incapacitated, dying, or taking another injury ends concentration immediately.'] },
      ],
    },
    {
      name: 'Cover',
      entries: [
        { type: 'text', content: 'Obstacles can shelter you from attacks and effects, granting a bonus to AC and Dexterity saving throws.' },
        { type: 'list', items: ['<b>Half cover</b> (a low wall or a creature): +2 bonus.', '<b>Three-quarters cover</b> (a narrow slit or an arrow slit): +5 bonus.', '<b>Full cover</b> (a solid wall): you cannot be targeted directly.'] },
      ],
    },
    {
      name: 'Opportunity Attack',
      entries: [
        { type: 'text', content: 'When a creature you can see moves out of your reach without taking the Disengage action, you can use your reaction to make a melee attack against it.' },
        { type: 'list', items: ['The attack uses the weapon you are holding and bypasses the normal limit on attacks per action.', 'Forced movement (being pushed, dragged, or carried) does not trigger opportunity attacks.'] },
      ],
    },
  ];

  let conditionSearch = $state('');
  let selectedSource = $state<string | null>(null);
  let expandedRule = $state<string | null>(null);
  let expandedCondition = $state<string | null>(null);

  const sources = $derived.by(() => {
    const s = new Set<string>();
    conditions.forEach((c: any) => s.add(c.source));
    return [null, ...Array.from(s).sort()];
  });

  const filteredConditions = $derived.by(() => {
    let result = conditions;
    if (conditionSearch) {
      result = result.filter((c: any) => c.name.toLowerCase().includes(conditionSearch.toLowerCase()));
    }
    if (selectedSource) {
      result = result.filter((c: any) => c.source === selectedSource);
    }
    return result;
  });
</script>

<svelte:head><title>Rules & Conditions - D&D Companion</title></svelte:head>

<div class="px-4 pt-4 pb-6 max-w-3xl mx-auto">
  <h1 class="font-display text-2xl font-bold text-dnd-gold mb-4">Rules & Conditions</h1>

  <h2 class="font-display text-lg font-semibold text-dnd-gold mb-2">Ability Scores</h2>
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
    {#each abilities as a}
      <div class="card">
        <div class="font-display text-2xl font-bold text-dnd-gold">{a.abbr}</div>
        <div class="text-sm font-semibold text-dnd-text">{a.name}</div>
        <p class="text-xs text-dnd-text-muted mt-1 leading-relaxed">{a.desc}</p>
        <div class="mt-2">
          <span class="tag text-[10px] bg-dnd-border/40 text-dnd-text-muted">{a.skills}</span>
        </div>
      </div>
    {/each}
  </div>

  <h2 class="font-display text-lg font-semibold text-dnd-gold mb-2">Combat Rules</h2>
  <div class="space-y-1.5 mb-6">
    {#each combatRules as rule (rule.name)}
      <button
        class="w-full card text-left"
        onclick={() => expandedRule = expandedRule === rule.name ? null : rule.name}
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-semibold text-dnd-text">{rule.name}</span>
          <span class="text-dnd-gold text-xs w-4 text-center">{expandedRule === rule.name ? '−' : '+'}</span>
        </div>
        {#if expandedRule === rule.name}
          <div class="mt-2 pt-2 border-t border-dnd-border fade-in">
            <ContentRenderer entries={rule.entries} />
          </div>
        {/if}
      </button>
    {/each}
  </div>

  <h2 class="font-display text-lg font-semibold text-dnd-gold mb-2">Conditions</h2>
  <input type="text" bind:value={conditionSearch} placeholder="Search conditions..." class="w-full mb-2" />

  <div class="flex flex-wrap gap-1.5 mb-2">
    <button class="filter-btn text-xs" class:active={selectedSource === null} onclick={() => selectedSource = null}>All</button>
    {#each sources as src}
      <button
        class="filter-btn text-xs"
        class:active={selectedSource === src}
        onclick={() => selectedSource = selectedSource === src ? null : src}
      >
        {src ? formatSourceShort(src) : 'All'}
      </button>
    {/each}
  </div>

  <p class="text-xs text-dnd-text-muted mb-2">
    {filteredConditions.length} condition{filteredConditions.length !== 1 ? 's' : ''}
  </p>

  <SourceLegend codes={filteredConditions.map((c: any) => c.source)} />

  <div class="space-y-1.5">
    {#each filteredConditions as cond (cond.name + cond.source)}
      <button
        class="w-full card text-left"
        onclick={() => expandedCondition = expandedCondition === `${cond.name}${cond.source}` ? null : `${cond.name}${cond.source}`}
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <span class="font-semibold text-sm text-dnd-text">{cond.name}</span>
            <span class="text-[10px] text-dnd-text-muted ml-1.5">{formatSource(cond.source)}</span>
          </div>
          <span class="text-dnd-gold text-xs w-4 text-center shrink-0">{expandedCondition === `${cond.name}${cond.source}` ? '−' : '+'}</span>
        </div>
        {#if expandedCondition === `${cond.name}${cond.source}`}
          <div class="mt-2 pt-2 border-t border-dnd-border fade-in">
            {#if cond.page}
              <p class="text-[10px] text-dnd-text-muted mb-2">Page {cond.page}</p>
            {/if}
            <ContentRenderer entries={cond.entries} />
          </div>
        {/if}
      </button>
    {/each}
  </div>
</div>