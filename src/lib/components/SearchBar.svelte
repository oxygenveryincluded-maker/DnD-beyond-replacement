<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  
  let { placeholder = 'Search spells, items, classes...', compact = false }: { placeholder?: string; compact?: boolean } = $props();
  let query = $state('');
  
  function handleSearch() {
    if (query.trim()) {
      goto(`${base}/search?q=${encodeURIComponent(query.trim())}`);
    }
  }
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSearch(); }} class="relative {compact ? 'w-full' : 'w-full max-w-md'}">
  <input
    type="text"
    bind:value={query}
    {placeholder}
    style="padding-left: 2.5rem; padding-right: 1rem;"
    class="w-full py-2.5 text-sm bg-dnd-card border border-dnd-border rounded-lg text-dnd-text placeholder-dnd-text-muted focus:border-dnd-gold focus:ring-1 focus:ring-dnd-gold/30"
  />
  <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dnd-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
  </svg>
</form>
