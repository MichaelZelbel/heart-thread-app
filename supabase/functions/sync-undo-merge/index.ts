import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";

/**
 * User-facing: undo a previous merge, restoring the merged person
 * and reverting moment assignments.
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

    const { merge_log_id } = await req.json();
    if (!merge_log_id) {
      return new Response(JSON.stringify({ error: "merge_log_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: log } = await admin
      .from("sync_merge_log")
      .select("*")
      .eq("id", merge_log_id)
      .eq("user_id", userId)
      .is("undone_at", null)
      .single();

    if (!log) {
      return new Response(JSON.stringify({ error: "Merge log not found or already undone" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mergedPersonId = log.merged_person_id;
    const keptPersonId = log.kept_person_id;

    // Unarchive the merged person
    await admin.from("partners").update({
      archived: false,
      merged_into_person_id: null,
    }).eq("id", mergedPersonId);

    // Restore moment assignments from snapshot
    const momentSnapshots = (log.merged_moments_snapshot as Array<{ id: string; partner_ids: string[] }>) || [];
    for (const snap of momentSnapshots) {
      await admin.from("moments").update({ partner_ids: snap.partner_ids }).eq("id", snap.id);
    }

    // Restore sync links from snapshot
    const linkSnapshots = (log.merged_links_snapshot as Array<Record<string, unknown>>) || [];
    for (const linkSnap of linkSnapshots) {
      const { data: existing } = await admin.from("sync_person_links")
        .select("id")
        .eq("id", linkSnap.id as string)
        .maybeSingle();

      if (existing) {
        await admin.from("sync_person_links").update({
          local_person_id: mergedPersonId,
        }).eq("id", existing.id);
      } else {
        // Re-insert the link
        await admin.from("sync_person_links").insert({
          id: linkSnap.id as string,
          user_id: userId,
          connection_id: linkSnap.connection_id as string,
          local_person_id: mergedPersonId,
          remote_person_uid: linkSnap.remote_person_uid as string,
          is_enabled: linkSnap.is_enabled as boolean,
          link_status: (linkSnap.link_status as string) || "linked",
        });
      }
    }

    // Mark log as undone
    await admin.from("sync_merge_log").update({
      undone_at: new Date().toISOString(),
    }).eq("id", merge_log_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-undo-merge error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
