-- Set up cron job to send event reminders every 15 minutes
-- Schedule the job to run every 15 minutes
SELECT cron.schedule(
  'send-event-reminders-every-15-min',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://wghsyeluwojspkyppyvv.supabase.co/functions/v1/send-event-reminders',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    ) as request_id;
  $$
);