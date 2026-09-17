<script lang="ts">
  let { value, onchange }: { value: 'classic' | 'one'; onchange: (v: 'classic' | 'one') => void } = $props();

  function set(v: 'classic' | 'one') {
    if (v !== value) onchange(v);
  }
</script>

<div class="flex gap-1.5 mb-3">
  <button class="filter-btn text-xs" class:active={value === 'classic'} type="button" onclick={() => set('classic')}>5E</button>
  <button class="filter-btn text-xs" class:active={value === 'one'} type="button" onclick={() => set('one')}>5.5E</button>
</div>