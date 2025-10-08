-- Drop the problematic policy
DROP POLICY IF EXISTS "Require authentication for profiles access" ON public.profiles;

-- Create first RESTRICTIVE layer: Must be authenticated
CREATE POLICY "profiles_require_auth"
ON public.profiles
AS RESTRICTIVE
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Create second RESTRICTIVE layer: Must be viewing own data OR be admin
CREATE POLICY "profiles_own_data_only"
ON public.profiles
AS RESTRICTIVE
FOR ALL
USING (
  auth.uid() = id 
  OR public.has_role(auth.uid(), 'admin'::app_role)
);