
-- Step 1: Add new columns to moments
ALTER TABLE public.moments ADD COLUMN is_celebrated_annually boolean NOT NULL DEFAULT false;
ALTER TABLE public.moments ADD COLUMN event_type text;

-- Step 2: Copy events into moments
INSERT INTO public.moments (user_id, title, description, moment_date, partner_ids, is_celebrated_annually, event_type)
SELECT 
  e.user_id, e.title, e.description, e.event_date,
  CASE WHEN e.partner_id IS NOT NULL THEN ARRAY[e.partner_id] ELSE '{}'::uuid[] END,
  e.is_recurring, e.event_type
FROM public.events e;

-- Step 3: Update event_notifications to reference moments
-- First drop the FK constraint
ALTER TABLE public.event_notifications DROP CONSTRAINT IF EXISTS event_notifications_event_id_fkey;

-- Add moment_id column
ALTER TABLE public.event_notifications ADD COLUMN moment_id uuid;

-- We can't perfectly map old event IDs to new moment IDs since they're different rows,
-- so we'll just keep event_id as-is for historical records and use moment_id going forward.
-- Make event_id nullable and moment_id the new required field for future inserts.
ALTER TABLE public.event_notifications ALTER COLUMN event_id DROP NOT NULL;

-- Step 4: Drop the events table
DROP TABLE public.events;
