<script lang="ts">
  import Recursive from './ContentRenderer.svelte';

  let { entries = [], depth = 0 }: { entries: any[]; depth?: number } = $props();
</script>

{#each entries as entry}
  {#if entry.type === 'text'}
    <p class="mb-2 text-sm leading-relaxed text-dnd-text">{@html entry.content}</p>
  {:else if entry.type === 'section'}
    {#if entry.name}
      <h4 class="mt-4 mb-1 font-display text-base font-semibold text-dnd-gold">{entry.name}</h4>
    {/if}
    {#if entry.entries?.length}
      <Recursive entries={entry.entries} depth={depth + 1} />
    {/if}
  {:else if entry.type === 'list'}
    <ul class="mb-2 ml-4 list-disc space-y-1 text-sm text-dnd-text">
      {#each entry.items as item}
        {#if typeof item === 'string'}
          <li>{@html item}</li>
        {:else if item.type === 'item'}
          <li>
            <span class="font-semibold text-dnd-gold">{item.name}.</span>
            {@html item.entry}
          </li>
        {:else}
          <li>{@html item}</li>
        {/if}
      {/each}
    </ul>
  {:else if entry.type === 'table'}
    <div class="my-3 overflow-x-auto">
      {#if entry.caption}
        <p class="mb-1 text-xs font-semibold text-dnd-gold">{entry.caption}</p>
      {/if}
      <table class="w-full text-xs">
        {#if entry.colLabels?.length}
          <thead>
            <tr class="border-b border-dnd-border">
              {#each entry.colLabels as label}
                <th class="px-2 py-1 text-left font-semibold text-dnd-gold">{label}</th>
              {/each}
            </tr>
          </thead>
        {/if}
        <tbody>
          {#each entry.rows as row}
            <tr class="border-b border-dnd-border/50">
              {#each row as cell}
                <td class="px-2 py-1">{@html cell}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
{/each}
