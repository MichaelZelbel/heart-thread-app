-- Comprehensive hardening of profiles table to ensure RLS is fully enforced
-- This migration is idempotent and safe to run multiple times

-- 1. Ensure RLS is enabled on profiles table (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Force RLS even for table owner/superuser (maximum security)
-- This ensures even privileged users must go through RLS policies
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- 3. Revoke all default public grants (if any exist)
REVOKE ALL ON TABLE public.profiles FROM PUBLIC;
REVOKE ALL ON TABLE public.profiles FROM anon;

-- 4. Grant only necessary privileges to authenticated users
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

-- 5. Verify all deny policies are in place for anonymous users
-- (These were created in previous migration, but we'll recreate if needed)
DO $$ 
BEGIN
    -- Drop and recreate to ensure they exist with correct definitions
    DROP POLICY IF EXISTS "Deny anonymous SELECT on profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Deny anonymous INSERT on profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Deny anonymous UPDATE on profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Deny anonymous DELETE on profiles" ON public.profiles;
    
    CREATE POLICY "Deny anonymous SELECT on profiles"
    ON public.profiles
    FOR SELECT
    TO anon
    USING (false);
    
    CREATE POLICY "Deny anonymous INSERT on profiles"
    ON public.profiles
    FOR INSERT
    TO anon
    WITH CHECK (false);
    
    CREATE POLICY "Deny anonymous UPDATE on profiles"
    ON public.profiles
    FOR UPDATE
    TO anon
    USING (false)
    WITH CHECK (false);
    
    CREATE POLICY "Deny anonymous DELETE on profiles"
    ON public.profiles
    FOR DELETE
    TO anon
    USING (false);
END $$;