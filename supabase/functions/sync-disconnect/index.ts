import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase-admin.ts";
import { computeHmac } from "../_shared/hmac.ts";

// User-authenticated: called by the Cherishly UI when the user clicks Disconnect.
// 1. Revokes the local connection
// 2. Calls the remote app's sync-revoke-connection to revoke the other side
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createUserClient(authHeader);
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { connection_id } = await req.json();
    if (!connection_id) {
      return new Response(JSON.stringify({ error: "connection_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createAdminClient();

    // Fetch the connection (must belong to user and be active)
    const { data: conn, error: connErr } = await admin
      .from("sync_connections")
      .select("id, user_id, shared_secret_hash, remote_base_url, status")
      .eq("id", connection_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "Connection not found or already revoked" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Revoke locally
    await admin
      .from("sync_connections")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("id", connection_id);

    // 2. Notify remote app (best-effort — don't fail if remote is unreachable)
    let remoteNotified = false;
    if (conn.remote_base_url) {
      try {
        const body = JSON.stringify({ revoked_by: "cherishly" });
        const signature = await computeHmac(conn.shared_secret_hash, body);

        const remoteUrl = `${conn.remote_base_url}/functions/v1/sync-revoke-connection`;
        const resp = await fetch(remoteUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-sync-signature": signature,
            "x-sync-connection-id": connection_id,
          },
          body,
        });

        remoteNotified = resp.ok;
        if (!resp.ok) {
          console.error(`Remote revoke failed: ${resp.status} ${await resp.text()}`);
        }
      } catch (err) {
        console.error("Failed to notify remote of revocation:", err);
      }
    }

    return new Response(JSON.stringify({ ok: true, remote_notified: remoteNotified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-disconnect error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
