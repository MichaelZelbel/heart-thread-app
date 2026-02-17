import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { verifyHmac } from "../_shared/hmac.ts";

/**
 * Server-to-server endpoint: returns this user's people list to the remote app.
 * Authenticated via HMAC signature (same pattern as sync-pull/sync-push).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("x-sync-signature");
    const connectionId = req.headers.get("x-sync-connection-id");

    if (!signature || !connectionId) {
      return new Response(JSON.stringify({ error: "Missing x-sync-signature or x-sync-connection-id" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bodyText = await req.text();
    const admin = createAdminClient();

    // Find matching connection by verifying HMAC against all active connections
    const { data: activeConns } = await admin
      .from("sync_connections")
      .select("id, user_id, shared_secret_hash, status")
      .eq("status", "active");

    if (!activeConns || activeConns.length === 0) {
      return new Response(JSON.stringify({ error: "No active connections" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let conn: typeof activeConns[0] | null = null;
    for (const c of activeConns) {
      const valid = await verifyHmac(c.shared_secret_hash, bodyText, signature);
      if (valid) {
        conn = c;
        break;
      }
    }

    if (!conn) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch this user's non-archived, non-merged partners
    const { data: partners, error: partnersErr } = await admin
      .from("partners")
      .select("person_uid, name, relationship_type")
      .eq("user_id", conn.user_id)
      .eq("archived", false)
      .is("merged_into_person_id", null);

    if (partnersErr) {
      console.error("Error fetching partners:", partnersErr);
      return new Response(JSON.stringify({ error: "Failed to fetch people" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const people = (partners || []).map((p) => ({
      person_uid: p.person_uid,
      name: p.name,
      relationship_label: p.relationship_type || null,
    }));

    return new Response(JSON.stringify({ people }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-list-people error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
