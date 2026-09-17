<script lang="ts">
  let { value, onchange }: { value: boolean; onchange: (v: boolean) => void } = $props();
</script>

<label class="inline-flex items-center gap-2 cursor-pointer select-none" title="Show homebrew / Unearthed Arcana / extra content sourced from the SRD wiki">
  <input type="checkbox" checked={value} onchange={(e) => onchange(e.currentTarget.checked)} class="w-4 h-4 accent-amber-500" />
  <span class="text-[10px] uppercase tracking-wider text-dnd-text-muted font-semibold">Include homebrew</span>
</label>