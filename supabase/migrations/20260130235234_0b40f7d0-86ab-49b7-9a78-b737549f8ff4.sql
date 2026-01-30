-- Create view for current AI allowance with dynamic credit calculations
CREATE OR REPLACE VIEW public.v_ai_allowance_current AS
SELECT
  ap.id,
  ap.user_id,
  ap.tokens_granted,
  ap.tokens_used,
  (ap.tokens_granted - ap.tokens_used) AS remaining_tokens,
  cs.value_int AS tokens_per_credit,
  (ap.tokens_granted / cs.value_int) AS credits_granted,
  (ap.tokens_used / cs.value_int) AS credits_used,
  ((ap.tokens_granted - ap.tokens_used) / cs.value_int) AS remaining_credits,
  ap.period_start,
  ap.period_end,
  ap.source,
  ap.metadata,
  ap.created_at,
  ap.updated_at
FROM public.ai_allowance_periods ap
CROSS JOIN public.ai_credit_settings cs
WHERE cs.key = 'tokens_per_credit'
  AND now() >= ap.period_start
  AND now() < ap.period_end;