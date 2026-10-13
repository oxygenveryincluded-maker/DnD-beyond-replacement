<script lang="ts">
  import Recursive from './ContentRenderer.svelte';

  let { entries = [], depth = 0 }: { entries: any[]; depth?: number } = $props();

  function tryParseEmbeddedJson(content: string): any | null {
    const t = (content || '').trim();
    if (!(t.startsWith('{') || t.startsWith('['))) return null;
    try {
      const p = JSON.parse(t);
      return p && typeof p === 'object' ? p : null;
    } catch {
      return null;
    }
  }

  // Pure: never mutates its input (entries may be $state proxies shared with
  // the data store - mutating them inside $derived throws state_unsafe_mutation).
  function normalizeEntry(e: any): any {
    if (!e || typeof e !== 'object') return e;
    // If a text node contains embedded structured content, unwrap it
    if (e.type === 'text' && typeof e.content === 'string') {
      const inner = tryParseEmbeddedJson(e.content);
      if (inner) return normalizeEntry(inner);
    }
    let out = e;
    if (Array.isArray(e.entries)) {
      out = { ...out, entries: e.entries.map((x: any) => normalizeEntry(x)) };
    }
    if (Array.isArray(e.items)) {
      out = {
        ...out,
        items: e.items.map((x: any) =>
          x && typeof x === 'object' ? normalizeEntry({ ...x }) : x
        )
      };
    }
    if (Array.isArray(e.rows)) {
      out = {
        ...out,
        rows: e.rows.map((row: any[]) =>
          (Array.isArray(row) ? row : [row]).map((cell: any) => {
            if (typeof cell === 'string') {
              const inner = tryParseEmbeddedJson(cell);
              return inner ? normalizeEntry(inner) : cell;
            }
            return cell && typeof cell === 'object' ? normalizeEntry({ ...cell }) : cell;
          })
        )
      };
    }
    return out;
  }

  let normEntries = $derived((entries || []).map((x: any) => normalizeEntry(x)));
</script>

{#each normEntries as entry}
  {#if entry.type === 'text'}
    <p class="mb-2 text-sm leading-relaxed text-dnd-text">{@html entry.content}</p>
  {:else if entry.type === 'quote'}
    <blockquote class="mb-2 border-l-2 border-dnd-gold/60 pl-3 text-sm italic text-dnd-text">
      {#if entry.entries?.length}
        <Recursive entries={entry.entries} depth={depth + 1} />
      {/if}
    </blockquote>
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
                <td class="px-2 py-1">{@html (typeof cell === 'string' ? cell : cell?.content ?? '')}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
{/each}
