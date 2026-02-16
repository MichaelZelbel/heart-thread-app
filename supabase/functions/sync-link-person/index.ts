import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";

/**
 * User-facing: manually link a local person to a remote person_uid.
 * Creates or updates sync_person_links with status='linked'.
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

    const { local_person_id, remote_person_uid, connection_id } = await req.json();
    if (!local_person_id || !remote_person_uid || !connection_id) {
      return new Response(JSON.stringify({ error: "local_person_id, remote_person_uid, connection_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership of local person
    const { data: partner } = await admin
      .from("partners")
      .select("id")
      .eq("id", local_person_id)
      .eq("user_id", userId)
      .single();

    if (!partner) {
      return new Response(JSON.stringify({ error: "Person not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert link
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
          local_person_id,
          link_status: "linked",
          is_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLink.id);
    } else {
      await admin.from("sync_person_links").insert({
        user_id: userId,
        connection_id,
        local_person_id,
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

    // Resolve any related conflicts
    await admin.from("sync_conflicts")
      .update({
        resolution: "linked_manually",
        resolved_at: new Date().toISOString(),
      })
      .eq("connection_id", connection_id)
      .eq("entity_uid", remote_person_uid)
      .eq("user_id", userId)
      .is("resolved_at", null);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-link-person error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
