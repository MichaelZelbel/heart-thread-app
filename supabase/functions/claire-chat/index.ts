import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, partnerId, messageCoachContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

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

    // Fetch last 10 messages from chat history for context (across ALL conversations)
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

    // Build comprehensive markdown report for all partners
    let contextData = '\n\n# User\'s Cherished People\n';
    
    if (partners?.length) {
      partners.forEach(partner => {
        contextData += `\n## ${partner.name}\n`;
        
        // Basic info
        if (partner.birthdate) {
          contextData += `- **Birthdate:** ${partner.birthdate}\n`;
        }
        
        // Love languages
        contextData += `- **Love Languages (scale 1-5):**\n`;
        contextData += `  - Physical Touch: ${partner.love_language_physical}\n`;
        contextData += `  - Words of Affirmation: ${partner.love_language_words}\n`;
        contextData += `  - Quality Time: ${partner.love_language_quality}\n`;
        contextData += `  - Acts of Service: ${partner.love_language_acts}\n`;
        contextData += `  - Gifts: ${partner.love_language_gifts}\n`;
        
        // Notes
        if (partner.notes) {
          contextData += `\n**Notes:** ${partner.notes}\n`;
        }
        
        // Likes
        const partnerLikes = likes?.filter(l => l.partner_id === partner.id);
        if (partnerLikes?.length) {
          contextData += `\n### Likes\n`;
          partnerLikes.forEach(like => {
            const tags = like.tags?.length ? ` [${like.tags.join(', ')}]` : '';
            contextData += `- ${like.item}${tags}\n`;
          });
        }
        
        // Dislikes
        const partnerDislikes = dislikes?.filter(d => d.partner_id === partner.id);
        if (partnerDislikes?.length) {
          contextData += `\n### Dislikes\n`;
          partnerDislikes.forEach(dislike => {
            const tags = dislike.tags?.length ? ` [${dislike.tags.join(', ')}]` : '';
            contextData += `- ${dislike.item}${tags}\n`;
          });
        }
        
        // Profile Details
        const partnerDetails = profileDetails?.filter(d => d.partner_id === partner.id);
        if (partnerDetails?.length) {
          contextData += `\n### Profile Details\n`;
          
          // Group by category
          const categories = [...new Set(partnerDetails.map(d => d.category))];
          categories.forEach(category => {
            const categoryDetails = partnerDetails.filter(d => d.category === category);
            contextData += `\n**${category}:**\n`;
            categoryDetails.forEach(detail => {
              contextData += `- ${detail.label}: ${detail.value}\n`;
            });
          });
        }
        
        // Events
        const partnerEvents = events?.filter(e => e.partner_id === partner.id);
        if (partnerEvents?.length) {
          contextData += `\n### Important Dates & Events\n`;
          partnerEvents.forEach(event => {
            const recurring = event.is_recurring ? ' (recurring)' : '';
            const eventType = event.event_type ? ` [${event.event_type}]` : '';
            contextData += `- ${event.title} - ${event.event_date}${recurring}${eventType}\n`;
          });
        }
        
        // Moments
        const partnerMoments = moments?.filter(m => m.partner_ids?.includes(partner.id));
        if (partnerMoments?.length) {
          contextData += `\n### Recent Moments\n`;
          partnerMoments.forEach(moment => {
            if (moment.title) {
              contextData += `- ${moment.title} - ${moment.moment_date}\n`;
            }
          });
        }
        
        contextData += '\n---\n';
      });
    } else {
      contextData += '\nNo cherished people added yet.\n';
    }
    
    // Add current page context
    if (partnerId && partners?.find(p => p.id === partnerId)) {
      const currentPartner = partners.find(p => p.id === partnerId);
      contextData += `\n**Current Page Context:** You're viewing ${currentPartner?.name}'s detail page. Focus your suggestions on them.\n`;
    } else {
      contextData += `\n**Current Page Context:** You're on the Dashboard. The user can ask about any of their cherished people.\n`;
    }

    // Add Message Coach context if provided (NOT added to global context)
    let messageCoachPrompt = '';
    if (messageCoachContext && (messageCoachContext.transcript || messageCoachContext.notes)) {
      messageCoachPrompt = '\n\n**Message Coach Context (Private - Only for this conversation):**\n';
      
      if (messageCoachContext.transcript) {
        messageCoachPrompt += `\n**Recent Conversation/Reflection:**\n${messageCoachContext.transcript}\n`;
      }
      
      if (messageCoachContext.notes) {
        messageCoachPrompt += `\n**User's Intent/Notes:**\n${messageCoachContext.notes}\n`;
      }

      // Add tone guidance
      const toneGuidance = [];
      if (messageCoachContext.useDefaultTone) {
        toneGuidance.push("Use the user's default tone (warm and authentic)");
      } else {
        if (messageCoachContext.presetTone) {
          toneGuidance.push(`Tone: ${messageCoachContext.presetTone}`);
        }
        if (messageCoachContext.customTone) {
          toneGuidance.push(`Custom tone style: ${messageCoachContext.customTone}`);
        }
      }

      if (toneGuidance.length > 0) {
        messageCoachPrompt += `\n**Tone Guidance:** ${toneGuidance.join(', ')}\n`;
      }

      messageCoachPrompt += '\n**Your Task:** Help the user craft a thoughtful reply based on the conversation/reflection and their intent. Provide 2-3 message suggestions they can use or adapt. Keep suggestions natural and aligned with their desired tone.\n';
    }

    // Get current date and time
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    });

    const systemPrompt = `**IMPORTANT: The current date and time is ${currentDateTime}. Use this for all date calculations and time-sensitive suggestions.**

You are Claire, a warm and empathetic relationship coach. Your role is to help users strengthen their relationships through thoughtful suggestions.

You have access to:
1. The FULL conversation history with this user (you remember everything they've told you)
2. Their saved information about their loved ones (cherished people), including:
   - Names, birthdates, and important dates
   - Love languages (how they prefer to receive love)
   - Likes, dislikes, and preferences
   - Profile details (favorite places, links, physical attributes)
   - Recent moments and memories logged

Based on this data, you provide:
- Personalized gift ideas
- Date and activity suggestions
- Thoughtful message templates
- Conversation starters
- Follow-up questions to deepen understanding

You also gently identify missing information that could help you give better suggestions (e.g., "I notice you haven't added their favorite restaurant—knowing that could help me suggest great date spots!").

Always be warm, supportive, and respectful. Keep responses concise but meaningful. When the user is viewing a specific partner's page, focus your suggestions on that partner. Otherwise, help with any of their cherished relationships.

User's Context:${contextData}`;

    // Build messages array with conversation history
    const userMessageWithContext = messageCoachPrompt 
      ? `${messageCoachPrompt}\n\n${message}`
      : message;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: userMessageWithContext }
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "I'm getting too many requests right now. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service needs credits. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: "Sorry, I'm having trouble thinking right now. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

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
