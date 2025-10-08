-- Harden profiles access with scoped RLS (Postgres 14-compatible), revoke grants, and enforce FORCE RLS
BEGIN;

-- Ensure RLS is enabled and forced
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Revoke direct grants so access depends solely on RLS
REVOKE ALL ON TABLE public.profiles FROM PUBLIC;
REVOKE ALL ON TABLE public.profiles FROM anon;
REVOKE ALL ON TABLE public.profiles FROM authenticated;

-- Drop existing overlapping policies to avoid permissive unions
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles cannot be deleted" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only modify their own profile data" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_data_only" ON public.profiles;
DROP POLICY IF EXISTS "profiles_require_auth" ON public.profiles;

-- Minimal policy set scoped explicitly to the authenticated role
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles_insert_own_only"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- No DELETE policy defined => deletes are denied by default under RLS

-- Invariant assertions to fail future drift
DO $$
DECLARE
  _forced boolean;
  _missing int;
BEGIN
  SELECT c.relforcerowsecurity INTO _forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'profiles';

  IF NOT coalesce(_forced, false) THEN
    RAISE EXCEPTION 'profiles must have FORCE RLS enabled';
  END IF;

  SELECT count(*) INTO _missing FROM (
    SELECT 'profiles_select_own_or_admin' AS name UNION ALL
    SELECT 'profiles_insert_own_only' UNION ALL
    SELECT 'profiles_update_own_or_admin'
  ) req
  LEFT JOIN pg_policies p
    ON p.schemaname = 'public' AND p.tablename = 'profiles' AND p.policyname = req.name
  WHERE p.policyname IS NULL;

  IF _missing > 0 THEN
    RAISE EXCEPTION 'profiles policies missing/renamed, drift=%', _missing;
  END IF;
END $$;

COMMIT;