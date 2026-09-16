<script lang="ts">
  import ContentRenderer from '$lib/components/ContentRenderer.svelte';
  import LevelTables from '$lib/components/LevelTables.svelte';
  import { base } from '$app/paths';
  import { formatSource } from '$lib/utils/dnd';
  import classesData from '$lib/data/classes.json';
  import subclassesData from '$lib/data/subclasses.json';
  import { page } from '$app/state';
  
  const className = $derived(page.params.name);
  
  const allClasses = $derived(classesData as any[]);
  const matchingClasses = $derived(allClasses.filter((c: any) => c.name.toLowerCase() === className));
  const currentClass = $derived(matchingClasses[0]);
  
  const allSubclasses = $derived(subclassesData as any[]);
  const matchingSubclasses = $derived(
    allSubclasses.filter((sc: any) => sc.className?.toLowerCase() === className)
  );
  
  let editionFilter = $state<'all' | 'classic' | 'one'>('all');
  const filteredSubclasses = $derived(
    matchingSubclasses.filter((sc: any) => 
      editionFilter === 'all' || sc.edition === editionFilter
    ).filter((sc: any, i: number, arr: any[]) => 
      arr.findIndex((s: any) => s.name === sc.name) === i
    )
  );
  
  let expandedFeature = $state<string | null>(null);
  let expandedSubclass = $state<string | null>(null);
  let expandedSubfeature = $state<string | null>(null);
</script>

<svelte:head>
  <title>{currentClass?.name || 'Class'} - D&D Companion</title>
</svelte:head>

<div class="px-4 pt-4 pb-4 max-w-3xl mx-auto">
  {#if !currentClass}
    <p class="text-dnd-text-muted">Class "{className}" not found.</p>
    <a href="{base}/classes" class="text-dnd-gold hover:underline text-sm mt-2 block">Back to Classes</a>
  {:else}
    <a href="{base}/classes" class="text-dnd-gold hover:underline text-xs mb-2 block">&larr; All Classes</a>
    
    <h1 class="font-display text-2xl font-bold text-dnd-gold mb-1">{currentClass.name}</h1>
    <p class="text-xs text-dnd-text-muted mb-4">{formatSource(currentClass.source)} · {currentClass.edition === 'one' ? '2024 (5.5e)' : '2014 (5e)'}</p>
    
    <div class="stat-block mb-4">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <p class="text-dnd-text-muted">Hit Die</p>
          <p class="font-semibold">d{currentClass.hitDice?.faces || '?'}</p>
        </div>
        <div>
          <p class="text-dnd-text-muted">Primary Ability</p>
          <p class="font-semibold">{(currentClass.proficiency || []).map((p: string) => p.toUpperCase()).join(', ')}</p>
        </div>
        <div>
          <p class="text-dnd-text-muted">Saving Throws</p>
          <p class="font-semibold">{(currentClass.proficiency || []).map((p: string) => p.toUpperCase()).join(', ')}</p>
        </div>
      </div>
    </div>
    
    <LevelTables tables={currentClass.tables || []} />

    {#if className === 'warlock'}
      <a href="{base}/invocations" class="card block text-sm mb-2 hover:border-dnd-gold">
        <div class="flex justify-between items-center">
          <span>Eldritch Invocations</span>
          <span class="text-dnd-gold">&rarr;</span>
        </div>
        <p class="text-[11px] text-dnd-text-muted mt-0.5">Browse warlock invocations &amp; optional features</p>
      </a>
    {/if}
    
    <h2 class="font-display text-lg font-semibold text-dnd-gold mb-2">Features</h2>
    <div class="space-y-1.5 mb-6">
      {#each (currentClass.features || []) as feature}
        {#if feature.level > 0}
          <button class="w-full card text-left text-sm" onclick={() => expandedFeature = expandedFeature === feature.name ? null : feature.name}>
            <div class="flex justify-between items-center">
              <span class="font-semibold text-dnd-text">{feature.name}</span>
              <span class="text-[10px] text-dnd-text-muted bg-dnd-darker px-2 py-0.5 rounded">Lv {feature.level}</span>
            </div>
            {#if expandedFeature === feature.name}
              <div class="mt-2 pt-2 border-t border-dnd-border fade-in">
                <ContentRenderer entries={feature.entries} />
              </div>
            {/if}
          </button>
        {/if}
      {/each}
    </div>
    
    {#if filteredSubclasses.length > 0}
      <div class="flex gap-1.5 mb-3">
        <button class="filter-btn text-xs" class:active={editionFilter === 'all'} onclick={() => editionFilter = 'all'}>All</button>
        <button class="filter-btn text-xs" class:active={editionFilter === 'classic'} onclick={() => editionFilter = 'classic'}>2014</button>
        <button class="filter-btn text-xs" class:active={editionFilter === 'one'} onclick={() => editionFilter = 'one'}>2024</button>
      </div>
      
      <h2 class="font-display text-lg font-semibold text-dnd-gold mb-2">Subclasses</h2>
      <div class="space-y-3">
        {#each filteredSubclasses as sub (sub.name + sub.source + sub.edition)}
          <div class="stat-block">
            <button class="w-full text-left" onclick={() => expandedSubclass = expandedSubclass === sub.name + sub.edition ? null : sub.name + sub.edition}>
              <div class="flex justify-between items-center">
                <div>
                  <h3 class="font-display font-semibold text-dnd-text">{sub.name}</h3>
                  <p class="text-[10px] text-dnd-text-muted">{formatSource(sub.source)} · {sub.edition === 'one' ? '2024' : '2014'}</p>
                </div>
                <span class="text-dnd-text-muted">{expandedSubclass === sub.name + sub.edition ? '▼' : '▶'}</span>
              </div>
            </button>
            
            {#if expandedSubclass === sub.name + sub.edition}
              <div class="mt-3 pt-3 border-t border-dnd-border space-y-2 fade-in">
                {#each (sub.features || []) as sf}
                  <button class="w-full text-left text-sm" onclick={() => expandedSubfeature = expandedSubfeature === sf.name + sf.level ? null : sf.name + sf.level}>
                    <div class="flex justify-between items-center">
                      <span class="font-semibold text-dnd-gold">{sf.name}</span>
                      <span class="text-[10px] text-dnd-text-muted">Lv {sf.level}</span>
                    </div>
                    {#if expandedSubfeature === sf.name + sf.level && sf.entries?.length}
                      <div class="mt-2 fade-in">
                        <ContentRenderer entries={sf.entries} />
                      </div>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
