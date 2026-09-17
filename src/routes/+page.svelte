<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import {
    initCloudAuth,
    authState,
    isCloudConfigured,
    signInCloud,
    signUpCloud,
    signOutCloud,
    syncNow,
    getSupabase
  } from '$lib/cloud';
  
  const quickLinks = [
    { href: '/spells', label: 'Spells', desc: 'Browse all spells', color: 'from-purple-900/50 to-indigo-900/50' },
    { href: '/classes', label: 'Classes', desc: 'All classes & subclasses', color: 'from-red-900/50 to-rose-900/50' },
    { href: '/equipment', label: 'Equipment', desc: 'Weapons, armor & gear', color: 'from-amber-900/50 to-yellow-900/50' },
    { href: '/magic-items', label: 'Magic Items', desc: 'All magic items', color: 'from-cyan-900/50 to-teal-900/50' },
    { href: '/feats', label: 'Feats', desc: 'All feats', color: 'from-emerald-900/50 to-green-900/50' },
    { href: '/races', label: 'Races', desc: 'All races & subraces', color: 'from-orange-900/50 to-amber-900/50' },
    { href: '/backgrounds', label: 'Backgrounds', desc: 'All backgrounds', color: 'from-pink-900/50 to-fuchsia-900/50' },
    { href: '/character', label: 'Builder', desc: 'Character builder', color: 'from-blue-900/50 to-sky-900/50' },
    { href: '/dice', label: 'Dice', desc: 'Dice roller', color: 'from-slate-800/50 to-zinc-800/50' },
    { href: '/rules', label: 'Rules', desc: 'Conditions & rules', color: 'from-violet-900/50 to-purple-900/50' },
  ];

  let email = $state('');
  let password = $state('');
  let busy = $state(false);
  let msg = $state<{ ok: boolean; text: string } | null>(null);
  let showChangePw = $state(false);
  let newPw = $state('');
  let newPw2 = $state('');

  onMount(() => initCloudAuth());

  async function doSignIn() {
    if (!$authState.loading && $authState.user) return;
    busy = true;
    msg = null;
    try {
      await signInCloud(email.trim(), password);
      const sb = getSupabase();
      const { data } = await sb!.auth.getSession();
      const userId = data.session?.user?.id ?? null;
      if (userId) await syncNow(userId);
      msg = { ok: true, text: `Signed in as ${email.trim()}. Characters synced.` };
    } catch (e) {
      msg = { ok: false, text: (e as Error).message };
    } finally {
      busy = false;
    }
  }

  async function doSignUp() {
    if (!$authState.loading && $authState.user) return;
    busy = true;
    msg = null;
    try {
      await signUpCloud(email.trim(), password);
      msg = { ok: true, text: `Account created. Check your email to confirm, then sign in.` };
      password = '';
    } catch (e) {
      msg = { ok: false, text: (e as Error).message };
    } finally {
      busy = false;
    }
  }

  async function doSyncNow() {
    if (!$authState.user) return;
    busy = true;
    msg = null;
    try {
      await syncNow($authState.user);
      msg = { ok: true, text: 'Characters synced to cloud.' };
    } catch (e) {
      msg = { ok: false, text: (e as Error).message };
    } finally {
      busy = false;
    }
  }

  async function doChangePw() {
    const sb = getSupabase();
    if (!sb || !$authState.user) return;
    if (newPw.length < 6) { msg = { ok: false, text: 'Password must be at least 6 characters.' }; return; }
    if (newPw !== newPw2) { msg = { ok: false, text: 'Passwords do not match.' }; return; }
    busy = true;
    msg = null;
    try {
      const { error } = await sb.auth.updateUser({ password: newPw });
      if (error) throw new Error(error.message);
      msg = { ok: true, text: 'Password changed successfully.' };
      showChangePw = false;
      newPw = '';
      newPw2 = '';
    } catch (e) {
      msg = { ok: false, text: (e as Error).message };
    } finally {
      busy = false;
    }
  }

  async function doSignOut() {
    await signOutCloud();
    msg = null;
  }
</script>

<svelte:head><title>D&D Companion</title></svelte:head>

<div class="px-4 pt-6 pb-4 max-w-3xl mx-auto">
  <div class="mb-6 text-center">
    <h1 class="font-display text-3xl font-bold text-dnd-gold mb-1">D&D Companion</h1>
    <p class="text-sm text-dnd-text-muted">5e & 5.5e Content Browser</p>
  </div>
  
  <div class="mb-8">
    <SearchBar />
  </div>

  <div class="card mb-5">
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-display text-sm font-semibold text-dnd-gold">☁ Cloud Sync</h2>
      {#if $authState.user}
        <span class="tag text-[10px] bg-emerald-900/40 text-emerald-300">signed in</span>
      {:else if !$authState.loading && isCloudConfigured()}
        <span class="tag text-[10px] bg-dnd-dark text-dnd-text-muted">not signed in</span>
      {/if}
    </div>

    {#if !isCloudConfigured()}
      <p class="text-xs text-dnd-text-muted">
        Cloud sync isn't configured yet. Open <code class="text-dnd-text">src/lib/config.ts</code> and paste your Supabase
        project URL and anon key, then run the SQL in <code class="text-dnd-text">supabase/schema.sql</code>.
      </p>
    {:else if $authState.loading}
      <p class="text-xs text-dnd-text-muted">Checking sign-in…</p>
    {:else if $authState.user}
      <p class="text-xs text-dnd-text-muted mb-2">Signed in as <span class="text-dnd-text">{ $authState.email }</span>. Changes to characters save to the cloud automatically.</p>
<div class="flex gap-2">
          <button class="filter-btn text-xs px-3 py-2" onclick={doSyncNow} disabled={busy}>
            {busy ? 'Syncing…' : 'Sync now'}
          </button>
          <button class="filter-btn text-xs px-3 py-2" onclick={() => { showChangePw = !showChangePw; newPw = ''; newPw2 = ''; msg = null; }}>
            {showChangePw ? 'Cancel' : 'Change password'}
          </button>
          <button class="filter-btn text-xs px-3 py-2" onclick={doSignOut}>Sign out</button>
        </div>

        {#if showChangePw}
          <div class="mt-3 pt-3 border-t border-dnd-border space-y-2">
            <div>
              <label class="text-xs text-dnd-text-muted mb-1 block" for="new-pw">New password</label>
              <input id="new-pw" type="password" value={newPw}
                oninput={(e) => newPw = (e.target as HTMLInputElement).value} class="w-full" autocomplete="new-password" />
            </div>
            <div>
              <label class="text-xs text-dnd-text-muted mb-1 block" for="new-pw2">Confirm password</label>
              <input id="new-pw2" type="password" value={newPw2}
                oninput={(e) => newPw2 = (e.target as HTMLInputElement).value} class="w-full" autocomplete="new-password"
                onkeydown={(e) => { if (e.key === 'Enter') doChangePw(); }} />
            </div>
            <button class="filter-btn text-xs px-3 py-2 font-semibold" onclick={doChangePw} disabled={busy}>
              {busy ? '…' : 'Save new password'}
            </button>
          </div>
        {/if}
    {:else}
      <div class="space-y-3">
        <div>
          <label class="text-xs text-dnd-text-muted mb-1 block" for="cloud-email">Email</label>
          <input id="cloud-email" type="email" value={email}
            oninput={(e) => email = (e.target as HTMLInputElement).value} class="w-full" autocomplete="email" />
        </div>
        <div>
          <label class="text-xs text-dnd-text-muted mb-1 block" for="cloud-pw">Password</label>
          <input id="cloud-pw" type="password" value={password}
            oninput={(e) => password = (e.target as HTMLInputElement).value} class="w-full" autocomplete="current-password"
            onkeydown={(e) => { if (e.key === 'Enter') doSignIn(); }} />
        </div>
        <div class="flex gap-2">
          <button class="filter-btn flex-1 py-2.5 text-sm font-semibold" onclick={doSignIn} disabled={busy}>
            {busy ? '…' : 'Sign in'}
          </button>
          <button class="filter-btn flex-1 py-2.5 text-sm" onclick={doSignUp} disabled={busy}>
            Create account
          </button>
        </div>
      </div>
    {/if}

    {#if msg}
      <p class="text-xs mt-3 {msg.ok ? 'text-emerald-300' : 'text-red-400'}">{msg.text}</p>
    {/if}
  </div>
  
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
    {#each quickLinks as link}
      <a href={base + link.href} class="card group bg-gradient-to-br {link.color} hover:border-dnd-gold transition-all">
        <h3 class="font-display font-semibold text-dnd-text group-hover:text-dnd-gold transition-colors">{link.label}</h3>
        <p class="text-xs text-dnd-text-muted mt-0.5">{link.desc}</p>
      </a>
    {/each}
  </div>
</div>
