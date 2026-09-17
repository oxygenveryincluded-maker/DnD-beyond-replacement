<script lang="ts">
  import { page } from '$app/state';
  import { base } from '$app/paths';
  import { formatSource, isHomebrew } from '$lib/utils/dnd';
  import HomebrewToggle from '$lib/components/HomebrewToggle.svelte';
  import searchIndex from '$lib/data/search-index.json';
  
  const query = $derived(page.url.searchParams.get('q') || '');
  let showHomebrew = $state(false);
  const results = $derived.by(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return searchIndex
      .filter((e: any) => !isHomebrew(e) || showHomebrew)
      .filter((e: any) => e.name.toLowerCase().includes(q))
      .slice(0, 50);
  });
  
  const typeColors: Record<string, string> = {
    'spell': 'bg-purple-900/50 text-purple-300',
    'class': 'bg-red-900/50 text-red-300',
    'subclass': 'bg-red-900/50 text-rose-300',
    'magic-item': 'bg-cyan-900/50 text-cyan-300',
    'equipment': 'bg-amber-900/50 text-amber-300',
    'feat': 'bg-emerald-900/50 text-emerald-300',
    'race': 'bg-orange-900/50 text-orange-300',
    'background': 'bg-pink-900/50 text-pink-300',
    'condition': 'bg-violet-900/50 text-violet-300',
    'optional-feature': 'bg-fuchsia-900/50 text-fuchsia-300'
  };
</script>

<svelte:head><title>Search: {query} - D&D Companion</title></svelte:head>

<div class="px-4 pt-4 pb-4 max-w-3xl mx-auto">
  <h1 class="font-display text-xl font-bold text-dnd-gold mb-1">Search Results</h1>
  <p class="text-sm text-dnd-text-muted mb-4">"{query}" &mdash; {results.length} result{results.length !== 1 ? 's' : ''}</p>
  
  <div class="flex justify-end mb-3">
    <HomebrewToggle value={showHomebrew} onchange={(v) => showHomebrew = v} />
  </div>
  
  <div class="space-y-2">
    {#each results as r (r.type + r.name + r.source)}
      <a href="{base + r.path}?search={encodeURIComponent(r.name)}" class="card block hover:border-dnd-gold">
        <div class="flex items-center gap-2">
          <span class="tag text-[10px] {typeColors[r.type] || 'bg-gray-800 text-gray-300'}">{r.type}</span>
          <span class="font-semibold text-sm text-dnd-text">{r.name}</span>
        </div>
        <p class="text-xs text-dnd-text-muted mt-0.5">{formatSource(r.source)}{r.extra ? ` · ${r.extra}` : ''}</p>
      </a>
    {/each}
  </div>
</div>
