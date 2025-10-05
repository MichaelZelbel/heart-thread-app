import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { partnerId, nowIso, nowReadable } = await req.json();

    // Fetch partner data if partnerId provided
    let contextData = '';
    
    if (partnerId) {
      const { data: partner } = await supabase
        .from('partners')
        .select('*')
        .eq('id', partnerId)
        .eq('user_id', user.id)
        .single();

      if (partner) {
        const [likes, dislikes, profileDetails] = await Promise.all([
          supabase.from('partner_likes').select('*').eq('partner_id', partnerId),
          supabase.from('partner_dislikes').select('*').eq('partner_id', partnerId),
          supabase.from('partner_profile_details').select('*').eq('partner_id', partnerId)
        ]);

        const loveLanguages = [
          { name: 'Words of Affirmation', score: partner.love_language_words || 3 },
          { name: 'Quality Time', score: partner.love_language_quality || 3 },
          { name: 'Gifts', score: partner.love_language_gifts || 3 },
          { name: 'Acts of Service', score: partner.love_language_acts || 3 },
          { name: 'Physical Touch', score: partner.love_language_physical || 3 }
        ].sort((a, b) => b.score - a.score);

        const primaryLoveLanguages = loveLanguages.slice(0, 2).map(ll => ll.name);

        contextData = `
**RELATIONSHIP_TYPE:** ${partner.relationship_type || 'partner'}
**CHERISHED_NAME:** ${partner.name}
**PRIMARY_LOVE_LANGUAGES:** ${primaryLoveLanguages.join(', ')}
**CHERISHED_COUNTRY:** ${partner.country || 'unknown'}
**GENDER_IDENTITY:** ${partner.gender_identity || 'not specified'}
**CHERISHED_LIKES:** ${likes.data?.map(l => l.item).join(', ') || 'none listed'}
**CHERISHED_DISLIKES:** ${dislikes.data?.map(d => d.item).join(', ') || 'none listed'}
`;

        // Add birthdate/upcoming birthday context if available
        if (partner.birthdate) {
          const birthdate = new Date(partner.birthdate);
          const now = new Date(nowIso);
          const thisYearBirthday = new Date(now.getFullYear(), birthdate.getMonth(), birthdate.getDate());
          if (thisYearBirthday < now) {
            thisYearBirthday.setFullYear(thisYearBirthday.getFullYear() + 1);
          }
          const daysUntilBirthday = Math.ceil((thisYearBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilBirthday <= 30) {
            contextData += `**UPCOMING_BIRTHDAY:** ${partner.name}'s birthday is in ${daysUntilBirthday} days\n`;
          }
        }
      }
    } else {
      // No specific partner - get general context
      const { data: partners } = await supabase
        .from('partners')
        .select('name, relationship_type')
        .eq('user_id', user.id)
        .eq('archived', false)
        .limit(1);

      if (partners && partners.length > 0) {
        contextData = `
**RELATIONSHIP_TYPE:** ${partners[0].relationship_type || 'partner'}
**CHERISHED_NAME:** ${partners[0].name}
`;
      } else {
        contextData = '**NOTE:** User has no Cherished profiles yet.\n';
      }
    }

    const systemPrompt = `**Role & Voice**
You are Cherishly's gentle companion. Suggest one small, specific activity that could brighten the bond between the user and one of their Cherished people. Be warm, personal, and realistic for today or this week. One emoji max. No gender assumptions. Keep under ~200 characters.

**Context you have received:**
${contextData}

**Current Date/Time:**
NOW (ISO): ${nowIso}
NOW (Readable): ${nowReadable}

**Available Tools:**
- Claire (for personalized notes, poems, relationship advice)

**Rules**
1. Don't assume gender or cohabitation; adapt wording: use "create" if together; "send" or "share" if apart or unknown.
2. Prefer ideas doable today/this week; tie to upcoming events when relevant.
3. Use shared or known likes/love-languages when possible.
4. Offer small, creative actions; avoid expensive/complex plans.
5. One emoji, friendly tone, ≤ ~200 chars.
6. If context is sparse, suggest a universally kind micro-gesture.
7. If user has no Cherished profiles, suggest they add someone special first.

**Examples (style, not templates):**
- "Create a tiny playlist of 'your songs' and play it during dinner tonight 🎶"
- "Ask Claire for a two-line poem about your favorite memory—share it as a sweet surprise 💌"
- "Snap a photo of something that reminded you of them today and tell them why 🌸"
- "Leave a little note that ties into their upcoming birthday—thoughtful beats fancy 🎉"

Return ONLY the suggestion text, nothing else.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate one activity suggestion for me.' }
        ],
        temperature: 0.9,
        max_tokens: 200
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const suggestion = data.choices[0]?.message?.content || 'Try something thoughtful today 💕';

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in suggest-activity:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
