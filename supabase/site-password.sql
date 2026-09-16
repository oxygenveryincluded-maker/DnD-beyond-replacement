-- Server-side master password check (github Pages / SPA friendly).
-- Run this ONCE in the Supabase SQL Editor.
-- To change the password later: edit the string below, re-run this script,
-- and no client code needs to change.

-- 1) Table holding the SHA-256 hash. RLS is ON with NO SELECT policy for the
--    anon/authenticated roles, so the hash can never be read through the API.
CREATE TABLE IF NOT EXISTS public.app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- 2) Store the hash of the master password (NOT the plaintext).
INSERT INTO public.app_config (key, value)
VALUES ('site_password_hash', encode(sha256('BETTERDNDBEYOND'::bytea), 'hex'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3) Verification function. SECURITY DEFINER runs it as the table owner, so it
--    may read app_config even though direct SELECT is blocked for anon.
--    PUBLIC has default EXECUTE access to functions, which is what the app uses.
CREATE OR REPLACE FUNCTION public.check_site_password(pwd text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_config
    WHERE key = 'site_password_hash'
      AND value = encode(sha256(pwd::bytea), 'hex')
  );
$$;

-- 4) Sanity check (should return true):
-- select public.check_site_password('BETTERDNDBEYOND');