import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { computeHmac } from "../_shared/hmac.ts";

/**
 * User-facing: creates a local person in the remote Temerio instance
 * by pushing a person upsert event, then auto-links.
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

    const { local_person_id } = await req.json();
    if (!local_person_id) {
      return new Response(JSON.stringify({ error: "local_person_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get partner
    const { data: partner } = await admin
      .from("partners")
      .select("id, name, person_uid, relationship_type")
      .eq("id", local_person_id)
      .eq("user_id", userId)
      .single();

    if (!partner) {
      return new Response(JSON.stringify({ error: "Person not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get connection
    const { data: conn } = await admin
      .from("sync_connections")
      .select("id, shared_secret_hash, remote_base_url")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!conn) {
      return new Response(JSON.stringify({ error: "No active connection" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remoteUrl = conn.remote_base_url || Deno.env.get("SYNC_REMOTE_APP_URL");
    if (!remoteUrl) {
      return new Response(JSON.stringify({ error: "Remote URL not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Push person creation to remote
    const pushBody = JSON.stringify({
      events: [{
        entity_type: "person",
        entity_uid: partner.person_uid,
        operation: "upsert",
        payload: {
          name: partner.name,
          relationship_label: partner.relationship_type,
          updated_at: new Date().toISOString(),
        },
      }],
    });

    const signature = await computeHmac(conn.shared_secret_hash, pushBody);

    const resp = await fetch(`${remoteUrl}/functions/v1/sync-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-signature": signature,
        "x-sync-connection-id": conn.id,
      },
      body: pushBody,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Remote push failed: ${errText}`);
    }

    // Auto-link locally
    const { data: existingLink } = await admin
      .from("sync_person_links")
      .select("id")
      .eq("connection_id", conn.id)
      .eq("local_person_id", partner.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingLink) {
      await admin.from("sync_person_links")
        .update({
          remote_person_uid: partner.person_uid,
          link_status: "linked",
          is_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLink.id);
    } else {
      await admin.from("sync_person_links").insert({
        user_id: userId,
        connection_id: conn.id,
        local_person_id: partner.id,
        remote_person_uid: partner.person_uid,
        link_status: "linked",
        is_enabled: true,
      });
    }

    return new Response(JSON.stringify({ success: true, person_uid: partner.person_uid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-create-remote-person error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
