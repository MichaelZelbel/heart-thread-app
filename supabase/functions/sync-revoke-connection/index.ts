import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { verifyHmac } from "../_shared/hmac.ts";

// Server-to-server: HMAC authenticated.
// Called by the remote app when THEY disconnect, so we also revoke locally.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("x-sync-signature");
    const connectionId = req.headers.get("x-sync-connection-id");

    if (!signature || !connectionId) {
      return new Response(JSON.stringify({ error: "Missing headers" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bodyText = await req.text();
    const admin = createAdminClient();

    // The connectionId header is the REMOTE app's connection ID, not ours.
    // We need to find our local active connection by verifying the HMAC
    // signature against all active connections' shared secrets.
    const { data: activeConns } = await admin
      .from("sync_connections")
      .select("id, user_id, shared_secret_hash, status")
      .eq("status", "active");

    if (!activeConns || activeConns.length === 0) {
      // No active connections — idempotent success
      return new Response(JSON.stringify({ ok: true, already_revoked: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the connection whose shared secret validates the HMAC
    let matchedConn: typeof activeConns[0] | null = null;
    for (const conn of activeConns) {
      const valid = await verifyHmac(conn.shared_secret_hash, bodyText, signature);
      if (valid) {
        matchedConn = conn;
        break;
      }
    }

    if (!matchedConn) {
      console.error("No active connection matched the HMAC signature. Remote connection ID:", connectionId);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Revoke the connection locally
    await admin
      .from("sync_connections")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", matchedConn.id);

    console.log(`Connection ${matchedConn.id} revoked by remote request (remote connection ID: ${connectionId})`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-revoke-connection error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
