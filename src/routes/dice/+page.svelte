<script lang="ts">
  const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];

  type RollResult = {
    rolls: number[];
    total: number;
    advantage?: boolean;
    advantageResult?: number;
  };

  type HistoryEntry = {
    dice: string;
    rolls: number[];
    total: number;
    time: Date;
  };

  let dieType = $state(20);
  let quantity = $state(1);
  let advantage = $state(false);
  let disadvantage = $state(false);

  let currentRoll = $state<RollResult | null>(null);
  let history = $state<HistoryEntry[]>([]);

  const isAdvActive = $derived(dieType === 20 && (advantage || disadvantage));

  function randomDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  function updateQuantity(e: Event) {
    const v = parseInt((e.currentTarget as HTMLInputElement).value, 10);
    quantity = Number.isNaN(v) ? 1 : Math.min(Math.max(v, 1), 100);
  }

  function shiftQuantity(delta: number) {
    quantity = Math.min(Math.max(quantity + delta, 1), 100);
  }

  function toggleAdvantage() {
    advantage = !advantage;
    disadvantage = false;
  }

  function toggleDisadvantage() {
    disadvantage = !disadvantage;
    advantage = false;
  }

  function roll() {
    const qty = Math.min(Math.max(quantity, 1), 100);
    let result: RollResult;

    if (dieType === 20 && advantage) {
      const kept: number[] = [];
      const dropped: number[] = [];
      for (let i = 0; i < qty; i++) {
        const a = randomDie(20);
        const b = randomDie(20);
        kept.push(Math.max(a, b));
        dropped.push(Math.min(a, b));
      }
      result = { rolls: kept, total: kept.reduce((s, r) => s + r, 0), advantage: true, advantageResult: dropped[0] };
    } else if (dieType === 20 && disadvantage) {
      const kept: number[] = [];
      const dropped: number[] = [];
      for (let i = 0; i < qty; i++) {
        const a = randomDie(20);
        const b = randomDie(20);
        kept.push(Math.min(a, b));
        dropped.push(Math.max(a, b));
      }
      result = { rolls: kept, total: kept.reduce((s, r) => s + r, 0), advantage: true, advantageResult: dropped[0] };
    } else {
      const rolled: number[] = [];
      for (let i = 0; i < qty; i++) {
        rolled.push(randomDie(dieType));
      }
      result = { rolls: rolled, total: rolled.reduce((s, r) => s + r, 0) };
    }

    currentRoll = result;

    const qualifier = isAdvActive ? (advantage ? ' · Adv' : ' · Dis') : '';
    const label = `d${dieType}${qty > 1 ? ` × ${qty}` : ''}${qualifier}`;
    history = [{ dice: label, rolls: result.rolls, total: result.total, time: new Date() }, ...history].slice(0, 20);
  }

  function rollSingle(type: number) {
    dieType = type;
    if (type !== 20) {
      advantage = false;
      disadvantage = false;
    }
    roll();
  }
</script>

<svelte:head><title>Dice - D&D Companion</title></svelte:head>

<div class="px-4 pt-4 pb-6 max-w-md mx-auto">
  <h1 class="font-display text-2xl font-bold text-dnd-gold mb-4">Dice Roller</h1>

  <div class="stat-block mb-4 text-center">
    {#if currentRoll}
      <p class="text-[10px] uppercase tracking-[0.2em] text-dnd-text-muted mb-1">
        {currentRoll.rolls.length > 1 ? `${currentRoll.rolls.length} × ` : ''}d{dieType}
        {isAdvActive ? ` — ${advantage ? 'Advantage' : 'Disadvantage'}` : ''}
      </p>
      <div class="font-display font-bold text-dnd-gold text-5xl tabular-nums leading-tight">
        {currentRoll.total}
      </div>
      <div class="flex flex-wrap justify-center gap-1.5 mt-3">
        {#each currentRoll.rolls as r, i}
          <span class="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-dnd-border bg-dnd-darker px-2 text-sm font-semibold text-dnd-text tabular-nums fade-in">{r}</span>
        {/each}
        {#if currentRoll.advantage && currentRoll.rolls.length === 1 && currentRoll.advantageResult != null}
          <span class="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-dashed border-dnd-text-muted/40 px-2 text-sm font-semibold text-dnd-text-muted line-through tabular-nums">{currentRoll.advantageResult}</span>
        {/if}
      </div>
      {#if currentRoll.advantage}
        <p class="text-xs text-dnd-text-muted mt-2">
          {advantage ? 'Advantage — highest kept' : 'Disadvantage — lowest kept'}
          {#if currentRoll.rolls.length === 1 && currentRoll.advantageResult != null}
            <span class="text-dnd-gold">(dropped {currentRoll.advantageResult})</span>
          {/if}
        </p>
      {/if}
    {:else}
      <div class="font-display font-bold text-dnd-gold text-5xl tabular-nums leading-tight">—</div>
      <p class="text-xs text-dnd-text-muted mt-2">Tap a die or press Roll to begin</p>
    {/if}
  </div>

  <div class="grid grid-cols-4 gap-2 mb-4">
    {#each DICE_TYPES as d}
      <button
        class="py-4 rounded-lg text-lg font-semibold transition-all active:scale-95
          {dieType === d
            ? 'bg-dnd-gold text-black border-2 border-dnd-gold'
            : 'bg-dnd-card text-dnd-text border border-dnd-border hover:border-dnd-gold-dark'}"
        onclick={() => rollSingle(d)}
      >
        d{d}
      </button>
    {/each}
  </div>

  <div class="card mb-4">
    <div class="flex items-center justify-between gap-3">
      <span class="text-sm font-semibold text-dnd-text">Quantity</span>
      <div class="flex items-center gap-2">
        <button
          class="h-11 w-11 rounded-lg border border-dnd-border bg-dnd-darker text-xl font-bold text-dnd-gold transition-colors hover:border-dnd-gold-dark active:scale-95"
          onclick={() => shiftQuantity(-1)}
          aria-label="Decrease quantity"
        >−</button>
        <input
          type="number"
          min="1"
          max="100"
          value={quantity}
          oninput={updateQuantity}
          class="w-16 text-center text-lg font-semibold tabular-nums"
          aria-label="Quantity"
        />
        <button
          class="h-11 w-11 rounded-lg border border-dnd-border bg-dnd-darker text-xl font-bold text-dnd-gold transition-colors hover:border-dnd-gold-dark active:scale-95"
          onclick={() => shiftQuantity(1)}
          aria-label="Increase quantity"
        >+</button>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-2 gap-2 mb-4">
    <button
      class="filter-btn w-full justify-center py-3 text-sm {dieType !== 20 ? 'opacity-40 pointer-events-none' : ''}"
      class:active={advantage}
      onclick={toggleAdvantage}
    >Advantage (d20)</button>
    <button
      class="filter-btn w-full justify-center py-3 text-sm {dieType !== 20 ? 'opacity-40 pointer-events-none' : ''}"
      class:active={disadvantage}
      onclick={toggleDisadvantage}
    >Disadvantage (d20)</button>
  </div>

  <button
    class="w-full py-4 mb-6 rounded-xl bg-dnd-gold text-black text-lg font-bold font-display tracking-wide shadow-lg shadow-dnd-gold/20 transition-all hover:bg-dnd-gold-dark active:scale-[0.98]"
    onclick={roll}
  >
    Roll
    {isAdvActive ? (advantage ? 'with Advantage' : 'with Disadvantage') : `d${dieType}`}
    {quantity > 1 ? ` × ${quantity}` : ''}
  </button>

  <div>
    <h2 class="font-display text-lg font-semibold text-dnd-gold mb-2">History</h2>
    {#if history.length === 0}
      <p class="text-sm text-dnd-text-muted">No rolls yet.</p>
    {:else}
      <div class="space-y-1.5">
        {#each history as entry (entry.time.getTime() + entry.dice)}
          <div class="card px-3 py-2 flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 flex-wrap min-w-0">
              {#each entry.rolls as r}
                <span class="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-dnd-border bg-dnd-darker px-1.5 text-xs font-semibold text-dnd-text tabular-nums">{r}</span>
              {/each}
            </div>
            <div class="text-right shrink-0">
              <div class="font-display text-lg font-bold text-dnd-gold tabular-nums leading-tight">{entry.total}</div>
              <div class="text-[10px] text-dnd-text-muted">
                {entry.dice} · {new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>