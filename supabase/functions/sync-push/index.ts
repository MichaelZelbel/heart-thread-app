import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { verifyHmac } from "../_shared/hmac.ts";

// Server-to-server: HMAC authenticated push of remote events
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

    const { data: conn, error: connErr } = await admin
      .from("sync_connections")
      .select("id, user_id, shared_secret_hash, status")
      .eq("id", connectionId)
      .eq("status", "active")
      .single();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "Connection not found or inactive" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valid = await verifyHmac(conn.shared_secret_hash, bodyText, signature);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { events } = JSON.parse(bodyText);
    if (!Array.isArray(events) || events.length === 0) {
      return new Response(JSON.stringify({ applied: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get person links for resolving remote_person_uid -> local partner id
    const { data: links } = await admin
      .from("sync_person_links")
      .select("local_person_id, remote_person_uid")
      .eq("connection_id", connectionId)
      .eq("is_enabled", true);

    const personMap = new Map<string, string>();
    for (const l of links || []) {
      personMap.set(l.remote_person_uid, l.local_person_id);
    }

    let applied = 0;
    const conflicts: Array<{ entity_uid: string; entity_type: string; reason: string }> = [];

    for (const evt of events) {
      const { entity_type, entity_uid, operation, payload } = evt;

      try {
        if (entity_type === "person") {
          await applyPerson(admin, conn.user_id, entity_uid, operation, payload);
          applied++;
        } else if (entity_type === "moment") {
          const result = await applyMoment(admin, conn.user_id, entity_uid, operation, payload, personMap, connectionId);
          if (result === "conflict") {
            conflicts.push({ entity_uid, entity_type, reason: "Both sides modified since last sync" });
          } else {
            applied++;
          }
        }
      } catch (err) {
        console.error(`Failed to apply ${entity_type}/${entity_uid}:`, err);
        conflicts.push({ entity_uid, entity_type, reason: err instanceof Error ? err.message : "Unknown" });
      }
    }

    return new Response(JSON.stringify({ applied, conflicts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-push error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function applyPerson(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  personUid: string,
  operation: string,
  payload: Record<string, unknown>,
) {
  if (operation === "delete") {
    return; // Soft-delete not supported for partners
  }

  // Check if partner already exists locally by person_uid
  const { data: existing } = await admin
    .from("partners")
    .select("id, updated_at")
    .eq("user_id", userId)
    .eq("person_uid", personUid)
    .single();

  if (existing) {
    const remoteUpdated = new Date(payload.updated_at as string);
    const localUpdated = new Date(existing.updated_at);
    if (remoteUpdated > localUpdated) {
      await admin
        .from("partners")
        .update({
          name: payload.name as string,
          relationship_type: (payload.relationship_label as string) || null,
          updated_at: payload.updated_at as string,
        })
        .eq("id", existing.id);
    }
  } else {
    await admin.from("partners").insert({
      user_id: userId,
      person_uid: personUid,
      name: (payload.name as string) || "Unknown",
      relationship_type: (payload.relationship_label as string) || null,
    });
  }
}

async function applyMoment(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  momentUid: string,
  operation: string,
  payload: Record<string, unknown>,
  personMap: Map<string, string>,
  connectionId: string,
): Promise<"applied" | "conflict"> {
  const { data: existing } = await admin
    .from("moments")
    .select("id, updated_at")
    .eq("user_id", userId)
    .eq("moment_uid", momentUid)
    .single();

  if (operation === "delete") {
    if (existing) {
      await admin
        .from("moments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    return "applied";
  }

  // Resolve partner from person_uid
  let partnerId: string | null = null;
  if (payload.person_uid) {
    partnerId = personMap.get(payload.person_uid as string) || null;
  }

  // Map Temerio fields to Cherishly schema
  const happenedAt = payload.happened_at as string;
  const momentDate = happenedAt ? happenedAt.substring(0, 10) : new Date().toISOString().substring(0, 10);

  const momentData: Record<string, unknown> = {
    title: payload.title as string,
    description: (payload.description as string) || null,
    moment_date: momentDate,
    happened_at: happenedAt,
    impact_level: (payload.impact_level as number) || 2,
    attachments: payload.attachments || null,
    event_type: (payload.event_type as string) || (payload.category as string) || null,
    is_celebrated_annually: payload.is_celebrated_annually ?? false,
    updated_at: payload.updated_at as string,
    source: "sync",
  };

  if (partnerId) {
    momentData.partner_ids = [partnerId];
  }

  if (existing) {
    const remoteUpdated = new Date(payload.updated_at as string);
    const localUpdated = new Date(existing.updated_at);

    if (localUpdated > remoteUpdated) {
      await admin.from("sync_conflicts").insert({
        user_id: userId,
        connection_id: connectionId,
        entity_type: "moment",
        entity_uid: momentUid,
        local_payload: existing as unknown as Record<string, unknown>,
        remote_payload: payload as unknown as Record<string, unknown>,
      });
      return "conflict";
    }

    await admin
      .from("moments")
      .update(momentData)
      .eq("id", existing.id);
  } else {
    await admin.from("moments").insert({
      ...momentData,
      user_id: userId,
      moment_uid: momentUid,
    });
  }

  return "applied";
}
