import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";

/**
 * User-facing: creates a local person from remote data and auto-links.
 * Used when a remote person exists in Temerio but not locally.
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

    const { remote_person_uid, remote_name, remote_relationship_label, connection_id } = await req.json();
    if (!remote_person_uid || !remote_name || !connection_id) {
      return new Response(JSON.stringify({ error: "remote_person_uid, remote_name, connection_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify connection belongs to user
    const { data: conn } = await admin
      .from("sync_connections")
      .select("id")
      .eq("id", connection_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!conn) {
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create local partner with the same person_uid
    const { data: newPartner, error: insertErr } = await admin
      .from("partners")
      .insert({
        user_id: userId,
        person_uid: remote_person_uid,
        name: remote_name,
        relationship_type: remote_relationship_label || "friend",
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Failed to create local partner:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to create person" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-link
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
          local_person_id: newPartner.id,
          link_status: "linked",
          is_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLink.id);
    } else {
      await admin.from("sync_person_links").insert({
        user_id: userId,
        connection_id,
        local_person_id: newPartner.id,
        remote_person_uid,
        link_status: "linked",
        is_enabled: true,
      });
    }

    // Update candidate status
    await admin.from("sync_person_candidates")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("connection_id", connection_id)
      .eq("remote_person_uid", remote_person_uid)
      .eq("user_id", userId);

    return new Response(JSON.stringify({
      success: true,
      local_person_id: newPartner.id,
      person_uid: remote_person_uid,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-create-local-person error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
