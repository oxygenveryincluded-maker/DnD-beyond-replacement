<script lang="ts">
  import CollapsibleEntries from '$lib/components/CollapsibleEntries.svelte';
  import EditionToggle from '$lib/components/EditionToggle.svelte';
  import { formatSource, editionOf, dedupeRecords } from '$lib/utils/dnd';
  import backgroundsData from '$lib/data/backgrounds.json';

  let search = $state('');
  let selectedSource = $state<string | null>(null);
  let selectedEdition = $state<'classic' | 'one'>('classic');
  let expanded = $state<string | null>(null);

  const sources = $derived.by(() => {
    const s = new Set<string>();
    (backgroundsData as any[]).forEach((b: any) => s.add(b.source));
    return [null, ...Array.from(s).sort()];
  });

  const filtered = $derived.by(() => {
    let result = backgroundsData as any[];
    if (search) result = result.filter((b: any) => b.name.toLowerCase().includes(search.toLowerCase()));
    if (selectedSource) result = result.filter((b: any) => b.source === selectedSource);
    result = result.filter((b: any) => editionOf(b) === selectedEdition);
    result = dedupeRecords(result, selectedEdition);
    return result;
  });

  function formatSkills(profs: any[]): string {
    if (!profs?.length) return '';
    return profs.map(p => Object.keys(p).join(', ')).join(', ');
  }

  function formatTools(profs: any[]): string {
    if (!profs?.length) return '';
    return profs.map(p => Object.keys(p).join(', ')).join(', ');
  }

  function formatLanguages(profs: any[]): string {
    if (!profs?.length) return '';
    return profs.map(p => {
      if (p.anyStandard) return `${p.anyStandard} of your choice`;
      return Object.keys(p).join(', ');
    }).join(', ');
  }

  function formatFeats(feats: any[]): string {
    if (!feats?.length) return '';
    return feats.map(f => Object.keys(f).join(', ')).join(', ');
  }
</script>

<svelte:head><title>Backgrounds - D&D Companion</title></svelte:head>

<div class="px-4 pt-4 pb-4 max-w-3xl mx-auto">
  <h1 class="font-display text-2xl font-bold text-dnd-gold mb-3">Backgrounds</h1>

  <EditionToggle value={selectedEdition} onchange={(v) => selectedEdition = v} />

  <input type="text" bind:value={search} placeholder="Search backgrounds..." class="w-full mb-3" />

  <div class="mb-3">
    <p class="text-xs text-dnd-text-muted mb-1">Source</p>
    <div class="flex flex-wrap gap-1.5">
      <button class="filter-btn text-xs" class:active={selectedSource === null} onclick={() => selectedSource = null}>All</button>
      {#each sources as src}
        <button class="filter-btn text-xs" class:active={selectedSource === src} onclick={() => selectedSource = selectedSource === src ? null : src}>
          {src ? formatSource(src) : 'All'}
        </button>
      {/each}
    </div>
  </div>

  <p class="text-xs text-dnd-text-muted mb-2">{filtered.length} background{filtered.length !== 1 ? 's' : ''}</p>

  <div class="space-y-1.5">
    {#each filtered as bg (bg.name + bg.source)}
      <button class="w-full card text-left" onclick={() => expanded = expanded === `${bg.name}${bg.source}` ? null : `${bg.name}${bg.source}`}>
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <span class="font-semibold text-sm text-dnd-text">{bg.name}</span>
            <div class="flex items-center gap-1 mt-0.5 flex-wrap">
              <span class="text-[10px] text-dnd-text-muted">{formatSource(bg.source)}</span>
            </div>
          </div>
        </div>
        {#if expanded === `${bg.name}${bg.source}`}
          <div class="mt-2 pt-2 border-t border-dnd-border fade-in">
            <div class="space-y-2 mb-3">
              {#if bg.skillProficiencies?.length}
                <p class="text-xs">
                  <span class="font-semibold text-dnd-gold">Skills:</span>
                  <span class="text-dnd-text">{formatSkills(bg.skillProficiencies)}</span>
                </p>
              {/if}
              {#if bg.toolProficiencies?.length}
                <p class="text-xs">
                  <span class="font-semibold text-dnd-gold">Tools:</span>
                  <span class="text-dnd-text">{formatTools(bg.toolProficiencies)}</span>
                </p>
              {/if}
              {#if bg.languageProficiencies?.length}
                <p class="text-xs">
                  <span class="font-semibold text-dnd-gold">Languages:</span>
                  <span class="text-dnd-text">{formatLanguages(bg.languageProficiencies)}</span>
                </p>
              {/if}
              {#if bg.feats?.length}
                <p class="text-xs">
                  <span class="font-semibold text-dnd-gold">Feat:</span>
                  <span class="text-dnd-text">{formatFeats(bg.feats)}</span>
                </p>
              {/if}
            </div>
            {#if bg.page}
              <p class="text-[10px] text-dnd-text-muted mb-2">Page {bg.page}</p>
            {/if}
            <CollapsibleEntries entries={bg.entries} label="description" />
          </div>
        {/if}
      </button>
    {/each}
  </div>
</div>