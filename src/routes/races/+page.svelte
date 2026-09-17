<script lang="ts">
  import ContentRenderer from '$lib/components/ContentRenderer.svelte';
  import EditionToggle from '$lib/components/EditionToggle.svelte';
  import { formatSource, dedupeRecords } from '$lib/utils/dnd';
  import racesData from '$lib/data/races.json';

  let search = $state('');
  let selectedEdition = $state<'classic' | 'one'>('classic');
  let expanded = $state<string | null>(null);

  const filtered = $derived.by(() => {
    let result = racesData as any[];
    if (search) result = result.filter((r: any) => r.name.toLowerCase().includes(search.toLowerCase()));
    result = result.filter((r: any) => r.edition === selectedEdition);
    result = dedupeRecords(result, selectedEdition);
    return result;
  });

  function formatSize(size: string[] | string): string {
    const sizes: Record<string, string> = { S: 'Small', M: 'Medium', L: 'Large', V: 'Variable' };
    if (Array.isArray(size)) return size.map(s => sizes[s] || s).join(', ');
    return sizes[size] || size;
  }

  function formatSpeed(speed: any): string {
    if (!speed) return '';
    const parts: string[] = [];
    if (speed.walk) parts.push(`${speed.walk} ft`);
    if (speed.fly) parts.push(`${speed.fly} ft fly`);
    if (speed.swim) parts.push(`${speed.swim} ft swim`);
    if (speed.climb) parts.push(`${speed.climb} ft climb`);
    return parts.join(', ');
  }

  function formatAbility(ability: any[]): string {
    if (!ability?.length) return '';
    return ability.map(a => Object.entries(a).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(', ')).join(' / ');
  }
</script>

<svelte:head><title>Races - D&D Companion</title></svelte:head>

<div class="px-4 pt-4 pb-4 max-w-3xl mx-auto">
  <h1 class="font-display text-2xl font-bold text-dnd-gold mb-3">Races</h1>

  <input type="text" bind:value={search} placeholder="Search races..." class="w-full mb-3" />

  <div class="mb-3">
    <p class="text-xs text-dnd-text-muted mb-1">Edition</p>
    <EditionToggle value={selectedEdition} onchange={(v) => selectedEdition = v} />
  </div>

  <p class="text-xs text-dnd-text-muted mb-2">{filtered.length} race{filtered.length !== 1 ? 's' : ''}</p>

  <div class="space-y-1.5">
    {#each filtered as race (race.name + race.source)}
      <button class="w-full card text-left" onclick={() => expanded = expanded === `${race.name}${race.source}` ? null : `${race.name}${race.source}`}>
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <span class="font-semibold text-sm text-dnd-text">{race.name}</span>
            <div class="flex items-center gap-1 mt-0.5 flex-wrap">
              <span class="tag text-[10px] bg-gray-700/60 text-gray-300">{race.edition === 'one' ? '2024' : '2014'}</span>
              <span class="text-[10px] text-dnd-text-muted">{formatSource(race.source)}</span>
            </div>
            <p class="text-[10px] text-dnd-text-muted mt-0.5">
              {formatSize(race.size)} &middot; {formatSpeed(race.speed)}
              {#if formatAbility(race.ability)} &middot; {formatAbility(race.ability)}{/if}
            </p>
          </div>
        </div>
        {#if expanded === `${race.name}${race.source}`}
          <div class="mt-2 pt-2 border-t border-dnd-border fade-in">
            {#if race.subraces?.length}
              <div class="mb-3">
                <h4 class="font-display text-sm font-semibold text-dnd-gold mb-1">Subraces</h4>
                <div class="space-y-1">
                  {#each race.subraces as sub}
                    <div class="p-2 rounded-lg bg-dnd-darker/50">
                      <span class="font-semibold text-xs text-dnd-text">{sub.name}</span>
                      {#if sub.source}
                        <span class="text-[10px] text-dnd-text-muted ml-1">{formatSource(sub.source)}</span>
                      {/if}
                      {#if sub.entries?.length}
                        <div class="mt-1">
                          <ContentRenderer entries={sub.entries} />
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
            {#if race.traits?.length}
              <div class="mb-3">
                <h4 class="font-display text-sm font-semibold text-dnd-gold mb-1">Traits</h4>
                <div class="flex flex-wrap gap-1">
                  {#each race.traits as trait}
                    <span class="tag text-[10px] bg-dnd-accent/20 text-dnd-accent">{trait}</span>
                  {/each}
                </div>
              </div>
            {/if}
            {#if race.languages?.length}
              <div class="mb-3">
                <h4 class="font-display text-sm font-semibold text-dnd-gold mb-1">Languages</h4>
                <div class="flex flex-wrap gap-1">
                  {#each race.languages as lang}
                    {#each Object.keys(lang) as l}
                      <span class="tag text-[10px] bg-green-900/50 text-green-300">{l}</span>
                    {/each}
                  {/each}
                </div>
              </div>
            {/if}
            {#if race.page}
              <p class="text-[10px] text-dnd-text-muted mb-2">Page {race.page}</p>
            {/if}
            <ContentRenderer entries={race.entries} />
          </div>
        {/if}
      </button>
    {/each}
  </div>
</div>