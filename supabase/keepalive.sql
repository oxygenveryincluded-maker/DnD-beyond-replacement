-- Keep the Free-plan project from being paused for inactivity.
--
-- Supabase pauses Free projects after ~7 days with too little database
-- activity. The GitHub Actions workflow in .github/workflows/keepalive.yml
-- calls this function every couple of days. Any successful query counts as
-- activity.
--
-- Run this once in Dashboard -> SQL -> New query.

create or replace function public.keep_alive()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object('ok', true, 'at', now());
$$;

revoke all on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;
