import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  Link2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ── Constants ─────────────────────────────────────────────────────
const CREATE_REMOTE = "__create_remote__";
const CREATE_LOCAL = "__create_local__";
const DO_NOT_SYNC = "__do_not_sync__";

// ── Types ─────────────────────────────────────────────────────────
interface LocalPerson {
  id: string;
  name: string;
  person_uid: string;
}
interface RemotePerson {
  person_uid: string;
  name: string;
  relationship_label: string | null;
}
interface ExistingLink {
  id: string;
  local_person_id: string | null;
  remote_person_uid: string;
  link_status: string;
  is_enabled: boolean;
}
interface Props {
  connectionId: string;
}

// ── Matching utilities ────────────────────────────────────────────
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ");
}

function matchScore(a: string, b: string): { confidence: number; reason: string } | null {
  const at = a.trim(), bt = b.trim();
  if (at.toLowerCase() === bt.toLowerCase()) return { confidence: 0.95, reason: "Exact name match" };
  if (normalizeName(at) === normalizeName(bt)) return { confidence: 0.90, reason: "Normalized name match" };
  const af = at.toLowerCase().split(/\s+/)[0];
  const bf = bt.toLowerCase().split(/\s+/)[0];
  if (af === bf && af.length >= 2) return { confidence: 0.70, reason: "First name match" };
  if (at.toLowerCase().includes(bt.toLowerCase()) || bt.toLowerCase().includes(at.toLowerCase()))
    return { confidence: 0.50, reason: "Partial name match" };
  return null;
}

// ── Component ─────────────────────────────────────────────────────
export function SyncPeopleMapping({ connectionId }: Props) {
  // Data
  const [localPeople, setLocalPeople] = useState<LocalPerson[]>([]);
  const [remotePeople, setRemotePeople] = useState<RemotePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  // Mapping state (staged, client-side only until Activate)
  const [localMappings, setLocalMappings] = useState<Record<string, string>>({}); // localId → remoteUid | CREATE_REMOTE | DO_NOT_SYNC
  const [remoteExcludes, setRemoteExcludes] = useState<Set<string>>(new Set());

  // Track which pairings are fuzzy suggestions (not exact match, not from DB)
  const [suggestedIds, setSuggestedIds] = useState<Set<string>>(new Set());

  // Snapshot of initial DB state for diff / hasChanges
  const [dbPairings, setDbPairings] = useState<Record<string, string>>({});
  const [dbExcludes, setDbExcludes] = useState<Set<string>>(new Set());

  // UI
  const [applying, setApplying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [remoteSearch, setRemoteSearch] = useState("");
  const [localFilter, setLocalFilter] = useState("all");
  const [remoteFilter, setRemoteFilter] = useState("all");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // ── Derived: reverse pairings (remoteUid → localId) ───────────
  const reversePairings = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [lid, val] of Object.entries(localMappings)) {
      if (val !== CREATE_REMOTE && val !== DO_NOT_SYNC) {
        map[val] = lid;
      }
    }
    return map;
  }, [localMappings]);

  // ── Helpers ────────────────────────────────────────────────────
  const getLocalAction = useCallback(
    (localId: string) => localMappings[localId] || CREATE_REMOTE,
    [localMappings]
  );

  const getRemoteAction = useCallback(
    (remoteUid: string): string => {
      if (reversePairings[remoteUid]) return reversePairings[remoteUid];
      if (remoteExcludes.has(remoteUid)) return DO_NOT_SYNC;
      return CREATE_LOCAL;
    },
    [reversePairings, remoteExcludes]
  );

  const localName = useCallback(
    (id: string) => localPeople.find((p) => p.id === id)?.name || "Unknown",
    [localPeople]
  );
  const remoteName = useCallback(
    (uid: string) => remotePeople.find((r) => r.person_uid === uid)?.name || uid.slice(0, 8) + "…",
    [remotePeople]
  );

  // ── Data loading ──────────────────────────────────────────────
  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  const loadData = useCallback(async (forceRefresh = false) => {
    const session = await getSession();
    if (!session) return;

    // 1) Trigger remote cache refresh
    const { data: syncData } = await supabase.functions.invoke("sync-list-remote-people", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { force_refresh: forceRefresh },
    });

    // 2) Get local people
    const { data: partners } = await supabase
      .from("partners")
      .select("id, name, person_uid")
      .eq("archived", false)
      .is("merged_into_person_id", null)
      .order("name");

    // 3) Get remote people from cache
    const { data: cacheData } = await supabase
      .from("sync_remote_people_cache")
      .select("remote_person_uid, remote_name, remote_relationship_label")
      .eq("connection_id", connectionId);

    // 4) Get existing links
    const { data: links } = await supabase
      .from("sync_person_links")
      .select("id, local_person_id, remote_person_uid, link_status, is_enabled")
      .eq("connection_id", connectionId);

    const lp: LocalPerson[] = (partners || []).map((p) => ({
      id: p.id,
      name: p.name,
      person_uid: p.person_uid,
    }));
    const rp: RemotePerson[] = (cacheData || []).map((c) => ({
      person_uid: c.remote_person_uid,
      name: c.remote_name,
      relationship_label: c.remote_relationship_label,
    }));
    const el: ExistingLink[] = (links || []) as ExistingLink[];

    setLocalPeople(lp);
    setRemotePeople(rp);
    setFetchedAt(syncData?.fetched_at || new Date().toISOString());

    // Build initial state from DB
    const dbPairs: Record<string, string> = {};
    const dbExcl = new Set<string>();
    for (const link of el) {
      if (link.link_status === "linked" && link.local_person_id) {
        dbPairs[link.local_person_id] = link.remote_person_uid;
      } else if (link.link_status === "excluded") {
        dbExcl.add(link.remote_person_uid);
      }
    }
    setDbPairings(dbPairs);
    setDbExcludes(dbExcl);

    // Build full mapping state: DB links + suggestions for unlinked
    const mappings: Record<string, string> = { ...dbPairs };
    const rExcludes = new Set(dbExcl);
    const suggested = new Set<string>();

    const linkedRemoteUids = new Set(Object.values(dbPairs));
    const linkedLocalIds = new Set(Object.keys(dbPairs));

    // Match unlinked local people to unlinked remote people
    const availableRemote = rp.filter(
      (r) => !linkedRemoteUids.has(r.person_uid) && !dbExcl.has(r.person_uid)
    );

    for (const local of lp) {
      if (linkedLocalIds.has(local.id)) continue;

      let bestMatch: { uid: string; confidence: number; reason: string } | null = null;
      for (const remote of availableRemote) {
        if (linkedRemoteUids.has(remote.person_uid)) continue;
        const m = matchScore(local.name, remote.name);
        if (m && (!bestMatch || m.confidence > bestMatch.confidence)) {
          bestMatch = { uid: remote.person_uid, ...m };
        }
      }

      if (bestMatch && bestMatch.confidence >= 0.50) {
        mappings[local.id] = bestMatch.uid;
        linkedRemoteUids.add(bestMatch.uid);
        if (bestMatch.confidence < 0.95) {
          suggested.add(local.id);
        }
      } else {
        mappings[local.id] = CREATE_REMOTE;
      }
    }

    setLocalMappings(mappings);
    setRemoteExcludes(rExcludes);
    setSuggestedIds(suggested);
    setLoading(false);
  }, [connectionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Change handlers ───────────────────────────────────────────
  const handleLocalChange = (localId: string, value: string) => {
    setSuggestedIds((s) => { const n = new Set(s); n.delete(localId); return n; });

    if (value === DO_NOT_SYNC || value === CREATE_REMOTE) {
      setLocalMappings((prev) => ({ ...prev, [localId]: value }));
      return;
    }

    // Linking to a remote person
    const remoteUid = value;
    setLocalMappings((prev) => {
      const next = { ...prev };
      // If remote was linked to another local, free them
      const oldLocal = Object.entries(next).find(
        ([lid, r]) => r === remoteUid && lid !== localId
      )?.[0];
      if (oldLocal) {
        next[oldLocal] = CREATE_REMOTE;
        toast.info(`Reassigned: ${remoteName(remoteUid)} → ${localName(localId)}`);
      }
      next[localId] = remoteUid;
      return next;
    });
    setRemoteExcludes((s) => { const n = new Set(s); n.delete(remoteUid); return n; });
  };

  const handleRemoteChange = (remoteUid: string, value: string) => {
    if (value === DO_NOT_SYNC) {
      // Remove any local pairing to this remote
      setLocalMappings((prev) => {
        const next = { ...prev };
        const lid = Object.entries(next).find(([_, r]) => r === remoteUid)?.[0];
        if (lid) {
          next[lid] = CREATE_REMOTE;
          setSuggestedIds((s) => { const n = new Set(s); n.delete(lid); return n; });
        }
        return next;
      });
      setRemoteExcludes((s) => new Set(s).add(remoteUid));
      return;
    }

    if (value === CREATE_LOCAL) {
      setLocalMappings((prev) => {
        const next = { ...prev };
        const lid = Object.entries(next).find(([_, r]) => r === remoteUid)?.[0];
        if (lid) {
          next[lid] = CREATE_REMOTE;
          setSuggestedIds((s) => { const n = new Set(s); n.delete(lid); return n; });
        }
        return next;
      });
      setRemoteExcludes((s) => { const n = new Set(s); n.delete(remoteUid); return n; });
      return;
    }

    // Linking to a local person
    const localId = value;
    setSuggestedIds((s) => { const n = new Set(s); n.delete(localId); return n; });
    setLocalMappings((prev) => {
      const next = { ...prev };
      // If this local was linked elsewhere, fine - we're overwriting
      // If this remote was linked to another local, free them
      const oldLocal = Object.entries(next).find(
        ([lid, r]) => r === remoteUid && lid !== localId
      )?.[0];
      if (oldLocal) {
        next[oldLocal] = CREATE_REMOTE;
        toast.info(`Reassigned: ${remoteName(remoteUid)} → ${localName(localId)}`);
      }
      next[localId] = remoteUid;
      return next;
    });
    setRemoteExcludes((s) => { const n = new Set(s); n.delete(remoteUid); return n; });
  };

  // ── Summary counts ────────────────────────────────────────────
  const summary = useMemo(() => {
    let linked = 0, createRemote = 0, doNotSyncLocal = 0;
    for (const val of Object.values(localMappings)) {
      if (val === CREATE_REMOTE) createRemote++;
      else if (val === DO_NOT_SYNC) doNotSyncLocal++;
      else linked++;
    }
    const linkedRemoteUids = new Set(
      Object.values(localMappings).filter((v) => v !== CREATE_REMOTE && v !== DO_NOT_SYNC)
    );
    const createLocal = remotePeople.filter(
      (r) => !linkedRemoteUids.has(r.person_uid) && !remoteExcludes.has(r.person_uid)
    ).length;
    const doNotSyncRemote = remoteExcludes.size;
    return { linked, createRemote, createLocal, doNotSync: doNotSyncLocal + doNotSyncRemote };
  }, [localMappings, remoteExcludes, remotePeople]);

  // ── Has changes ───────────────────────────────────────────────
  const hasChanges = useMemo(() => {
    // Compare current state with DB state
    for (const [lid, val] of Object.entries(localMappings)) {
      const dbVal = dbPairings[lid];
      if (val !== CREATE_REMOTE && val !== DO_NOT_SYNC) {
        // Currently linked
        if (dbVal !== val) return true;
      } else {
        // Currently not linked
        if (dbVal) return true; // was linked in DB
        if (val === CREATE_REMOTE) {
          // Check if this is a new "create remote" that wasn't a default
        }
      }
    }
    // Check for DB pairings removed
    for (const lid of Object.keys(dbPairings)) {
      const cur = localMappings[lid];
      if (!cur || cur === CREATE_REMOTE || cur === DO_NOT_SYNC) return true;
      if (cur !== dbPairings[lid]) return true;
    }
    // Check remote excludes
    for (const uid of remoteExcludes) {
      if (!dbExcludes.has(uid)) return true;
    }
    for (const uid of dbExcludes) {
      if (!remoteExcludes.has(uid)) return true;
    }
    // Check for create_local (remote people not linked and not excluded, not in DB)
    const linkedRemoteUids = new Set(
      Object.values(localMappings).filter((v) => v !== CREATE_REMOTE && v !== DO_NOT_SYNC)
    );
    for (const rp of remotePeople) {
      if (!linkedRemoteUids.has(rp.person_uid) && !remoteExcludes.has(rp.person_uid)) {
        // This remote person would be "create local" — check if it was also unlinked in DB
        if (dbPairings && Object.values(dbPairings).includes(rp.person_uid)) return true;
      }
    }
    return false;
  }, [localMappings, remoteExcludes, dbPairings, dbExcludes, remotePeople]);

  // ── Activate mapping ──────────────────────────────────────────
  const handleActivate = async () => {
    setApplying(true);
    try {
      const session = await getSession();
      if (!session) return;

      // Compute actions from diff
      const actions: Array<{
        action: string;
        local_person_id?: string;
        remote_person_uid?: string;
        remote_name?: string;
        remote_relationship_label?: string | null;
      }> = [];

      const linkedRemoteUids = new Set(
        Object.values(localMappings).filter((v) => v !== CREATE_REMOTE && v !== DO_NOT_SYNC)
      );

      // Process local mappings
      for (const [lid, val] of Object.entries(localMappings)) {
        if (val !== CREATE_REMOTE && val !== DO_NOT_SYNC) {
          // Link action (only if different from DB)
          if (dbPairings[lid] !== val) {
            actions.push({ action: "link", local_person_id: lid, remote_person_uid: val });
          }
        } else if (val === CREATE_REMOTE) {
          // Only create if not already linked in DB
          if (!dbPairings[lid]) {
            actions.push({ action: "create_remote", local_person_id: lid });
          }
        }
      }

      // Process remote people: create_local
      for (const rp of remotePeople) {
        if (!linkedRemoteUids.has(rp.person_uid) && !remoteExcludes.has(rp.person_uid)) {
          // Not linked to any local person and not excluded → create locally
          if (!Object.values(dbPairings).includes(rp.person_uid)) {
            actions.push({
              action: "create_local",
              remote_person_uid: rp.person_uid,
              remote_name: rp.name,
              remote_relationship_label: rp.relationship_label,
            });
          }
        }
      }

      // Process excludes
      for (const uid of remoteExcludes) {
        if (!dbExcludes.has(uid)) {
          actions.push({ action: "exclude", remote_person_uid: uid });
        }
      }

      if (actions.length === 0) {
        toast.info("No changes to apply");
        setApplying(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("sync-apply-mapping", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { connection_id: connectionId, actions },
      });

      if (error) throw error;

      if (data?.failed > 0) {
        toast.warning(`Mapping activated with ${data.failed} issue(s). ${data.succeeded} succeeded.`);
      } else {
        toast.success("Mapping activated!");
      }

      // Reload data
      setLoading(true);
      await loadData(true);
    } catch (e) {
      console.error("Activate mapping error:", e);
      toast.error("Failed to activate mapping");
    } finally {
      setApplying(false);
    }
  };

  const handleReset = () => {
    // Reload from scratch
    setLoading(true);
    loadData();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
    toast.success("Refreshed from Temerio");
  };

  // ── Filtered & sorted lists ───────────────────────────────────
  const filteredLocal = useMemo(() => {
    let list = [...localPeople].sort((a, b) => a.name.localeCompare(b.name));
    if (localSearch) {
      const q = localSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (localFilter !== "all") {
      list = list.filter((p) => {
        const action = getLocalAction(p.id);
        if (localFilter === "linked") return action !== CREATE_REMOTE && action !== DO_NOT_SYNC;
        if (localFilter === "create") return action === CREATE_REMOTE;
        if (localFilter === "dns") return action === DO_NOT_SYNC;
        return true;
      });
    }
    return list;
  }, [localPeople, localSearch, localFilter, getLocalAction]);

  const filteredRemote = useMemo(() => {
    let list = [...remotePeople].sort((a, b) => a.name.localeCompare(b.name));
    if (remoteSearch) {
      const q = remoteSearch.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    if (remoteFilter !== "all") {
      list = list.filter((r) => {
        const action = getRemoteAction(r.person_uid);
        if (remoteFilter === "linked") return action !== CREATE_LOCAL && action !== DO_NOT_SYNC;
        if (remoteFilter === "create") return action === CREATE_LOCAL;
        if (remoteFilter === "dns") return action === DO_NOT_SYNC;
        return true;
      });
    }
    return list;
  }, [remotePeople, remoteSearch, remoteFilter, getRemoteAction]);

  // ── Status badge helper ───────────────────────────────────────
  const statusBadge = (action: string, isLocal: boolean, id: string) => {
    if (action === DO_NOT_SYNC) return <Badge variant="secondary" className="text-xs shrink-0">Do Not Sync</Badge>;
    if (isLocal && action === CREATE_REMOTE) return <Badge className="text-xs bg-amber-500/20 text-amber-700 border-amber-500/30 shrink-0">Create</Badge>;
    if (!isLocal && action === CREATE_LOCAL) return <Badge className="text-xs bg-amber-500/20 text-amber-700 border-amber-500/30 shrink-0">Create</Badge>;
    // Linked
    const isSuggested = isLocal && suggestedIds.has(id);
    return (
      <div className="flex items-center gap-1 shrink-0">
        <Badge className="text-xs bg-green-500/20 text-green-700 border-green-500/30">Linked</Badge>
        {isSuggested && <Badge variant="outline" className="text-xs text-primary/70 border-primary/30 italic">Suggested</Badge>}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="py-8 text-center space-y-2">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading people mapping…</p>
      </div>
    );
  }

  if (localPeople.length === 0 && remotePeople.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        No people found. Add people in Cherishly or Temerio first.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            People Mapping
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review how people are connected between Cherishly and Temerio. You stay in control.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || applying}
          className="text-xs"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Panel */}
      <div className="flex flex-wrap gap-3 text-xs bg-muted/50 rounded-lg px-4 py-2.5 border">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Linked: <strong>{summary.linked}</strong>
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Create in Temerio: <strong>{summary.createRemote}</strong>
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Create in Cherishly: <strong>{summary.createLocal}</strong>
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground" />
          Do Not Sync: <strong>{summary.doNotSync}</strong>
        </span>
      </div>

      {/* Table 1: Cherished (Local → Remote) */}
      <MappingTable
        title="Cherished"
        subtitle={`${localPeople.length} people`}
        search={localSearch}
        onSearchChange={setLocalSearch}
        filter={localFilter}
        onFilterChange={setLocalFilter}
        disabled={applying}
      >
        {filteredLocal.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-4">
              No people match your filter.
            </TableCell>
          </TableRow>
        ) : (
          filteredLocal.map((person) => {
            const action = getLocalAction(person.id);
            return (
              <TableRow key={person.id}>
                <TableCell className="font-medium text-sm py-2">{person.name}</TableCell>
                <TableCell className="py-2">{statusBadge(action, true, person.id)}</TableCell>
                <TableCell className="py-2">
                  <Select
                    value={action}
                    onValueChange={(v) => handleLocalChange(person.id, v)}
                    disabled={applying}
                  >
                    <SelectTrigger className="h-8 text-xs w-full max-w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {remotePeople.map((rp) => (
                        <SelectItem key={rp.person_uid} value={rp.person_uid}>
                          Sync with {rp.name}
                        </SelectItem>
                      ))}
                      <SelectItem value={CREATE_REMOTE}>Create in Temerio</SelectItem>
                      <SelectItem value={DO_NOT_SYNC}>Do Not Sync</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </MappingTable>

      {/* Table 2: Temerio People (Remote → Local) */}
      <MappingTable
        title="Temerio People"
        subtitle={`${remotePeople.length} people`}
        search={remoteSearch}
        onSearchChange={setRemoteSearch}
        filter={remoteFilter}
        onFilterChange={setRemoteFilter}
        disabled={applying}
      >
        {filteredRemote.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-4">
              No people match your filter.
            </TableCell>
          </TableRow>
        ) : (
          filteredRemote.map((person) => {
            const action = getRemoteAction(person.person_uid);
            return (
              <TableRow key={person.person_uid}>
                <TableCell className="font-medium text-sm py-2">{person.name}</TableCell>
                <TableCell className="py-2">{statusBadge(action, false, person.person_uid)}</TableCell>
                <TableCell className="py-2">
                  <Select
                    value={action}
                    onValueChange={(v) => handleRemoteChange(person.person_uid, v)}
                    disabled={applying}
                  >
                    <SelectTrigger className="h-8 text-xs w-full max-w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {localPeople.map((lp) => (
                        <SelectItem key={lp.id} value={lp.id}>
                          Sync with {lp.name}
                        </SelectItem>
                      ))}
                      <SelectItem value={CREATE_LOCAL}>Create in Cherishly</SelectItem>
                      <SelectItem value={DO_NOT_SYNC}>Do Not Sync</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </MappingTable>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2 border-t">
        <p className="text-xs text-muted-foreground">
          Changes are applied when you click Activate Mapping.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={applying}>
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset Changes
          </Button>
          <Button size="sm" onClick={handleActivate} disabled={applying || !hasChanges}>
            {applying ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Check className="w-3 h-3 mr-1" />
            )}
            Activate Mapping
          </Button>
        </div>
      </div>

      {/* Advanced section */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground w-full justify-start">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Advanced
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          <div className="text-xs text-muted-foreground">
            {fetchedAt && (
              <p>Last fetched: {new Date(fetchedAt).toLocaleString()}</p>
            )}
            <p>Local people: {localPeople.length} · Remote people: {remotePeople.length}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Force Refresh from Temerio
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ── Sub-component: MappingTable wrapper ─────────────────────────
function MappingTable({
  title,
  subtitle,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  disabled,
  children,
}: {
  title: string;
  subtitle: string;
  search: string;
  onSearchChange: (v: string) => void;
  filter: string;
  onFilterChange: (v: string) => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium">{title}</h4>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search…"
              className="h-7 text-xs pl-7 w-[140px]"
              disabled={disabled}
            />
          </div>
          <Select value={filter} onValueChange={onFilterChange} disabled={disabled}>
            <SelectTrigger className="h-7 text-xs w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="linked">Linked</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="dns">Do Not Sync</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs h-8">Name</TableHead>
              <TableHead className="text-xs h-8 w-[120px]">Status</TableHead>
              <TableHead className="text-xs h-8 w-[240px]">Mapping</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{children}</TableBody>
        </Table>
      </div>
    </div>
  );
}
