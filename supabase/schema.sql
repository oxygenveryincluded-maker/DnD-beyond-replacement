-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query)
create table if not exists public.user_data (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null unique references auth.users(id) on delete cascade,
  data jsonb not null default '{"characters":[],"updatedAt":0}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "select own" on public.user_data;
create policy "select own" on public.user_data
  for select using (auth.uid() = owner);

drop policy if exists "insert own" on public.user_data;
create policy "insert own" on public.user_data
  for insert with check (auth.uid() = owner);

drop policy if exists "update own" on public.user_data;
create policy "update own" on public.user_data
  for update using (auth.uid() = owner) with check (auth.uid() = owner);

-- Limit each account's saved payload so one account cannot exhaust the free
-- tier (or accidentally push a multi-megabyte blob). Safe to re-run.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_data_size_limit'
  ) then
    alter table public.user_data
      add constraint user_data_size_limit check (pg_column_size(data) <= 4194304);
  end if;
end $$;