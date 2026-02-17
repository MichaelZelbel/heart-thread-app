import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { GitMerge, Loader2, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
}

export function MergePeopleSection() {
  const [mergeLogs, setMergeLogs] = useState<MergeLog[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeKeep, setMergeKeep] = useState<string>("");
  const [mergeDrop, setMergeDrop] = useState<string>("");

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [mergeLogsRes, partnersRes] = await Promise.all([
      supabase.from("sync_merge_log").select("*").is("undone_at", null).order("created_at", { ascending: false }),
      supabase.from("partners").select("id, name").eq("archived", false).order("name"),
    ]);

    setMergeLogs((mergeLogsRes.data || []) as unknown as MergeLog[]);
    setPartners(partnersRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const partnerName = (id: string) => partners.find(p => p.id === id)?.name || "Unknown";

  const handleMerge = async () => {
    if (!mergeKeep || !mergeDrop || mergeKeep === mergeDrop) return;
    setActionLoading("merge");
    try {
      const { data: { session } } = await supabase.auth.getSession();
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
      const { data: { session } } = await supabase.auth.getSession();
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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitMerge className="w-5 h-5" />
          Merge Duplicate People
        </CardTitle>
        <CardDescription>
          Combine two people into one. All moments, likes, and links from the merged person will move to the kept person. This can be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button variant="outline" onClick={() => setMergeOpen(true)} disabled={partners.length < 2}>
          <GitMerge className="w-4 h-4 mr-1" />
          Merge People
        </Button>

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
      </CardContent>
    </Card>
  );
}
