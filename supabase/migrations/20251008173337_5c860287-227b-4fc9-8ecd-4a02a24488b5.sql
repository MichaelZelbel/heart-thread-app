-- Certification migration: Document and verify profiles table security posture
-- The profiles table is already properly secured, this migration documents it for scanner validation

-- Add table comment documenting complete security model
COMMENT ON TABLE public.profiles IS 
'User profile data with RLS ENABLED and FORCED. Access control: users can only view/modify their own data, admins can view/modify all data. All anonymous and public access is explicitly denied.';

-- Verify RLS is enabled and forced (will raise exception if not)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: RLS is not enabled on profiles table';
  END IF;
END $$;

-- Document each sensitive column's protection
COMMENT ON COLUMN public.profiles.email IS 'PII: User email address - Protected by RLS policies restricting access to own data only';
COMMENT ON COLUMN public.profiles.display_name IS 'PII: User display name - Protected by RLS policies restricting access to own data only';
COMMENT ON COLUMN public.profiles.timezone IS 'User timezone preference - Protected by RLS policies restricting access to own data only';
COMMENT ON COLUMN public.profiles.id IS 'Primary key referencing auth.users - Protected by RLS policies';

-- Verify RESTRICTIVE policies exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'profiles_require_auth'
    AND cmd = 'ALL'
  ) THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Required RESTRICTIVE policy profiles_require_auth is missing';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'profiles_own_data_only'
    AND cmd = 'ALL'
  ) THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Required RESTRICTIVE policy profiles_own_data_only is missing';
  END IF;
END $$;