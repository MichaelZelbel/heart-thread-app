import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { computeHmac } from "../_shared/hmac.ts";

/**
 * User-facing: fetches remote people from the connected Temerio instance
 * via server-to-server HMAC call, returning name + person_uid list.
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

    // Get active connection
    const { data: conn } = await admin
      .from("sync_connections")
      .select("id, shared_secret_hash, remote_base_url")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!conn) {
      return new Response(JSON.stringify({ error: "No active sync connection" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remoteUrl = conn.remote_base_url || Deno.env.get("SYNC_REMOTE_APP_URL");
    if (!remoteUrl) {
      return new Response(JSON.stringify({ error: "Remote URL not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call remote sync-pull to get person events (or a dedicated endpoint)
    // We'll call the remote's sync-pull with a special request to list people
    const body = JSON.stringify({ list_people: true, since_outbox_id: 0, limit: 500 });
    const signature = await computeHmac(conn.shared_secret_hash, body);

    const resp = await fetch(`${remoteUrl}/functions/v1/sync-pull`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-signature": signature,
        "x-sync-connection-id": conn.id,
      },
      body,
    });

    if (!resp.ok) {
      // Fallback: query local sync_person_links to see what remote UIDs we know about
      // and query locally for any candidates we've cached
    }

    const remoteData = await resp.json();

    // Also get locally-known remote person info from candidates table
    const { data: candidates } = await admin
      .from("sync_person_candidates")
      .select("*")
      .eq("connection_id", conn.id)
      .eq("user_id", userId);

    // Also get existing links
    const { data: links } = await admin
      .from("sync_person_links")
      .select("*")
      .eq("connection_id", conn.id)
      .eq("user_id", userId);

    return new Response(JSON.stringify({
      remote_events: remoteData.events || [],
      candidates: candidates || [],
      links: links || [],
      connection_id: conn.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-list-remote-people error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
