<script lang="ts">
  import { type Character, SKILLS, type SkillConfig } from '$lib/utils/character-store';
  import {
    abilityMod,
    formatMod,
    proficiencyBonus,
    saveModifier,
    skillModifier,
    levelText,
    derivedSpellcasting,
    derivedMaxHp,
    armorClassFromEquipment,
    sanitizeProficiencyText
  } from '$lib/utils/dnd';
  import classesData from '$lib/data/classes.json';
  import subclassesData from '$lib/data/subclasses.json';
  import racesData from '$lib/data/races.json';
  import backgroundsData from '$lib/data/backgrounds.json';
  import spellsData from '$lib/data/spells.json';
  import equipmentData from '$lib/data/equipment.json';
  import ContentRenderer from '$lib/components/ContentRenderer.svelte';
  import CollapsibleEntries from '$lib/components/CollapsibleEntries.svelte';

  const BLOCK_IDS = [
    'abilities',
    'bonus',
    'saves',
    'proficiencies',
    'skills',
    'features',
    'combat',
    'hitpoints',
    'spellcasting',
    'attacks',
    'equipment',
    'feats',
    'character'
  ] as const;

  type FeatureTab = 'race' | 'background' | 'class' | 'subclass';
  const FEATURE_TAB_LABELS: Record<FeatureTab, string> = {
    race: 'Race', background: 'Background', class: 'Class', subclass: 'Subclass'
  };

  const ZONES = [
    { x: 0, w: 0.26 },
    { x: 0.29, w: 0.42 },
    { x: 0.74, w: 0.26 }
  ];

  let { char, onLayoutChange }: { char: Character; onLayoutChange?: (pos: Record<string, { x: number; y: number; w: string }>) => void } = $props();

  let pos: Record<string, { x: number; y: number; w: string }> = $state({});
  let canvasEl = $state<HTMLDivElement | null>(null);
  let canvasH = $state(400);

  $effect(() => {
    pos = { ...(char.layoutPos || {}) };
    scheduleMeasure();
  });

  $effect(() => {
    scheduleMeasure();
  });

  let measuring = false;
  function scheduleMeasure() {
    if (measuring || typeof requestAnimationFrame === 'undefined') return;
    measuring = true;
    requestAnimationFrame(() => {
      measuring = false;
      measureAndPlace();
    });
  }

  function measureAndPlace() {
    const el = canvasEl;
    if (!el) return;
    const W = el.clientWidth || 900;
    const blocks = Array.from(el.querySelectorAll<HTMLElement>('[data-block]'));
    if (!blocks.length) return;
    let dirty = false;
    const next = { ...pos };
    const bottoms = [0, 0, 0];
    const gap = 16;
    let maxBottom = 0;
    for (const b of blocks) {
      const id = b.dataset.blockId || '';
      const h = b.offsetHeight;
      const p = pos[id];
      if (p) {
        maxBottom = Math.max(maxBottom, p.y + h);
      } else {
        const zi = bottoms[0] <= bottoms[1]
          ? (bottoms[0] <= bottoms[2] ? 0 : 2)
          : (bottoms[1] <= bottoms[2] ? 1 : 2);
        const zone = ZONES[zi];
        const nx = Math.max(0, Math.floor(zone.x * W));
        const ny = Math.floor(bottoms[zi]);
        next[id] = { x: nx, y: ny, w: `${Math.round(zone.w * 100)}%` };
        bottoms[zi] = ny + h + gap;
        maxBottom = Math.max(maxBottom, ny + h);
        dirty = true;
      }
    }
    if (dirty) pos = next;
    if (canvasH !== maxBottom) canvasH = Math.max(400, maxBottom);
  }

  let featureTab = $state<FeatureTab>('race');
  let featureCollapsed = $state<Record<string, boolean>>({ race: false, background: false, class: false, subclass: false });

  const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
  const ABILITY_FULL: Record<string, string> = {
    str: 'Strength', dex: 'Dexterity', con: 'Constitution',
    int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma'
  };
  const ABILITY_SHORT: Record<string, string> = {
    str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA'
  };

  const classData = $derived(
    (classesData as any[]).find(
      (c) => c.name === char.class && (!char.classSource || c.source === char.classSource)
    ) || (classesData as any[]).find((c) => c.name === char.class)
  );

  const subclassData = $derived.by(() => {
    const list = (subclassesData as any[]).filter(
      (s) => s.className === char.class && s.name === char.subclass
    );
    if (!list.length) return null;
    const withEdition = classData ? list.filter((s) => s.edition === classData.edition) : [];
    return withEdition[0] || list[0];
  });

  const raceData = $derived(
    (racesData as any[]).find((r) => r.name === char.race && r.source === char.raceSource)
      || (racesData as any[]).find((r) => r.name === char.race)
      || null
  );

  const backgroundData = $derived(
    (backgroundsData as any[]).find((b) => b.name === char.background && b.source === char.backgroundSource)
      || (backgroundsData as any[]).find((b) => b.name === char.background)
      || null
  );

  const pb = $derived(proficiencyBonus(char.level));
  const spell = $derived(derivedSpellcasting(classData, char.level, char.abilityScores));
  const hpRecommended = $derived(
    char.hitDice ? derivedMaxHp(char.hitDice, char.level, abilityMod(char.abilityScores.con || 10)) : null
  );

  const armorPieces = $derived(
    (char.equipment || []).filter((e) => e.equipped).map((e) => {
      const meta = (equipmentData as any[]).find((x) => x.name.toLowerCase() === (e.name || '').toLowerCase());
      return { name: e.name, ac: meta?.ac ?? null, armorCategory: meta?.armorCategory ?? null };
    })
  );

  const acFromEquipment = $derived(armorClassFromEquipment(armorPieces, abilityMod(char.abilityScores.dex || 10)));
  const acFinal = $derived(char.ac || acFromEquipment);

  const weapons = $derived(
    (char.equipment || [])
      .filter((e) => {
        const meta = (equipmentData as any[]).find((x) => x.name.toLowerCase() === (e.name || '').toLowerCase());
        return meta?.weaponCategory || meta?.dmg1 || (e.equipped === false && meta?.dmg1);
      })
      .map((e) => {
        const meta = (equipmentData as any[]).find((x) => x.name.toLowerCase() === (e.name || '').toLowerCase());
        const melee = !(meta?.type || '').toString().startsWith('R');
        const toHit = pb + abilityMod(char.abilityScores[melee ? 'str' : 'dex'] || 10);
        return { name: e.name, toHit, dmg: meta?.dmg1 ? `${meta.dmg1} ${meta.dmgType || ''}`.trim() : '', proficient: true };
      })
  );

  const spellsByLevel = $derived.by(() => {
    const map = new Map<number, string[]>();
    for (const name of char.spellsKnown) {
      const spellMeta = (spellsData as any[]).find((s) => s.name.toLowerCase() === name.toLowerCase());
      const lvl = spellMeta?.level ?? 1;
      if (!map.has(lvl)) map.set(lvl, []);
      map.get(lvl)!.push(spellMeta?.name || name);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  });

  const showAttacks = $derived(weapons.length > 0);
  const showSpells = $derived(spell.isCaster);
  const showFeats = $derived(char.feats.length > 0);
  const showEquipment = $derived(char.equipment.length > 0);

  function isVisible(id: string): boolean {
    if (id === 'attacks') return showAttacks;
    if (id === 'spellcasting') return showSpells;
    if (id === 'feats') return showFeats;
    if (id === 'equipment') return showEquipment;
    return true;
  }

  const availableTabs = $derived.by(() => {
    const tabs: FeatureTab[] = [];
    if (raceData?.entries?.length) tabs.push('race');
    if (backgroundData?.entries?.length) tabs.push('background');
    if (classFeaturesForLevel().length) tabs.push('class');
    if (subclassFeaturesForLevel().length) tabs.push('subclass');
    return tabs;
  });
  $effect(() => {
    if (availableTabs.length && !availableTabs.includes(featureTab)) featureTab = availableTabs[0];
  });

  let dragId: string | null = $state(null);
  let dragPointer: number | null = null;
  let dragStart: { x: number; y: number; ox: number; oy: number } | null = null;

  function gripDown(e: PointerEvent, id: string) {
    e.preventDefault();
    const p = pos[id] || { x: 0, y: 0, w: '32%' };
    dragId = id;
    dragStart = { x: e.clientX, y: e.clientY, ox: p.x, oy: p.y };
    dragPointer = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    window.addEventListener('pointermove', gripMove);
    window.addEventListener('pointerup', gripUp);
    window.addEventListener('pointercancel', gripUp);
  }

  function snapPosition(id: string, bx: number, by: number, bw: number, bh: number) {
    const el = canvasEl;
    if (!el) return { x: bx, y: by };
    const T = 12;
    const GAP = 16;
    const blocks = Array.from(el.querySelectorAll<HTMLElement>('[data-block]'));
    const others: { x: number; y: number; w: number; h: number }[] = [];
    for (const b of blocks) {
      const bid = b.dataset.blockId;
      if (!bid || bid === id) continue;
      const p = pos[bid];
      others.push({ x: p?.x ?? 0, y: p?.y ?? 0, w: b.offsetWidth, h: b.offsetHeight });
    }
    const W = el.clientWidth || 900;
    const xcands: { x: number; d: number }[] = [{ x: 0, d: Math.abs(bx) }];
    for (const o of others) {
      xcands.push({ x: o.x, d: Math.abs(bx - o.x) });
      xcands.push({ x: o.x + o.w + GAP, d: Math.abs(bx - (o.x + o.w + GAP)) });
      xcands.push({ x: o.x - bw - GAP, d: Math.abs(bx - (o.x - bw - GAP)) });
      xcands.push({ x: o.x + o.w - bw, d: Math.abs(bx - (o.x + o.w - bw)) });
    }
    for (const z of ZONES) {
      xcands.push({ x: Math.floor(z.x * W), d: Math.abs(bx - z.x * W) });
      xcands.push({ x: Math.floor((z.x + z.w) * W) - bw, d: Math.abs(bx - ((z.x + z.w) * W - bw)) });
    }
    let nx = bx;
    let nd = T;
    for (const c of xcands) if (c.d <= nd) { nx = c.x; nd = c.d; }
    const ycands: { y: number; d: number }[] = [];
    for (const o of others) {
      ycands.push({ y: o.y, d: Math.abs(by - o.y) });
      ycands.push({ y: o.y + o.h + GAP - bh, d: Math.abs(by - (o.y + o.h + GAP - bh)) });
    }
    let ny = by;
    let yd = T;
    for (const c of ycands) if (c.d <= yd) { ny = c.y; yd = c.d; }
    return { x: nx, y: ny };
  }

  function gripMove(e: PointerEvent) {
    if (e.pointerId !== dragPointer || !dragStart) return;
    const THRESHOLD = 70;
    if (e.clientY < THRESHOLD) window.scrollBy(0, -14);
    else if (e.clientY > window.innerHeight - THRESHOLD) window.scrollBy(0, 14);
    const dx = Math.round(e.clientX - dragStart.x);
    const dy = Math.round(e.clientY - dragStart.y);
    const id = dragId!;
    const prev = pos[id] || { x: 0, y: 0, w: '32%' };
    const moveEl = canvasEl?.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
    const bw = moveEl?.offsetWidth ?? 0;
    const bh = moveEl?.offsetHeight ?? 0;
    const snap = snapPosition(id, dragStart.ox + dx, Math.max(0, dragStart.oy + dy), bw, bh);
    const nextPos = {
      x: snap.x,
      y: snap.y,
      w: prev.w
    };
    pos = { ...pos, [id]: nextPos };
  }

  function gripUp(e: PointerEvent) {
    if (e.pointerId !== dragPointer) return;
    window.removeEventListener('pointermove', gripMove);
    window.removeEventListener('pointerup', gripUp);
    window.removeEventListener('pointercancel', gripUp);
    if (dragId) {
      const entries = Object.entries(pos).map(([k, v]) => [k, { x: v.x, y: v.y, w: v.w }]);
      onLayoutChange?.(Object.fromEntries(entries));
    }
    dragId = null;
    dragStart = null;
    dragPointer = null;
  }

  function resetPositions() {
    pos = {};
    onLayoutChange?.({});
    scheduleMeasure();
  }

  function skillMod(skill: typeof SKILLS[number], cfg: SkillConfig): number {
    return skillModifier(char.abilityScores[skill.ability], cfg, char.level);
  }

  function classFeaturesForLevel(): { name: string; level: number; entries: any[] }[] {
    if (!classData?.features) return [];
    return classData.features.filter((f: any) => f.level <= char.level && f.level > 0 && f.entries?.length);
  }

  function subclassFeaturesForLevel(): { name: string; level: number; entries: any[] }[] {
    if (!subclassData?.features) return [];
    return subclassData.features.filter((f: any) => f.level <= char.level && f.level > 0 && f.entries?.length);
  }

  function printSheet() {
    window.print();
  }
</script>

<div class="char-sheet">
  <!-- Header -->
  <div class="sheet-box mb-3">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
      <div class="col-span-2">
        <p class="sheet-label">Character Name</p>
        <p class="text-base font-bold text-dnd-text font-display">{char.name || 'Unnamed'}</p>
      </div>
      <div>
        <p class="sheet-label">Class & Level</p>
        <p class="text-xs font-semibold text-dnd-text">
          {char.class || '—'}{char.level ? ` ${char.level}` : ''}
        </p>
      </div>
      <div>
        <p class="sheet-label">Player Name</p>
        <p class="text-xs font-semibold text-dnd-text">{char.playerName || '—'}</p>
      </div>
      <div>
        <p class="sheet-label">Race</p>
        <p class="text-xs font-semibold text-dnd-text">{char.race || '—'}{char.subrace ? ` (${char.subrace})` : ''}</p>
      </div>
      <div>
        <p class="sheet-label">Background</p>
        <p class="text-xs font-semibold text-dnd-text">{char.background || '—'}</p>
      </div>
      <div>
        <p class="sheet-label">Alignment</p>
        <p class="text-xs font-semibold text-dnd-text">{char.alignment || '—'}</p>
      </div>
      <div>
        <p class="sheet-label">Experience Points</p>
        <p class="text-xs font-semibold text-dnd-text">{char.experience || 0}</p>
      </div>
    </div>
  </div>

  <div class="flex items-center justify-between mb-2">
    <p class="text-[10px] text-dnd-text-muted">Hold the ⠿ grip and drag a section anywhere on the sheet.</p>
    <button class="filter-btn text-xs px-2.5 py-1.5 min-h-[36px]" onclick={resetPositions}>Reposition</button>
  </div>

  <!-- Free drag canvas -->
  <div
    class="sheet-canvas"
    style="height: {canvasH}px;"
    bind:this={canvasEl}
  >
    {#each BLOCK_IDS as blockId}
      {#if isVisible(blockId)}
        {@const p = pos[blockId] || { x: 0, y: 0, w: '32%' }}
        <section
          class="block-wrap"
          data-block
          data-block-id={blockId}
          class:dragging={blockId === dragId}
          style="left: {p.x}px; top: {p.y}px; width: {p.w};"
        >
          <button
            class="block-grip"
            aria-label="Drag {blockId} to reposition"
            onpointerdown={(e) => gripDown(e, blockId)}>⠿</button>

          {#if blockId === 'abilities'}
            <div class="grid grid-cols-3 gap-1.5">
              {#each ABILITY_KEYS as key}
                {@const score = char.abilityScores[key] ?? 10}
                {@const mod = abilityMod(score)}
                <div class="ability-box">
                  <p class="sheet-label text-center">{ABILITY_FULL[key]}</p>
                  <p class="ability-score text-center">{score}</p>
                  <p class="ability-mod text-center {mod >= 0 ? 'text-dnd-gold' : 'text-red-400'}">{formatMod(mod)}</p>
                </div>
              {/each}
            </div>

          {:else if blockId === 'bonus'}
            <div class="sheet-box">
              <div class="flex items-center justify-between">
                <div class="text-center">
                  <p class="sheet-label">Inspiration</p>
                  <div class="w-7 h-7 mx-auto border-2 border-dnd-border rounded-full
                    {char.inspiration ? 'bg-dnd-gold border-dnd-gold' : ''}"></div>
                </div>
                <div class="text-center">
                  <p class="sheet-label">Proficiency Bonus</p>
                  <p class="text-xl font-bold text-dnd-gold">{formatMod(pb)}</p>
                </div>
                <div class="text-center">
                  <p class="sheet-label">Passive Perception</p>
                  <p class="text-xl font-bold text-dnd-text">
                    {10 + abilityMod(char.abilityScores.wis || 10) + (char.skillProficiencies['perception']?.proficient ? pb : 0)}
                  </p>
                </div>
              </div>
            </div>

          {:else if blockId === 'saves'}
            <div class="sheet-box">
              <h3 class="sheet-heading">Saving Throws</h3>
              <div class="space-y-0.5">
                {#each ABILITY_KEYS as key}
                  {@const proficient = char.saveProficiencies.includes(key)}
                  {@const mod = saveModifier(char.abilityScores[key], proficient, char.level)}
                  <div class="flex items-center gap-2 text-xs py-0.5">
                    <div class="save-dot {proficient ? 'bg-dnd-gold' : ''}"></div>
                    <span class="font-semibold text-dnd-text w-8">{ABILITY_SHORT[key]}</span>
                    <span class="font-mono font-bold flex-1 text-right {mod >= 0 ? 'text-dnd-gold' : 'text-red-400'}">{formatMod(mod)}</span>
                  </div>
                {/each}
              </div>
            </div>

          {:else if blockId === 'proficiencies'}
            <div class="sheet-box">
              <h3 class="sheet-heading">Proficiencies &amp; Languages</h3>
              <div class="space-y-1.5 text-xs">
                {#if char.armorProficiencies.length}<p><span class="text-dnd-text-muted">Armor:</span> <span class="text-dnd-text">{char.armorProficiencies.map(sanitizeProficiencyText).join(', ')}</span></p>{/if}
                {#if char.weaponProficiencies.length}<p><span class="text-dnd-text-muted">Weapons:</span> <span class="text-dnd-text">{char.weaponProficiencies.map(sanitizeProficiencyText).join(', ')}</span></p>{/if}
                {#if char.toolProficiencies.length}<p><span class="text-dnd-text-muted">Tools:</span> <span class="text-dnd-text">{char.toolProficiencies.map(sanitizeProficiencyText).join(', ')}</span></p>{/if}
                {#if char.languages.length}<p><span class="text-dnd-text-muted">Languages:</span> <span class="text-dnd-text">{char.languages.map(sanitizeProficiencyText).join(', ')}</span></p>{/if}
              </div>
            </div>

          {:else if blockId === 'skills'}
            <div class="sheet-box">
              <h3 class="sheet-heading">Skills</h3>
              <div class="space-y-0.5">
                {#each SKILLS as skill}
                  {@const cfg = char.skillProficiencies[skill.id] || {}}
                  {@const mod = skillMod(skill, cfg)}
                  <div class="flex items-center gap-2 text-xs py-0.5">
                    <div class="skill-dot
                      {cfg.expertise ? 'bg-dnd-gold skill-exp' : cfg.proficient ? 'bg-dnd-gold/60' : ''}"></div>
                    <span class="font-medium text-dnd-text flex-1 min-w-0 truncate">{skill.name}</span>
                    <span class="text-[9px] text-dnd-text-muted w-6 text-right">{ABILITY_SHORT[skill.ability]}</span>
                    <span class="font-mono font-bold w-7 text-right {mod >= 0 ? 'text-dnd-gold' : 'text-red-400'}">{formatMod(mod)}</span>
                  </div>
                {/each}
              </div>
            </div>

          {:else if blockId === 'features'}
            {#if availableTabs.length}
              <div class="sheet-box">
                <h3 class="sheet-heading">Features &amp; Traits</h3>
                <div class="feature-tabs">
                  {#each availableTabs as tab}
                    <button class="feature-tab {featureTab === tab ? 'active' : ''}" onclick={() => (featureTab = tab)}>
                      {FEATURE_TAB_LABELS[tab]}
                    </button>
                  {/each}
                </div>
                {#if featureTab === 'race' && raceData?.entries?.length}
                  <div class="text-xs text-dnd-text-muted">
                    <CollapsibleEntries entries={raceData.entries} label="traits"
                      collapsed={featureCollapsed.race}
                      onchange={(v) => { featureCollapsed.race = v; }} />
                  </div>

                {:else if featureTab === 'background' && backgroundData?.entries?.length}
                  <div class="text-xs text-dnd-text-muted">
                    <CollapsibleEntries entries={backgroundData.entries} label="features"
                      collapsed={featureCollapsed.background}
                      onchange={(v) => { featureCollapsed.background = v; }} />
                  </div>

                {:else if featureTab === 'class'}
                  {@const feats = classFeaturesForLevel()}
                  {#if feats.length}
                    <div class="space-y-2">
                      {#each feats.slice(0, 1) as feat}
                        <div>
                          <p class="text-xs font-semibold text-dnd-gold">{feat.name}</p>
                          <div class="text-xs text-dnd-text-muted mt-0.5"><ContentRenderer entries={feat.entries} /></div>
                        </div>
                      {/each}
                      {#if feats.length > 1}
                        <button class="filter-btn text-[10px] px-2.5 py-1 min-h-[28px]"
                          onclick={() => { featureCollapsed.class = !featureCollapsed.class; }}>
                          {featureCollapsed.class ? `Show ${feats.length - 1} more features` : 'Collapse'}
                        </button>
                        {#if !featureCollapsed.class}
                          <div class="border-t border-dnd-border pt-2 space-y-2">
                            {#each feats.slice(1) as feat}
                              <div>
                                <p class="text-xs font-semibold text-dnd-gold">{feat.name}</p>
                                <div class="text-xs text-dnd-text-muted mt-0.5"><ContentRenderer entries={feat.entries} /></div>
                              </div>
                            {/each}
                          </div>
                        {/if}
                      {/if}
                    </div>
                  {/if}

                {:else if featureTab === 'subclass'}
                  {@const feats = subclassFeaturesForLevel()}
                  {#if feats.length}
                    <div class="space-y-2">
                      {#each feats.slice(0, 1) as feat}
                        <div>
                          <p class="text-xs font-semibold text-dnd-gold">{feat.name}</p>
                          <div class="text-xs text-dnd-text-muted mt-0.5"><ContentRenderer entries={feat.entries} /></div>
                        </div>
                      {/each}
                      {#if feats.length > 1}
                        <button class="filter-btn text-[10px] px-2.5 py-1 min-h-[28px]"
                          onclick={() => { featureCollapsed.subclass = !featureCollapsed.subclass; }}>
                          {featureCollapsed.subclass ? `Show ${feats.length - 1} more features` : 'Collapse'}
                        </button>
                        {#if !featureCollapsed.subclass}
                          <div class="border-t border-dnd-border pt-2 space-y-2">
                            {#each feats.slice(1) as feat}
                              <div>
                                <p class="text-xs font-semibold text-dnd-gold">{feat.name}</p>
                                <div class="text-xs text-dnd-text-muted mt-0.5"><ContentRenderer entries={feat.entries} /></div>
                              </div>
                            {/each}
                          </div>
                        {/if}
                      {/if}
                    </div>
                  {/if}
                {/if}
              </div>
            {/if}

          {:else if blockId === 'combat'}
            <div class="grid grid-cols-3 gap-1.5">
              <div class="sheet-box cbox text-center">
                <p class="sheet-label">Armor Class</p>
                <p class="text-2xl font-bold text-dnd-text leading-none">{acFinal}</p>
                {#if acFromEquipment !== acFinal}<p class="text-[9px] text-dnd-text-muted whitespace-nowrap overflow-hidden">(worn: {acFromEquipment})</p>{/if}
              </div>
              <div class="sheet-box cbox text-center">
                <p class="sheet-label">Initiative</p>
                <p class="text-2xl font-bold text-dnd-gold leading-none">{formatMod(abilityMod(char.abilityScores.dex || 10) + char.initiativeBonus)}</p>
              </div>
              <div class="sheet-box cbox text-center">
                <p class="sheet-label">Speed</p>
                <p class="text-2xl font-bold text-dnd-text leading-none">{char.speed}<span class="text-sm">ft</span></p>
              </div>
            </div>

          {:else if blockId === 'hitpoints'}
            <div class="sheet-box">
              <h3 class="sheet-heading">Hit Points</h3>
              <div class="flex items-baseline gap-2">
                <span class="text-3xl font-bold text-dnd-text">{char.currentHp}</span>
                <span class="text-sm text-dnd-text-muted">/ {char.maxHp}</span>
                {#if char.tempHp > 0}<span class="text-sm text-green-400">(+{char.tempHp} temp)</span>{/if}
              </div>
              <div class="h-2 bg-dnd-card rounded-full overflow-hidden mt-2 mb-3">
                <div class="h-full rounded-full transition-all duration-300
                  {char.currentHp <= 0 ? 'bg-red-500' : char.currentHp <= char.maxHp * 0.25 ? 'bg-red-500' : char.currentHp <= char.maxHp * 0.5 ? 'bg-yellow-500' : 'bg-green-500'}"
                  style="width: {Math.max(0, (char.currentHp / Math.max(1, char.maxHp)) * 100)}%"></div>
              </div>
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p class="sheet-label">Hit Dice</p>
                  <p class="text-sm font-semibold text-dnd-text">
                    {char.hitDice || '—'}
                    <span class="text-dnd-text-muted"> (used {char.hitDiceUsed})</span>
                  </p>
                </div>
                <div>
                  <p class="sheet-label">Death Saves</p>
                  <div class="flex items-center gap-1">
                    {#each Array(3) as _, i}
                      <div class="w-4 h-4 rounded-full border-2 border-dnd-border flex items-center justify-center {i < char.deathSaves.successes ? 'bg-dnd-gold border-dnd-gold' : ''}">{i < char.deathSaves.successes ? '✓' : ''}</div>
                    {/each}
                    <span class="text-dnd-text-muted mx-0.5">/</span>
                    {#each Array(3) as _, i}
                      <div class="w-4 h-4 rounded-full border-2 border-dnd-border flex items-center justify-center {i < char.deathSaves.failures ? 'bg-red-500 border-red-500' : ''}">{i < char.deathSaves.failures ? '✕' : ''}</div>
                    {/each}
                  </div>
                </div>
              </div>
              {#if hpRecommended != null && hpRecommended !== char.maxHp}
                <p class="text-[10px] text-dnd-text-muted mt-2">Recommended max HP ({char.hitDice} avg): {hpRecommended}</p>
              {/if}
            </div>

          {:else if blockId === 'spellcasting'}
            <div class="sheet-box">
              <h3 class="sheet-heading">Spellcasting</h3>
              <div class="flex flex-wrap gap-3 text-xs mb-2">
                {#if spell.ability}<p><span class="text-dnd-text-muted">Ability:</span> <span class="font-semibold text-dnd-text">{spell.ability.toUpperCase()}</span></p>{/if}
                <p><span class="text-dnd-text-muted">Save DC:</span> <span class="font-semibold text-dnd-gold">{spell.saveDC ?? '—'}</span></p>
                <p><span class="text-dnd-text-muted">Attack:</span> <span class="font-semibold text-dnd-gold">{spell.attackBonus != null ? formatMod(spell.attackBonus) : '—'}</span></p>
                {#if spell.preparedCount != null}<p><span class="text-dnd-text-muted">Prepared:</span> <span class="font-semibold text-dnd-text">{spell.preparedCount}</span></p>{/if}
              </div>
              {#if spell.slots.some((n) => n > 0)}
                <div class="flex flex-wrap gap-2 mb-2">
                  {#each spell.slots as n, i}
                    {#if n > 0}
                      <div class="text-center border border-dnd-border rounded-lg px-2.5 py-1">
                        <p class="sheet-label">Lv {i + 1}</p>
                        <p class="text-sm font-bold text-dnd-text">{n}</p>
                      </div>
                    {/if}
                  {/each}
                </div>
              {/if}
              {#if spell.cantripsKnown > 0 && char.spellsCantrips.length}
                <div class="mb-2">
                  <p class="sheet-label">Cantrips ({char.spellsCantrips.length}/{spell.cantripsKnown})</p>
                  <p class="text-xs text-dnd-text">{char.spellsCantrips.join(', ') || '—'}</p>
                </div>
              {/if}
              {#each spellsByLevel as [lvl, spells]}
                <div class="mb-1.5">
                  <p class="sheet-label">{levelText(lvl)}</p>
                  <p class="text-xs text-dnd-text">{spells.join(', ')}</p>
                </div>
              {/each}
              {#if !char.spellsCantrips.length && !char.spellsKnown.length}
                <p class="text-xs text-dnd-text-muted">No spells chosen yet.</p>
              {/if}
            </div>

          {:else if blockId === 'attacks'}
            <div class="sheet-box">
              <h3 class="sheet-heading">Attacks &amp; Spellcasting</h3>
              <div class="space-y-1 text-xs">
                {#each weapons as w}
                  <div class="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                    <span class="font-semibold text-dnd-text truncate">{sanitizeProficiencyText(w.name)}</span>
                    <span class="font-mono font-bold text-dnd-gold">{formatMod(w.toHit)}</span>
                    {#if w.dmg}<span class="font-mono text-dnd-text-muted">{w.dmg}</span>{/if}
                  </div>
                {/each}
              </div>
            </div>

          {:else if blockId === 'equipment'}
            <div class="sheet-box">
              <h3 class="sheet-heading">Equipment</h3>
              <div class="space-y-0.5 text-xs">
                {#each char.equipment as item}
                  <div class="flex justify-between">
                    <span class="text-dnd-text {item.equipped ? 'font-bold text-dnd-gold' : ''}">{item.equipped ? '⚔ ' : ''}{sanitizeProficiencyText(item.name)}</span>
                    {#if item.quantity > 1}<span class="text-dnd-text-muted">×{item.quantity}</span>{/if}
                  </div>
                {/each}
                <p class="pt-1 text-dnd-text-muted text-[10px]">
                  PP {char.coins.pp} · GP {char.coins.gp} · EP {char.coins.ep} · SP {char.coins.sp} · CP {char.coins.cp}
                </p>
              </div>
            </div>

          {:else if blockId === 'feats'}
            <div class="sheet-box">
              <h3 class="sheet-heading">Feats</h3>
              <p class="text-xs text-dnd-text">{char.feats.map(sanitizeProficiencyText).join(', ')}</p>
            </div>

          {:else if blockId === 'character'}
            <div class="sheet-box">
              <h3 class="sheet-heading">Character</h3>
              <div class="space-y-1.5 text-xs">
                <p><span class="text-dnd-text-muted">Personality Traits:</span> <span class="text-dnd-text whitespace-pre-wrap">{char.traits.personality || '—'}</span></p>
                <p><span class="text-dnd-text-muted">Ideals:</span> <span class="text-dnd-text whitespace-pre-wrap">{char.traits.ideals || '—'}</span></p>
                <p><span class="text-dnd-text-muted">Bonds:</span> <span class="text-dnd-text whitespace-pre-wrap">{char.traits.bonds || '—'}</span></p>
                <p><span class="text-dnd-text-muted">Flaws:</span> <span class="text-dnd-text whitespace-pre-wrap">{char.traits.flaws || '—'}</span></p>
                {#if char.notes}<p><span class="text-dnd-text-muted">Notes:</span> <span class="text-dnd-text whitespace-pre-wrap">{char.notes}</span></p>{/if}
              </div>
            </div>
          {/if}
        </section>
      {/if}
    {/each}
  </div>

  <button class="print-btn filter-btn w-full min-h-[44px] text-sm mt-3" onclick={printSheet}>
    Print / Save as PDF
  </button>
</div>

<style>
  .sheet-canvas {
    position: relative;
  }
  .block-wrap {
    position: absolute;
    min-width: 200px;
    max-width: 640px;
  }
  .block-wrap.dragging {
    opacity: 0.45;
    z-index: 50;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
  .block-grip {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 10;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1;
    color: var(--color-dnd-text-muted);
    background: transparent;
    border: none;
    cursor: grab;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }
  .block-grip:hover,
  .block-grip:active {
    color: var(--color-dnd-gold);
    background: var(--color-dnd-card);
  }
  .sheet-box {
    border: 1px solid var(--color-dnd-border);
    border-radius: 0.75rem;
    background: var(--color-dnd-darker);
    padding: 0.75rem;
  }
  .cbox {
    padding: 0.5rem 0.25rem;
  }
  .sheet-label {
    font-size: 9px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-dnd-text-muted);
    font-weight: 600;
    margin-bottom: 2px;
    overflow-wrap: break-word;
  }
  .sheet-heading {
    font-family: var(--font-display, serif);
    font-size: 13px;
    font-weight: 600;
    color: var(--color-dnd-gold);
    margin-bottom: 6px;
  }
  .feature-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
  }
  .feature-tab {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 9999px;
    border: 1px solid var(--color-dnd-border);
    color: var(--color-dnd-text-muted);
    background: transparent;
    min-height: 28px;
  }
  .feature-tab.active {
    background: var(--color-dnd-gold);
    border-color: var(--color-dnd-gold);
    color: #000;
  }
  .ability-box {
    border: 1px solid var(--color-dnd-border);
    border-radius: 0.75rem;
    background: var(--color-dnd-darker);
    padding: 10px 6px;
    text-align: center;
    min-width: 0;
  }
  .ability-box :global(.sheet-label) {
    white-space: normal;
    line-height: 1.05;
    word-break: break-word;
  }
  .ability-score {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-dnd-text);
    line-height: 1;
  }
  .ability-mod {
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
  }
  .save-dot {
    width: 14px;
    height: 14px;
    border-radius: 9999px;
    border: 2px solid var(--color-dnd-border);
    flex-shrink: 0;
  }
  .skill-dot {
    width: 12px;
    height: 12px;
    border: 2px solid var(--color-dnd-border);
    flex-shrink: 0;
  }
  .skill-exp {
    box-shadow: 0 0 0 2px var(--color-dnd-dark);
  }

  @media print {
    .char-sheet :global(*) { color: #111 !important; }
    .char-sheet { font-size: 9.5pt; max-width: 100% !important; padding: 0 !important; }
    .sheet-canvas { position: static !important; height: auto !important; }
    .block-wrap { position: static !important; width: 100% !important; max-width: none !important; min-width: 0 !important; height: auto !important; margin-bottom: 8px; }
    .block-grip { display: none !important; }
    .char-sheet :global(.sheet-box) { border: 1px solid #bbb !important; border-radius: 2px !important; background: #fff !important; padding: 5px 7px !important; }
    .char-sheet :global(.ability-box) { border: 1px solid #bbb !important; border-radius: 2px !important; background: #fff !important; }
    .char-sheet :global(.text-dnd-gold) { color: #000 !important; font-weight: 700 !important; }
    .char-sheet :global(.text-dnd-text-muted) { color: #444 !important; }
    .char-sheet :global(.text-dnd-text) { color: #111 !important; }
    .char-sheet :global(.text-red-400) { color: #111 !important; }
    .char-sheet :global(.bg-dnd-card) { background: #fff !important; }
    .char-sheet :global(.bg-dnd-gold) { background: #333 !important; color: #fff !important; }
    .char-sheet :global(.bg-dnd-gold\/60) { background: #ccc !important; }
    .char-sheet :global(.border-dnd-border) { border-color: #999 !important; }
    .char-sheet :global(.border-2) { border-color: #999 !important; }
    .char-sheet :global(a) { color: #000 !important; }
    .print-btn { display: none !important; }
    :global(nav) { display: none !important; }
    :global(main) { padding: 0 !important; max-width: 100% !important; }
  }
</style>