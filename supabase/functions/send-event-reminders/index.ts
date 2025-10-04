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
        // Calculate "today" in the user's timezone
        const userTimezone = user.timezone || 'UTC';
        const userNow = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
        const userHour = userNow.getHours();
        const userMinutes = userNow.getMinutes();

        // Only send if user's local time is between 00:00 and 00:15
        if (userHour !== 0 || userMinutes > 15) {
          console.log(`Skipping user ${user.id}: not in notification window (${userHour}:${userMinutes})`);
          continue;
        }

        const todayInUserTZ = userNow.toISOString().split('T')[0];
        console.log(`Processing user ${user.id} for date ${todayInUserTZ}`);

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

        // Get regular events for today
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', user.id)
          .eq('event_date', todayInUserTZ);

        if (eventsError) {
          console.error(`Error fetching events for user ${user.id}:`, eventsError);
          continue;
        }

        const allEvents: Event[] = events || [];

        // Add recurring events (birthdays, anniversaries)
        const { data: recurringEvents, error: recurringError } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_recurring', true);

        if (!recurringError && recurringEvents) {
          const todayMonth = userNow.getMonth() + 1;
          const todayDay = userNow.getDate();

          for (const event of recurringEvents) {
            const eventDate = new Date(event.event_date);
            const eventMonth = eventDate.getMonth() + 1;
            const eventDay = eventDate.getDate();

            if (eventMonth === todayMonth && eventDay === todayDay) {
              allEvents.push(event);
            }
          }
        }

        // Add partner birthdays
        if (partners) {
          for (const partner of partners as Partner[]) {
            if (partner.birthdate) {
              const birthdateObj = new Date(partner.birthdate);
              const birthMonth = birthdateObj.getMonth() + 1;
              const birthDay = birthdateObj.getDate();
              const todayMonth = userNow.getMonth() + 1;
              const todayDay = userNow.getDate();

              if (birthMonth === todayMonth && birthDay === todayDay) {
                allEvents.push({
                  id: `birthday-${partner.id}`,
                  title: 'Birthday',
                  event_date: partner.birthdate,
                  is_recurring: true,
                  event_type: 'birthday',
                  description: null,
                  partner_id: partner.id,
                });
              }
            }
          }
        }

        console.log(`Found ${allEvents.length} events for user ${user.id}`);

        // Send email for each event
        for (const event of allEvents) {
          try {
            // Check if notification already sent for this event today
            const { data: existingNotification } = await supabase
              .from('event_notifications')
              .select('id')
              .eq('user_id', user.id)
              .eq('event_id', event.id)
              .eq('notification_date', todayInUserTZ)
              .single();

            if (existingNotification) {
              console.log(`Notification already sent for event ${event.id}`);
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
            const emailSubject = `Today: ${event.title} (${partnerName})`;
            const emailHtml = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #FF6B9D;">Hi ${user.display_name || 'there'}! 💗</h2>
                <p style="font-size: 16px; line-height: 1.6;">
                  Today is <strong>${partnerName}'s ${event.title}</strong> 💗
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
                notification_date: todayInUserTZ,
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
