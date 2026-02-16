import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { hashSecret } from "../_shared/hmac.ts";

// Server-to-server endpoint — no JWT required, validated by pairing code
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, initiator_app, initiator_base_url, shared_secret } = await req.json();

    if (!code || !initiator_app || !initiator_base_url || !shared_secret) {
      return new Response(
        JSON.stringify({ error: "code, initiator_app, initiator_base_url, and shared_secret are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createAdminClient();

    // Find and validate the pairing code
    const { data: pairingCode, error: findErr } = await admin
      .from("sync_pairing_codes")
      .select("*")
      .eq("code", code.toUpperCase())
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (findErr || !pairingCode) {
      return new Response(JSON.stringify({ error: "Invalid or expired pairing code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark code as consumed
    await admin
      .from("sync_pairing_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", pairingCode.id);

    // Create connection for the local user (the one who generated the code)
    const secretHash = await hashSecret(shared_secret);

    const { data: conn, error: connErr } = await admin
      .from("sync_connections")
      .insert({
        user_id: pairingCode.user_id,
        remote_app: initiator_app,
        remote_base_url: initiator_base_url.replace(/\/$/, ""),
        status: "active",
        shared_secret_hash: secretHash,
      })
      .select("id, status")
      .single();

    if (connErr) {
      console.error("Insert connection error:", connErr);
      return new Response(JSON.stringify({ error: "Failed to create connection" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        remote_user_id: pairingCode.user_id,
        connection_id: conn.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("consume-pairing-code error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
