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
    const { message, partnerId } = await req.json();
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

    // Build context for Claire
    let contextData = '';
    
    if (partnerId && partners?.find(p => p.id === partnerId)) {
      const partner = partners.find(p => p.id === partnerId);
      contextData = `\n\nCurrent Partner Focus: ${partner?.name}`;
      
      const partnerLikes = likes?.filter(l => l.partner_id === partnerId);
      const partnerDislikes = dislikes?.filter(d => d.partner_id === partnerId);
      const partnerDetails = profileDetails?.filter(d => d.partner_id === partnerId);
      const partnerEvents = events?.filter(e => e.partner_id === partnerId);
      const partnerMoments = moments?.filter(m => m.partner_ids?.includes(partnerId));

      if (partner) {
        contextData += `\nBirthdate: ${partner.birthdate || 'Not set'}`;
        contextData += `\nLove Languages (1-5): Physical Touch: ${partner.love_language_physical}, Words: ${partner.love_language_words}, Quality Time: ${partner.love_language_quality}, Acts of Service: ${partner.love_language_acts}, Gifts: ${partner.love_language_gifts}`;
        if (partner.notes) contextData += `\nNotes: ${partner.notes}`;
      }

      if (partnerLikes?.length) {
        contextData += `\n\nLikes: ${partnerLikes.map(l => l.item).join(', ')}`;
      }

      if (partnerDislikes?.length) {
        contextData += `\nDislikes: ${partnerDislikes.map(d => d.item).join(', ')}`;
      }

      if (partnerDetails?.length) {
        contextData += `\n\nProfile Details:`;
        partnerDetails.forEach(d => {
          contextData += `\n- ${d.label}: ${d.value}`;
        });
      }

      if (partnerEvents?.length) {
        contextData += `\n\nImportant Dates: ${partnerEvents.map(e => `${e.title} (${e.event_date})`).join(', ')}`;
      }

      if (partnerMoments?.length) {
        contextData += `\n\nRecent Moments: ${partnerMoments.map(m => m.title).filter(Boolean).join(', ')}`;
      }
    } else if (partners?.length) {
      contextData = `\n\nAll Cherished People: ${partners.map(p => p.name).join(', ')}`;
      contextData += `\n\nNote: Ask the user which person they'd like suggestions for to give more personalized advice.`;
    }

    const systemPrompt = `You are Claire, a warm and empathetic relationship coach. Your role is to help users strengthen their relationships through thoughtful suggestions.

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
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
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
