import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";

/**
 * sync-backfill: One-time (or on-demand) population of sync_outbox with
 * all existing moments and partners that belong to active, linked people.
 *
 * Call this once after the initial connection is established so that
 * historical data can be synced via sync-run.
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

    // Load active connections for this user
    let connQuery = admin
      .from("sync_connections")
      .select("id, shared_secret_hash, remote_base_url, status")
      .eq("user_id", userId)
      .eq("status", "active");

    if (connection_id) {
      connQuery = connQuery.eq("id", connection_id);
    }

    const { data: conns } = await connQuery;
    if (!conns || conns.length === 0) {
      return new Response(JSON.stringify({ error: "No active connection found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalMoments = 0;
    let totalPeople = 0;

    for (const conn of conns) {
      // Load all enabled person links for this connection
      const { data: links } = await admin
        .from("sync_person_links")
        .select("local_person_id, remote_person_uid")
        .eq("connection_id", conn.id)
        .eq("is_enabled", true);

      if (!links || links.length === 0) continue;

      const localPersonIds = links.map((l) => l.local_person_id).filter(Boolean) as string[];
      const personUidMap = new Map<string, string>(); // local_person_id -> remote_person_uid
      for (const l of links) {
        if (l.local_person_id) {
          personUidMap.set(l.local_person_id, l.remote_person_uid);
        }
      }

      // --- Backfill partners ---
      const { data: partners } = await admin
        .from("partners")
        .select("id, person_uid, name, relationship_type, updated_at")
        .eq("user_id", userId)
        .eq("archived", false)
        .in("id", localPersonIds);

      for (const p of partners || []) {
        const remoteUid = personUidMap.get(p.id);
        if (!remoteUid) continue;

        // Check if this outbox entry already exists (avoid duplicates via dedup window)
        const { count } = await admin
          .from("sync_outbox")
          .select("id", { count: "exact", head: true })
          .eq("connection_id", conn.id)
          .eq("entity_uid", p.person_uid)
          .eq("entity_type", "person");

        if ((count ?? 0) > 0) continue; // already in outbox

        await admin.from("sync_outbox").insert({
          user_id: userId,
          connection_id: conn.id,
          entity_type: "person",
          entity_uid: p.person_uid,
          operation: "upsert",
          payload: {
            name: p.name,
            relationship_label: p.relationship_type,
            updated_at: p.updated_at,
          },
        });
        totalPeople++;
      }

      // --- Backfill moments ---
      const { data: moments } = await admin
        .from("moments")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .not("partner_ids", "is", null);

      for (const m of moments || []) {
        const partnerIds: string[] = Array.isArray(m.partner_ids) ? m.partner_ids : [];
        // Find the first partner that is linked
        const linkedPartnerId = partnerIds.find((pid) => personUidMap.has(pid));
        if (!linkedPartnerId) continue;

        const remotePersonUid = personUidMap.get(linkedPartnerId)!;

        // Avoid duplicates
        const { count } = await admin
          .from("sync_outbox")
          .select("id", { count: "exact", head: true })
          .eq("connection_id", conn.id)
          .eq("entity_uid", m.moment_uid)
          .eq("entity_type", "moment");

        if ((count ?? 0) > 0) continue;

        await admin.from("sync_outbox").insert({
          user_id: userId,
          connection_id: conn.id,
          entity_type: "moment",
          entity_uid: m.moment_uid,
          operation: "upsert",
          payload: {
            title: m.title,
            description: m.description,
            happened_at: m.happened_at ?? m.moment_date,
            impact_level: m.impact_level,
            attachments: m.attachments,
            event_type: m.event_type,
            is_celebrated_annually: m.is_celebrated_annually,
            person_uid: remotePersonUid,
            updated_at: m.updated_at,
          },
        });
        totalMoments++;
      }
    }

    return new Response(
      JSON.stringify({ queued_moments: totalMoments, queued_people: totalPeople }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sync-backfill error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
