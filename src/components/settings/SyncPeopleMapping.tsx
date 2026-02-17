import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  EyeOff,
  Link2,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Unlink,
  Upload,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ── Types ──────────────────────────────────────────────────────────

interface SuggestedMatch {
  remote_person_uid: string;
  remote_name: string;
  local_person_id: string;
  local_name: string;
  confidence: number;
  reasons: string[];
}

interface SuggestedCreateRemote {
  local_person_id: string;
  local_name: string;
  local_person_uid: string;
}

interface SuggestedCreateLocal {
  remote_person_uid: string;
  remote_name: string;
  remote_relationship_label: string | null;
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

interface Partner {
  id: string;
  name: string;
  person_uid: string;
}

interface Props {
  connectionId: string;
}

// ── Component ──────────────────────────────────────────────────────

export function SyncPeopleMapping({ connectionId }: Props) {
  const [suggestedMatches, setSuggestedMatches] = useState<SuggestedMatch[]>([]);
  const [suggestedCreateRemote, setSuggestedCreateRemote] = useState<SuggestedCreateRemote[]>([]);
  const [suggestedCreateLocal, setSuggestedCreateLocal] = useState<SuggestedCreateLocal[]>([]);
  const [links, setLinks] = useState<PersonLink[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  // Manual link dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDialogMode, setLinkDialogMode] = useState<"remote" | "local">("remote");
  const [linkRemoteUid, setLinkRemoteUid] = useState("");
  const [linkRemoteName, setLinkRemoteName] = useState("");
  const [linkLocalId, setLinkLocalId] = useState("");
  const [linkLocalName, setLinkLocalName] = useState("");

  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  // ── Fetch suggestions from backend ────────────────────────────

  const fetchSuggestions = useCallback(async (forceRefresh = false) => {
    const session = await getSession();
    if (!session) return;

    try {
      const { data, error } = await supabase.functions.invoke("sync-list-remote-people", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { force_refresh: forceRefresh },
      });

      if (error) throw error;

      setSuggestedMatches(data.suggested_matches || []);
      setSuggestedCreateRemote(data.suggested_create_remote || []);
      setSuggestedCreateLocal(data.suggested_create_local || []);
      setLinks(data.links || []);
      setFetchedAt(data.fetched_at || null);
    } catch (e) {
      console.error("Failed to fetch suggestions:", e);
      // Don't toast on initial load failure — just show empty state
    }
  }, []);

  const loadConflicts = useCallback(async () => {
    const [conflictsRes, partnersRes] = await Promise.all([
      supabase.from("sync_conflicts").select("*").eq("connection_id", connectionId).is("resolved_at", null).order("created_at", { ascending: false }),
      supabase.from("partners").select("id, name, person_uid").eq("archived", false).order("name"),
    ]);
    setConflicts((conflictsRes.data || []) as unknown as SyncConflict[]);
    setPartners(partnersRes.data || []);
  }, [connectionId]);

  // Auto-fetch on mount
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await Promise.all([fetchSuggestions(), loadConflicts()]);
      if (mounted) setLoading(false);
    };
    init();
    return () => { mounted = false; };
  }, [fetchSuggestions, loadConflicts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchSuggestions(true), loadConflicts()]);
    setRefreshing(false);
    toast.success("Refreshed from Temerio");
  };

  // ── Actions ───────────────────────────────────────────────────

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
      await Promise.all([fetchSuggestions(true), loadConflicts()]);
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
      await Promise.all([fetchSuggestions(true), loadConflicts()]);
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
      await Promise.all([fetchSuggestions(true), loadConflicts()]);
    } catch {
      toast.error("Failed to create remote person");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateLocal = async (remoteUid: string, remoteName: string, remoteLabel: string | null) => {
    setActionLoading(remoteUid);
    try {
      const session = await getSession();
      if (!session) return;
      const { error } = await supabase.functions.invoke("sync-create-local-person", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {
          remote_person_uid: remoteUid,
          remote_name: remoteName,
          remote_relationship_label: remoteLabel,
          connection_id: connectionId,
        },
      });
      if (error) throw error;
      toast.success(`"${remoteName}" created in Cherishly and linked!`);
      await Promise.all([fetchSuggestions(true), loadConflicts()]);
    } catch {
      toast.error("Failed to create local person");
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
        const conflict = conflicts.find(c => c.id === conflictId);
        if (conflict?.remote_payload) {
          const session = await getSession();
          if (!session) return;
          const { data: newPartner, error: insertErr } = await supabase.from("partners").insert({
            user_id: session.user.id,
            person_uid: remoteUid,
            name: (conflict.remote_payload.name as string) || "Unknown",
            relationship_type: (conflict.remote_payload.relationship_label as string) || null,
          }).select("id").single();
          if (insertErr) throw insertErr;
          if (newPartner) await handleLinkPerson(remoteUid, newPartner.id);
        }
      }
      await supabase.from("sync_conflicts")
        .update({ resolution, resolved_at: new Date().toISOString() })
        .eq("id", conflictId);
      await loadConflicts();
    } catch {
      toast.error("Failed to resolve conflict");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Picker helpers ────────────────────────────────────────────

  const openPickRemote = (localId: string, localName: string) => {
    setLinkDialogMode("remote");
    setLinkLocalId(localId);
    setLinkLocalName(localName);
    setLinkRemoteUid("");
    setLinkDialogOpen(true);
  };

  const openPickLocal = (remoteUid: string, remoteName: string) => {
    setLinkDialogMode("local");
    setLinkRemoteUid(remoteUid);
    setLinkRemoteName(remoteName);
    setLinkLocalId("");
    setLinkDialogOpen(true);
  };

  // ── Accept All ────────────────────────────────────────────────

  const handleAcceptAll = async () => {
    setActionLoading("accept-all");
    try {
      const session = await getSession();
      if (!session) return;

      // 1) Accept all suggested matches (link them)
      for (const m of suggestedMatches) {
        await supabase.functions.invoke("sync-link-person", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: { remote_person_uid: m.remote_person_uid, local_person_id: m.local_person_id },
        });
      }

      // 2) Create all missing people in Temerio
      for (const p of suggestedCreateRemote) {
        await supabase.functions.invoke("sync-create-remote-person", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: { local_person_id: p.local_person_id },
        });
      }

      // 3) Create all missing people in Cherishly
      for (const rp of suggestedCreateLocal) {
        await supabase.functions.invoke("sync-create-local-person", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            remote_person_uid: rp.remote_person_uid,
            remote_name: rp.remote_name,
            remote_relationship_label: rp.remote_relationship_label,
            connection_id: connectionId,
          },
        });
      }

      toast.success("All suggestions accepted!");
      await Promise.all([fetchSuggestions(true), loadConflicts()]);
    } catch {
      toast.error("Some actions failed. Please review remaining items.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Derived state ─────────────────────────────────────────────

  const partnerName = (id: string) => partners.find(p => p.id === id)?.name || "Unknown";
  const linkedLinks = links.filter(l => l.link_status === "linked");
  const excludedLinks = links.filter(l => l.link_status === "excluded");
  const personConflicts = conflicts.filter(c => c.entity_type === "person");
  const momentConflicts = conflicts.filter(c => c.entity_type === "moment" && c.conflict_type === "missing_mapping");
  const dataConflicts = conflicts.filter(c => c.entity_type === "moment" && c.conflict_type !== "missing_mapping");

  const totalSuggestions = suggestedMatches.length + suggestedCreateRemote.length + suggestedCreateLocal.length;
  const totalConflicts = personConflicts.length + momentConflicts.length + dataConflicts.length;

  // Remote people UIDs from the cache for the "pick remote" dialog
  // We pull from suggestedCreateLocal + suggestedMatches (unlinked remote people)
  const availableRemotePeople = [
    ...suggestedCreateLocal.map(r => ({ uid: r.remote_person_uid, name: r.remote_name })),
    ...suggestedMatches.map(r => ({ uid: r.remote_person_uid, name: r.remote_name })),
  ];

  // ── Render ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-8 text-center space-y-2">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Fetching people from Temerio…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {fetchedAt && `Last synced: ${new Date(fetchedAt).toLocaleTimeString()}`}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-xs"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Conflict Inbox */}
      {totalConflicts > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            Conflicts ({totalConflicts})
          </h4>
          {personConflicts.map(c => (
            <ConflictCard
              key={c.id}
              conflict={c}
              actionLoading={actionLoading}
              onResolve={handleResolveConflict}
              onExclude={handleExclude}
            />
          ))}
          {momentConflicts.map(c => (
            <div key={c.id} className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
              <Badge variant="outline" className="text-amber-600 border-amber-500/50">
                Moment Queued — Missing Person Mapping
              </Badge>
              <p className="text-xs text-muted-foreground">
                A moment for "{(c.remote_payload?.person_uid as string)?.slice(0, 8)}…" is waiting.
              </p>
            </div>
          ))}
          {dataConflicts.map(c => (
            <div key={c.id} className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
              <Badge variant="outline" className="text-amber-600 border-amber-500/50">Data Conflict</Badge>
              <p className="text-xs text-muted-foreground">
                Moment "{(c.remote_payload?.title as string) || c.entity_uid}" has conflicting edits.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleResolveConflict(c.id, "keep_local")} disabled={!!actionLoading}>
                  Keep Local
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleResolveConflict(c.id, "keep_remote")} disabled={!!actionLoading}>
                  Keep Remote
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Suggested Actions ──────────────────────────────────── */}
      {totalSuggestions > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Suggested Actions
              <Badge variant="secondary" className="text-xs">{totalSuggestions}</Badge>
            </h4>
            <Button
              size="sm"
              onClick={handleAcceptAll}
              disabled={!!actionLoading}
            >
              {actionLoading === "accept-all" ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Check className="w-3 h-3 mr-1" />
              )}
              Accept All
            </Button>
          </div>

          {/* A) Suggested Matches */}
          {suggestedMatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suggested Matches</p>
              {suggestedMatches.map(m => (
                <div key={m.remote_person_uid} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {m.local_name} <span className="text-muted-foreground">↔</span> {m.remote_name}
                      </p>
                      <span className="text-xs text-muted-foreground mt-0.5">{m.reasons.join(", ")}</span>
                    </div>
                    {actionLoading === m.remote_person_uid && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleLinkPerson(m.remote_person_uid, m.local_person_id)}
                      disabled={!!actionLoading}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Accept Link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPickLocal(m.remote_person_uid, m.remote_name)}
                      disabled={!!actionLoading}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Choose Different
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExclude(m.remote_person_uid)}
                      disabled={!!actionLoading}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* B) Suggested Creations (missing on remote) */}
          {suggestedCreateRemote.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Create in Temerio</p>
              {suggestedCreateRemote.map(p => (
                <div key={p.local_person_id} className="rounded-lg border p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      <Upload className="w-3 h-3 inline mr-1 text-muted-foreground" />
                      Create "{p.local_name}" in Temerio
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleCreateRemote(p.local_person_id)}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === p.local_person_id ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Check className="w-3 h-3 mr-1" />
                      )}
                      Create & Link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPickRemote(p.local_person_id, p.local_name)}
                      disabled={!!actionLoading}
                    >
                      <Link2 className="w-3 h-3 mr-1" />
                      Link Existing
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        // Just remove from local suggestions (no backend call needed)
                        setSuggestedCreateRemote(prev => prev.filter(x => x.local_person_id !== p.local_person_id));
                      }}
                      disabled={!!actionLoading}
                    >
                      <EyeOff className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* C) Suggested Imports (missing locally) */}
          {suggestedCreateLocal.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Create in Cherishly</p>
              {suggestedCreateLocal.map(rp => (
                <div key={rp.remote_person_uid} className="rounded-lg border p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      <Download className="w-3 h-3 inline mr-1 text-muted-foreground" />
                      Create "{rp.remote_name}" in Cherishly
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleCreateLocal(rp.remote_person_uid, rp.remote_name, rp.remote_relationship_label)}
                      disabled={!!actionLoading}
                    >
                      {actionLoading === rp.remote_person_uid ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Check className="w-3 h-3 mr-1" />
                      )}
                      Create & Link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPickLocal(rp.remote_person_uid, rp.remote_name)}
                      disabled={!!actionLoading}
                    >
                      <Link2 className="w-3 h-3 mr-1" />
                      Link Existing
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExclude(rp.remote_person_uid)}
                      disabled={!!actionLoading}
                    >
                      <EyeOff className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : totalConflicts === 0 && linkedLinks.length > 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          <Check className="w-5 h-5 mx-auto mb-1 text-green-500" />
          No suggestions. You're fully mapped!
        </div>
      ) : totalConflicts === 0 && linkedLinks.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No people found. Add people in Cherishly or Temerio first.
        </div>
      ) : null}

      {/* ── Linked People ──────────────────────────────────────── */}
      {linkedLinks.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Linked People ({linkedLinks.length})
              </span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-2">
            {linkedLinks.map(l => (
              <div key={l.id} className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-600/50 text-xs">Linked</Badge>
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
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ── Excluded (collapsed) ───────────────────────────────── */}
      {excludedLinks.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <EyeOff className="w-4 h-4" />
                Excluded ({excludedLinks.length})
              </span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-2">
            {excludedLinks.map(l => (
              <div key={l.id} className="flex items-center justify-between py-2 px-3 rounded opacity-60">
                <span className="text-sm text-muted-foreground">{l.remote_person_uid.slice(0, 8)}…</span>
                <Badge variant="secondary" className="text-xs">Excluded</Badge>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ── Picker Dialog ──────────────────────────────────────── */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {linkDialogMode === "local"
                ? `Link "${linkRemoteName}" to a local person`
                : `Link "${linkLocalName}" to a remote person`}
            </DialogTitle>
            <DialogDescription>
              {linkDialogMode === "local"
                ? "Choose which local person to link to this remote person."
                : "Choose which remote person to link to this local person."}
            </DialogDescription>
          </DialogHeader>

          {linkDialogMode === "local" ? (
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
          ) : (
            <Select value={linkRemoteUid} onValueChange={setLinkRemoteUid}>
              <SelectTrigger>
                <SelectValue placeholder="Select a remote person..." />
              </SelectTrigger>
              <SelectContent>
                {availableRemotePeople.map(rp => (
                  <SelectItem key={rp.uid} value={rp.uid}>{rp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (linkDialogMode === "local" && linkLocalId && linkRemoteUid) {
                  handleLinkPerson(linkRemoteUid, linkLocalId);
                } else if (linkDialogMode === "remote" && linkLocalId && linkRemoteUid) {
                  handleLinkPerson(linkRemoteUid, linkLocalId);
                }
                setLinkDialogOpen(false);
                setLinkLocalId("");
                setLinkRemoteUid("");
              }}
              disabled={
                (linkDialogMode === "local" && !linkLocalId) ||
                (linkDialogMode === "remote" && !linkRemoteUid) ||
                !!actionLoading
              }
            >
              Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const variant = confidence >= 0.9 ? "default" : confidence >= 0.7 ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="text-xs">
      {pct}% match
    </Badge>
  );
}

function ConflictCard({
  conflict,
  actionLoading,
  onResolve,
  onExclude,
}: {
  conflict: SyncConflict;
  actionLoading: string | null;
  onResolve: (id: string, resolution: string, uid?: string, localId?: string) => void;
  onExclude: (uid: string) => void;
}) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Badge variant="outline" className="text-destructive border-destructive/50 mb-1">
            {conflict.conflict_type === "duplicate_detected" ? "Duplicate Detected" : "Missing Mapping"}
          </Badge>
          <p className="text-sm font-medium">
            Remote: "{(conflict.remote_payload?.name as string) || conflict.entity_uid}"
          </p>
          {conflict.suggested_resolution && (
            <p className="text-xs text-muted-foreground">{conflict.suggested_resolution}</p>
          )}
        </div>
        {actionLoading === conflict.id && <Loader2 className="w-4 h-4 animate-spin" />}
      </div>
      <div className="flex flex-wrap gap-2">
        {conflict.conflict_type === "duplicate_detected" && conflict.local_payload?.id && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onResolve(conflict.id, "link_existing", conflict.entity_uid, conflict.local_payload.id as string)}
            disabled={!!actionLoading}
          >
            <Link2 className="w-3 h-3 mr-1" />
            Link to "{(conflict.local_payload?.name as string)}"
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onResolve(conflict.id, "create_new", conflict.entity_uid)}
          disabled={!!actionLoading}
        >
          <Users className="w-3 h-3 mr-1" />
          Create New
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            onExclude(conflict.entity_uid);
            // Also mark conflict as resolved — fire and forget
            supabase.from("sync_conflicts").update({ resolution: "excluded", resolved_at: new Date().toISOString() }).eq("id", conflict.id);
          }}
          disabled={!!actionLoading}
        >
          <EyeOff className="w-3 h-3 mr-1" />
          Exclude
        </Button>
      </div>
    </div>
  );
}
