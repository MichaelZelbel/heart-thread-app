import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient, createAdminClient } from "../_shared/supabase-admin.ts";
import { generateSecret, hashSecret } from "../_shared/hmac.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createUserClient(authHeader);
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const { code } = await req.json();
    if (!code) {
      return new Response(JSON.stringify({ error: "code is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve remote URL from env
    const remoteBaseUrl = Deno.env.get("SYNC_REMOTE_APP_URL");
    if (!remoteBaseUrl) {
      console.error("SYNC_REMOTE_APP_URL is not configured");
      return new Response(JSON.stringify({ error: "Sync is not configured on this deployment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remoteApp = "temerio"; // hardcoded for Cherishly side

    // Generate a shared secret for this connection
    const sharedSecret = generateSecret();

    // Call the remote app's consume-pairing-code endpoint
    const consumeUrl = `${remoteBaseUrl.replace(/\/+$/, "")}/functions/v1/consume-pairing-code`;
    const consumeResp = await fetch(consumeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        initiator_app: "cherishly",
        initiator_base_url: Deno.env.get("SUPABASE_URL"),
        shared_secret: sharedSecret,
      }),
    });

    if (!consumeResp.ok) {
      const errBody = await consumeResp.text();
      console.error("Remote consume failed:", consumeResp.status, errBody);
      return new Response(JSON.stringify({ error: "Remote app rejected the pairing code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const consumeData = await consumeResp.json();

    // Store the connection locally
    const admin = createAdminClient();
    const secretHash = await hashSecret(sharedSecret);

    const { data: conn, error: connErr } = await admin
      .from("sync_connections")
      .insert({
        user_id: userId,
        remote_app: remoteApp,
        remote_base_url: remoteBaseUrl.replace(/\/+$/, ""),
        status: "active",
        shared_secret_hash: secretHash,
      })
      .select("id, status, remote_app")
      .single();

    if (connErr) {
      console.error("Insert connection error:", connErr);
      return new Response(JSON.stringify({ error: "Failed to create connection" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ connection_id: conn.id, connection: conn }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("accept-pairing-code error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
