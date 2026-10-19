<script lang="ts">
  import ContentRenderer from '$lib/components/ContentRenderer.svelte';
  import EditionToggle from '$lib/components/EditionToggle.svelte';
  import HomebrewToggle from '$lib/components/HomebrewToggle.svelte';
  import SourceLegend from '$lib/components/SourceLegend.svelte';
  import { formatSource, formatEquipType, editionOf, dedupeRecords, isHomebrew } from '$lib/utils/dnd';
  import equipmentData from '$lib/data/equipment.json';
  import itemsData from '$lib/data/items.json';

  type Kind = 'all' | 'gear' | 'magic';

  let search = $state('');
  let selectedType = $state<string | null>(null);
  let selectedRarity = $state<string | null>(null);
  let selectedEdition = $state<'classic' | 'one'>('classic');
  let showHomebrew = $state(false);
  let expanded = $state<string | null>(null);
  let kind = $state<Kind>('all');

  const gear = $derived(
    (equipmentData as any[]).map((e) => ({ ...e, kind: 'gear' as const }))
  );
  // Magic items: only entries that actually are magic (have a rarity).
  const magic = $derived(
    (itemsData as any[])
      .filter((i: any) => i.rarity && i.rarity !== 'none')
      .map((i: any) => ({ ...i, kind: 'magic' as const }))
  );

  const all = $derived([...gear, ...magic]);

  const types = $derived.by(() => {
    const t = new Set<string>();
    gear.forEach((i: any) => t.add(i.type));
    return [null, ...Array.from(t).sort()];
  });

  const rarities = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];

  const rarityColors: Record<string, string> = {
    'common': 'bg-gray-700 text-gray-300',
    'uncommon': 'bg-green-900/50 text-green-300',
    'rare': 'bg-blue-900/50 text-blue-300',
    'very rare': 'bg-purple-900/50 text-purple-300',
    'legendary': 'bg-orange-900/50 text-orange-300',
    'artifact': 'bg-red-900/50 text-red-300'
  };

  const filtered = $derived.by(() => {
    let result = all;
    if (kind === 'gear') result = result.filter((i: any) => i.kind === 'gear');
    else if (kind === 'magic') result = result.filter((i: any) => i.kind === 'magic');
    if (!showHomebrew) result = result.filter((i: any) => !isHomebrew(i));
    if (search) result = result.filter((i: any) => i.name.toLowerCase().includes(search.toLowerCase()));
    if (selectedType) result = result.filter((i: any) => i.kind === 'gear' && i.type === selectedType);
    if (selectedRarity) result = result.filter((i: any) => i.kind === 'magic' && i.rarity === selectedRarity);
    result = result.filter((i: any) => editionOf(i) === selectedEdition);
    result = dedupeRecords(result, selectedEdition);
    return result;
  });
</script>

<svelte:head><title>Equipment - D&D Companion</title></svelte:head>

<div class="px-4 pt-4 pb-4 max-w-3xl mx-auto">
  <h1 class="font-display text-2xl font-bold text-dnd-gold mb-3">Equipment</h1>

  <EditionToggle value={selectedEdition} onchange={(v) => selectedEdition = v} />
  <div class="flex justify-end mb-2">
    <HomebrewToggle value={showHomebrew} onchange={(v) => showHomebrew = v} />
  </div>

  <input type="text" bind:value={search} placeholder="Search equipment and magic items..." class="w-full mb-3" />

  <div class="mb-3">
    <p class="text-xs text-dnd-text-muted mb-1">Show</p>
    <div class="flex flex-wrap gap-1.5">
      {#each [['all', 'All'], ['gear', 'Gear'], ['magic', 'Magic Items']] as [k, label]}
        <button class="filter-btn text-xs" class:active={kind === k} onclick={() => { kind = k as Kind; selectedType = null; selectedRarity = null; }}>
          {label}
        </button>
      {/each}
    </div>
  </div>

  {#if kind !== 'magic'}
    <div class="mb-3">
      <p class="text-xs text-dnd-text-muted mb-1">Type</p>
      <div class="flex flex-wrap gap-1.5">
        {#each types as t}
          <button class="filter-btn text-xs" class:active={selectedType === t} onclick={() => { selectedType = t; kind = 'gear'; }}>
            {t ? formatEquipType(t) : 'All'}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if kind !== 'gear'}
    <div class="mb-3">
      <p class="text-xs text-dnd-text-muted mb-1">Rarity</p>
      <div class="flex flex-wrap gap-1.5">
        {#each rarities as r}
          <button class="filter-btn text-xs {selectedRarity === r ? 'active' : ''}" onclick={() => { selectedRarity = selectedRarity === r ? null : r; kind = 'magic'; }}>
            {r}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <p class="text-xs text-dnd-text-muted mb-2">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>

  <SourceLegend codes={filtered.map((i: any) => i.source)} />

  <div class="space-y-1.5">
    {#each filtered as item (item.kind + item.name + item.source)}
      <button class="w-full card text-left" onclick={() => expanded = expanded === item.name ? null : item.name}>
        <div class="flex justify-between items-start gap-2">
          <div class="min-w-0">
            <span class="font-semibold text-sm text-dnd-text">{item.name}</span>
            {#if item.kind === 'magic'}
              <span class="tag text-[10px] ml-2 {rarityColors[item.rarity] || 'bg-dnd-dark text-dnd-text-muted'}">{item.rarity}</span>
              {#if item.reqAttune}
                <span class="tag text-[10px] bg-purple-900/50 text-purple-300 ml-1">attunement</span>
              {/if}
            {:else}
              <span class="text-[10px] text-dnd-text-muted ml-2">{formatEquipType(item.type)}</span>
            {/if}
            <span class="text-[10px] text-dnd-text-muted ml-2">{formatSource(item.source)}</span>
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
        {#if item.kind === 'magic' && item.reqAttune}
          <p class="text-xs text-dnd-text-muted">
            {typeof item.reqAttune === 'string' ? `Requires attunement${item.reqAttune.startsWith('by') ? ' ' + item.reqAttune : ''}` : 'Requires attunement'}
          </p>
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
