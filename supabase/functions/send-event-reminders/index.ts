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

interface MomentEvent {
  id: string;
  title: string;
  moment_date: string;
  is_celebrated_annually: boolean;
  event_type: string | null;
  description: string | null;
  partner_ids: string[] | null;
}

interface Partner {
  id: string;
  name: string;
  birthdate: string | null;
}

function parseDateString(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

function getTomorrowInTimezone(timezone: string): { month: number; day: number } {
  const now = new Date();
  const userNowStr = now.toLocaleString('en-US', { timeZone: timezone });
  const userNow = new Date(userNowStr);
  userNow.setDate(userNow.getDate() + 1);
  return { month: userNow.getMonth() + 1, day: userNow.getDate() };
}

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Starting event reminder job...');

    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, display_name, email, timezone')
      .eq('email_notifications_enabled', true)
      .not('email', 'is', null);

    if (usersError) { console.error('Error fetching users:', usersError); throw usersError; }
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
        const userTimezone = user.timezone || 'UTC';
        const userNowStr = now.toLocaleString('en-US', { timeZone: userTimezone });
        const userNow = new Date(userNowStr);
        const userHour = userNow.getHours();
        const userMinutes = userNow.getMinutes();

        if (userHour !== 0 || userMinutes > 15) {
          console.log(`Skipping user ${user.id}: not in notification window (${userHour}:${userMinutes})`);
          continue;
        }

        const tomorrow = getTomorrowInTimezone(userTimezone);
        const tomorrowDateStr = getTomorrowDateString(userTimezone);
        console.log(`Processing user ${user.id} for tomorrow: ${tomorrowDateStr}`);

        const { data: partners, error: partnersError } = await supabase
          .from('partners')
          .select('id, name, birthdate')
          .eq('user_id', user.id)
          .eq('archived', false);

        if (partnersError) { console.error(`Error fetching partners for user ${user.id}:`, partnersError); continue; }

        const eventsMap = new Map<string, MomentEvent>();

        // Get celebrated-annually moments
        const { data: recurringMoments, error: recurringError } = await supabase
          .from('moments')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_celebrated_annually', true);

        if (!recurringError && recurringMoments) {
          for (const moment of recurringMoments) {
            const { month: mMonth, day: mDay } = parseDateString(moment.moment_date);
            if (mMonth === tomorrow.month && mDay === tomorrow.day) {
              const partnerId = moment.partner_ids?.[0] || 'no-partner';
              const dedupeKey = `${partnerId}-${moment.event_type || moment.title}`;
              if (!eventsMap.has(dedupeKey)) {
                eventsMap.set(dedupeKey, moment);
                console.log(`Added recurring moment: ${moment.title} (key: ${dedupeKey})`);
              }
            }
          }
        }

        // Get future one-off moments happening tomorrow
        const { data: futureMoments, error: futureError } = await supabase
          .from('moments')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_celebrated_annually', false)
          .eq('moment_date', tomorrowDateStr);

        if (!futureError && futureMoments) {
          for (const moment of futureMoments) {
            const partnerId = moment.partner_ids?.[0] || 'no-partner';
            const dedupeKey = `${partnerId}-${moment.title}`;
            if (!eventsMap.has(dedupeKey)) {
              eventsMap.set(dedupeKey, moment);
              console.log(`Added future moment: ${moment.title}`);
            }
          }
        }

        // Add partner birthdays
        if (partners) {
          for (const partner of partners as Partner[]) {
            if (partner.birthdate) {
              const { month: birthMonth, day: birthDay } = parseDateString(partner.birthdate);
              if (birthMonth === tomorrow.month && birthDay === tomorrow.day) {
                const dedupeKey = `${partner.id}-birthday`;
                if (!eventsMap.has(dedupeKey)) {
                  eventsMap.set(dedupeKey, {
                    id: `birthday-${partner.id}`,
                    title: 'Birthday',
                    moment_date: partner.birthdate,
                    is_celebrated_annually: true,
                    event_type: 'birthday',
                    description: null,
                    partner_ids: [partner.id],
                  });
                  console.log(`Added partner birthday: ${partner.name}`);
                }
              }
            }
          }
        }

        const allEvents = Array.from(eventsMap.values());
        console.log(`Found ${allEvents.length} unique events for user ${user.id}`);

        for (const event of allEvents) {
          try {
            // Check if notification already sent
            const { data: existingNotification } = await supabase
              .from('event_notifications')
              .select('id')
              .eq('user_id', user.id)
              .eq('moment_id', event.id)
              .eq('notification_date', tomorrowDateStr)
              .single();

            if (existingNotification) {
              console.log(`Notification already sent for moment ${event.id} on ${tomorrowDateStr}`);
              continue;
            }

            const partnerId = event.partner_ids?.[0];
            let partnerName = 'Your Cherished';
            if (partnerId && partners) {
              const partner = (partners as Partner[]).find(p => p.id === partnerId);
              if (partner) partnerName = partner.name;
            }

            const emailSubject = `Tomorrow: ${event.title} (${partnerName})`;
            const emailHtml = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #FF6B9D;">Hi ${user.display_name || 'there'}! 💗</h2>
                <p style="font-size: 16px; line-height: 1.6;">
                  Tomorrow is <strong>${partnerName}'s ${event.title}</strong> 💗
                </p>
                ${event.description ? `<p style="font-size: 14px; color: #666; line-height: 1.6;">${event.description}</p>` : ''}
                <div style="margin: 30px 0;">
                  <a href="${supabaseUrl?.replace('supabase.co', 'lovable.app')}/partner/${partnerId}"
                     style="display: inline-block; background: #FF6B9D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-right: 10px;">
                    Open ${partnerName}
                  </a>
                  <a href="${supabaseUrl?.replace('supabase.co', 'lovable.app')}/dashboard"
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
              console.error(`Error sending email for moment ${event.id}:`, errorText);
              continue;
            }

            // Record notification using moment_id
            const { error: notificationError } = await supabase
              .from('event_notifications')
              .insert({
                user_id: user.id,
                moment_id: event.id,
                notification_date: tomorrowDateStr,
              });

            if (notificationError) {
              console.error(`Error recording notification for moment ${event.id}:`, notificationError);
              continue;
            }

            notificationsSent.push({ user_id: user.id, moment_id: event.id, email: user.email });
            console.log(`Sent notification for moment ${event.id} to ${user.email}`);
          } catch (error) {
            console.error(`Error processing moment ${event.id}:`, error);
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-event-reminders function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
