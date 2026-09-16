<script lang="ts">
  import { onMount } from 'svelte';
  import {
    loadCharacters,
    saveCharacters,
    createDefaultCharacter,
    SKILLS,
    type Character
  } from '$lib/utils/character-store';
  import {
    initCloudAuth,
    authState,
    scheduleCloudPush,
    syncNow
  } from '$lib/cloud';
  import {
    abilityMod,
    formatMod,
    proficiencyBonus,
    formatSource,
    levelText,
    skillIdFromName,
    skillIdsFromProficiencies,
    derivedMaxHp,
    derivedSpellcasting,
    armorClassFromEquipment,
    raceSpeed,
    expandProficiencies,
    backgroundFeatNames,
    raceBackgroundLanguages,
    equipmentNamesFromEntries
  } from '$lib/utils/dnd';
  import CharacterSheet from '$lib/components/CharacterSheet.svelte';
  import SearchPicker from '$lib/components/SearchPicker.svelte';
  import classesData from '$lib/data/classes.json';
  import subclassesData from '$lib/data/subclasses.json';
  import racesData from '$lib/data/races.json';
  import backgroundsData from '$lib/data/backgrounds.json';
  import spellsData from '$lib/data/spells.json';
  import featsData from '$lib/data/feats.json';
  import equipmentData from '$lib/data/equipment.json';

  let characters = $state<Character[]>([]);
  let cloudStatus = $state<'off' | 'syncing' | 'synced' | 'error'>('off');
  let didInitialSync = false;
  let selectedId = $state<string | null>(null);
  let viewMode = $state<'builder' | 'sheet'>('builder');
  let builderStep = $state(0);
  let mounted = $state(false);
  let featsInput = $state('');
  let spellsInput = $state('');
  let equipInput = $state('');
  let equipQty = $state(1);
  let newSpellCantrip = $state(false);

  const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
  const ABILITY_LABELS: Record<string, string> = {
    str: 'Strength', dex: 'Dexterity', con: 'Constitution',
    int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma'
  };
  const ABILITY_SHORT: Record<string, string> = {
    str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA'
  };
  const SAVE_LABELS: Record<string, string> = {
    str: 'Strength', dex: 'Dexterity', con: 'Constitution',
    int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma'
  };
  const ALIGNMENTS = [
    'Lawful Good', 'Neutral Good', 'Chaotic Good',
    'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
    'Lawful Evil', 'Neutral Evil', 'Chaotic Evil', 'Unaligned'
  ];
  const EQUIP_TYPE: Record<string, string> = {
    HA: 'Heavy Armor', MA: 'Medium Armor', LA: 'Light Armor', S: 'Shield',
    M: 'Melee Weapon', R: 'Ranged Weapon', A: 'Ammunition',
    AT: 'Adventuring Tools', INS: 'Instrument', SCF: 'Spellcasting Focus', AF: 'Adventuring Gear'
  };

  const STEPS = [
    'Info', 'Class', 'Subclass', 'Race', 'Background',
    'Ability Scores', 'Skills', 'Combat', 'Equipment', 'Feats', 'Spells', 'Notes'
  ];

  const allClasses = $derived(
    [...new Map((classesData as any[]).map((c) => [c.name, c])).values()] as any[]
  );

  const allRaces = $derived(
    [...new Map(
      (racesData as any[]).map((r): [string, any] => [r.name, r])
        .slice()
        .sort((a, b) => (b[1].entries?.length || 0) - (a[1].entries?.length || 0))
    ).values()].sort((a, b) => a.name.localeCompare(b.name)) as any[]
  );

  const allBackgrounds = $derived(
    [...new Map(
      (backgroundsData as any[]).map((b): [string, any] => [b.name, b])
        .slice()
        .sort((a, b2) => (b2[1].entries?.length || 0) - (a[1].entries?.length || 0))
    ).values()].sort((a, b) => a.name.localeCompare(b.name)) as any[]
  );

  const selectedChar = $derived(characters.find((c) => c.id === selectedId) ?? null);

  const classInfo = $derived(
    (classesData as any[]).find(
      (c) => c.name === selectedChar?.class &&
             (selectedChar?.classSource ? c.source === selectedChar.classSource : true)
    )
  );

  const raceInfo = $derived(
  (racesData as any[]).find(
    (r) => r.name === selectedChar?.race && r.source === selectedChar?.raceSource
  )
    || (racesData as any[]).find((r) => r.name === selectedChar?.race)
    || null
);

const backgroundInfo = $derived(
  (backgroundsData as any[]).find(
    (b) => b.name === selectedChar?.background && b.source === selectedChar?.backgroundSource
  )
    || (backgroundsData as any[]).find((b) => b.name === selectedChar?.background)
    || null
);

  const allSubclasses = $derived.by(() => {
    if (!classInfo || !selectedChar?.class) return [];
    const cls = selectedChar.class;
    const same = (subclassesData as any[]).filter((s) => s.className === cls);
    const pool = same.filter((s) => s.edition === classInfo.edition);
    const usable = pool.length ? pool : same;
    const seen = new Set<string>();
    return usable.filter((s) => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });
  });

  const spellDerived = $derived(
    classInfo
      ? derivedSpellcasting(classInfo, selectedChar?.level || 1, selectedChar?.abilityScores || {})
      : { isCaster: false, ability: null, saveDC: null, attackBonus: null, preparedCount: null, preparedFormula: null, cantripsKnown: 0, spellsKnown: 0, slots: [] as number[] }
  );

  const hpDerived = $derived(
    selectedChar?.hitDice
      ? derivedMaxHp(selectedChar.hitDice, selectedChar.level, abilityMod(selectedChar.abilityScores.con || 10))
      : null
  );

  const armorPieces = $derived(
    (selectedChar?.equipment || []).filter((e) => e.equipped).map((e) => {
      const meta = (equipmentData as any[]).find(
        (x) => x.name.toLowerCase() === e.name.toLowerCase()
      );
      return { name: e.name, ac: meta?.ac ?? null, armorCategory: meta?.armorCategory ?? null };
    })
  );

  const acDerived = $derived(
    armorClassFromEquipment(armorPieces, abilityMod(selectedChar?.abilityScores.dex || 10))
  );

  $effect(() => {
    const c = selectedChar;
    if (!c) return;
    const rs = raceSpeed(raceInfo);
    if (c.maxHpAuto && hpDerived != null && c.maxHp !== hpDerived) {
      updateChar(c.id, (x) => {
        const old = x.maxHp;
        x.maxHp = hpDerived;
        if (x.currentHp === old) x.currentHp = hpDerived;
      });
    }
    if (c.acAuto && acDerived != null && c.ac !== acDerived) {
      updateChar(c.id, (x) => { x.ac = acDerived; });
    }
    if (c.speedAuto && rs != null && c.speed !== rs) {
      updateChar(c.id, (x) => { x.speed = rs; });
    }
  });

  const classSkillChoice = $derived.by(() => {
    const sp = classInfo?.startingProficiencies?.skills || [];
    for (const p of sp) {
      if (p && typeof p === 'object' && p.choose?.from?.length) {
        return {
          count: p.choose.count ?? 1,
          from: (p.choose.from as string[]).map((s) => skillIdFromName(s)).filter(Boolean) as string[]
        };
      }
    }
    return null;
  });

  const classSkillPoolCount = $derived(
    classSkillChoice
      ? classSkillChoice.from.filter((id: string) => selectedChar?.skillProficiencies[id]?.proficient).length
      : 0
  );

  const derivedSkillIds = $derived.by(() => {
    const ids = [
      ...skillIdsFromProficiencies(backgroundInfo?.skillProficiencies),
      ...skillIdsFromProficiencies(raceInfo?.skillProficiencies)
    ];
    return [...new Set(ids)];
  });

  const classStartingItems = $derived(classInfo?.startingEquipment?.items || []);
  const bgStartingItems = $derived(equipmentNamesFromEntries(backgroundInfo?.startingEquipment));
  const bgFeatNames = $derived(backgroundFeatNames(backgroundInfo));

  function updateChar(id: string, updater: (c: Character) => void) {
    characters = characters.map((c) => {
      if (c.id !== id) return c;
      const updated = { ...c };
      updater(updated);
      return updated;
    });
  }

  function mergeUnique(a: string[], b: string[]): string[] {
    return [...new Set([...a.filter(Boolean), ...b.filter(Boolean)])];
  }

  function newCharacter() {
    const c = createDefaultCharacter();
    characters = [...characters, c];
    selectedId = c.id;
    builderStep = 0;
    viewMode = 'builder';
  }

  function deleteCharacter(id: string) {
    characters = characters.filter((c) => c.id !== id);
    if (selectedId === id) selectedId = null;
  }

  function set(field: string, value: any) {
    if (!selectedId) return;
    updateChar(selectedId, (c) => { (c as any)[field] = value; });
  }

  function adjustScore(key: string, delta: number) {
    if (!selectedId) return;
    updateChar(selectedId, (c) => {
      c.abilityScores[key] = Math.max(1, Math.min(30, (c.abilityScores[key] ?? 10) + delta));
    });
  }

  function adjustHp(field: 'maxHp' | 'currentHp' | 'tempHp' | 'hitDiceUsed', delta: number) {
    if (!selectedId) return;
    updateChar(selectedId, (c) => {
      const val = (c as any)[field] + delta;
      (c as any)[field] = field === 'hitDiceUsed'
        ? Math.max(0, Math.min(c.level, val))
        : Math.max(0, val);
      if (field === 'maxHp') c.maxHpAuto = false;
    });
  }

  function setAc(v: number) {
    if (!selectedId) return;
    updateChar(selectedId, (c) => {
      c.ac = Math.max(0, v);
      c.acAuto = false;
    });
  }

  function setSpeed(v: number) {
    if (!selectedId) return;
    updateChar(selectedId, (c) => {
      c.speed = Math.max(0, v);
      c.speedAuto = false;
    });
  }

  function setClass(name: string) {
    if (!selectedId) return;
    const cls = allClasses.find((c) => c.name === name);
    if (!cls) return;
    const info = (classesData as any[]).find((c) => c.name === name && c.source === cls.source) || cls;
    updateChar(selectedId, (c) => {
      c.class = name;
      c.classSource = cls.source ?? '';
      c.subclass = '';
      c.subclassSource = '';
      c.hitDice = `d${info.hd?.faces ?? 8}`;
      if (c.maxHp <= 10 && c.currentHp <= 10) {
        const hp = derivedMaxHp(c.hitDice, c.level, abilityMod(c.abilityScores.con));
        if (hp != null) { c.maxHp = hp; c.currentHp = hp; }
      }
      c.saveProficiencies = info.savingThrows || [];
      const profs = expandProficiencies(info.startingProficiencies);
      c.armorProficiencies = mergeUnique(c.armorProficiencies, profs.armor);
      c.weaponProficiencies = mergeUnique(c.weaponProficiencies, profs.weapons);
      c.toolProficiencies = mergeUnique(c.toolProficiencies, profs.tools);
      c.languages = mergeUnique(c.languages, profs.languages);
      const sp = info.startingProficiencies?.skills || [];
      for (const p of sp) {
        if (p && typeof p === 'object' && p.choose?.from?.length) {
          const ids = (p.choose.from as string[]).map((s) => skillIdFromName(s)).filter(Boolean) as string[];
          const have = ids.filter((id) => c.skillProficiencies[id]?.proficient).length;
          if (have === 0) {
            ids.slice(0, Math.min(p.choose.count ?? 1, ids.length)).forEach((id) => {
              c.skillProficiencies[id] = { ...(c.skillProficiencies[id] || {}), proficient: true };
            });
          }
        }
      }
    });
  }

  function setSubclass(name: string) {
    if (!selectedId) return;
    const sub = allSubclasses.find((s) => s.name === name);
    updateChar(selectedId, (c) => {
      c.subclass = name;
      c.subclassSource = sub?.source ?? '';
    });
  }

  function setRace(name: string) {
    if (!selectedId) return;
    const race = allRaces.find((r) => r.name === name);
    updateChar(selectedId, (c) => {
      c.race = name;
      c.raceSource = race?.source ?? '';
      c.subrace = c.subrace && race?.subraces?.length ? c.subrace : c.subrace;
      if (c.speed === 30 && race) {
        const sp = raceSpeed(race);
        if (sp != null) c.speed = sp;
      }
      skillIdsFromProficiencies(race?.skillProficiencies).forEach((id) => {
        c.skillProficiencies[id] = { ...(c.skillProficiencies[id] || {}), proficient: true };
      });
      c.languages = mergeUnique(c.languages, raceBackgroundLanguages(race, backgroundInfo));
    });
  }

  function setBackground(name: string) {
    if (!selectedId) return;
    const bg = allBackgrounds.find((b) => b.name === name);
    updateChar(selectedId, (c) => {
      c.background = name;
      c.backgroundSource = bg?.source ?? '';
      skillIdsFromProficiencies(bg?.skillProficiencies).forEach((id) => {
        c.skillProficiencies[id] = { ...(c.skillProficiencies[id] || {}), proficient: true };
      });
      backgroundFeatNames(bg).forEach((f) => {
        if (!c.feats.includes(f)) c.feats = [...c.feats, f];
      });
      const rg = (racesData as any[]).find(
        (x) => x.name === c.race && x.source === c.raceSource
      ) || (racesData as any[]).find((x) => x.name === c.race) || null;
      c.languages = mergeUnique(c.languages, raceBackgroundLanguages(rg, bg));
    });
  }

  function toggleSkill(skillId: string, type: 'proficient' | 'expertise') {
    if (!selectedId) return;
    updateChar(selectedId, (c) => {
      const cfg = { ...(c.skillProficiencies[skillId] || {}) };
      if (type === 'proficient') {
        cfg.proficient = !cfg.proficient;
        if (!cfg.proficient) cfg.expertise = false;
      } else {
        cfg.expertise = !cfg.expertise;
        if (cfg.expertise) cfg.proficient = true;
      }
      c.skillProficiencies[skillId] = cfg;
    });
  }

  function toggleSave(ability: string) {
    if (!selectedId) return;
    updateChar(selectedId, (c) => {
      if (c.saveProficiencies.includes(ability)) {
        c.saveProficiencies = c.saveProficiencies.filter((s) => s !== ability);
      } else {
        c.saveProficiencies = [...c.saveProficiencies, ability];
      }
    });
  }

  function addFeatsCustom() {
    if (!selectedId || !featsInput.trim()) return;
    updateChar(selectedId, (c) => {
      if (!c.feats.includes(featsInput.trim())) c.feats = [...c.feats, featsInput.trim()];
    });
    featsInput = '';
  }

  function addFeat(name: string) {
    if (!selectedId || !name.trim()) return;
    updateChar(selectedId, (c) => {
      if (!c.feats.includes(name.trim())) c.feats = [...c.feats, name.trim()];
    });
  }

  function removeFeat(i: number) {
    if (!selectedId) return;
    updateChar(selectedId, (c) => {
      c.feats = c.feats.filter((_, idx) => idx !== i);
    });
  }

  function addSpellsCustom() {
    if (!selectedId || !spellsInput.trim()) return;
    updateChar(selectedId, (c) => {
      const arr = newSpellCantrip ? c.spellsCantrips : c.spellsKnown;
      if (!arr.includes(spellsInput.trim())) arr.push(spellsInput.trim());
    });
    spellsInput = '';
  }

  function addSpellFromList(item: any) {
    if (!selectedId || !item?.name) return;
    const isCantrip = item.level === 0;
    updateChar(selectedId, (c) => {
      const arr = isCantrip ? c.spellsCantrips : c.spellsKnown;
      if (!arr.includes(item.name)) arr.push(item.name);
    });
  }

  function removeSpell(type: 'cantrips' | 'known', i: number) {
    if (!selectedId) return;
    updateChar(selectedId, (c) => {
      if (type === 'cantrips') c.spellsCantrips = c.spellsCantrips.filter((_, idx) => idx !== i);
      else c.spellsKnown = c.spellsKnown.filter((_, idx) => idx !== i);
    });
  }

  function addEquipmentCustom() {
    if (!selectedId || !equipInput.trim()) return;
    updateChar(selectedId, (c) => {
      const name = equipInput.trim();
      const existing = c.equipment.find((e) => e.name.toLowerCase() === name.toLowerCase());
      if (existing) existing.quantity += equipQty || 1;
      else c.equipment.push({ name, quantity: equipQty || 1, equipped: false });
    });
    equipInput = '';
    equipQty = 1;
  }

  function addEquipmentFromList(item: any) {
    if (!selectedId || !item?.name) return;
    updateChar(selectedId, (c) => {
      const name = item.name;
      const existing = c.equipment.find((e) => e.name.toLowerCase() === name.toLowerCase());
      if (existing) existing.quantity += 1;
      else c.equipment.push({ name, quantity: 1, equipped: false });
    });
  }

  function addStartingItems(names: string[]) {
    if (!selectedId) return;
    for (const name of names) {
      updateChar(selectedId, (c) => {
        const existing = c.equipment.find((e) => e.name.toLowerCase() === name.toLowerCase());
        if (existing) existing.quantity += 1;
        else c.equipment.push({ name, quantity: 1, equipped: false });
      });
    }
  }

  function removeEquip(i: number) {
    if (!selectedId) return;
    updateChar(selectedId, (c) => {
      c.equipment = c.equipment.filter((_, idx) => idx !== i);
    });
  }

  function toggleEquip(i: number) {
    if (!selectedId) return;
    updateChar(selectedId, (c) => {
      const item = c.equipment[i];
      if (item) item.equipped = !item.equipped;
    });
  }

  onMount(() => {
    characters = loadCharacters();
    mounted = true;
    initCloudAuth();
    authState.subscribe(async (s) => {
      if (s.loading) return;
      if (s.user && !didInitialSync) {
        didInitialSync = true;
        cloudStatus = 'syncing';
        try {
          characters = await syncNow(s.user);
          cloudStatus = 'synced';
        } catch (e) {
          cloudStatus = 'error';
          console.error('initial cloud sync failed:', e);
        }
      } else if (!s.user) {
        cloudStatus = 'off';
      }
    });
  });

  $effect(() => {
    if (!mounted) return;
    const stamped = saveCharacters(characters);
    if ($authState.user) scheduleCloudPush($authState.user, stamped);
  });

  $effect(() => {
    if (!mounted || !selectedChar || !selectedChar.class) return;
    const der = derivedSpellcasting(classInfo, selectedChar.level, selectedChar.abilityScores);
    if (der.isCaster && der.saveDC != null && (selectedChar.spellSaveDC !== der.saveDC || selectedChar.spellAttackBonus !== der.attackBonus)) {
      updateChar(selectedChar.id, (c) => {
        c.spellSaveDC = der.saveDC!;
        c.spellAttackBonus = der.attackBonus!;
      });
    }
  });
</script>

<svelte:head><title>Character Builder - D&D Companion</title></svelte:head>

<div class="px-2 pt-2 pb-4 max-w-7xl mx-auto">
  {#if !selectedId}
    <div class="flex items-center justify-between mb-4">
      <h1 class="font-display text-2xl font-bold text-dnd-gold">Characters</h1>
      <button class="filter-btn text-sm px-4 py-2.5 min-h-[44px]" onclick={newCharacter}>+ New Character</button>
    </div>

    {#if characters.length === 0}
      <div class="card text-center py-12">
        <p class="text-dnd-text-muted mb-3">No characters yet</p>
        <button class="filter-btn px-5 py-2.5 min-h-[44px]" onclick={newCharacter}>Create your first character</button>
      </div>
    {:else}
      <div class="space-y-3">
        {#each characters as char (char.id)}
          <div class="w-full card text-left min-h-[44px] cursor-pointer" role="button" tabindex="0"
            onclick={() => { selectedId = char.id; viewMode = 'builder'; }}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectedId = char.id; viewMode = 'builder'; } }}>
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-dnd-text text-sm">{char.name}</h3>
                <p class="text-xs text-dnd-text-muted mt-0.5">
                  Lv.{char.level} {char.class || '—'}
                  {char.race ? ` · ${char.race}` : ''}
                </p>
                <div class="flex gap-2 mt-1.5 flex-wrap">
                  <span class="tag text-[10px] bg-dnd-dark text-dnd-text-muted">HP {char.currentHp}/{char.maxHp}</span>
                  <span class="tag text-[10px] bg-dnd-dark text-dnd-text-muted">AC {char.ac}</span>
                  <span class="tag text-[10px] bg-dnd-dark text-dnd-text-muted">PB +{proficiencyBonus(char.level)}</span>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button
                  class="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-dnd-text-muted hover:text-red-400 hover:bg-red-900/20"
                  onclick={(e) => { e.stopPropagation(); deleteCharacter(char.id); }}
                  aria-label="Delete character"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
                <svg class="w-5 h-5 text-dnd-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}

  {:else if selectedChar}
    <!-- Selected character view -->
    <div class="mb-3 flex items-center gap-2">
      <button class="filter-btn text-sm px-3 py-2 min-h-[44px]" onclick={() => { selectedId = null; }}>← Back</button>
      <button class="filter-btn text-sm px-3 py-2 min-h-[44px]" class:active={viewMode === 'builder'} onclick={() => viewMode = 'builder'}>Builder</button>
      <button class="filter-btn text-sm px-3 py-2 min-h-[44px]" class:active={viewMode === 'sheet'} onclick={() => viewMode = 'sheet'}>Sheet</button>
      <span class="ml-auto inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg shrink-0
        {cloudStatus === 'synced' ? 'bg-emerald-900/40 text-emerald-300'
          : cloudStatus === 'error' ? 'bg-red-900/40 text-red-300'
          : 'bg-dnd-card text-dnd-text-muted'}">
        ☁ {cloudStatus === 'synced' ? 'synced' : cloudStatus === 'syncing' ? 'syncing…' : cloudStatus === 'error' ? 'sync error' : 'offline'}
      </span>
    </div>

    {#if viewMode === 'sheet'}
      <CharacterSheet
        char={selectedChar}
        onLayoutChange={(pos) => updateChar(selectedChar.id, (c) => { c.layoutPos = pos; })}
      />
    {:else}
      <!-- Builder mode -->
      <div class="flex gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
        {#each STEPS as label, i}
          <button
            class="filter-btn text-xs min-h-[36px] shrink-0"
            class:active={builderStep === i}
            onclick={() => (builderStep = i)}
          >
            <span class="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold mr-1.5
              {builderStep === i ? 'bg-dnd-gold text-black' : builderStep > i ? 'bg-dnd-gold/30 text-dnd-gold' : 'bg-dnd-card text-dnd-text-muted'}">
              {i + 1}
            </span>
            {label}
          </button>
        {/each}
      </div>

      <div class="card mb-4 fade-in">
        {#if builderStep === 0}
          <h2 class="font-display text-lg font-semibold text-dnd-gold mb-3">Basic Info</h2>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-dnd-text-muted mb-1 block" for="char-name">Name</label>
              <input id="char-name" type="text" value={selectedChar.name}
                oninput={(e) => set('name', (e.target as HTMLInputElement).value)} class="w-full" />
            </div>
            <div>
              <label class="text-xs text-dnd-text-muted mb-1 block" for="char-level">Level</label>
              <div class="flex items-center gap-3">
                <button class="filter-btn min-w-[44px] min-h-[44px] text-lg font-bold"
                  onclick={() => set('level', Math.max(1, selectedChar.level - 1))}>-</button>
                <input id="char-level" type="number" min="1" max="20" value={selectedChar.level}
                  onchange={(e) => set('level', Math.max(1, Math.min(20, Number((e.target as HTMLInputElement).value) || 1)))}
                  class="w-20 text-center" />
                <button class="filter-btn min-w-[44px] min-h-[44px] text-lg font-bold"
                  onclick={() => set('level', Math.min(20, selectedChar.level + 1))}>+</button>
              </div>
            </div>
            <div>
              <p class="text-xs text-dnd-text-muted mb-1 block">Alignment</p>
              <div class="flex flex-wrap gap-1.5">
                {#each ALIGNMENTS as align}
                  <button class="filter-btn text-[10px] px-2.5 py-1.5 min-h-[32px] {selectedChar.alignment === align ? 'active' : ''}"
                    onclick={() => set('alignment', align)}>{align}</button>
                {/each}
              </div>
            </div>
            <div>
              <label class="text-xs text-dnd-text-muted mb-1 block" for="char-player">Player Name</label>
              <input id="char-player" type="text" value={selectedChar.playerName}
                oninput={(e) => set('playerName', (e.target as HTMLInputElement).value)} class="w-full" />
            </div>
            <div>
              <label class="text-xs text-dnd-text-muted mb-1 block" for="char-xp">Experience Points</label>
              <input id="char-xp" type="number" min="0" value={selectedChar.experience}
                onchange={(e) => set('experience', Math.max(0, parseInt((e.target as HTMLInputElement).value) || 0))}
                class="w-full" />
            </div>
          </div>

        {:else if builderStep === 1}
          <h2 class="font-display text-lg font-semibold text-dnd-gold mb-3">Class</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {#each allClasses as cls}
              <button class="filter-btn text-sm min-h-[44px] text-left {selectedChar.class === cls.name && selectedChar.classSource === cls.source ? 'active' : ''}"
                onclick={() => setClass(cls.name)}>
                {cls.name}
                <span class="block text-[10px] opacity-60">{cls.edition === 'one' ? '2024 Rules' : '2014 Rules'}</span>
              </button>
            {/each}
          </div>
          {#if classInfo?.hd}
            <p class="text-xs text-dnd-text-muted mt-2">
              Hit Die: d{classInfo.hd.faces} · Saving Throws: {(classInfo.savingThrows || []).map((s: string) => ABILITY_SHORT[s]).join(', ') || '—'}
            </p>
          {/if}

        {:else if builderStep === 2}
          <h2 class="font-display text-lg font-semibold text-dnd-gold mb-3">Subclass</h2>
          {#if !selectedChar.class}
            <p class="text-sm text-dnd-text-muted">Select a class first.</p>
          {:else if allSubclasses.length === 0}
            <p class="text-sm text-dnd-text-muted">No subclasses available for {selectedChar.class}.</p>
          {:else}
            <p class="text-xs text-dnd-text-muted mb-2">Published subclasses for {selectedChar.class} — {classInfo?.edition === 'one' ? '2024' : '2014'} rules preferred ({allSubclasses.length} shown).</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button class="filter-btn text-sm min-h-[44px] text-left {!selectedChar.subclass ? 'active' : ''}"
                onclick={() => setSubclass('')}>None</button>
              {#each allSubclasses as sub}
                <button class="filter-btn text-sm min-h-[44px] text-left {selectedChar.subclass === sub.name ? 'active' : ''}"
                  onclick={() => setSubclass(sub.name)}>
                  {sub.name}
                  <span class="block text-[10px] opacity-60">{formatSource(sub.source)}</span>
                </button>
              {/each}
            </div>
          {/if}

        {:else if builderStep === 3}
          <h2 class="font-display text-lg font-semibold text-dnd-gold mb-3">Race</h2>
          <p class="text-xs text-dnd-text-muted mb-2">{allRaces.length} playable races.</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto pr-1">
            {#each allRaces as race}
              <button class="filter-btn text-sm min-h-[44px] text-left {selectedChar.race === race.name ? 'active' : ''}"
                onclick={() => setRace(race.name)}>
                {race.name}
                <span class="block text-[10px] opacity-60">{race.edition === 'one' ? '2024' : '2014'}</span>
              </button>
            {/each}
          </div>

          {#if selectedChar.race}
            <div class="stat-block mt-3">
              <p class="text-[10px] uppercase tracking-wider text-dnd-text-muted font-semibold mb-1">Languages</p>
              <p class="text-[10px] text-dnd-text-muted mb-1">Auto-filled from {selectedChar.race}{selectedChar.background ? ` + ${selectedChar.background}` : ''}. Type comma-separated to change.</p>
              <input type="text" value={selectedChar.languages.join(', ')}
                oninput={(e) => set('languages', (e.target as HTMLInputElement).value.split(',').map(s=>s.trim()).filter(Boolean))}
                placeholder="e.g. Common, Elvish, Draconic" class="w-full" />
            </div>
          {/if}

        {:else if builderStep === 4}
          <h2 class="font-display text-lg font-semibold text-dnd-gold mb-3">Background</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto pr-1">
            {#each allBackgrounds as bg}
              <button class="filter-btn text-sm min-h-[44px] text-left {selectedChar.background === bg.name ? 'active' : ''}"
                onclick={() => setBackground(bg.name)}>
                {bg.name}
                <span class="block text-[10px] opacity-60">{formatSource(bg.source)}</span>
              </button>
            {/each}
          </div>

          {#if selectedChar.background}
            <div class="stat-block mt-3">
              <p class="text-[10px] uppercase tracking-wider text-dnd-text-muted font-semibold mb-1">Languages</p>
              <p class="text-[10px] text-dnd-text-muted mb-1">Auto-filled from {selectedChar.background}{selectedChar.race ? ` + ${selectedChar.race}` : ''}. Type comma-separated to change.</p>
              <input type="text" value={selectedChar.languages.join(', ')}
                oninput={(e) => set('languages', (e.target as HTMLInputElement).value.split(',').map(s=>s.trim()).filter(Boolean))}
                placeholder="e.g. Common, Elvish, Draconic" class="w-full" />
            </div>
          {/if}
          {#if bgFeatNames.length}
            <p class="text-xs text-dnd-text-muted mt-2">Auto Feats: <span class="text-dnd-gold">{bgFeatNames.join(', ')}</span></p>
          {/if}

        {:else if builderStep === 5}
          <h2 class="font-display text-lg font-semibold text-dnd-gold mb-3">Ability Scores</h2>
          <p class="text-xs text-dnd-text-muted mb-3">Total points spent: {Object.values(selectedChar.abilityScores).reduce((s, v) => s + Math.max(0, v - 10), 0)} / 27 (standard)</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {#each ABILITY_KEYS as key}
              {@const score = selectedChar.abilityScores[key] ?? 10}
              <div class="bg-dnd-dark rounded-xl p-3 text-center border border-dnd-border">
                <p class="text-[10px] uppercase tracking-wider text-dnd-text-muted font-semibold mb-1 break-words leading-tight">{ABILITY_LABELS[key]}</p>
                <p class="text-2xl font-bold text-dnd-text">{score}</p>
                <p class="text-sm font-semibold text-dnd-gold">{formatMod(abilityMod(score))}</p>
                <div class="flex items-center justify-center gap-2 mt-2">
                  <button class="filter-btn min-w-[44px] min-h-[44px] text-lg font-bold"
                    onclick={() => adjustScore(key, -1)}>-</button>
                  <button class="filter-btn min-w-[44px] min-h-[44px] text-lg font-bold"
                    onclick={() => adjustScore(key, 1)}>+</button>
                </div>
              </div>
            {/each}
          </div>
          {#if raceInfo?.ability}
            <p class="text-xs text-dnd-text-muted mt-3">
              {raceInfo.name} ability bonuses:
              <span class="text-dnd-gold">{Object.entries(raceInfo.ability).map(([k, v]) => `${ABILITY_SHORT[k as string]} +${v}`).join(', ')}</span>
            </p>
          {/if}

        {:else if builderStep === 6}
          <h2 class="font-display text-lg font-semibold text-dnd-gold mb-3">Skills</h2>
          <div class="space-y-1 mb-4">
            <h3 class="font-display text-sm font-semibold text-dnd-gold mt-2">Saving Throws</h3>
            {#each ABILITY_KEYS as ability}
              {@const proficient = selectedChar.saveProficiencies.includes(ability)}
              <button class="w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg hover:bg-dnd-dark/50 min-h-[36px]"
                onclick={() => toggleSave(ability)}>
                <div class="w-4 h-4 rounded-full border-2 border-dnd-border flex items-center justify-center shrink-0
                  {proficient ? 'bg-dnd-gold border-dnd-gold' : ''}"></div>
                <span class="font-semibold text-dnd-text w-20">{SAVE_LABELS[ability]}</span>
                {#if (classInfo?.savingThrows || []).includes(ability)}
                  <span class="text-[10px] text-dnd-text-muted">({classInfo.name})</span>
                {/if}
              </button>
            {/each}
          </div>

          {#if classSkillChoice}
            <div class="mb-4">
              <h3 class="font-display text-sm font-semibold text-dnd-gold mb-1">
                Class Skills — pick {classSkillChoice.count}
                <span class="text-dnd-text-muted font-normal">({classSkillPoolCount}/{classSkillChoice.count} chosen)</span>
              </h3>
              <div class="flex flex-wrap gap-1.5">
                {#each classSkillChoice.from as id (id)}
                  {@const effectivelyProf = selectedChar.skillProficiencies[id]?.proficient}
                  {@const atLimit = classSkillPoolCount >= classSkillChoice.count && !effectivelyProf}
                  <button
                    class="filter-btn text-[10px] px-2.5 py-1.5 min-h-[32px] {effectivelyProf ? 'active' : ''} {atLimit ? 'opacity-40' : ''}"
                    onclick={() => {
                      if (atLimit) return;
                      toggleSkill(id, 'proficient');
                    }}
                  >{(SKILLS.find((s) => s.id === id) as any)?.name || id}</button>
                {/each}
              </div>
            </div>
          {/if}

          {#if derivedSkillIds.length}
            <div class="mb-4">
              <h3 class="font-display text-sm font-semibold text-dnd-gold mb-1">From Background & Race (auto)</h3>
              <div class="flex flex-wrap gap-1.5">
                {#each derivedSkillIds as id (id)}
                  {@const cfg = selectedChar.skillProficiencies[id] || {}}
                  <span class="tag text-[10px] bg-dnd-card text-dnd-text">
                    {(SKILLS.find((s) => s.id === id) as any)?.name || id}
                    {cfg.expertise ? ' (Exp)' : ''}
                  </span>
                {/each}
              </div>
            </div>
          {/if}

          <div class="space-y-1">
            <h3 class="font-display text-sm font-semibold text-dnd-gold">All Skills (tap = proficiency, tap again = expertise)</h3>
            {#each SKILLS as skill}
              {@const cfg = selectedChar.skillProficiencies[skill.id] || {}}
              <button class="w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg hover:bg-dnd-dark/50 min-h-[36px]"
                onclick={() => toggleSkill(skill.id, cfg.proficient ? 'expertise' : 'proficient')}>
                <div class="w-4 h-4 rounded-full border-2 border-dnd-border flex items-center justify-center shrink-0
                  {cfg.expertise ? 'bg-dnd-gold border-dnd-gold' : cfg.proficient ? 'bg-dnd-gold/60 border-dnd-gold/80' : ''}">
                  {#if cfg.expertise}<span class="text-[8px] text-dnd-darker font-bold">E</span>
                  {:else if cfg.proficient}<span class="text-[8px] text-dnd-darker font-bold">P</span>{/if}
                </div>
                <span class="font-semibold text-dnd-text flex-1">{skill.name}</span>
                <span class="text-[10px] text-dnd-text-muted">{ABILITY_SHORT[skill.ability]}</span>
              </button>
            {/each}
          </div>

        {:else if builderStep === 7}
          <h2 class="font-display text-lg font-semibold text-dnd-gold mb-3">Combat</h2>
          <div class="space-y-4">
            <div class="stat-block">
              <p class="text-[10px] uppercase tracking-wider text-dnd-text-muted font-semibold mb-3">Hit Points
                {#if selectedChar.maxHpAuto}<span class="text-dnd-text-muted/60 normal-case">· auto from {selectedChar.hitDice} + CON</span>{/if}
              </p>
              {#if hpDerived != null && !selectedChar.maxHpAuto}
                <button class="filter-btn text-[10px] px-2 py-1 mb-2" onclick={() => set('maxHpAuto', true)}>
                  Re-enable auto ({selectedChar.hitDice}, CON {formatMod(abilityMod(selectedChar.abilityScores.con))}): {hpDerived}
                </button>
              {/if}
              <div class="grid grid-cols-3 gap-3">
                {#each [['maxHp', 'Max HP'], ['currentHp', 'Current'], ['tempHp', 'Temp'] ] as [field, label]}
                  <div class="text-center">
                    <p class="text-[10px] text-dnd-text-muted mb-1">{label}</p>
                    <p class="text-xl font-bold text-dnd-text">{(selectedChar as any)[field]}</p>
                    <div class="flex items-center justify-center gap-2 mt-1">
                      <button class="filter-btn min-w-[44px] min-h-[44px] text-lg font-bold"
                        onclick={() => adjustHp(field as any, -1)}>-</button>
                      <button class="filter-btn min-w-[44px] min-h-[44px] text-lg font-bold"
                        onclick={() => adjustHp(field as any, 1)}>+</button>
                    </div>
                  </div>
                {/each}
              </div>
              <div class="h-2 bg-dnd-card rounded-full overflow-hidden mt-3">
                <div class="h-full rounded-full transition-all duration-300
                  {selectedChar.currentHp <= 0 ? 'bg-red-500' : selectedChar.currentHp <= selectedChar.maxHp * 0.25 ? 'bg-red-500' : selectedChar.currentHp <= selectedChar.maxHp * 0.5 ? 'bg-yellow-500' : 'bg-green-500'}"
                  style="width: {Math.max(0, (selectedChar.currentHp / Math.max(1, selectedChar.maxHp)) * 100)}%"></div>
              </div>
              {#if selectedChar.hitDice}
                <div class="mt-3 pt-3 border-t border-dnd-border flex items-center justify-between text-xs">
                  <span class="text-dnd-text-muted">Hit Dice ({selectedChar.hitDice}) used:</span>
                  <div class="flex items-center gap-2">
                    <button class="filter-btn px-3 py-1" onclick={() => adjustHp('hitDiceUsed', -1)}>-</button>
                    <span class="font-semibold text-dnd-text">{selectedChar.hitDiceUsed} / {selectedChar.level}</span>
                    <button class="filter-btn px-3 py-1" onclick={() => adjustHp('hitDiceUsed', 1)}>+</button>
                  </div>
                </div>
              {/if}
            </div>

            <div class="stat-block">
              <p class="text-[10px] uppercase tracking-wider text-dnd-text-muted font-semibold mb-2">Armor Class
                {#if selectedChar.acAuto}<span class="text-dnd-text-muted/60 normal-case">· auto from equipment + DEX</span>{/if}
              </p>
              {#if !selectedChar.acAuto}
                <button class="filter-btn text-[10px] px-2 py-1 mb-2" onclick={() => set('acAuto', true)}>
                  Re-enable auto (equipped armor): {acDerived}
                </button>
              {/if}
              <div class="flex items-center gap-3 justify-center">
                <button class="filter-btn min-w-[44px] min-h-[44px] text-lg font-bold"
                  onclick={() => setAc(selectedChar.ac - 1)}>-</button>
                <span class="text-3xl font-bold text-dnd-text min-w-[3rem] text-center">{selectedChar.ac}</span>
                <button class="filter-btn min-w-[44px] min-h-[44px] text-lg font-bold"
                  onclick={() => setAc(selectedChar.ac + 1)}>+</button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="stat-block">
                <p class="text-[10px] uppercase tracking-wider text-dnd-text-muted font-semibold mb-2">Speed
                  {#if selectedChar.speedAuto && raceInfo}<span class="text-dnd-text-muted/60 normal-case">· auto from {raceInfo.name}</span>{/if}
                </p>
                {#if raceInfo && !selectedChar.speedAuto}
                  {@const sp = raceSpeed(raceInfo)}
                  {#if sp != null}
                    <button class="filter-btn text-[10px] px-2 py-1 mb-2" onclick={() => set('speedAuto', true)}>
                      Re-enable auto ({raceInfo.name}): {sp} ft
                    </button>
                  {/if}
                {/if}
                <div class="flex items-center gap-2 justify-center">
                  <button class="filter-btn px-3 py-1" onclick={() => setSpeed(selectedChar.speed - 5)}>-</button>
                  <span class="text-xl font-bold text-dnd-text">{selectedChar.speed} ft</span>
                  <button class="filter-btn px-3 py-1" onclick={() => setSpeed(selectedChar.speed + 5)}>+</button>
                </div>
              </div>
              <div class="stat-block">
                <p class="text-[10px] uppercase tracking-wider text-dnd-text-muted font-semibold mb-2">Initiative</p>
                <p class="text-xl font-bold text-dnd-gold text-center">
                  {formatMod(abilityMod(selectedChar.abilityScores.dex) + selectedChar.initiativeBonus)}
                  <span class="text-[10px] text-dnd-text-muted block">(DEX {formatMod(abilityMod(selectedChar.abilityScores.dex))} + {selectedChar.initiativeBonus || '0'})</span>
                </p>
              </div>
            </div>

            <div class="stat-block">
              <p class="text-[10px] uppercase tracking-wider text-dnd-text-muted font-semibold mb-2">Armor/Weapon/Tool/Language Proficiencies</p>
              <p class="text-[10px] text-dnd-text-muted mb-2">Auto-filled from class, race & background. Edit freely.</p>
              <div class="grid grid-cols-2 gap-3 text-xs space-y-1">
                <div>
                  <span class="text-dnd-text-muted">Armor:</span>
                  <input type="text" value={selectedChar.armorProficiencies.join(', ')}
                    oninput={(e) => set('armorProficiencies', (e.target as HTMLInputElement).value.split(',').map(s=>s.trim()).filter(Boolean))}
                    placeholder="e.g. Light, Shields" class="w-full mt-0.5" />
                </div>
                <div>
                  <span class="text-dnd-text-muted">Weapons:</span>
                  <input type="text" value={selectedChar.weaponProficiencies.join(', ')}
                    oninput={(e) => set('weaponProficiencies', (e.target as HTMLInputElement).value.split(',').map(s=>s.trim()).filter(Boolean))}
                    placeholder="e.g. Simple, Martial" class="w-full mt-0.5" />
                </div>
                <div>
                  <span class="text-dnd-text-muted">Tools:</span>
                  <input type="text" value={selectedChar.toolProficiencies.join(', ')}
                    oninput={(e) => set('toolProficiencies', (e.target as HTMLInputElement).value.split(',').map(s=>s.trim()).filter(Boolean))}
                    placeholder="e.g. Thieves' Tools, Herbalism Kit" class="w-full mt-0.5" />
                </div>
                <div>
                  <span class="text-dnd-text-muted">Languages:</span>
                  <input type="text" value={selectedChar.languages.join(', ')}
                    oninput={(e) => set('languages', (e.target as HTMLInputElement).value.split(',').map(s=>s.trim()).filter(Boolean))}
                    placeholder="e.g. Common, Elvish" class="w-full mt-0.5" />
                </div>
              </div>
            </div>
          </div>

        {:else if builderStep === 8}
          <h2 class="font-display text-lg font-semibold text-dnd-gold mb-3">Equipment & Coins</h2>

          {#if classStartingItems.length > 0 || bgStartingItems.length > 0}
            <div class="stat-block mb-4">
              <p class="text-[10px] uppercase tracking-wider text-dnd-text-muted font-semibold mb-2">Starting Equipment</p>
              {#if classStartingItems.length > 0}
                <div class="flex items-center justify-between gap-2 mb-1.5">
                  <span class="text-xs text-dnd-text">{selectedChar.class || 'Class'} items: <span class="text-dnd-text-muted">{classStartingItems.join(', ')}</span></span>
                  <button class="filter-btn text-[10px] px-2 py-1 min-h-[32px]" onclick={() => addStartingItems(classStartingItems)}>+ Add class</button>
                </div>
              {/if}
              {#if bgStartingItems.length > 0}
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs text-dnd-text">{selectedChar.background || 'Background'} items: <span class="text-dnd-text-muted">{bgStartingItems.join(', ')}</span></span>
                  <button class="filter-btn text-[10px] px-2 py-1 min-h-[32px]" onclick={() => addStartingItems(bgStartingItems)}>+ Add bg</button>
                </div>
              {/if}
            </div>
          {/if}

          <div class="stat-block mb-4">
            <p class="text-[10px] uppercase tracking-wider text-dnd-text-muted font-semibold mb-2">Add Custom Item</p>
            <div class="flex gap-2">
              <input type="number" min="1" max="99" value={equipQty}
                onchange={(e) => equipQty = Math.max(1, parseInt((e.target as HTMLInputElement).value) || 1)}
                class="w-14 text-center text-sm" />
              <input type="text" value={equipInput}
                oninput={(e) => equipInput = (e.target as HTMLInputElement).value}
                onkeydown={(e) => { if (e.key === 'Enter') addEquipmentCustom(); }}
                placeholder="Item name (anything)" class="flex-1 text-sm" />
              <button class="filter-btn px-3 min-h-[44px] text-sm" onclick={addEquipmentCustom}>Add</button>
            </div>
            <SearchPicker
              label="Browse equipment list"
              items={(equipmentData as any[]).map((e) => ({
                name: e.name,
                source: e.source,
                sub: e.armorCategory || EQUIP_TYPE[e.type] || e.weaponCategory || 'Gear'
              }))}
              onAdd={addEquipmentFromList}
            />
          </div>

          <div class="space-y-1 mb-4">
            {#if selectedChar.equipment.length === 0}
              <p class="text-xs text-dnd-text-muted text-center py-3">No equipment yet. Tap the ⚔ to mark a shield or armor as worn — it feeds your AC.</p>
            {/if}
            {#each selectedChar.equipment as item, i}
              <div class="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-dnd-dark/50 min-h-[36px]">
                <button class="text-dnd-text-muted {item.equipped ? 'text-dnd-gold' : ''} p-1"
                  onclick={() => toggleEquip(i)} title="Toggle equipped">⚔</button>
                <span class="flex-1 text-dnd-text truncate">{item.name}</span>
                {#if item.quantity > 1}<span class="text-dnd-text-muted">×{item.quantity}</span>{/if}
                <button class="text-dnd-text-muted hover:text-red-400 p-1" onclick={() => removeEquip(i)}>✕</button>
              </div>
            {/each}
          </div>

          <div class="stat-block">
            <p class="text-[10px] uppercase tracking-wider text-dnd-text-muted font-semibold mb-2">Coin</p>
            <div class="grid grid-cols-5 gap-2">
              {#each [['pp', 'Platinum'], ['gp', 'Gold'], ['ep', 'Electrum'], ['sp', 'Silver'], ['cp', 'Copper']] as [type, label]}
                <div class="text-center">
                  <p class="text-[10px] text-dnd-text-muted uppercase">{label}</p>
                  <input type="number" min="0" value={(selectedChar.coins as any)[type]}
                    onchange={(e) => {
                      updateChar(selectedChar.id, (c) => {
                        (c.coins as any)[type] = Math.max(0, parseInt((e.target as HTMLInputElement).value) || 0);
                      });
                    }}
                    class="w-full text-center text-sm font-semibold text-dnd-text mt-0.5" />
                </div>
              {/each}
            </div>
          </div>

        {:else if builderStep === 9}
          <h2 class="font-display text-lg font-semibold text-dnd-gold mb-3">Feats</h2>
          {#if bgFeatNames.length}
            <p class="text-xs text-dnd-text-muted mb-3">From your background: <span class="text-dnd-gold">{bgFeatNames.join(', ')}</span></p>
          {/if}
          <div class="flex gap-2 mb-3">
            <input type="text" value={featsInput}
              oninput={(e) => featsInput = (e.target as HTMLInputElement).value}
              onkeydown={(e) => { if (e.key === 'Enter') addFeatsCustom(); }}
              placeholder="Custom feat name" class="flex-1 text-sm" />
            <button class="filter-btn px-3 min-h-[44px] text-sm" onclick={addFeatsCustom}>Add</button>
          </div>
          <SearchPicker
            label="Browse feats list"
            items={(featsData as any[]).map((f) => ({ name: f.name, source: f.source, sub: f.category || '' }))}
            onAdd={(item) => addFeat(item.name)}
          />
          <div class="space-y-1 mt-3">
            {#each selectedChar.feats as feat, i}
              <div class="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg bg-dnd-dark/50 min-h-[36px]">
                <span class="flex-1 text-dnd-text">{feat}</span>
                <button class="text-dnd-text-muted hover:text-red-400 p-1" onclick={() => removeFeat(i)}>✕</button>
              </div>
            {/each}
          </div>

        {:else if builderStep === 10}
          <h2 class="font-display text-lg font-semibold text-dnd-gold mb-3">Spells</h2>

          {#if spellDerived.isCaster}
            <div class="stat-block mb-3">
              <p class="text-[10px] uppercase tracking-wider text-dnd-text-muted font-semibold mb-2">Spellcasting (auto)</p>
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div>
                  <p class="text-[10px] text-dnd-text-muted uppercase">Ability</p>
                  <p class="text-sm font-bold text-dnd-gold">{spellDerived.ability ? ABILITY_LABELS[spellDerived.ability] : '—'}</p>
                </div>
                <div>
                  <p class="text-[10px] text-dnd-text-muted uppercase">Save DC</p>
                  <p class="text-sm font-bold text-dnd-text">{spellDerived.saveDC ?? '—'}</p>
                </div>
                <div>
                  <p class="text-[10px] text-dnd-text-muted uppercase">Attack</p>
                  <p class="text-sm font-bold text-dnd-text">{spellDerived.attackBonus != null ? formatMod(spellDerived.attackBonus) : '—'}</p>
                </div>
                <div>
                  <p class="text-[10px] text-dnd-text-muted uppercase">Cantrips</p>
                  <p class="text-sm font-bold text-dnd-text">{selectedChar.spellsCantrips.length}/{spellDerived.cantripsKnown}</p>
                </div>
                <div>
                  <p class="text-[10px] text-dnd-text-muted uppercase">Known</p>
                  <p class="text-sm font-bold text-dnd-text">
                    {selectedChar.spellsKnown.length}{spellDerived.spellsKnown ? `/${spellDerived.spellsKnown}` : ''}
                  </p>
                </div>
              </div>
              {#if spellDerived.slots.some((n) => n > 0)}
                <div class="flex flex-wrap gap-2 mt-2 justify-center">
                  {#each spellDerived.slots as n, i}
                    {#if n > 0}
                      <span class="tag text-[10px] bg-dnd-dark text-dnd-text">Lv{i + 1}: {n} slot{n > 1 ? 's' : ''}</span>
                    {/if}
                  {/each}
                </div>
              {/if}
              {#if spellDerived.preparedCount != null}
                <p class="text-[10px] text-dnd-text-muted mt-2 text-center">Prepared: {spellDerived.preparedCount} ({spellDerived.preparedFormula})</p>
              {/if}
            </div>
          {/if}

          <div class="flex gap-2 mb-3">
            <button class="filter-btn px-3 min-h-[44px] text-xs {newSpellCantrip ? 'active' : ''}"
              onclick={() => newSpellCantrip = true}>Cantrip</button>
            <button class="filter-btn px-3 min-h-[44px] text-xs {!newSpellCantrip ? 'active' : ''}"
              onclick={() => newSpellCantrip = false}>Known</button>
            <input type="text" value={spellsInput}
              oninput={(e) => spellsInput = (e.target as HTMLInputElement).value}
              onkeydown={(e) => { if (e.key === 'Enter') addSpellsCustom(); }}
              placeholder="Custom spell name" class="flex-1 text-sm" />
            <button class="filter-btn px-3 min-h-[44px] text-sm" onclick={addSpellsCustom}>Add</button>
          </div>
          <SearchPicker
            label="Browse spell list"
            items={(spellsData as any[]).map((s) => ({
              name: s.name,
              source: s.source,
              sub: s.level === 0 ? 'Cantrip' : `${levelText(s.level)} · ${s.school || ''}`.trim()
            }))}
            onAdd={addSpellFromList}
          />

          {#if selectedChar.spellsCantrips.length}
            <div class="mb-2 mt-3">
              <h3 class="font-display text-sm font-semibold text-dnd-gold mb-1">Cantrips</h3>
              {#each selectedChar.spellsCantrips as spell, i}
                <div class="flex items-center gap-2 text-xs px-2 py-1 rounded-lg bg-dnd-dark/50 min-h-[32px]">
                  <span class="flex-1 text-dnd-text">{spell}</span>
                  <button class="text-dnd-text-muted hover:text-red-400 p-1" onclick={() => removeSpell('cantrips', i)}>✕</button>
                </div>
              {/each}
            </div>
          {/if}
          {#if selectedChar.spellsKnown.length}
            <div>
              <h3 class="font-display text-sm font-semibold text-dnd-gold mb-1">Known Spells</h3>
              {#each selectedChar.spellsKnown as spell, i}
                <div class="flex items-center gap-2 text-xs px-2 py-1 rounded-lg bg-dnd-dark/50 min-h-[32px]">
                  <span class="flex-1 text-dnd-text">{spell}</span>
                  <button class="text-dnd-text-muted hover:text-red-400 p-1" onclick={() => removeSpell('known', i)}>✕</button>
                </div>
              {/each}
            </div>
          {/if}

        {:else if builderStep === 11}
          <h2 class="font-display text-lg font-semibold text-dnd-gold mb-3">Character Notes</h2>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-dnd-text-muted mb-1 block" for="trait-personality">Personality Traits</label>
              <textarea id="trait-personality" value={selectedChar.traits.personality}
                oninput={(e) => updateChar(selectedChar.id, c => c.traits.personality = (e.target as HTMLTextAreaElement).value)}
                rows="2" class="w-full resize-y text-sm" placeholder="Personality traits..."></textarea>
            </div>
            <div>
              <label class="text-xs text-dnd-text-muted mb-1 block" for="trait-ideals">Ideals</label>
              <textarea id="trait-ideals" value={selectedChar.traits.ideals}
                oninput={(e) => updateChar(selectedChar.id, c => c.traits.ideals = (e.target as HTMLTextAreaElement).value)}
                rows="2" class="w-full resize-y text-sm" placeholder="Ideals..."></textarea>
            </div>
            <div>
              <label class="text-xs text-dnd-text-muted mb-1 block" for="trait-bonds">Bonds</label>
              <textarea id="trait-bonds" value={selectedChar.traits.bonds}
                oninput={(e) => updateChar(selectedChar.id, c => c.traits.bonds = (e.target as HTMLTextAreaElement).value)}
                rows="2" class="w-full resize-y text-sm" placeholder="Bonds..."></textarea>
            </div>
            <div>
              <label class="text-xs text-dnd-text-muted mb-1 block" for="trait-flaws">Flaws</label>
              <textarea id="trait-flaws" value={selectedChar.traits.flaws}
                oninput={(e) => updateChar(selectedChar.id, c => c.traits.flaws = (e.target as HTMLTextAreaElement).value)}
                rows="2" class="w-full resize-y text-sm" placeholder="Flaws..."></textarea>
            </div>
            <div>
              <label class="text-xs text-dnd-text-muted mb-1 block" for="trait-notes">General Notes</label>
              <textarea id="trait-notes" value={selectedChar.notes}
                oninput={(e) => set('notes', (e.target as HTMLTextAreaElement).value)}
                rows="5" class="w-full resize-y text-sm" placeholder="Additional notes..."></textarea>
            </div>
          </div>
        {/if}
      </div>

      <!-- Mini summary + quick switches for inspiration/death saves -->
      <div class="card mb-4 stat-block">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-display text-sm font-bold text-dnd-gold">{selectedChar.name || 'Unnamed'}</h3>
          <div class="flex gap-2 items-center">
            <button class="filter-btn px-2 py-1 text-[10px] {selectedChar.inspiration ? 'active' : ''}"
              onclick={() => set('inspiration', !selectedChar.inspiration)}>Inspiration</button>
            <button class="filter-btn text-[10px] px-3 text-red-400 hover:text-red-300 hover:bg-red-900/20"
              onclick={() => deleteCharacter(selectedChar.id)}>Delete</button>
          </div>
        </div>
        <div class="grid grid-cols-6 gap-2 text-center">
          {#each ABILITY_KEYS as key}
            {@const score = selectedChar.abilityScores[key] ?? 10}
            {@const mod = abilityMod(score)}
            <div class="bg-dnd-darker rounded-lg p-1.5">
              <p class="text-[9px] uppercase text-dnd-text-muted tracking-wider">{ABILITY_SHORT[key]}</p>
              <p class="text-sm font-bold text-dnd-text">{score}</p>
              <p class="text-[10px] font-semibold text-dnd-gold">{formatMod(mod)}</p>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>