<script lang="ts">
  import { base } from '$app/paths';
  import { formatSource, dedupeRecords, isHomebrew } from '$lib/utils/dnd';
  import EditionToggle from '$lib/components/EditionToggle.svelte';
  import HomebrewToggle from '$lib/components/HomebrewToggle.svelte';
  import SourceLegend from '$lib/components/SourceLegend.svelte';
  import classesData from '$lib/data/classes.json';
  
  let edition = $state<'classic' | 'one'>('classic');
  let showHomebrew = $state(false);
  
  const classes = $derived(
    dedupeRecords(
      (classesData as any[]).filter((c) => c.edition === edition && (showHomebrew || !isHomebrew(c))),
      edition
    )
  );
  
  const classColors: Record<string, string> = {
    'Barbarian': 'from-red-900/60 to-rose-950/60',
    'Bard': 'from-purple-900/60 to-violet-950/60',
    'Cleric': 'from-yellow-900/60 to-amber-950/60',
    'Druid': 'from-green-900/60 to-emerald-950/60',
    'Fighter': 'from-slate-800/60 to-gray-900/60',
    'Monk': 'from-sky-900/60 to-cyan-950/60',
    'Paladin': 'from-amber-900/60 to-yellow-950/60',
    'Ranger': 'from-emerald-900/60 to-teal-950/60',
    'Rogue': 'from-gray-800/60 to-zinc-900/60',
    'Sorcerer': 'from-rose-900/60 to-pink-950/60',
    'Warlock': 'from-indigo-900/60 to-violet-950/60',
    'Wizard': 'from-blue-900/60 to-indigo-950/60',
    'Artificer': 'from-orange-900/60 to-amber-950/60',
  };
</script>

<svelte:head><title>Classes - D&D Companion</title></svelte:head>

<div class="px-4 pt-4 pb-4 max-w-3xl mx-auto">
  <h1 class="font-display text-2xl font-bold text-dnd-gold mb-3">Classes</h1>
  
  <div class="flex gap-1.5 mb-4">
    <EditionToggle value={edition} onchange={(v) => edition = v} />
  </div>

  <div class="flex justify-end mb-2">
    <HomebrewToggle value={showHomebrew} onchange={(v) => showHomebrew = v} />
  </div>

  <SourceLegend codes={classes.map((c: any) => c.source)} />
  
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
    {#each classes as cls (cls.name + cls.source)}
      <a href="{base}/classes/{cls.name.toLowerCase()}" class="card bg-gradient-to-br {classColors[cls.name] || 'from-gray-800 to-gray-900'} hover:border-dnd-gold group">
        <h3 class="font-display font-semibold text-dnd-text group-hover:text-dnd-gold transition-colors">{cls.name}</h3>
        <p class="text-[10px] text-dnd-text-muted">{formatSource(cls.source)} · {cls.edition === 'one' ? '2024' : '2014'}</p>
        <p class="text-[10px] text-dnd-text-muted mt-1">HD: d{cls.hitDice?.faces || '?'}</p>
      </a>
    {/each}
  </div>
</div>
