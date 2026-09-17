<script lang="ts">
  import ContentRenderer from '$lib/components/ContentRenderer.svelte';
  import SourceLegend from '$lib/components/SourceLegend.svelte';
  import { formatSource } from '$lib/utils/dnd';
  import invocationsData from '$lib/data/invocations.json';
  import allOptionalData from '$lib/data/optional-features.json';

  let search = $state('');
  let selectedCategory = $state<string | null>(null);
  let expanded = $state<string | null>(null);
  let showAll = $state(false);

  const invocations = $derived(invocationsData as any[]);
  const allOptional = $derived(allOptionalData as any[]);
  const items = $derived(showAll ? allOptional : invocations);

  const categories = $derived.by(() => {
    const c = new Set<string>();
    items.forEach((i: any) => c.add(i.category));
    return [null, ...Array.from(c).sort()];
  });

  const filtered = $derived.by(() => {
    let result = items;
    if (search) result = result.filter((i: any) => i.name.toLowerCase().includes(search.toLowerCase()));
    if (selectedCategory) result = result.filter((i: any) => i.category === selectedCategory);
    return result;
  });
</script>

<svelte:head><title>Eldritch Invocations - D&D Companion</title></svelte:head>

<div class="px-4 pt-4 pb-4 max-w-3xl mx-auto">
  <h1 class="font-display text-2xl font-bold text-dnd-gold mb-1">Eldritch Invocations</h1>
  <p class="text-xs text-dnd-text-muted mb-3">Warlock invocations & other optional features</p>

  <input type="text" bind:value={search} placeholder="Search invocations..." class="w-full mb-3" />

  <div class="flex flex-wrap items-center gap-1.5 mb-3">
    <button class="filter-btn text-xs" class:active={showAll} onclick={() => showAll = !showAll}>
      Show all optional features
    </button>
  </div>

  <div class="flex flex-wrap gap-1.5 mb-3">
    {#each categories as c}
      <button class="filter-btn text-xs" class:active={selectedCategory === c} onclick={() => selectedCategory = c}>
        {c || 'All'}
      </button>
    {/each}
  </div>

  <p class="text-xs text-dnd-text-muted mb-2">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>

  <SourceLegend codes={filtered.map((i: any) => i.source)} />

  <div class="space-y-1.5">
    {#each filtered as inv (inv.name + inv.source + inv.category)}
      <button class="w-full card text-left" onclick={() => expanded = expanded === inv.name + inv.source ? null : inv.name + inv.source}>
        <div class="flex justify-between items-start gap-2">
          <div class="min-w-0">
            <span class="font-semibold text-sm text-dnd-text">{inv.name}</span>
            <div class="flex items-center gap-1 mt-0.5 flex-wrap">
              <span class="tag text-[10px] bg-purple-900/50 text-purple-300">{inv.category}</span>
              <span class="text-[10px] text-dnd-text-muted">{formatSource(inv.source)}</span>
            </div>
          </div>
        </div>
        {#if inv.prerequisite?.length}
          <p class="text-[11px] text-dnd-text-muted mt-1">
            Prerequisite: {inv.prerequisite.map((p: any) => 
              (p.level ? `Level ${p.level}` : '') + (p.spell?.length ? ` ${p.spell.join(', ')}${p.spell.length > 1 ? ' spells' : ' spell'}` : '')
            ).filter(Boolean).join(', ') || 'See entry'}
          </p>
        {/if}
        {#if expanded === inv.name + inv.source && inv.entries?.length}
          <div class="mt-2 pt-2 border-t border-dnd-border fade-in">
            <ContentRenderer entries={inv.entries} />
          </div>
        {/if}
      </button>
    {/each}
  </div>
</div>