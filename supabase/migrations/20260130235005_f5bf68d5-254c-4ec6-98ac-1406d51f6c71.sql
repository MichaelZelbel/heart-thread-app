-- Create is_admin helper function using existing user_roles table
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::app_role
  )
$$;

-- 1. AI Credit Settings table
CREATE TABLE public.ai_credit_settings (
  key text PRIMARY KEY,
  value_int integer NOT NULL,
  description text
);

-- Insert default settings
INSERT INTO public.ai_credit_settings (key, value_int, description) VALUES
  ('tokens_per_credit', 200, 'LLM tokens per display credit'),
  ('credits_free_per_month', 0, 'Monthly credits for free users'),
  ('credits_premium_per_month', 1500, 'Monthly credits for premium users');

-- Enable RLS
ALTER TABLE public.ai_credit_settings ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can SELECT
CREATE POLICY "Anyone can view credit settings"
ON public.ai_credit_settings
FOR SELECT
USING (true);

-- RLS: Only admins can UPDATE
CREATE POLICY "Admins can update credit settings"
ON public.ai_credit_settings
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 2. AI Allowance Periods table
CREATE TABLE public.ai_allowance_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tokens_granted bigint DEFAULT 0,
  tokens_used bigint DEFAULT 0,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  source text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_allowance_periods ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own periods
CREATE POLICY "Users can view their own allowance periods"
ON public.ai_allowance_periods
FOR SELECT
USING (auth.uid() = user_id);

-- RLS: Admins can view all periods
CREATE POLICY "Admins can view all allowance periods"
ON public.ai_allowance_periods
FOR SELECT
USING (public.is_admin(auth.uid()));

-- RLS: Admins can insert periods
CREATE POLICY "Admins can insert allowance periods"
ON public.ai_allowance_periods
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- RLS: Admins can update periods
CREATE POLICY "Admins can update allowance periods"
ON public.ai_allowance_periods
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_ai_allowance_periods_updated_at
BEFORE UPDATE ON public.ai_allowance_periods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3. LLM Usage Events table (append-only ledger)
CREATE TABLE public.llm_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  feature text,
  model text,
  provider text,
  prompt_tokens bigint DEFAULT 0,
  completion_tokens bigint DEFAULT 0,
  total_tokens bigint DEFAULT 0,
  credits_charged numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.llm_usage_events ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only SELECT their own events
CREATE POLICY "Users can view their own usage events"
ON public.llm_usage_events
FOR SELECT
USING (auth.uid() = user_id);

-- RLS: Admins can view all events
CREATE POLICY "Admins can view all usage events"
ON public.llm_usage_events
FOR SELECT
USING (public.is_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies for clients - only service role can write