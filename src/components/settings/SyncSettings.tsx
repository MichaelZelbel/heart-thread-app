import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  RefreshCw,
  Link2,
  Unlink,
  Copy,
  Loader2,
  CheckCircle2,
  Clock,
  ArrowDownUp,
  History,
} from "lucide-react";
import { SyncPeopleMapping } from "./SyncPeopleMapping";

interface SyncConnection {
  id: string;
  remote_app: string;
  status: string;
  created_at: string;
}

export function SyncSettings() {
  const [connections, setConnections] = useState<SyncConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpiry, setPairingExpiry] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");
  const [enterCode, setEnterCode] = useState("");
  const [generating, setGenerating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const connRes = await supabase.from("sync_connections").select("*").eq("status", "active").order("created_at", { ascending: false });
    setConnections((connRes.data || []) as SyncConnection[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime: auto-refresh when sync_connections changes (e.g. revoked from Temerio side)
  useEffect(() => {
    const channel = supabase
      .channel("sync-connections-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sync_connections" },
        () => { loadData(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  // Countdown timer for pairing code
  useEffect(() => {
    if (!pairingExpiry) return;
    const interval = setInterval(() => {
      const diff = pairingExpiry.getTime() - Date.now();
      if (diff <= 0) {
        setPairingCode(null);
        setPairingExpiry(null);
        setCountdown("");
        clearInterval(interval);
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${m}:${s.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [pairingExpiry]);

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("create-pairing-code", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      setPairingCode(data.code);
      setPairingExpiry(new Date(data.expires_at));
    } catch (e) {
      toast.error("Failed to generate pairing code");
    } finally {
      setGenerating(false);
    }
  };

  const handleAcceptCode = async () => {
    if (!enterCode.trim()) return;
    setAccepting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("accept-pairing-code", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { code: enterCode.trim().toUpperCase() },
      });

      if (error) throw error;
      toast.success("Connected to Temerio!");
      setEnterCode("");
      loadData();
    } catch (e) {
      toast.error("Failed to accept pairing code. It may be invalid or expired.");
    } finally {
      setAccepting(false);
    }
  };

  const handleRevoke = async (connId: string) => {
    if (!confirm("Revoke this connection? Sync will stop on both sides.")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("sync-disconnect", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { connection_id: connId },
      });

      if (error) throw error;

      const remoteNotified = data?.remote_notified;
      toast.success(
        remoteNotified
          ? "Disconnected from both sides"
          : "Disconnected locally (Temerio may still show the connection briefly)"
      );
      loadData();
    } catch (e) {
      toast.error("Failed to disconnect");
    }
  };

  const handleSyncNow = async (connId: string) => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("sync-run", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { connection_id: connId },
      });

      if (error) throw error;

      const { pulled, applied, conflicts } = data as { pulled: number; applied: number; conflicts: number };
      if (pulled === 0) {
        toast.info("Already up to date — no new events from Temerio.");
      } else if (conflicts > 0) {
        toast.warning(`Synced ${applied} events from Temerio. ${conflicts} conflict(s) need review.`);
      } else {
        toast.success(`Synced ${applied} event(s) from Temerio.`);
      }
    } catch (e) {
      toast.error("Sync failed. Please try again.");
      console.error("sync-run error:", e);
    } finally {
      setSyncing(false);
    }
  };

  const handleBackfill = async (connId: string) => {
    setBackfilling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("sync-backfill", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { connection_id: connId },
      });

      if (error) throw error;

      const { queued_moments, queued_people } = data as { queued_moments: number; queued_people: number };
      const total = queued_moments + queued_people;
      if (total === 0) {
        toast.info("All existing moments are already queued — press Sync Now to push them.");
      } else {
        toast.success(
          `Queued ${queued_moments} moment(s) and ${queued_people} person(s) for sync. Press "Sync Now" to push them.`
        );
      }
    } catch (e) {
      toast.error("Backfill failed. Please try again.");
      console.error("sync-backfill error:", e);
    } finally {
      setBackfilling(false);
    }
  };

  const copyCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      toast.success("Code copied!");
    }
  };

  const activeConnection = connections.find(c => c.status === "active");

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
          <RefreshCw className="w-5 h-5" />
          Sync with Temerio
        </CardTitle>
        <CardDescription>
          Link your Cherishly account with Temerio to keep moments in sync across both apps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!activeConnection ? (
          /* No active connection — show pairing UI */
          <div className="space-y-4">
            {/* Generate code */}
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-medium text-sm">Share a code with Temerio</h4>
              <p className="text-xs text-muted-foreground">
                Generate a pairing code here, then enter it in Temerio to link accounts.
              </p>
              {pairingCode ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-md font-mono text-lg tracking-widest">
                    {pairingCode}
                  </div>
                  <Button variant="ghost" size="sm" onClick={copyCode}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {countdown}
                  </div>
                </div>
              ) : (
                <Button size="sm" onClick={handleGenerateCode} disabled={generating}>
                  {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Link2 className="w-4 h-4 mr-1" />}
                  Generate Code
                </Button>
              )}
            </div>

            {/* Enter code from Temerio */}
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-medium text-sm">Enter a code from Temerio</h4>
              <p className="text-xs text-muted-foreground">
                If you generated a pairing code in Temerio, paste it here.
              </p>
              <div className="flex gap-2">
                <Input
                  value={enterCode}
                  onChange={(e) => setEnterCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB3XYZ"
                  className="font-mono tracking-widest max-w-[200px]"
                  maxLength={6}
                />
                <Button size="sm" onClick={handleAcceptCode} disabled={accepting || !enterCode.trim()}>
                  {accepting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                  Link
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Active connection — show sync controls with tabs */
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Connected to Temerio</p>
                  <p className="text-xs text-muted-foreground">
                    Since {new Date(activeConnection.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBackfill(activeConnection.id)}
                  disabled={backfilling || syncing}
                  title="Queue all existing moments so they can be sent to Temerio"
                >
                  {backfilling
                    ? <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    : <History className="w-4 h-4 mr-1" />}
                  {backfilling ? "Queuing…" : "Sync History"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSyncNow(activeConnection.id)}
                  disabled={syncing || backfilling}
                >
                  {syncing
                    ? <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    : <ArrowDownUp className="w-4 h-4 mr-1" />}
                  {syncing ? "Syncing…" : "Sync Now"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleRevoke(activeConnection.id)} className="text-destructive hover:text-destructive">
                  <Unlink className="w-4 h-4 mr-1" />
                  Disconnect
                </Button>
              </div>
            </div>

            <SyncPeopleMapping connectionId={activeConnection.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
