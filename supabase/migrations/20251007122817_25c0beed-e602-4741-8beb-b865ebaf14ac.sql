-- Fix public exposure of event_notifications table
-- Drop existing policies that apply to public role
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.event_notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.event_notifications;

-- Recreate policies restricted to authenticated users only
CREATE POLICY "Users can view their own notifications"
ON public.event_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role can insert (this needs to stay as-is for the edge function to work)
CREATE POLICY "Service role can insert notifications"
ON public.event_notifications
FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

-- Fix public exposure of profiles table
-- Drop existing policies that apply to public role
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view their own profile" ON public.profiles;

-- Recreate policies restricted to authenticated users only
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);