<script lang="ts">
  import ContentRenderer from '$lib/components/ContentRenderer.svelte';
  import EditionToggle from '$lib/components/EditionToggle.svelte';
  import HomebrewToggle from '$lib/components/HomebrewToggle.svelte';
  import SourceLegend from '$lib/components/SourceLegend.svelte';
  import { formatSource, editionOf, dedupeRecords, isHomebrew } from '$lib/utils/dnd';
  import featsData from '$lib/data/feats.json';

  let search = $state('');
  let selectedCategory = $state<string | null>(null);
  let selectedSource = $state<string | null>(null);
  let selectedEdition = $state<'classic' | 'one'>('classic');
  let showHomebrew = $state(false);
  let expanded = $state<string | null>(null);

  const categories = [
    { code: 'G', label: 'General' },
    { code: 'O', label: 'Optional' },
    { code: 'FS', label: 'Fighting Style' },
    { code: 'EB', label: 'Epic Boon' },
    { code: 'DG', label: 'Dark Gift' },
    { code: 'D', label: 'Dragonmark' },
  ];

  const sources = $derived.by(() => {
    const s = new Set<string>();
    (featsData as any[]).forEach((f: any) => s.add(f.source));
    return [null, ...Array.from(s).sort()];
  });

  const categoryColors: Record<string, string> = {
    G: 'bg-gray-700/60 text-gray-300',
    O: 'bg-teal-900/50 text-teal-300',
    FS: 'bg-red-900/50 text-red-300',
    EB: 'bg-amber-900/50 text-amber-300',
    DG: 'bg-purple-900/50 text-purple-300',
    D: 'bg-blue-900/50 text-blue-300',
  };

  const filtered = $derived.by(() => {
    let result = featsData as any[];
    if (!showHomebrew) result = result.filter((f: any) => !isHomebrew(f));
    if (search) result = result.filter((f: any) => f.name.toLowerCase().includes(search.toLowerCase()));
    if (selectedCategory) result = result.filter((f: any) => f.category === selectedCategory);
    if (selectedSource) result = result.filter((f: any) => f.source === selectedSource);
    result = result.filter((f: any) => editionOf(f) === selectedEdition);
    result = dedupeRecords(result, selectedEdition);
    return result;
  });

  function formatAbility(ability: any[]): string {
    if (!ability?.length) return '';
    return ability
      .map((a: any) => {
        const entries = Object.entries(a).filter(([k]) => !['choose', 'hidden', 'max'].includes(k));
        return entries.map(([k, v]) => `${k.toUpperCase()} +${v}`).join(', ');
      })
      .filter(Boolean)
      .join(', ');
  }

  function formatPrereqs(prereqs: any[]): string {
    if (!prereqs?.length) return '';
    return prereqs.map((p: any) => {
      if (p.level) return `Level ${p.level}`;
      if (p.feat) return Array.isArray(p.feat) ? p.feat.join(', ') : p.feat;
      if (p.ability) return Array.isArray(p.ability) ? p.ability.join(', ') : p.ability;
      if (p.campaign) return Array.isArray(p.campaign) ? p.campaign.join(', ') : p.campaign;
      if (p.race) return Array.isArray(p.race) ? p.race.join(', ') : p.race;
      if (p.other) return p.other;
      if (p.otherSummary) return p.otherSummary;
      if (p.proficiency) return Array.isArray(p.proficiency) ? p.proficiency.join(', ') : p.proficiency;
      if (p.spellcastingFeature) return 'Spellcasting';
      if (p.spellcasting) return 'Spellcasting';
      if (p.spellcasting2020) return 'Spellcasting';
      if (p.background) return Array.isArray(p.background) ? p.background.join(', ') : p.background;
      if (p.feature) return Array.isArray(p.feature) ? p.feature.join(', ') : p.feature;
      if (p.featCategory) return `Feats from ${p.featCategory}`;
      return '';
    }).filter(Boolean).join('; ');
  }

  function toggleCategory(cat: string) {
    selectedCategory = selectedCategory === cat ? null : cat;
  }

  function toggleSource(src: string | null) {
    selectedSource = selectedSource === src ? null : src;
  }
</script>

<svelte:head><title>Feats - D&D Companion</title></svelte:head>

<div class="px-4 pt-4 pb-4 max-w-3xl mx-auto">
  <h1 class="font-display text-2xl font-bold text-dnd-gold mb-3">Feats</h1>

  <EditionToggle value={selectedEdition} onchange={(v) => selectedEdition = v} />
  <div class="flex justify-end mb-2">
    <HomebrewToggle value={showHomebrew} onchange={(v) => showHomebrew = v} />
  </div>

  <input type="text" bind:value={search} placeholder="Search feats..." class="w-full mb-3" />

  <div class="mb-3">
    <p class="text-xs text-dnd-text-muted mb-1">Category</p>
    <div class="flex flex-wrap gap-1.5">
      <button class="filter-btn text-xs" class:active={selectedCategory === null} onclick={() => selectedCategory = null}>All</button>
      {#each categories as cat}
        <button class="filter-btn text-xs" class:active={selectedCategory === cat.code} onclick={() => toggleCategory(cat.code)}>
          {cat.label}
        </button>
      {/each}
    </div>
  </div>

  <div class="mb-3">
    <p class="text-xs text-dnd-text-muted mb-1">Source</p>
    <div class="flex flex-wrap gap-1.5">
      <button class="filter-btn text-xs" class:active={selectedSource === null} onclick={() => selectedSource = null}>All</button>
      {#each sources as src}
        <button class="filter-btn text-xs" class:active={selectedSource === src} onclick={() => toggleSource(src)}>
          {src ? formatSource(src) : 'All'}
        </button>
      {/each}
    </div>
  </div>

  <p class="text-xs text-dnd-text-muted mb-2">{filtered.length} feat{filtered.length !== 1 ? 's' : ''}</p>

  <SourceLegend codes={filtered.map((f: any) => f.source)} />

  <div class="space-y-1.5">
    {#each filtered as feat (feat.name + feat.source)}
      <button class="w-full card text-left" onclick={() => expanded = expanded === `${feat.name}${feat.source}` ? null : `${feat.name}${feat.source}`}>
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <span class="font-semibold text-sm text-dnd-text">{feat.name}</span>
            <div class="flex items-center gap-1 mt-0.5 flex-wrap">
              {#if feat.category}
                <span class="tag text-[10px] {categoryColors[feat.category] || 'bg-gray-700 text-gray-300'}">{categories.find(c => c.code === feat.category)?.label || feat.category}</span>
              {/if}
              <span class="text-[10px] text-dnd-text-muted">{formatSource(feat.source)}</span>
            </div>
            {#if formatAbility(feat.ability)}
              <p class="text-[10px] text-dnd-text-muted mt-0.5">{formatAbility(feat.ability)}</p>
            {/if}
          </div>
        </div>
        {#if expanded === `${feat.name}${feat.source}`}
          <div class="mt-2 pt-2 border-t border-dnd-border fade-in">
            {#if formatPrereqs(feat.prerequisite)}
              <p class="text-xs text-dnd-text-muted mb-2">
                <span class="font-semibold text-dnd-gold">Prerequisites:</span> {formatPrereqs(feat.prerequisite)}
              </p>
            {/if}
            {#if feat.page}
              <p class="text-[10px] text-dnd-text-muted mb-2">Page {feat.page}</p>
            {/if}
            <ContentRenderer entries={feat.entries} />
          </div>
        {/if}
      </button>
    {/each}
  </div>
</div>