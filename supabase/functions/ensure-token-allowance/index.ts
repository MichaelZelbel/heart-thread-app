import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  user_id?: string;
  batch_init?: boolean;
}

interface AllowancePeriod {
  id: string;
  user_id: string;
  tokens_granted: number;
  tokens_used: number;
  period_start: string;
  period_end: string;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Parse request body
    let body: RequestBody = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        // Empty body is fine
      }
    }

    const { user_id: targetUserId, batch_init } = body;

    // Get caller's auth info
    const authHeader = req.headers.get("Authorization");
    let callerId: string | null = null;
    let isAdmin = false;
    let isServiceRole = false;

    // Check if using service role key directly
    if (authHeader === `Bearer ${serviceRoleKey}`) {
      isServiceRole = true;
      console.log("Service role key detected");
    } else if (authHeader?.startsWith("Bearer ")) {
      // Validate JWT for regular users
      const supabaseAuth = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

      if (claimsError || !claimsData?.claims) {
        console.error("Auth error:", claimsError);
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      callerId = claimsData.claims.sub as string;
      console.log("Authenticated user:", callerId);
    }

    // Use service role client for all DB operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if caller is admin (if authenticated)
    if (callerId) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId)
        .eq("role", "admin")
        .maybeSingle();

      isAdmin = !!roleData;
      console.log("Is admin:", isAdmin);
    }

    // Authorization checks
    if (batch_init) {
      if (!isServiceRole && !isAdmin) {
        return new Response(
          JSON.stringify({ error: "Admin or service role required for batch initialization" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (targetUserId && targetUserId !== callerId) {
      if (!isServiceRole && !isAdmin) {
        return new Response(
          JSON.stringify({ error: "Admin access required to manage other users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Determine which user(s) to process
    const effectiveUserId = targetUserId || callerId;

    if (!batch_init && !effectiveUserId) {
      return new Response(
        JSON.stringify({ error: "user_id required when not authenticated" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get credit settings
    const { data: settings, error: settingsError } = await supabase
      .from("ai_credit_settings")
      .select("key, value_int");

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      throw new Error("Failed to fetch credit settings");
    }

    const settingsMap: Record<string, number> = {};
    for (const s of settings || []) {
      settingsMap[s.key] = s.value_int;
    }

    const tokensPerCredit = settingsMap["tokens_per_credit"] || 200;
    const creditsFree = settingsMap["credits_free_per_month"] || 0;
    const creditsPremium = settingsMap["credits_premium_per_month"] || 1500;

    console.log("Settings:", { tokensPerCredit, creditsFree, creditsPremium });

    // Calculate period boundaries (1st of current month to 1st of next month)
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    console.log("Period:", { periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() });

    // Helper function to ensure allowance for a single user
    async function ensureAllowanceForUser(userId: string): Promise<AllowancePeriod | null> {
      // Check for existing current period
      const { data: existingPeriod, error: existingError } = await supabase
        .from("ai_allowance_periods")
        .select("*")
        .eq("user_id", userId)
        .gte("period_end", now.toISOString())
        .lte("period_start", now.toISOString())
        .maybeSingle();

      if (existingError) {
        console.error("Error checking existing period:", existingError);
        throw existingError;
      }

      if (existingPeriod) {
        console.log("Found existing period for user:", userId);
        return existingPeriod;
      }

      // Get user's role to determine plan type
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .order("role")  // Will get admin first if multiple roles
        .limit(1)
        .maybeSingle();

      const userRole = roleData?.role || "free";
      const isPremium = userRole === "pro" || userRole === "pro_gift" || userRole === "admin";
      const monthlyCredits = isPremium ? creditsPremium : creditsFree;
      const baseTokens = monthlyCredits * tokensPerCredit;

      console.log("User role:", userRole, "isPremium:", isPremium, "baseTokens:", baseTokens);

      // Check for previous period's remaining tokens for rollover
      let rolloverTokens = 0;
      const { data: previousPeriod } = await supabase
        .from("ai_allowance_periods")
        .select("tokens_granted, tokens_used")
        .eq("user_id", userId)
        .lt("period_end", periodStart.toISOString())
        .order("period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (previousPeriod) {
        const previousRemaining = previousPeriod.tokens_granted - previousPeriod.tokens_used;
        // Rollover is capped at base_tokens
        rolloverTokens = Math.max(0, Math.min(previousRemaining, baseTokens));
        console.log("Previous period found, rollover:", rolloverTokens);
      }

      const tokensGranted = baseTokens + rolloverTokens;
      const source = isPremium ? "subscription" : "free_tier";

      // Insert new period
      const { data: newPeriod, error: insertError } = await supabase
        .from("ai_allowance_periods")
        .insert({
          user_id: userId,
          tokens_granted: tokensGranted,
          tokens_used: 0,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          source,
          metadata: {
            base_tokens: baseTokens,
            rollover_tokens: rolloverTokens,
            user_role: userRole,
          },
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting period:", insertError);
        throw insertError;
      }

      console.log("Created new period for user:", userId, "tokens_granted:", tokensGranted);
      return newPeriod;
    }

    // Handle batch initialization
    if (batch_init) {
      console.log("Starting batch initialization...");

      // Get all user IDs from profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id");

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw profilesError;
      }

      let initializedCount = 0;
      const errors: Array<{ user_id: string; error: string }> = [];

      for (const profile of profiles || []) {
        try {
          const period = await ensureAllowanceForUser(profile.id);
          if (period && period.created_at === period.updated_at) {
            // Newly created (created_at equals updated_at)
            initializedCount++;
          }
        } catch (err) {
          console.error("Error initializing user:", profile.id, err);
          errors.push({ user_id: profile.id, error: String(err) });
        }
      }

      console.log("Batch initialization complete:", { initializedCount, errorCount: errors.length });

      return new Response(
        JSON.stringify({
          success: true,
          initialized_count: initializedCount,
          total_users: profiles?.length || 0,
          errors: errors.length > 0 ? errors : undefined,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle single user
    const period = await ensureAllowanceForUser(effectiveUserId!);

    return new Response(
      JSON.stringify({
        success: true,
        period,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ensure-token-allowance:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
