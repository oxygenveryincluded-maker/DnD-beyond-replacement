<script lang="ts">
  import { SOURCE_NAMES } from '$lib/utils/sources';

  let { codes = [] }: { codes?: string[] } = $props();
  let open = $state(false);

  const entries = $derived(
    [...new Set(codes.filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .map((code) => ({ code, name: SOURCE_NAMES[code] || 'Unknown source' }))
  );
</script>

{#if entries.length}
  <div class="mb-3">
    <button
      type="button"
      class="text-[10px] uppercase tracking-wider font-semibold text-dnd-text-muted hover:text-dnd-gold transition-colors"
      onclick={() => (open = !open)}
    >
      {open ? '▾' : '▸'} Source key
    </button>
    {#if open}
      <div class="mt-1.5 p-2 rounded-lg bg-dnd-darker/50 border border-dnd-border text-[10px] leading-relaxed fade-in">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
          {#each entries as entry (entry.code)}
            <div>
              <span class="font-semibold text-dnd-text">{entry.code}</span>
              <span class="text-dnd-text-muted"> — {entry.name}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}
