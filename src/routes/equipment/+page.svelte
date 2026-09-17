<script lang="ts">
  import ContentRenderer from '$lib/components/ContentRenderer.svelte';
  import EditionToggle from '$lib/components/EditionToggle.svelte';
  import { formatSource, editionOf, dedupeRecords } from '$lib/utils/dnd';
  import equipmentData from '$lib/data/equipment.json';
  
  let search = $state('');
  let selectedType = $state<string | null>(null);
  let selectedEdition = $state<'classic' | 'one'>('classic');
  let expanded = $state<string | null>(null);
  
  const items = $derived(equipmentData as any[]);
  
  const types = $derived.by(() => {
    const t = new Set<string>();
    items.forEach(i => t.add(i.type));
    return [null, ...Array.from(t).sort()];
  });
  
  const filtered = $derived.by(() => {
    let result = items;
    if (search) result = result.filter((i: any) => i.name.toLowerCase().includes(search.toLowerCase()));
    if (selectedType) result = result.filter((i: any) => i.type === selectedType);
    result = result.filter((i: any) => editionOf(i) === selectedEdition);
    result = dedupeRecords(result, selectedEdition);
    return result;
  });
</script>

<svelte:head><title>Equipment - D&D Companion</title></svelte:head>

<div class="px-4 pt-4 pb-4 max-w-3xl mx-auto">
  <h1 class="font-display text-2xl font-bold text-dnd-gold mb-3">Equipment</h1>

  <EditionToggle value={selectedEdition} onchange={(v) => selectedEdition = v} />
  
  <input type="text" bind:value={search} placeholder="Search equipment..." class="w-full mb-3" />
  
  <div class="flex flex-wrap gap-1.5 mb-3">
    {#each types as t}
      <button class="filter-btn text-xs" class:active={selectedType === t} onclick={() => selectedType = t}>
        {t || 'All'}
      </button>
    {/each}
  </div>
  
  <p class="text-xs text-dnd-text-muted mb-2">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>
  
  <div class="space-y-1.5">
    {#each filtered as item (item.name + item.source)}
      <button class="w-full card text-left" onclick={() => expanded = expanded === item.name ? null : item.name}>
        <div class="flex justify-between items-start gap-2">
          <div>
            <span class="font-semibold text-sm text-dnd-text">{item.name}</span>
            <span class="text-[10px] text-dnd-text-muted ml-2">{item.type}</span>
          </div>
          <div class="text-right text-[10px] text-dnd-text-muted shrink-0">
            {#if item.value}<span>{item.value / 100} gp</span>{/if}
            {#if item.weight}<span class="ml-2">{item.weight} lb</span>{/if}
          </div>
        </div>
        {#if item.dmg1}
          <p class="text-xs text-dnd-text-muted">{item.dmg1} {item.dmgType || ''} &middot; {item.weaponCategory || ''} {item.weaponRange || ''}</p>
        {/if}
        {#if item.ac}
          <p class="text-xs text-dnd-text-muted">AC {item.ac}{item.stealthDisadvantage ? ' (Disadvantage on Stealth)' : ''}</p>
        {/if}
        {#if expanded === item.name && item.entries?.length}
          <div class="mt-2 pt-2 border-t border-dnd-border fade-in">
            <ContentRenderer entries={item.entries} />
          </div>
        {/if}
      </button>
    {/each}
  </div>
</div>
