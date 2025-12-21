import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// n8n webhook URL for Claire Chat workflow
const N8N_WEBHOOK_URL = 'https://n8n-cherishly.agentpool.cloud/webhook/claire';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, partnerId, messageCoachContext } = await req.json();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch last 10 messages from chat history for context
    const { data: chatHistory } = await supabase
      .from('claire_chat_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Reverse to get chronological order (oldest first)
    const conversationHistory = chatHistory ? chatHistory.reverse() : [];

    // Fetch user's cherished data
    const { data: partners } = await supabase
      .from('partners')
      .select(`
        id, 
        name, 
        birthdate, 
        love_language_physical, 
        love_language_words, 
        love_language_quality, 
        love_language_acts, 
        love_language_gifts,
        notes
      `)
      .eq('user_id', user.id)
      .eq('archived', false);

    const { data: likes } = await supabase
      .from('partner_likes')
      .select('partner_id, item, tags')
      .in('partner_id', partners?.map(p => p.id) || []);

    const { data: dislikes } = await supabase
      .from('partner_dislikes')
      .select('partner_id, item, tags')
      .in('partner_id', partners?.map(p => p.id) || []);

    const { data: profileDetails } = await supabase
      .from('partner_profile_details')
      .select('partner_id, category, label, value')
      .in('partner_id', partners?.map(p => p.id) || []);

    const { data: events } = await supabase
      .from('events')
      .select('partner_id, title, event_date, event_type, is_recurring')
      .eq('user_id', user.id);

    const { data: moments } = await supabase
      .from('moments')
      .select('title, moment_date, partner_ids')
      .eq('user_id', user.id)
      .order('moment_date', { ascending: false })
      .limit(10);

    // Build comprehensive markdown context for all partners
    let partnerContext = '\n\n# User\'s Cherished People\n';
    let partnerName = '';
    
    if (partners?.length) {
      // Get current partner name if viewing a specific partner
      if (partnerId) {
        const currentPartner = partners.find(p => p.id === partnerId);
        partnerName = currentPartner?.name || '';
      }

      partners.forEach(partner => {
        partnerContext += `\n## ${partner.name}\n`;
        
        // Basic info
        if (partner.birthdate) {
          partnerContext += `- **Birthdate:** ${partner.birthdate}\n`;
        }
        
        // Love languages
        partnerContext += `- **Love Languages (scale 1-5):**\n`;
        partnerContext += `  - Physical Touch: ${partner.love_language_physical}\n`;
        partnerContext += `  - Words of Affirmation: ${partner.love_language_words}\n`;
        partnerContext += `  - Quality Time: ${partner.love_language_quality}\n`;
        partnerContext += `  - Acts of Service: ${partner.love_language_acts}\n`;
        partnerContext += `  - Gifts: ${partner.love_language_gifts}\n`;
        
        // Notes
        if (partner.notes) {
          partnerContext += `\n**Notes:** ${partner.notes}\n`;
        }
        
        // Likes
        const partnerLikes = likes?.filter(l => l.partner_id === partner.id);
        if (partnerLikes?.length) {
          partnerContext += `\n### Likes\n`;
          partnerLikes.forEach(like => {
            const tags = like.tags?.length ? ` [${like.tags.join(', ')}]` : '';
            partnerContext += `- ${like.item}${tags}\n`;
          });
        }
        
        // Dislikes
        const partnerDislikes = dislikes?.filter(d => d.partner_id === partner.id);
        if (partnerDislikes?.length) {
          partnerContext += `\n### Dislikes\n`;
          partnerDislikes.forEach(dislike => {
            const tags = dislike.tags?.length ? ` [${dislike.tags.join(', ')}]` : '';
            partnerContext += `- ${dislike.item}${tags}\n`;
          });
        }
        
        // Profile Details
        const partnerDetails = profileDetails?.filter(d => d.partner_id === partner.id);
        if (partnerDetails?.length) {
          partnerContext += `\n### Profile Details\n`;
          
          // Group by category
          const categories = [...new Set(partnerDetails.map(d => d.category))];
          categories.forEach(category => {
            const categoryDetails = partnerDetails.filter(d => d.category === category);
            partnerContext += `\n**${category}:**\n`;
            categoryDetails.forEach(detail => {
              partnerContext += `- ${detail.label}: ${detail.value}\n`;
            });
          });
        }
        
        // Events
        const partnerEvents = events?.filter(e => e.partner_id === partner.id);
        if (partnerEvents?.length) {
          partnerContext += `\n### Important Dates & Events\n`;
          partnerEvents.forEach(event => {
            const recurring = event.is_recurring ? ' (recurring)' : '';
            const eventType = event.event_type ? ` [${event.event_type}]` : '';
            partnerContext += `- ${event.title} - ${event.event_date}${recurring}${eventType}\n`;
          });
        }
        
        // Moments
        const partnerMoments = moments?.filter(m => m.partner_ids?.includes(partner.id));
        if (partnerMoments?.length) {
          partnerContext += `\n### Recent Moments\n`;
          partnerMoments.forEach(moment => {
            if (moment.title) {
              partnerContext += `- ${moment.title} - ${moment.moment_date}\n`;
            }
          });
        }
        
        partnerContext += '\n---\n';
      });
    } else {
      partnerContext += '\nNo cherished people added yet.\n';
    }
    
    // Add current page context
    if (partnerId && partners?.find(p => p.id === partnerId)) {
      const currentPartner = partners.find(p => p.id === partnerId);
      partnerContext += `\n**Current Page Context:** You're viewing ${currentPartner?.name}'s detail page. Focus your suggestions on them.\n`;
    } else {
      partnerContext += `\n**Current Page Context:** You're on the Dashboard. The user can ask about any of their cherished people.\n`;
    }

    // Build Message Coach context string
    let messageCoachContextString = '';
    if (messageCoachContext && (messageCoachContext.transcript || messageCoachContext.notes)) {
      messageCoachContextString = '\n\n**Message Coach Context (Private - Only for this conversation):**\n';
      
      if (messageCoachContext.transcript) {
        messageCoachContextString += `\n**Recent Conversation/Reflection:**\n${messageCoachContext.transcript}\n`;
      }
      
      if (messageCoachContext.notes) {
        messageCoachContextString += `\n**User's Intent/Notes:**\n${messageCoachContext.notes}\n`;
      }

      // Add tone guidance
      const toneGuidance = [];
      if (messageCoachContext.presetTone) {
        toneGuidance.push(`Tone: ${messageCoachContext.presetTone}`);
      }
      if (messageCoachContext.customTone) {
        toneGuidance.push(`Custom tone style: ${messageCoachContext.customTone}`);
      }

      if (toneGuidance.length > 0) {
        messageCoachContextString += `\n**Tone Guidance:** ${toneGuidance.join(', ')}\n`;
      }

      messageCoachContextString += '\n**Your Task:** Help the user craft a thoughtful reply based on the conversation/reflection and their intent. Provide 2-3 message suggestions they can use or adapt. Keep suggestions natural and aligned with their desired tone.\n';
    }

    // Prepare payload for n8n webhook
    const n8nPayload = {
      userId: user.id,
      partnerId: partnerId || null,
      partnerName: partnerName,
      userMessage: message,
      conversationHistory: conversationHistory,
      partnerContext: partnerContext,
      messageCoachContext: messageCoachContextString
    };

    console.log('Calling n8n webhook with payload:', JSON.stringify(n8nPayload, null, 2));

    // Call n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n webhook error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "I'm getting too many requests right now. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: "Sorry, I'm having trouble thinking right now. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('n8n response:', JSON.stringify(data, null, 2));
    
    // Extract the reply from n8n response
    // The response structure depends on how the "Respond to Webhook" node is configured
    // Common patterns: data.output, data.text, data.message, or direct response
    const reply = data.output || data.text || data.message || data.response || 
                  (typeof data === 'string' ? data : JSON.stringify(data));

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in claire-chat function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
