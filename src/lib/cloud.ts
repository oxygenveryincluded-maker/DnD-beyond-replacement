import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { writable } from 'svelte/store';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$lib/config';
import { loadCharacters, saveCharacters, migrateCharacter, type Character } from '$lib/utils/character-store';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

export function isCloudConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export interface CloudAuthState {
  user: string | null;
  email: string | null;
  loading: boolean;
}

export const authState = writable<CloudAuthState>({ user: null, email: null, loading: true });

let initialized = false;
export function initCloudAuth(): void {
  if (initialized) return;
  initialized = true;
  const sb = getSupabase();
  if (!sb) {
    authState.set({ user: null, email: null, loading: false });
    return;
  }
  sb.auth.getSession().then(({ data }) => {
    const s = data.session;
    authState.set({ user: s?.user?.id ?? null, email: s?.user?.email ?? null, loading: false });
  });
  sb.auth.onAuthStateChange((_event, session) => {
    authState.set({ user: session?.user?.id ?? null, email: session?.user?.email ?? null, loading: false });
  });
}

export async function signInCloud(email: string, password: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Cloud sync is not configured');
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function signUpCloud(email: string, password: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Cloud sync is not configured');
  const { error } = await sb.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
}

export async function signOutCloud(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

export interface CloudData {
  characters: unknown[];
  updatedAt: number;
}

export async function fetchCloudData(userId: string | null): Promise<CloudData | null> {
  const sb = getSupabase();
  if (!sb || !userId) return null;
  const { data, error } = await sb.from('user_data').select('data').eq('owner', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return ((data as { data: CloudData } | null)?.data ?? null);
}

export async function pushCloudData(userId: string | null, characters: Character[]): Promise<void> {
  const sb = getSupabase();
  if (!sb || !userId) return;
  const { error } = await sb.from('user_data').upsert(
    {
      owner: userId,
      data: { characters, updatedAt: Date.now() },
      updated_at: new Date().toISOString()
    },
    { onConflict: 'owner' }
  );
  if (error) throw new Error(error.message);
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleCloudPush(user: string, characters: Character[]): void {
  if (!getSupabase()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushCloudData(user, characters).catch((e) => console.error('cloud push failed:', e));
  }, 800);
}

export async function pushCloudNow(user: string, characters: Character[]): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  await pushCloudData(user, characters);
}

export interface MergeResult {
  characters: Character[];
  added: number;
  updated: number;
}

function normName(n: unknown): string {
  return String(n ?? '').trim().toLowerCase();
}

export function mergeCharacters(
  cloud: unknown[] | null | undefined,
  local: Character[]
): MergeResult {
  const out = [...local];
  const empty: MergeResult = { characters: out, added: 0, updated: 0 };
  if (!Array.isArray(cloud) || cloud.length === 0) return empty;
  const byId = new Map(out.map((c) => [c.id, c]));
  const byName = new Map<string, Character>();
  for (const c of out) {
    const n = normName((c as any)?.name);
    if (n && !byName.has(n)) byName.set(n, c);
  }
  for (const raw of cloud) {
    const cc = raw as any;
    if (!cc || typeof cc !== 'object') continue;
    const cu = Number(cc.updatedAt ?? 0);
    let target: Character | undefined;
    if (cc.id) target = byId.get(cc.id);
    // Same character recreated on another device gets a new id: fall back to
    // matching by name so edits update in place instead of duplicating.
    // Most recent version (by updatedAt) wins; ids converge on the winner.
    if (!target) {
      const n = normName(cc.name);
      if (n) target = byName.get(n);
    }
    if (!target) {
      if (!cc.id && !normName(cc.name)) continue;
      const migrated = migrateCharacter(cc);
      out.push(migrated);
      if (migrated.id) byId.set(migrated.id, migrated);
      const n = normName((migrated as any)?.name);
      if (n && !byName.has(n)) byName.set(n, migrated);
      empty.added++;
    } else if (cu > Number((target as any)?.updatedAt ?? 0)) {
      const idx = out.findIndex((m) => m === target);
      const migrated = migrateCharacter(cc);
      if (idx >= 0) out[idx] = migrated;
      if ((target as Character).id) byId.delete((target as Character).id);
      if (migrated.id) byId.set(migrated.id, migrated);
      const n = normName((migrated as any)?.name);
      if (n) byName.set(n, migrated);
      empty.updated++;
    }
    // Older-or-equal cloud copies are ignored: never downgrade, never duplicate.
  }
  return empty;
}

export async function syncNow(user: string | null): Promise<MergeResult> {
  const local = loadCharacters();
  if (!user) return { characters: local, added: 0, updated: 0 };
  const cloud = await fetchCloudData(user);
  const merged = mergeCharacters(cloud?.characters ?? [], local);
  saveCharacters(merged.characters);
  await pushCloudData(user, merged.characters);
  return merged;
}