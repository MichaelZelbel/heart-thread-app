import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { computeHmac, verifyHmac } from "../_shared/hmac.ts";

/**
 * sync-run: User-triggered active pull from Temerio.
 * 1. Finds the active connection for the calling user.
 * 2. Calls Temerio's sync-pull endpoint (HMAC signed) to fetch their outbox events.
 * 3. Feeds those events into local sync-push logic to apply them here.
 * 4. Returns a summary { pulled, applied, conflicts }.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createAdminClient();
    const { data: claimsData, error: claimsErr } = await admin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.user.id;

    const body = await req.json().catch(() => ({}));
    const { connection_id } = body as { connection_id?: string };

    // Load the active connection
    let connQuery = admin
      .from("sync_connections")
      .select("id, shared_secret_hash, remote_base_url, status")
      .eq("user_id", userId)
      .eq("status", "active");

    if (connection_id) {
      connQuery = connQuery.eq("id", connection_id);
    }

    const { data: conn } = await connQuery.single();

    if (!conn) {
      return new Response(JSON.stringify({ error: "No active connection found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remoteUrl = conn.remote_base_url;
    if (!remoteUrl) {
      return new Response(JSON.stringify({ error: "Remote URL not configured on connection" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load cursor so we only pull new events
    const { data: cursor } = await admin
      .from("sync_cursors")
      .select("last_pushed_outbox_id")
      .eq("user_id", userId)
      .eq("connection_id", conn.id)
      .single();

    const sinceOutboxId = cursor?.last_pushed_outbox_id ?? 0;

    // Pull events from Temerio
    const pullBody = JSON.stringify({ since_outbox_id: sinceOutboxId, limit: 200 });
    const pullSig = await computeHmac(conn.shared_secret_hash, pullBody);

    const pullResp = await fetch(`${remoteUrl}/functions/v1/sync-pull`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-signature": pullSig,
        "x-sync-connection-id": conn.id,
      },
      body: pullBody,
    });

    if (!pullResp.ok) {
      const errText = await pullResp.text();
      console.error("sync-pull from remote failed:", pullResp.status, errText);
      return new Response(JSON.stringify({ error: `Remote pull failed: ${pullResp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { events, last_outbox_id } = await pullResp.json() as {
      events: Array<Record<string, unknown>>;
      last_outbox_id: number;
    };

    const pulled = events?.length ?? 0;

    if (pulled === 0) {
      return new Response(JSON.stringify({ pulled: 0, applied: 0, conflicts: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Push those events into local sync-push endpoint (self-call)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const pushBody = JSON.stringify({ events });
    const pushSig = await computeHmac(conn.shared_secret_hash, pushBody);

    const pushResp = await fetch(`${supabaseUrl}/functions/v1/sync-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-signature": pushSig,
        "x-sync-connection-id": conn.id,
      },
      body: pushBody,
    });

    let applied = 0;
    let conflicts = 0;

    if (pushResp.ok) {
      const pushResult = await pushResp.json() as { applied: number; conflicts: unknown[] };
      applied = pushResult.applied ?? 0;
      conflicts = (pushResult.conflicts ?? []).length;
    } else {
      const errText = await pushResp.text();
      console.error("local sync-push failed:", pushResp.status, errText);
    }

    // Advance the cursor so next pull starts from where we left off
    if (last_outbox_id > sinceOutboxId) {
      await admin.from("sync_cursors").upsert({
        user_id: userId,
        connection_id: conn.id,
        last_pushed_outbox_id: last_outbox_id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,connection_id" });
    }

    return new Response(JSON.stringify({ pulled, applied, conflicts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-run error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
