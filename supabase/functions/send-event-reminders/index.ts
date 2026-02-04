import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resendApiKey = Deno.env.get('RESEND_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface UserWithEvents {
  id: string;
  display_name: string;
  email: string;
  timezone: string;
}

interface Event {
  id: string;
  title: string;
  event_date: string;
  is_recurring: boolean;
  event_type: string;
  description: string | null;
  partner_id: string | null;
}

interface Partner {
  id: string;
  name: string;
  birthdate: string | null;
}

/**
 * Parse a date string (YYYY-MM-DD) into local date components.
 * This avoids UTC conversion issues that cause day shifts.
 */
function parseDateString(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

/**
 * Get tomorrow's date components in the user's timezone.
 */
function getTomorrowInTimezone(timezone: string): { month: number; day: number } {
  const now = new Date();
  // Get current time in user's timezone
  const userNowStr = now.toLocaleString('en-US', { timeZone: timezone });
  const userNow = new Date(userNowStr);
  
  // Add one day to get tomorrow
  userNow.setDate(userNow.getDate() + 1);
  
  return {
    month: userNow.getMonth() + 1, // 1-indexed
    day: userNow.getDate(),
  };
}

/**
 * Format tomorrow's date as YYYY-MM-DD for notification tracking.
 */
function getTomorrowDateString(timezone: string): string {
  const now = new Date();
  const userNowStr = now.toLocaleString('en-US', { timeZone: timezone });
  const userNow = new Date(userNowStr);
  userNow.setDate(userNow.getDate() + 1);
  
  const year = userNow.getFullYear();
  const month = String(userNow.getMonth() + 1).padStart(2, '0');
  const day = String(userNow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting event reminder job...');

    // Get all users with notifications enabled
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, display_name, email, timezone')
      .eq('email_notifications_enabled', true)
      .not('email', 'is', null);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.log('No users with notifications enabled');
      return new Response(JSON.stringify({ message: 'No users to notify' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${users.length} users with notifications enabled`);

    const notificationsSent = [];
    const now = new Date();

    for (const user of users as UserWithEvents[]) {
      try {
        // Calculate "now" in the user's timezone
        const userTimezone = user.timezone || 'UTC';
        const userNowStr = now.toLocaleString('en-US', { timeZone: userTimezone });
        const userNow = new Date(userNowStr);
        const userHour = userNow.getHours();
        const userMinutes = userNow.getMinutes();

        // Only send if user's local time is between 00:00 and 00:15
        if (userHour !== 0 || userMinutes > 15) {
          console.log(`Skipping user ${user.id}: not in notification window (${userHour}:${userMinutes})`);
          continue;
        }

        // Get tomorrow's date components in user's timezone
        const tomorrow = getTomorrowInTimezone(userTimezone);
        const tomorrowDateStr = getTomorrowDateString(userTimezone);
        console.log(`Processing user ${user.id} for tomorrow's date: ${tomorrowDateStr} (month: ${tomorrow.month}, day: ${tomorrow.day})`);

        // Get user's partners
        const { data: partners, error: partnersError } = await supabase
          .from('partners')
          .select('id, name, birthdate')
          .eq('user_id', user.id)
          .eq('archived', false);

        if (partnersError) {
          console.error(`Error fetching partners for user ${user.id}:`, partnersError);
          continue;
        }

        // Use a Map to deduplicate events by a unique key
        const eventsMap = new Map<string, Event>();

        // Get recurring events that match tomorrow's date
        const { data: recurringEvents, error: recurringError } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_recurring', true);

        if (!recurringError && recurringEvents) {
          for (const event of recurringEvents) {
            // Parse date without UTC conversion
            const { month: eventMonth, day: eventDay } = parseDateString(event.event_date);

            if (eventMonth === tomorrow.month && eventDay === tomorrow.day) {
              // Use partner_id + event_type as key to deduplicate
              const dedupeKey = `${event.partner_id || 'no-partner'}-${event.event_type || event.title}`;
              if (!eventsMap.has(dedupeKey)) {
                eventsMap.set(dedupeKey, event);
                console.log(`Added recurring event: ${event.title} (key: ${dedupeKey})`);
              } else {
                console.log(`Skipped duplicate recurring event: ${event.title} (key: ${dedupeKey})`);
              }
            }
          }
        }

        // Add partner birthdays (only if not already added via events table)
        if (partners) {
          for (const partner of partners as Partner[]) {
            if (partner.birthdate) {
              // Parse birthdate without UTC conversion
              const { month: birthMonth, day: birthDay } = parseDateString(partner.birthdate);

              if (birthMonth === tomorrow.month && birthDay === tomorrow.day) {
                const dedupeKey = `${partner.id}-birthday`;
                if (!eventsMap.has(dedupeKey)) {
                  eventsMap.set(dedupeKey, {
                    id: `birthday-${partner.id}`,
                    title: 'Birthday',
                    event_date: partner.birthdate,
                    is_recurring: true,
                    event_type: 'birthday',
                    description: null,
                    partner_id: partner.id,
                  });
                  console.log(`Added partner birthday: ${partner.name} (key: ${dedupeKey})`);
                } else {
                  console.log(`Skipped duplicate birthday for partner: ${partner.name} (key: ${dedupeKey})`);
                }
              }
            }
          }
        }

        const allEvents = Array.from(eventsMap.values());
        console.log(`Found ${allEvents.length} unique events for user ${user.id}`);

        // Send email for each event
        for (const event of allEvents) {
          try {
            // Check if notification already sent for this event tomorrow
            const { data: existingNotification } = await supabase
              .from('event_notifications')
              .select('id')
              .eq('user_id', user.id)
              .eq('event_id', event.id)
              .eq('notification_date', tomorrowDateStr)
              .single();

            if (existingNotification) {
              console.log(`Notification already sent for event ${event.id} on ${tomorrowDateStr}`);
              continue;
            }

            // Get partner name if event has partner_id
            let partnerName = 'Your Cherished';
            if (event.partner_id && partners) {
              const partner = (partners as Partner[]).find(p => p.id === event.partner_id);
              if (partner) {
                partnerName = partner.name;
              }
            }

            // Send email using fetch to Resend API
            const emailSubject = `Tomorrow: ${event.title} (${partnerName})`;
            const emailHtml = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #FF6B9D;">Hi ${user.display_name || 'there'}! 💗</h2>
                <p style="font-size: 16px; line-height: 1.6;">
                  Tomorrow is <strong>${partnerName}'s ${event.title}</strong> 💗
                </p>
                ${event.description ? `<p style="font-size: 14px; color: #666; line-height: 1.6;">${event.description}</p>` : ''}
                <div style="margin: 30px 0;">
                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app')}/partner/${event.partner_id}" 
                     style="display: inline-block; background: #FF6B9D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-right: 10px;">
                    Open ${partnerName}
                  </a>
                  <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app')}/dashboard" 
                     style="display: inline-block; background: #6B9DFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                    View all events
                  </a>
                </div>
                <p style="font-size: 12px; color: #999; margin-top: 40px;">
                  You're receiving this because you have email notifications enabled in your Cherishly account.
                </p>
              </div>
            `;

            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Cherishly <onboarding@resend.dev>',
                to: [user.email],
                subject: emailSubject,
                html: emailHtml,
              }),
            });

            if (!emailResponse.ok) {
              const errorText = await emailResponse.text();
              console.error(`Error sending email for event ${event.id}:`, errorText);
              continue;
            }

            // Record notification
            const { error: notificationError } = await supabase
              .from('event_notifications')
              .insert({
                user_id: user.id,
                event_id: event.id,
                notification_date: tomorrowDateStr,
              });

            if (notificationError) {
              console.error(`Error recording notification for event ${event.id}:`, notificationError);
              continue;
            }

            notificationsSent.push({
              user_id: user.id,
              event_id: event.id,
              email: user.email,
            });

            console.log(`Sent notification for event ${event.id} to ${user.email}`);
          } catch (error) {
            console.error(`Error processing event ${event.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
      }
    }

    console.log(`Job completed. Sent ${notificationsSent.length} notifications`);

    return new Response(
      JSON.stringify({
        message: 'Event reminders processed',
        notifications_sent: notificationsSent.length,
        details: notificationsSent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-event-reminders function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
