-- Drop the ineffective deny anonymous policies
DROP POLICY IF EXISTS "Deny anonymous SELECT on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous INSERT on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous UPDATE on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous DELETE on profiles" ON public.profiles;

-- Add a RESTRICTIVE policy that requires authentication for all operations
-- This policy is AND'd with all other policies, ensuring anonymous users are always blocked
CREATE POLICY "Require authentication for profiles access"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO PUBLIC
USING (auth.uid() IS NOT NULL);

-- Add another RESTRICTIVE policy for INSERT/UPDATE to ensure user_id matches authenticated user
CREATE POLICY "Users can only modify their own profile data"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO PUBLIC
WITH CHECK (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role));