-- Fix view to use SECURITY INVOKER (respects RLS of querying user)
ALTER VIEW public.v_ai_allowance_current SET (security_invoker = on);