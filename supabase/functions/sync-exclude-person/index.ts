import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";

/**
 * User-facing: exclude a remote person from syncing.
 * Sets link_status='excluded' and is_enabled=false.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createAdminClient();
    const { data: claimsData, error: claimsErr } = await admin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.user.id;

    const { remote_person_uid, connection_id } = await req.json();
    if (!remote_person_uid || !connection_id) {
      return new Response(JSON.stringify({ error: "remote_person_uid, connection_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert link as excluded
    const { data: existingLink } = await admin
      .from("sync_person_links")
      .select("id")
      .eq("connection_id", connection_id)
      .eq("remote_person_uid", remote_person_uid)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingLink) {
      await admin.from("sync_person_links")
        .update({
          link_status: "excluded",
          is_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLink.id);
    } else {
      // Create a placeholder link marked as excluded
      // We need a local_person_id — use a dummy approach: set to the first partner or handle null
      await admin.from("sync_person_links").insert({
        user_id: userId,
        connection_id,
        local_person_id: "00000000-0000-0000-0000-000000000000", // placeholder, won't be used
        remote_person_uid,
        link_status: "excluded",
        is_enabled: false,
      });
    }

    // Update candidate status
    await admin.from("sync_person_candidates")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("connection_id", connection_id)
      .eq("remote_person_uid", remote_person_uid)
      .eq("user_id", userId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-exclude-person error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
