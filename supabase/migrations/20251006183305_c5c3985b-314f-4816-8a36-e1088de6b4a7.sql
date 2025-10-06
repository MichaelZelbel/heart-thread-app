-- Defense-in-depth hardening for profiles and event_notifications (no RESTRICTIVE syntax)

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_notifications ENABLE ROW LEVEL SECURITY;

-- 1) Harden profiles against anonymous access and enumeration
-- Revoke any direct table privileges from anon and ensure authenticated has only what is needed
REVOKE ALL ON TABLE public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Replace previous anon deny policy with explicit deny policies
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;
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

-- 2) Lock down event_notifications updates/deletes from users to avoid manipulation
REVOKE ALL ON TABLE public.event_notifications FROM anon;
GRANT SELECT ON public.event_notifications TO authenticated;

DROP POLICY IF EXISTS "Users cannot update event notifications" ON public.event_notifications;
DROP POLICY IF EXISTS "Users cannot delete event notifications" ON public.event_notifications;

CREATE POLICY "Users cannot update event notifications"
ON public.event_notifications
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Users cannot delete event notifications"
ON public.event_notifications
FOR DELETE
TO authenticated
USING (false);
