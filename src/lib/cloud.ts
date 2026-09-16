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

export function mergeCharacters(cloud: unknown[] | null | undefined, local: Character[]): Character[] {
  const out = [...local];
  if (!Array.isArray(cloud) || cloud.length === 0) return out;
  const byId = new Map(local.map((c) => [c.id, c]));
  for (const raw of cloud) {
    const cc = raw as any;
    const id = cc?.id as string | undefined;
    if (!id) continue;
    const existing = byId.get(id);
    const cu = Number(cc.updatedAt ?? 0);
    const lu = Number(existing?.updatedAt ?? 0);
    if (!existing) {
      out.push(migrateCharacter(cc));
    } else if (cu > lu) {
      const idx = out.findIndex((m) => m.id === id);
      if (idx >= 0) out[idx] = migrateCharacter(cc);
    }
  }
  return out;
}

export async function syncNow(user: string | null): Promise<Character[]> {
  const local = loadCharacters();
  if (!user) return local;
  const cloud = await fetchCloudData(user);
  const merged = mergeCharacters(cloud?.characters ?? [], local);
  saveCharacters(merged);
  await pushCloudData(user, merged);
  return merged;
}