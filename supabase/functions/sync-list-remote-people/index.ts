import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { computeHmac } from "../_shared/hmac.ts";

/**
 * User-facing: fetches remote people from Temerio, caches them,
 * builds all 3 suggestion types, and returns them.
 * 
 * Returns:
 * - suggested_matches: remote people that match local people by name
 * - suggested_create_remote: local people not found remotely
 * - suggested_create_local: remote people not found locally
 * - links: existing links
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

    // Parse optional force_refresh flag
    let forceRefresh = false;
    try {
      const body = await req.json();
      forceRefresh = body?.force_refresh === true;
    } catch { /* no body is fine */ }

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

    // Check cache freshness (10 minute TTL)
    const { data: cachedPeople } = await admin
      .from("sync_remote_people_cache")
      .select("*")
      .eq("connection_id", conn.id)
      .eq("user_id", userId);

    const cacheAge = cachedPeople && cachedPeople.length > 0
      ? Date.now() - new Date(cachedPeople[0].fetched_at).getTime()
      : Infinity;
    const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

    let remotePeople: Array<{ person_uid: string; name: string; relationship_label: string | null }> = [];

    if (!forceRefresh && cacheAge < CACHE_TTL && cachedPeople && cachedPeople.length > 0) {
      // Use cached data
      remotePeople = cachedPeople.map(c => ({
        person_uid: c.remote_person_uid,
        name: c.remote_name,
        relationship_label: c.remote_relationship_label,
      }));
    } else {
      // Fetch from remote
      const remoteUrl = conn.remote_base_url || Deno.env.get("SYNC_REMOTE_APP_URL");
      if (!remoteUrl) {
        return new Response(JSON.stringify({ error: "Remote URL not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = JSON.stringify({ list_people: true });
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
        const errText = await resp.text();
        console.error("Remote fetch failed:", resp.status, errText);
        // Fall back to cached data if available
        if (cachedPeople && cachedPeople.length > 0) {
          remotePeople = cachedPeople.map(c => ({
            person_uid: c.remote_person_uid,
            name: c.remote_name,
            relationship_label: c.remote_relationship_label,
          }));
        } else {
          return new Response(JSON.stringify({ error: "Failed to fetch remote people" }), {
            status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        const remoteData = await resp.json();
        remotePeople = remoteData.people || [];

        // Update cache: delete old, insert new
        await admin
          .from("sync_remote_people_cache")
          .delete()
          .eq("connection_id", conn.id)
          .eq("user_id", userId);

        if (remotePeople.length > 0) {
          await admin.from("sync_remote_people_cache").insert(
            remotePeople.map(rp => ({
              user_id: userId,
              connection_id: conn.id,
              remote_person_uid: rp.person_uid,
              remote_name: rp.name,
              remote_relationship_label: rp.relationship_label || null,
              fetched_at: new Date().toISOString(),
            }))
          );
        }
      }
    }

    // Get local partners
    const { data: partners } = await admin
      .from("partners")
      .select("id, name, person_uid, relationship_type")
      .eq("user_id", userId)
      .eq("archived", false)
      .is("merged_into_person_id", null);

    // Get existing links
    const { data: links } = await admin
      .from("sync_person_links")
      .select("*")
      .eq("connection_id", conn.id)
      .eq("user_id", userId);

    const linkedRemoteUids = new Set(
      (links || []).filter(l => l.link_status === "linked" || l.link_status === "excluded").map(l => l.remote_person_uid)
    );
    const linkedLocalIds = new Set(
      (links || []).filter(l => l.link_status === "linked").map(l => l.local_person_id)
    );

    // Build suggestions
    const suggestedMatches: Array<{
      remote_person_uid: string;
      remote_name: string;
      local_person_id: string;
      local_name: string;
      confidence: number;
      reasons: string[];
    }> = [];

    const unmatchedRemote: typeof remotePeople = [];

    for (const rp of remotePeople) {
      if (linkedRemoteUids.has(rp.person_uid)) continue;

      const remoteName = (rp.name || "").trim();
      if (!remoteName) continue;

      // Try to find best local match
      let bestMatch: { id: string; name: string; confidence: number; reasons: string[] } | null = null;

      for (const local of (partners || [])) {
        if (linkedLocalIds.has(local.id)) continue;

        const localName = local.name.trim();
        const reasons: string[] = [];
        let confidence = 0;

        // Same person_uid (already synced before)
        if (local.person_uid === rp.person_uid) {
          confidence = 0.99;
          reasons.push("Same person ID");
        }
        // Exact case-insensitive match
        else if (localName.toLowerCase() === remoteName.toLowerCase()) {
          confidence = 0.95;
          reasons.push("Exact name match");
        }
        // Normalized match (trim, collapse spaces, remove punctuation)
        else if (normalizeName(localName) === normalizeName(remoteName)) {
          confidence = 0.90;
          reasons.push("Normalized name match");
        }
        // First name match
        else {
          const localFirst = localName.toLowerCase().split(/\s+/)[0];
          const remoteFirst = remoteName.toLowerCase().split(/\s+/)[0];
          if (localFirst === remoteFirst && localFirst.length >= 2) {
            confidence = 0.70;
            reasons.push("First name match");
          }
          // Substring match
          else if (localName.toLowerCase().includes(remoteName.toLowerCase()) ||
                   remoteName.toLowerCase().includes(localName.toLowerCase())) {
            confidence = 0.50;
            reasons.push("Partial name match");
          }
        }

        if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
          bestMatch = { id: local.id, name: local.name, confidence, reasons };
        }
      }

      if (bestMatch && bestMatch.confidence >= 0.50) {
        suggestedMatches.push({
          remote_person_uid: rp.person_uid,
          remote_name: rp.name,
          local_person_id: bestMatch.id,
          local_name: bestMatch.name,
          confidence: bestMatch.confidence,
          reasons: bestMatch.reasons,
        });
      } else {
        unmatchedRemote.push(rp);
      }
    }

    // Local people not linked and not in suggested matches
    const matchedLocalIds = new Set(suggestedMatches.map(m => m.local_person_id));
    const suggestedCreateRemote = (partners || [])
      .filter(p => !linkedLocalIds.has(p.id) && !matchedLocalIds.has(p.id))
      .map(p => ({
        local_person_id: p.id,
        local_name: p.name,
        local_person_uid: p.person_uid,
      }));

    // Remote people not linked and not in suggested matches
    const suggestedCreateLocal = unmatchedRemote.map(rp => ({
      remote_person_uid: rp.person_uid,
      remote_name: rp.name,
      remote_relationship_label: rp.relationship_label,
    }));

    // Upsert suggestions into sync_person_candidates for persistence
    const allCandidates = [
      ...suggestedMatches.map(m => ({
        user_id: userId,
        connection_id: conn.id,
        remote_person_uid: m.remote_person_uid,
        remote_person_name: m.remote_name,
        local_person_id: m.local_person_id,
        confidence: m.confidence,
        reasons: m.reasons,
        status: "pending",
        updated_at: new Date().toISOString(),
      })),
      ...suggestedCreateLocal.map(rp => ({
        user_id: userId,
        connection_id: conn.id,
        remote_person_uid: rp.remote_person_uid,
        remote_person_name: rp.remote_name,
        local_person_id: null,
        confidence: 0,
        reasons: ["No local match found"],
        status: "pending",
        updated_at: new Date().toISOString(),
      })),
    ];

    // Clear old pending candidates and insert new
    await admin
      .from("sync_person_candidates")
      .delete()
      .eq("connection_id", conn.id)
      .eq("user_id", userId)
      .eq("status", "pending");

    if (allCandidates.length > 0) {
      await admin.from("sync_person_candidates").insert(allCandidates);
    }

    return new Response(JSON.stringify({
      suggested_matches: suggestedMatches,
      suggested_create_remote: suggestedCreateRemote,
      suggested_create_local: suggestedCreateLocal,
      links: links || [],
      connection_id: conn.id,
      fetched_at: new Date().toISOString(),
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

/** Normalize a name for fuzzy comparison */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, "") // remove punctuation
    .replace(/\s+/g, " "); // collapse spaces
}
