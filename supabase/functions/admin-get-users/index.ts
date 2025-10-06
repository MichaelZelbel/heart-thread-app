import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      throw new Error("Admin access required");
    }

    // Get all users from auth
    const { data: { users }, error: usersError } = await supabaseClient.auth.admin.listUsers();
    if (usersError) throw usersError;

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('*');
    if (profilesError) throw profilesError;

    // Get all roles
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('user_id, role')
      .order('role', { ascending: true });
    if (rolesError) throw rolesError;

    // Create role map
    const roleMap = new Map();
    roles?.forEach(r => {
      if (!roleMap.has(r.user_id)) {
        roleMap.set(r.user_id, r.role);
      }
    });

    // Create profile map
    const profileMap = new Map();
    profiles?.forEach(p => {
      profileMap.set(p.id, p);
    });

    // Combine data
    const usersWithData = users.map(user => {
      const profile = profileMap.get(user.id);
      return {
        id: user.id,
        email: user.email,
        display_name: profile?.display_name || user.email?.split('@')[0] || 'Unknown',
        created_at: user.created_at,
        email_notifications_enabled: profile?.email_notifications_enabled || false,
        role: roleMap.get(user.id) || 'free'
      };
    });

    return new Response(JSON.stringify({ users: usersWithData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
