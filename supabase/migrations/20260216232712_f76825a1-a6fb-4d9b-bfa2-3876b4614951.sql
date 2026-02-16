-- Add unique index to prevent duplicate notifications from concurrent runs
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_notifications_unique_moment
ON public.event_notifications (user_id, moment_id, notification_date)
WHERE moment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_notifications_unique_event
ON public.event_notifications (user_id, event_id, notification_date)
WHERE event_id IS NOT NULL;