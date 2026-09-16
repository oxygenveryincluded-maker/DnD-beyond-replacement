<script lang="ts">
  import ContentRenderer from '$lib/components/ContentRenderer.svelte';
  import { formatSchool, getSchoolColor, levelText, formatTime, formatRange, formatComponents, formatDuration, formatSource } from '$lib/utils/dnd';
  import spellsData from '$lib/data/spells.json';
  import { page } from '$app/state';
  
  let spells: any[] = $state(spellsData);
  let search = $state('');
  let selectedLevel = $state<number | null>(null);
  let selectedSchool = $state<string | null>(null);
  let selectedClass = $state<string | null>(null);
  let selectedSource = $state<string | null>(null);
  let expandedSpell = $state<any | null>(null);
  
  const urlSearch = $derived(page.url.searchParams.get('search') || '');
  
  const classes = ['Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard','Artificer'];
  const levels = [null,0,1,2,3,4,5,6,7,8,9];
  const schools = [null,'A','C','D','E','V','I','N','T'];
  const sources = [null,'PHB','XPHB','TCE','XGE','BGG'];
  
  $effect(() => { search = urlSearch; });
  
  const filtered = $derived.by(() => {
    let result = spells;
    const q = (search || '').toLowerCase();
    if (q) result = result.filter(s => s.name.toLowerCase().includes(q));
    if (selectedLevel !== null) result = result.filter(s => s.level === selectedLevel);
    if (selectedSchool) result = result.filter(s => s.school === selectedSchool);
    if (selectedSource) result = result.filter(s => s.source === selectedSource);
    return result;
  });
  
  function toggleLevel(l: number | null) { selectedLevel = selectedLevel === l ? null : l; }
  function toggleSchool(s: string | null) { selectedSchool = selectedSchool === s ? null : s; }
  function toggleSource(s: string | null) { selectedSource = selectedSource === s ? null : s; }
</script>

<svelte:head><title>Spells - D&D Companion</title></svelte:head>

<div class="px-4 pt-4 pb-4 max-w-3xl mx-auto">
  <h1 class="font-display text-2xl font-bold text-dnd-gold mb-4">Spells</h1>
  
  <input type="text" bind:value={search} placeholder="Search spells..." class="w-full mb-3" />
  
  <div class="mb-3">
    <p class="text-xs text-dnd-text-muted mb-1">Source</p>
    <div class="flex flex-wrap gap-1.5">
      {#each sources as src}
        <button class="filter-btn text-xs" class:active={selectedSource === src} onclick={() => toggleSource(src)}>
          {src ? formatSource(src) : 'All'}
        </button>
      {/each}
    </div>
  </div>
  
  <div class="mb-3">
    <p class="text-xs text-dnd-text-muted mb-1">Level</p>
    <div class="flex flex-wrap gap-1.5">
      {#each levels as l}
        <button class="filter-btn text-xs" class:active={selectedLevel === l} onclick={() => toggleLevel(l)}>
          {l === null ? 'All' : levelText(l)}
        </button>
      {/each}
    </div>
  </div>
  
  <div class="mb-3">
    <p class="text-xs text-dnd-text-muted mb-1">School</p>
    <div class="flex flex-wrap gap-1.5">
      {#each schools as s}
        <button class="filter-btn text-xs" class:active={selectedSchool === s} onclick={() => toggleSchool(s)}>
          {s ? formatSchool(s) : 'All'}
        </button>
      {/each}
    </div>
  </div>
  
  <p class="text-xs text-dnd-text-muted mb-2">{filtered.length} spell{filtered.length !== 1 ? 's' : ''}</p>
  
  <div class="space-y-2">
    {#each filtered as spell (spell.name + spell.source)}
      <button class="w-full card text-left" onclick={() => expandedSpell = expandedSpell?.name === spell.name ? null : spell}>
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold text-dnd-text text-sm">{spell.name}</span>
              <span class="tag text-[10px] {getSchoolColor(spell.school)}">{formatSchool(spell.school)}</span>
              {#if spell.concentration}<span class="tag text-[10px] bg-yellow-900/50 text-yellow-300">C</span>{/if}
              {#if spell.ritual}<span class="tag text-[10px] bg-blue-900/50 text-blue-300">R</span>{/if}
            </div>
            <p class="text-xs text-dnd-text-muted mt-0.5">{levelText(spell.level)} &middot; {formatSource(spell.source)}</p>
          </div>
          <span class="text-dnd-text-muted text-xs shrink-0">{formatTime(spell.time)}</span>
        </div>
        
        {#if expandedSpell?.name === spell.name}
          <div class="mt-3 pt-3 border-t border-dnd-border fade-in">
            <div class="grid grid-cols-2 gap-2 text-xs mb-3">
              <div><span class="text-dnd-text-muted">Casting Time:</span> {formatTime(spell.time)}</div>
              <div><span class="text-dnd-text-muted">Range:</span> {formatRange(spell.range)}</div>
              <div><span class="text-dnd-text-muted">Components:</span> {formatComponents(spell.components)}</div>
              <div><span class="text-dnd-text-muted">Duration:</span> {formatDuration(spell.duration)}</div>
            </div>
            {#if spell.damageInflict?.length}
              <div class="flex items-center gap-1 mb-2">
                <span class="text-xs text-dnd-text-muted">Damage:</span>
                {#each spell.damageInflict as d}
                  <span class="tag text-[10px] bg-red-900/50 text-red-300">{d}</span>
                {/each}
              </div>
            {/if}
            {#if spell.savingThrow?.length}
              <div class="flex items-center gap-1 mb-2">
                <span class="text-xs text-dnd-text-muted">Save:</span>
                {#each spell.savingThrow as s}
                  <span class="tag text-[10px] bg-orange-900/50 text-orange-300">{s}</span>
                {/each}
              </div>
            {/if}
            <ContentRenderer entries={spell.entries} />
            {#if spell.entriesHigherLevel?.length}
              <h4 class="mt-3 font-display text-sm font-semibold text-dnd-gold">At Higher Levels</h4>
              <ContentRenderer entries={spell.entriesHigherLevel} />
            {/if}
          </div>
        {/if}
      </button>
    {/each}
  </div>
</div>
