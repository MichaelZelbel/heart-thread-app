import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";

/**
 * User-facing: suggests matches between remote people and local partners
 * based on name similarity. NEVER auto-matches — only suggests.
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

    const { remote_people } = await req.json();
    if (!Array.isArray(remote_people)) {
      return new Response(JSON.stringify({ error: "remote_people array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get local partners
    const { data: partners } = await admin
      .from("partners")
      .select("id, name, person_uid")
      .eq("user_id", userId)
      .eq("archived", false)
      .is("merged_into_person_id", null);

    if (!partners) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active connection
    const { data: conn } = await admin
      .from("sync_connections")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!conn) {
      return new Response(JSON.stringify({ error: "No active connection" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get existing links to exclude already-linked people
    const { data: existingLinks } = await admin
      .from("sync_person_links")
      .select("remote_person_uid, local_person_id, link_status")
      .eq("connection_id", conn.id)
      .eq("user_id", userId);

    const linkedRemoteUids = new Set(
      (existingLinks || [])
        .filter(l => l.link_status === 'linked' || l.link_status === 'excluded')
        .map(l => l.remote_person_uid)
    );

    const suggestions: Array<{
      remote_person_uid: string;
      remote_person_name: string;
      local_person_id: string | null;
      local_person_name: string | null;
      confidence: number;
      reasons: string[];
    }> = [];

    for (const remotePerson of remote_people) {
      if (linkedRemoteUids.has(remotePerson.person_uid)) continue;

      const remoteName = (remotePerson.name || "").trim().toLowerCase();
      if (!remoteName) continue;

      let bestMatch: { id: string; name: string; confidence: number; reasons: string[] } | null = null;

      for (const local of partners) {
        const localName = local.name.trim().toLowerCase();
        const reasons: string[] = [];
        let confidence = 0;

        // Exact match
        if (localName === remoteName) {
          confidence = 0.95;
          reasons.push("Exact name match");
        }
        // Same person_uid (already synced before)
        else if (local.person_uid === remotePerson.person_uid) {
          confidence = 0.99;
          reasons.push("Same person ID");
        }
        // First name match
        else {
          const localFirst = localName.split(/\s+/)[0];
          const remoteFirst = remoteName.split(/\s+/)[0];
          if (localFirst === remoteFirst && localFirst.length >= 2) {
            confidence = 0.7;
            reasons.push("First name match");
          }
          // Substring match
          else if (localName.includes(remoteName) || remoteName.includes(localName)) {
            confidence = 0.5;
            reasons.push("Partial name match");
          }
        }

        if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
          bestMatch = { id: local.id, name: local.name, confidence, reasons };
        }
      }

      suggestions.push({
        remote_person_uid: remotePerson.person_uid,
        remote_person_name: remotePerson.name,
        local_person_id: bestMatch?.id || null,
        local_person_name: bestMatch?.name || null,
        confidence: bestMatch?.confidence || 0,
        reasons: bestMatch?.reasons || [],
      });

      // Upsert into candidates table
      await admin.from("sync_person_candidates").upsert({
        user_id: userId,
        connection_id: conn.id,
        remote_person_uid: remotePerson.person_uid,
        remote_person_name: remotePerson.name,
        local_person_id: bestMatch?.id || null,
        confidence: bestMatch?.confidence || 0,
        reasons: bestMatch?.reasons || [],
        status: "pending",
        updated_at: new Date().toISOString(),
      }, { onConflict: "connection_id,remote_person_uid" });
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-suggest-person-matches error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
