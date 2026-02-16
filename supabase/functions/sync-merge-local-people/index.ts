import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";

/**
 * User-facing: merge two local people. Keeps one, archives the other,
 * moves all moments/likes/dislikes/nicknames/links, and logs for undo.
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

    const { keep_person_id, merge_person_id } = await req.json();
    if (!keep_person_id || !merge_person_id || keep_person_id === merge_person_id) {
      return new Response(JSON.stringify({ error: "keep_person_id and merge_person_id required and must differ" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: keepPerson } = await admin.from("partners").select("*").eq("id", keep_person_id).eq("user_id", userId).single();
    const { data: mergePerson } = await admin.from("partners").select("*").eq("id", merge_person_id).eq("user_id", userId).single();

    if (!keepPerson || !mergePerson) {
      return new Response(JSON.stringify({ error: "One or both people not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Snapshot the merged person's data for undo
    const { data: mergedMoments } = await admin.from("moments").select("id, partner_ids").eq("user_id", userId);
    const momentsWithMerged = (mergedMoments || []).filter(m => 
      (m.partner_ids || []).includes(merge_person_id)
    );

    const { data: mergedLinks } = await admin.from("sync_person_links").select("*").eq("local_person_id", merge_person_id).eq("user_id", userId);

    // Log the merge for undo
    await admin.from("sync_merge_log").insert({
      user_id: userId,
      kept_person_id: keep_person_id,
      merged_person_id: merge_person_id,
      merged_person_snapshot: mergePerson,
      merged_links_snapshot: mergedLinks || [],
      merged_moments_snapshot: momentsWithMerged.map(m => ({ id: m.id, partner_ids: m.partner_ids })),
    });

    // Move moments: replace merge_person_id with keep_person_id in partner_ids
    for (const moment of momentsWithMerged) {
      const newPartnerIds = (moment.partner_ids || []).map((pid: string) => 
        pid === merge_person_id ? keep_person_id : pid
      );
      // Deduplicate
      const unique = [...new Set(newPartnerIds)];
      await admin.from("moments").update({ partner_ids: unique }).eq("id", moment.id);
    }

    // Move sync links: point to kept person
    if (mergedLinks && mergedLinks.length > 0) {
      for (const link of mergedLinks) {
        // Check if kept person already has a link for this remote_person_uid
        const { data: existing } = await admin.from("sync_person_links")
          .select("id")
          .eq("local_person_id", keep_person_id)
          .eq("remote_person_uid", link.remote_person_uid)
          .eq("user_id", userId)
          .maybeSingle();

        if (existing) {
          // Delete the duplicate link
          await admin.from("sync_person_links").delete().eq("id", link.id);
        } else {
          // Re-point to kept person
          await admin.from("sync_person_links").update({ local_person_id: keep_person_id }).eq("id", link.id);
        }
      }
    }

    // Move likes, dislikes, nicknames, profile details
    await admin.from("partner_likes").update({ partner_id: keep_person_id }).eq("partner_id", merge_person_id);
    await admin.from("partner_dislikes").update({ partner_id: keep_person_id }).eq("partner_id", merge_person_id);
    await admin.from("partner_nicknames").update({ partner_id: keep_person_id }).eq("partner_id", merge_person_id);
    await admin.from("partner_profile_details").update({ partner_id: keep_person_id }).eq("partner_id", merge_person_id);
    await admin.from("partner_connections").update({ partner_id: keep_person_id }).eq("partner_id", merge_person_id);
    await admin.from("partner_connections").update({ connected_partner_id: keep_person_id }).eq("connected_partner_id", merge_person_id);

    // Archive merged person
    await admin.from("partners").update({
      archived: true,
      merged_into_person_id: keep_person_id,
    }).eq("id", merge_person_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-merge-local-people error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
