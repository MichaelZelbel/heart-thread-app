import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  EyeOff,
  GitMerge,
  Link2,
  Loader2,
  RotateCcw,
  Sparkles,
  Unlink,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Candidate {
  id: string;
  remote_person_uid: string;
  remote_person_name: string;
  local_person_id: string | null;
  confidence: number;
  reasons: string[];
  status: string;
}

interface PersonLink {
  id: string;
  local_person_id: string;
  remote_person_uid: string;
  is_enabled: boolean;
  link_status: string;
}

interface SyncConflict {
  id: string;
  entity_type: string;
  entity_uid: string;
  conflict_type: string | null;
  suggested_resolution: string | null;
  local_payload: Record<string, unknown>;
  remote_payload: Record<string, unknown>;
  resolved_at: string | null;
}

interface MergeLog {
  id: string;
  kept_person_id: string;
  merged_person_id: string;
  merged_person_snapshot: Record<string, unknown>;
  undone_at: string | null;
  created_at: string;
}

interface Partner {
  id: string;
  name: string;
  person_uid: string;
}

interface Props {
  connectionId: string;
}

export function SyncPeopleMapping({ connectionId }: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [links, setLinks] = useState<PersonLink[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [mergeLogs, setMergeLogs] = useState<MergeLog[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Merge dialog state
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeKeep, setMergeKeep] = useState<string>("");
  const [mergeDrop, setMergeDrop] = useState<string>("");

  // Manual link dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkRemoteUid, setLinkRemoteUid] = useState<string>("");
  const [linkRemoteName, setLinkRemoteName] = useState<string>("");
  const [linkLocalId, setLinkLocalId] = useState<string>("");

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [candidatesRes, linksRes, conflictsRes, mergeLogsRes, partnersRes] = await Promise.all([
      supabase.from("sync_person_candidates").select("*").eq("connection_id", connectionId).order("confidence", { ascending: false }),
      supabase.from("sync_person_links").select("*").eq("connection_id", connectionId),
      supabase.from("sync_conflicts").select("*").eq("connection_id", connectionId).is("resolved_at", null).order("created_at", { ascending: false }),
      supabase.from("sync_merge_log").select("*").is("undone_at", null).order("created_at", { ascending: false }),
      supabase.from("partners").select("id, name, person_uid").eq("archived", false).order("name"),
    ]);

    setCandidates((candidatesRes.data || []) as unknown as Candidate[]);
    setLinks((linksRes.data || []) as unknown as PersonLink[]);
    setConflicts((conflictsRes.data || []) as unknown as SyncConflict[]);
    setMergeLogs((mergeLogsRes.data || []) as unknown as MergeLog[]);
    setPartners(partnersRes.data || []);
    setLoading(false);
  }, [connectionId]);

  useEffect(() => { loadData(); }, [loadData]);

  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  const handleLinkPerson = async (remoteUid: string, localId: string) => {
    setActionLoading(remoteUid);
    try {
      const session = await getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke("sync-link-person", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { local_person_id: localId, remote_person_uid: remoteUid, connection_id: connectionId },
      });
      if (error) throw error;
      toast.success("Person linked!");
      loadData();
    } catch {
      toast.error("Failed to link person");
    } finally {
      setActionLoading(null);
    }
  };

  const handleExclude = async (remoteUid: string) => {
    setActionLoading(remoteUid);
    try {
      const session = await getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke("sync-exclude-person", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { remote_person_uid: remoteUid, connection_id: connectionId },
      });
      if (error) throw error;
      toast.success("Person excluded from sync");
      loadData();
    } catch {
      toast.error("Failed to exclude person");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateRemote = async (localPersonId: string) => {
    setActionLoading(localPersonId);
    try {
      const session = await getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke("sync-create-remote-person", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { local_person_id: localPersonId },
      });
      if (error) throw error;
      toast.success("Person created in Temerio and linked!");
      loadData();
    } catch {
      toast.error("Failed to create remote person");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMerge = async () => {
    if (!mergeKeep || !mergeDrop || mergeKeep === mergeDrop) return;
    setActionLoading("merge");
    try {
      const session = await getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke("sync-merge-local-people", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { keep_person_id: mergeKeep, merge_person_id: mergeDrop },
      });
      if (error) throw error;
      toast.success("People merged!");
      setMergeOpen(false);
      setMergeKeep("");
      setMergeDrop("");
      loadData();
    } catch {
      toast.error("Failed to merge people");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUndoMerge = async (logId: string) => {
    setActionLoading(logId);
    try {
      const session = await getSession();
      if (!session) return;

      const { error } = await supabase.functions.invoke("sync-undo-merge", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { merge_log_id: logId },
      });
      if (error) throw error;
      toast.success("Merge undone!");
      loadData();
    } catch {
      toast.error("Failed to undo merge");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveConflict = async (conflictId: string, resolution: string, remoteUid?: string, localId?: string) => {
    setActionLoading(conflictId);
    try {
      if (resolution === "link_existing" && remoteUid && localId) {
        await handleLinkPerson(remoteUid, localId);
      } else if (resolution === "create_new" && remoteUid) {
        // Actually create the person from remote data
        const conflict = conflicts.find(c => c.id === conflictId);
        if (conflict?.remote_payload) {
          const session = await getSession();
          if (!session) return;
          const admin = supabase;
          
          // Create the partner locally
          const { data: newPartner, error: insertErr } = await admin.from("partners").insert({
            user_id: session.user.id,
            person_uid: remoteUid,
            name: (conflict.remote_payload.name as string) || "Unknown",
            relationship_type: (conflict.remote_payload.relationship_label as string) || null,
          }).select("id").single();

          if (insertErr) throw insertErr;

          // Auto-link
          if (newPartner) {
            await handleLinkPerson(remoteUid, newPartner.id);
          }
        }
      }

      // Mark conflict resolved
      await supabase.from("sync_conflicts")
        .update({ resolution, resolved_at: new Date().toISOString() })
        .eq("id", conflictId);

      loadData();
    } catch {
      toast.error("Failed to resolve conflict");
    } finally {
      setActionLoading(null);
    }
  };

  const partnerName = (id: string) => partners.find(p => p.id === id)?.name || "Unknown";

  const linkedRemoteUids = new Set(links.filter(l => l.link_status === "linked").map(l => l.remote_person_uid));
  const excludedRemoteUids = new Set(links.filter(l => l.link_status === "excluded").map(l => l.remote_person_uid));
  const linkedLocalIds = new Set(links.filter(l => l.link_status === "linked").map(l => l.local_person_id));

  const pendingCandidates = candidates.filter(c => c.status === "pending" && !linkedRemoteUids.has(c.remote_person_uid) && !excludedRemoteUids.has(c.remote_person_uid));
  const unlinkdLocalPeople = partners.filter(p => !linkedLocalIds.has(p.id));
  const personConflicts = conflicts.filter(c => c.entity_type === "person");
  const momentConflicts = conflicts.filter(c => c.entity_type === "moment" && c.conflict_type === "missing_mapping");
  const dataConflicts = conflicts.filter(c => c.entity_type === "moment" && c.conflict_type !== "missing_mapping");

  if (loading) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Conflict Inbox */}
      {(personConflicts.length > 0 || momentConflicts.length > 0 || dataConflicts.length > 0) && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            Conflict Inbox ({personConflicts.length + momentConflicts.length + dataConflicts.length})
          </h4>

          {personConflicts.map(c => (
            <div key={c.id} className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge variant="outline" className="text-destructive border-destructive/50 mb-1">
                    {c.conflict_type === "duplicate_detected" ? "Duplicate Detected" : "Missing Mapping"}
                  </Badge>
                  <p className="text-sm font-medium">
                    Remote: "{(c.remote_payload?.name as string) || c.entity_uid}"
                  </p>
                  {c.suggested_resolution && (
                    <p className="text-xs text-muted-foreground">{c.suggested_resolution}</p>
                  )}
                </div>
                {actionLoading === c.id && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>

              <div className="flex flex-wrap gap-2">
                {c.conflict_type === "duplicate_detected" && c.local_payload?.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolveConflict(c.id, "link_existing", c.entity_uid, c.local_payload.id as string)}
                    disabled={!!actionLoading}
                  >
                    <Link2 className="w-3 h-3 mr-1" />
                    Link to "{(c.local_payload?.name as string)}"
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveConflict(c.id, "create_new", c.entity_uid)}
                  disabled={!!actionLoading}
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Create New
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    handleExclude(c.entity_uid);
                    supabase.from("sync_conflicts").update({ resolution: "excluded", resolved_at: new Date().toISOString() }).eq("id", c.id);
                  }}
                  disabled={!!actionLoading}
                >
                  <EyeOff className="w-3 h-3 mr-1" />
                  Exclude
                </Button>
              </div>
            </div>
          ))}

          {momentConflicts.map(c => (
            <div key={c.id} className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
              <Badge variant="outline" className="text-amber-600 border-amber-500/50">
                Moment Queued — Missing Person Mapping
              </Badge>
              <p className="text-xs text-muted-foreground">
                A moment for "{(c.remote_payload?.person_uid as string)?.slice(0, 8)}…" is waiting. Map the person first.
              </p>
            </div>
          ))}

          {dataConflicts.map(c => (
            <div key={c.id} className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
              <Badge variant="outline" className="text-amber-600 border-amber-500/50">
                Data Conflict
              </Badge>
              <p className="text-xs text-muted-foreground">
                Moment "{(c.remote_payload?.title as string) || c.entity_uid}" has conflicting edits.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveConflict(c.id, "keep_local")}
                  disabled={!!actionLoading}
                >
                  Keep Local
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveConflict(c.id, "keep_remote")}
                  disabled={!!actionLoading}
                >
                  Keep Remote
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggested Matches */}
      {pendingCandidates.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Suggested Matches ({pendingCandidates.length})
          </h4>
          {pendingCandidates.map(c => (
            <div key={c.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Remote: {c.remote_person_name}</p>
                  {c.local_person_id && (
                    <p className="text-xs text-muted-foreground">
                      → Suggested local: {partnerName(c.local_person_id)}
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {Math.round(c.confidence * 100)}%
                      </Badge>
                    </p>
                  )}
                  {c.reasons.length > 0 && (
                    <p className="text-xs text-muted-foreground">{c.reasons.join(", ")}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.local_person_id && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleLinkPerson(c.remote_person_uid, c.local_person_id!)}
                    disabled={!!actionLoading}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Link
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setLinkRemoteUid(c.remote_person_uid);
                    setLinkRemoteName(c.remote_person_name);
                    setLinkDialogOpen(true);
                  }}
                  disabled={!!actionLoading}
                >
                  <Link2 className="w-3 h-3 mr-1" />
                  Pick Different
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleExclude(c.remote_person_uid)}
                  disabled={!!actionLoading}
                >
                  <EyeOff className="w-3 h-3 mr-1" />
                  Exclude
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Linked People */}
      {links.filter(l => l.link_status === "linked").length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Linked People ({links.filter(l => l.link_status === "linked").length})
          </h4>
          <div className="space-y-1">
            {links.filter(l => l.link_status === "linked").map(l => (
              <div key={l.id} className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-600/50">Linked</Badge>
                  <span className="text-sm">{partnerName(l.local_person_id)}</span>
                  <span className="text-xs text-muted-foreground">↔ {l.remote_person_uid.slice(0, 8)}…</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleExclude(l.remote_person_uid)}
                  disabled={!!actionLoading}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Unlink className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unlinked Local People */}
      {unlinkdLocalPeople.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            Local People Not Synced ({unlinkdLocalPeople.length})
          </h4>
          <div className="space-y-1">
            {unlinkdLocalPeople.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/30">
                <span className="text-sm">{p.name}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCreateRemote(p.id)}
                  disabled={!!actionLoading}
                >
                  {actionLoading === p.id ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <ExternalLink className="w-3 h-3 mr-1" />
                  )}
                  Create in Temerio
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Excluded */}
      {links.filter(l => l.link_status === "excluded").length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
            <EyeOff className="w-4 h-4" />
            Excluded ({links.filter(l => l.link_status === "excluded").length})
          </h4>
          <div className="space-y-1">
            {links.filter(l => l.link_status === "excluded").map(l => (
              <div key={l.id} className="flex items-center justify-between py-2 px-3 rounded opacity-60">
                <span className="text-sm text-muted-foreground">{l.remote_person_uid.slice(0, 8)}…</span>
                <Badge variant="secondary">Excluded</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Merge & Undo */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <GitMerge className="w-4 h-4" />
            Merge Duplicates
          </h4>
          <Button size="sm" variant="outline" onClick={() => setMergeOpen(true)} disabled={partners.length < 2}>
            <GitMerge className="w-3 h-3 mr-1" />
            Merge People
          </Button>
        </div>

        {mergeLogs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Recent merges (undoable):</p>
            {mergeLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 px-3 rounded border">
                <div>
                  <p className="text-sm">
                    Merged "{(log.merged_person_snapshot as { name?: string })?.name}" → "{partnerName(log.kept_person_id)}"
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleUndoMerge(log.id)}
                  disabled={!!actionLoading}
                >
                  {actionLoading === log.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3 h-3 mr-1" />
                  )}
                  Undo
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Remote Person</DialogTitle>
            <DialogDescription>
              Choose a local person to link to "{linkRemoteName}"
            </DialogDescription>
          </DialogHeader>
          <Select value={linkLocalId} onValueChange={setLinkLocalId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a person..." />
            </SelectTrigger>
            <SelectContent>
              {partners.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (linkLocalId && linkRemoteUid) {
                  handleLinkPerson(linkRemoteUid, linkLocalId);
                  setLinkDialogOpen(false);
                  setLinkLocalId("");
                }
              }}
              disabled={!linkLocalId || !!actionLoading}
            >
              Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Duplicate People</DialogTitle>
            <DialogDescription>
              All moments, likes, and links from the merged person will move to the kept person. This can be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Keep this person:</label>
              <Select value={mergeKeep} onValueChange={setMergeKeep}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person to keep..." />
                </SelectTrigger>
                <SelectContent>
                  {partners.filter(p => p.id !== mergeDrop).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Merge (archive) this person:</label>
              <Select value={mergeDrop} onValueChange={setMergeDrop}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person to merge..." />
                </SelectTrigger>
                <SelectContent>
                  {partners.filter(p => p.id !== mergeKeep).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMergeOpen(false)}>Cancel</Button>
            <Button
              onClick={handleMerge}
              disabled={!mergeKeep || !mergeDrop || mergeKeep === mergeDrop || !!actionLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionLoading === "merge" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <GitMerge className="w-4 h-4 mr-1" />}
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
