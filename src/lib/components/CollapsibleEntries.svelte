<script lang="ts">
  import ContentRenderer from './ContentRenderer.svelte';

  let {
    entries = [],
    label = 'details',
    collapsed: collapsedProp = undefined,
    onchange
  }: {
    entries: any[];
    label?: string;
    collapsed?: boolean;
    onchange?: (v: boolean) => void;
  } = $props();

  let localCollapsed = $state(false);
  const isCollapsed = $derived(collapsedProp !== undefined ? collapsedProp : localCollapsed);
  const showToggle = $derived(entries?.length > 1);

  function toggle() {
    const next = !isCollapsed;
    if (onchange) onchange(next);
    else localCollapsed = next;
  }
</script>

{#if entries?.length}
  <ContentRenderer entries={entries.slice(0, 1)} />
  {#if showToggle}
    <button
      class="filter-btn text-[10px] px-2.5 py-1 min-h-[28px] mt-2"
      onclick={toggle}>
      {isCollapsed ? `Show ${label} (${entries.length - 1} more)` : 'Collapse'}
    </button>
    {#if !isCollapsed}
      <div class="mt-2 border-t border-dnd-border pt-2">
        <ContentRenderer entries={entries.slice(1)} />
      </div>
    {/if}
  {/if}
{/if}