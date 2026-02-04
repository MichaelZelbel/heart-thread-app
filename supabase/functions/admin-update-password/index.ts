import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordUpdate {
  email: string;
  newPassword: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const body = await req.json();
    const updates: PasswordUpdate[] = body.updates;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Request body must contain "updates" array with email and newPassword' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const results = [];

    for (const update of updates) {
      // Find user by email
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
      const user = usersData?.users.find(u => u.email === update.email);

      if (!user) {
        results.push({ email: update.email, status: 'not_found' });
        continue;
      }

      // Update password
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: update.newPassword,
      });

      if (error) {
        results.push({ email: update.email, status: 'error', error: error.message });
      } else {
        results.push({ email: update.email, status: 'updated' });
      }
    }

    return new Response(
      JSON.stringify({ message: 'Password updates completed', results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
