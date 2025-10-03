-- Add is_recurring column to events table
ALTER TABLE public.events
ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT false;

-- Update existing Birthday events to be recurring
UPDATE public.events
SET is_recurring = true
WHERE event_type = 'birthday';

COMMENT ON COLUMN public.events.is_recurring IS 'Whether this event repeats yearly. Birthdays are always recurring.';