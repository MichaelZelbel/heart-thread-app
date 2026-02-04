import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestUser {
  email: string;
  password: string;
  displayName: string;
  role: 'free' | 'pro' | 'admin';
}

// Test user credentials must be passed via request body for security
// Do not hardcode credentials in source code

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse test users from request body
    const body = await req.json();
    const testUsers: TestUser[] = body.users;

    if (!testUsers || !Array.isArray(testUsers) || testUsers.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Request body must contain "users" array with email, password, displayName, and role' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

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

    const results = [];

    for (const user of testUsers) {
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUser?.users.some(u => u.email === user.email);

      if (userExists) {
        results.push({ email: user.email, status: 'already_exists' });
        continue;
      }

      // Create user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          display_name: user.displayName,
        },
      });

      if (createError) {
        results.push({ email: user.email, status: 'error', error: createError.message });
        continue;
      }

      // Assign role using the database function
      const { error: roleError } = await supabaseAdmin.rpc('assign_role_by_email', {
        _email: user.email,
        _role: user.role,
      });

      if (roleError) {
        results.push({ 
          email: user.email, 
          status: 'created_but_role_failed', 
          error: roleError.message 
        });
      } else {
        results.push({ 
          email: user.email, 
          status: 'success', 
          role: user.role 
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Test users seeded',
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
