<script lang="ts">
  import ContentRenderer from '$lib/components/ContentRenderer.svelte';
  import { formatSource } from '$lib/utils/dnd';
  import itemsData from '$lib/data/items.json';
  
  let search = $state('');
  let selectedRarity = $state<string | null>(null);
  let selectedSource = $state<string | null>(null);
  let showAttunement = $state<boolean | null>(null);
  let expanded = $state<string | null>(null);
  
  const magicItems = $derived((itemsData as any[]).filter((i: any) => i.rarity && i.rarity !== 'none'));
  
  const rarities = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];
  const sources = $derived.by(() => {
    const s = new Set<string>();
    magicItems.forEach((i: any) => s.add(i.source));
    return [null, ...Array.from(s).sort()];
  });
  
  const rarityColors: Record<string, string> = {
    'common': 'bg-gray-700 text-gray-300',
    'uncommon': 'bg-green-900/50 text-green-300',
    'rare': 'bg-blue-900/50 text-blue-300',
    'very rare': 'bg-purple-900/50 text-purple-300',
    'legendary': 'bg-orange-900/50 text-orange-300',
    'artifact': 'bg-red-900/50 text-red-300'
  };
  
  const filtered = $derived.by(() => {
    let result = magicItems;
    if (search) result = result.filter((i: any) => i.name.toLowerCase().includes(search.toLowerCase()));
    if (selectedRarity) result = result.filter((i: any) => i.rarity === selectedRarity);
    if (selectedSource) result = result.filter((i: any) => i.source === selectedSource);
    if (showAttunement !== null) {
      result = showAttunement 
        ? result.filter((i: any) => i.reqAttune)
        : result.filter((i: any) => !i.reqAttune);
    }
    return result;
  });
</script>

<svelte:head><title>Magic Items - D&D Companion</title></svelte:head>

<div class="px-4 pt-4 pb-4 max-w-3xl mx-auto">
  <h1 class="font-display text-2xl font-bold text-dnd-gold mb-3">Magic Items</h1>
  
  <input type="text" bind:value={search} placeholder="Search magic items..." class="w-full mb-3" />
  
  <div class="flex flex-wrap gap-1.5 mb-2">
    <button class="filter-btn text-xs" class:active={selectedRarity === null} onclick={() => selectedRarity = null}>All</button>
    {#each rarities as r}
      <button class="filter-btn text-xs" class:active={selectedRarity === r} onclick={() => selectedRarity = r}>{r}</button>
    {/each}
  </div>
  
  <div class="flex gap-1.5 mb-3">
    <button class="filter-btn text-xs" class:active={showAttunement === null} onclick={() => showAttunement = null}>Any</button>
    <button class="filter-btn text-xs" class:active={showAttunement === true} onclick={() => showAttunement = showAttunement === true ? null : true}>Attunement</button>
    <button class="filter-btn text-xs" class:active={showAttunement === false} onclick={() => showAttunement = showAttunement === false ? null : false}>No Attunement</button>
  </div>
  
  <p class="text-xs text-dnd-text-muted mb-2">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>
  
  <div class="space-y-1.5">
    {#each filtered as item (item.name + item.source + item.rarity)}
      <button class="w-full card text-left" onclick={() => expanded = expanded === `${item.name}${item.source}` ? null : `${item.name}${item.source}`}>
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <span class="font-semibold text-sm text-dnd-text">{item.name}</span>
            <div class="flex items-center gap-1 mt-0.5 flex-wrap">
              <span class="tag text-[10px] {rarityColors[item.rarity] || ''}">{item.rarity}</span>
              {#if item.reqAttune}
                <span class="tag text-[10px] bg-yellow-900/50 text-yellow-300">Attunement</span>
              {/if}
              <span class="text-[10px] text-dnd-text-muted">{formatSource(item.source)}</span>
            </div>
          </div>
        </div>
        {#if expanded === `${item.name}${item.source}` && item.entries?.length}
          <div class="mt-2 pt-2 border-t border-dnd-border fade-in">
            <ContentRenderer entries={item.entries} />
          </div>
        {/if}
      </button>
    {/each}
  </div>
</div>
