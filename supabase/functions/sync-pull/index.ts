import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { verifyHmac } from "../_shared/hmac.ts";

// Server-to-server: HMAC authenticated
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

    // The connectionId header is the REMOTE app's connection ID, not ours.
    // Find local connection by verifying HMAC against all active connections.
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

    const parsed = JSON.parse(bodyText);

    // Handle list_people mode: return all local partners for the connected user
    if (parsed.list_people) {
      const { data: partners } = await admin
        .from("partners")
        .select("id, name, person_uid, relationship_type")
        .eq("user_id", conn.user_id)
        .eq("archived", false)
        .is("merged_into_person_id", null);

      return new Response(JSON.stringify({
        people: (partners || []).map(p => ({
          person_uid: p.person_uid,
          name: p.name,
          relationship_label: p.relationship_type,
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Standard pull: return outbox events
    const { since_outbox_id = 0, limit = 100 } = parsed;

    const { data: links } = await admin
      .from("sync_person_links")
      .select("local_person_id, remote_person_uid")
      .eq("connection_id", conn.id)
      .eq("is_enabled", true);

    if (!links || links.length === 0) {
      return new Response(JSON.stringify({ events: [], last_outbox_id: since_outbox_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: outboxRows, error: outboxErr } = await admin
      .from("sync_outbox")
      .select("*")
      .eq("connection_id", conn.id)
      .gt("id", since_outbox_id)
      .order("id", { ascending: true })
      .limit(limit);

    if (outboxErr) {
      console.error("Outbox query error:", outboxErr);
      return new Response(JSON.stringify({ error: "Failed to read outbox" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastId = outboxRows && outboxRows.length > 0
      ? outboxRows[outboxRows.length - 1].id
      : since_outbox_id;

    await admin
      .from("sync_cursors")
      .upsert({
        user_id: conn.user_id,
        connection_id: conn.id,
        last_pulled_outbox_id: lastId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,connection_id" });

    return new Response(JSON.stringify({ events: outboxRows || [], last_outbox_id: lastId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-pull error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
