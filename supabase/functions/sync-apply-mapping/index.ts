import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { computeHmac } from "../_shared/hmac.ts";

interface MappingAction {
  action: "link" | "create_remote" | "create_local" | "exclude";
  local_person_id?: string;
  remote_person_uid?: string;
  remote_name?: string;
  remote_relationship_label?: string | null;
}

/**
 * Batch applies mapping actions for people sync.
 * Processes: link, create_remote, create_local, exclude.
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

    const { connection_id, actions } = await req.json() as {
      connection_id: string;
      actions: MappingAction[];
    };

    if (!connection_id || !actions || !Array.isArray(actions)) {
      return new Response(JSON.stringify({ error: "connection_id and actions[] required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get connection
    const { data: conn } = await admin
      .from("sync_connections")
      .select("id, shared_secret_hash, remote_base_url")
      .eq("id", connection_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!conn) {
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ action: string; success: boolean; error?: string }> = [];

    for (const act of actions) {
      try {
        switch (act.action) {
          case "link": {
            if (!act.local_person_id || !act.remote_person_uid) {
              results.push({ action: "link", success: false, error: "Missing IDs" });
              break;
            }
            // Verify ownership
            const { data: partner } = await admin.from("partners").select("id")
              .eq("id", act.local_person_id).eq("user_id", userId).single();
            if (!partner) {
              results.push({ action: "link", success: false, error: "Person not found" });
              break;
            }
            await upsertLink(admin, userId, conn.id, act.local_person_id, act.remote_person_uid, "linked", true);
            results.push({ action: "link", success: true });
            break;
          }

          case "exclude": {
            if (!act.remote_person_uid) {
              results.push({ action: "exclude", success: false, error: "Missing remote_person_uid" });
              break;
            }
            await upsertLink(admin, userId, conn.id, null, act.remote_person_uid, "excluded", false);
            results.push({ action: "exclude", success: true });
            break;
          }

          case "create_remote": {
            if (!act.local_person_id) {
              results.push({ action: "create_remote", success: false, error: "Missing local_person_id" });
              break;
            }
            const { data: p } = await admin.from("partners")
              .select("id, name, person_uid, relationship_type")
              .eq("id", act.local_person_id).eq("user_id", userId).single();
            if (!p) {
              results.push({ action: "create_remote", success: false, error: "Person not found" });
              break;
            }
            const remoteUrl = conn.remote_base_url || Deno.env.get("SYNC_REMOTE_APP_URL");
            if (!remoteUrl) {
              results.push({ action: "create_remote", success: false, error: "No remote URL" });
              break;
            }
            const pushBody = JSON.stringify({
              events: [{
                entity_type: "person",
                entity_uid: p.person_uid,
                operation: "upsert",
                payload: { name: p.name, relationship_label: p.relationship_type, updated_at: new Date().toISOString() },
              }],
            });
            const sig = await computeHmac(conn.shared_secret_hash, pushBody);
            const resp = await fetch(`${remoteUrl}/functions/v1/sync-push`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-sync-signature": sig, "x-sync-connection-id": conn.id },
              body: pushBody,
            });
            if (!resp.ok) {
              results.push({ action: "create_remote", success: false, error: `Push failed: ${resp.status}` });
              break;
            }
            await upsertLink(admin, userId, conn.id, p.id, p.person_uid, "linked", true);
            results.push({ action: "create_remote", success: true });
            break;
          }

          case "create_local": {
            if (!act.remote_person_uid || !act.remote_name) {
              results.push({ action: "create_local", success: false, error: "Missing fields" });
              break;
            }
            const { data: newPartner, error: insErr } = await admin.from("partners").insert({
              user_id: userId,
              person_uid: act.remote_person_uid,
              name: act.remote_name,
              relationship_type: act.remote_relationship_label || "friend",
            }).select("id").single();
            if (insErr) {
              results.push({ action: "create_local", success: false, error: insErr.message });
              break;
            }
            await upsertLink(admin, userId, conn.id, newPartner.id, act.remote_person_uid, "linked", true);
            results.push({ action: "create_local", success: true });
            break;
          }

          default:
            results.push({ action: act.action, success: false, error: "Unknown action" });
        }
      } catch (e) {
        results.push({ action: act.action, success: false, error: e instanceof Error ? e.message : "Unknown" });
      }
    }

    const failures = results.filter(r => !r.success);
    return new Response(JSON.stringify({
      success: failures.length === 0,
      total: results.length,
      succeeded: results.filter(r => r.success).length,
      failed: failures.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-apply-mapping error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// deno-lint-ignore no-explicit-any
async function upsertLink(admin: any, userId: string, connId: string, localPersonId: string | null, remoteUid: string, status: string, enabled: boolean) {
  const { data: existing } = await admin.from("sync_person_links")
    .select("id").eq("connection_id", connId).eq("remote_person_uid", remoteUid).eq("user_id", userId).maybeSingle();

  if (existing) {
    await admin.from("sync_person_links").update({
      local_person_id: localPersonId,
      link_status: status,
      is_enabled: enabled,
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
  } else {
    await admin.from("sync_person_links").insert({
      user_id: userId,
      connection_id: connId,
      local_person_id: localPersonId,
      remote_person_uid: remoteUid,
      link_status: status,
      is_enabled: enabled,
    });
  }
}
