<script lang="ts">
  import { formatSource } from '$lib/utils/dnd';

  interface PickerItem {
    name: string;
    source?: string;
    sub?: string;
    group?: string;
  }

  let {
    label,
    placeholder = 'Search...',
    items,
    displayName,
    onAdd,
    emptyHint
  }: {
    label: string;
    placeholder?: string;
    items: PickerItem[];
    displayName?: (item: any) => string;
    onAdd: (item: any) => void;
    emptyHint?: string;
  } = $props();

  let query = $state('');
  let open = $state(false);

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (q) {
      list = items.filter((it) => {
        const hay = `${it.name || ''} ${it.source || ''} ${it.sub || ''} ${it.group || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return list.slice(0, 60);
  });
</script>

<div class="mt-3">
  <button
    class="filter-btn w-full min-h-[44px] text-sm text-left flex items-center justify-between"
    onclick={() => (open = !open)}
    aria-expanded={open}
  >
    <span class="text-dnd-text-muted">{label}</span>
    <span class="text-dnd-gold text-xs">{open ? '▲ hide' : '▼ browse'}</span>
  </button>

  {#if open}
    <div class="mt-2 bg-dnd-dark rounded-xl border border-dnd-border p-2">
      <input
        type="text"
        value={query}
        oninput={(e) => (query = (e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        class="w-full mb-2"
      />
      <div class="max-h-[45vh] overflow-y-auto space-y-1 pr-0.5">
        {#if filtered.length === 0}
          <p class="text-xs text-dnd-text-muted text-center py-4">{emptyHint || 'No matches found'}</p>
        {:else}
          {#each filtered as item (item.name + item.source)}
            <button
              class="w-full flex items-center justify-between gap-2 text-xs px-2 py-2 rounded-lg hover:bg-dnd-card min-h-[36px] text-left"
              onclick={() => {
                onAdd(item);
                query = '';
              }}
            >
              <span class="min-w-0">
                <span class="block truncate text-dnd-text font-medium">
                  {displayName ? displayName(item) : item.name}
                </span>
                {#if item.sub}<span class="block text-[10px] text-dnd-text-muted truncate">{item.sub}</span>{/if}
              </span>
              {#if item.source}
                <span class="text-[10px] text-dnd-text-muted shrink-0">{formatSource(item.source)}</span>
              {/if}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>