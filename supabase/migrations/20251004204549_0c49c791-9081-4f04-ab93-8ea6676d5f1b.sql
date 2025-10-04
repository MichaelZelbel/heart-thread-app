-- Add email notification fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verification_pending BOOLEAN DEFAULT false;

-- Create table to track sent notifications (prevent duplicates)
CREATE TABLE IF NOT EXISTS public.event_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  notification_date DATE NOT NULL,
  notified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id, notification_date)
);

-- Enable RLS on event_notifications
ALTER TABLE public.event_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_notifications
CREATE POLICY "Users can view their own notifications"
ON public.event_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
ON public.event_notifications
FOR INSERT
WITH CHECK (true);

-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests from cron
CREATE EXTENSION IF NOT EXISTS pg_net;