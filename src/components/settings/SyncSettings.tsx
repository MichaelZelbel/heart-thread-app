import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  RefreshCw,
  Link2,
  Unlink,
  Copy,
  Loader2,
  CheckCircle2,
  Clock,
  Users,
  Search,
} from "lucide-react";
import { SyncPeopleMapping } from "./SyncPeopleMapping";

interface SyncConnection {
  id: string;
  remote_app: string;
  status: string;
  created_at: string;
}

interface PersonLink {
  id: string;
  local_person_id: string;
  remote_person_uid: string;
  is_enabled: boolean;
  partner_name?: string;
}

export function SyncSettings() {
  const [connections, setConnections] = useState<SyncConnection[]>([]);
  const [personLinks, setPersonLinks] = useState<PersonLink[]>([]);
  const [partners, setPartners] = useState<{ id: string; name: string; person_uid: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpiry, setPairingExpiry] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");
  const [enterCode, setEnterCode] = useState("");
  const [generating, setGenerating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [connRes, linksRes, partnersRes] = await Promise.all([
      supabase.from("sync_connections").select("*").eq("status", "active").order("created_at", { ascending: false }),
      supabase.from("sync_person_links").select("*"),
      supabase.from("partners").select("id, name, person_uid").eq("archived", false).order("name"),
    ]);

    setConnections((connRes.data || []) as SyncConnection[]);
    
    const links = (linksRes.data || []) as PersonLink[];
    // Enrich with partner names
    const partnerMap = new Map((partnersRes.data || []).map(p => [p.id, p.name]));
    const enriched = links.map(l => ({ ...l, partner_name: partnerMap.get(l.local_person_id) || "Unknown" }));
    setPersonLinks(enriched);
    setPartners(partnersRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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
    if (!confirm("Revoke this connection? Sync will stop.")) return;
    const { error } = await supabase
      .from("sync_connections")
      .update({ status: "revoked" })
      .eq("id", connId);
    if (error) {
      toast.error("Failed to revoke");
      return;
    }
    toast.success("Connection revoked");
    loadData();
  };

  const handleTogglePersonLink = async (partnerId: string, connectionId: string, currentlyEnabled: boolean) => {
    const existing = personLinks.find(l => l.local_person_id === partnerId && l.id);

    if (existing) {
      await supabase.from("sync_person_links").update({ is_enabled: !currentlyEnabled }).eq("id", existing.id);
    } else {
      const partner = partners.find(p => p.id === partnerId);
      if (!partner) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.from("sync_person_links").insert({
        user_id: session.user.id,
        connection_id: connectionId,
        local_person_id: partnerId,
        remote_person_uid: partner.person_uid,
        is_enabled: true,
      });
    }
    loadData();
  };

  const handleSyncAll = async (connId: string) => {
    // Enable all partners for sync
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    for (const p of partners) {
      const exists = personLinks.find(l => l.local_person_id === p.id);
      if (!exists) {
        await supabase.from("sync_person_links").insert({
          user_id: session.user.id,
          connection_id: connId,
          local_person_id: p.id,
          remote_person_uid: p.person_uid,
          is_enabled: true,
        });
      } else if (!exists.is_enabled) {
        await supabase.from("sync_person_links").update({ is_enabled: true }).eq("id", exists.id);
      }
    }
    toast.success("All people enabled for sync");
    loadData();
  };

  const copyCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      toast.success("Code copied!");
    }
  };

  const activeConnection = connections.find(c => c.status === "active");
  const filteredPartners = partners.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <Button variant="ghost" size="sm" onClick={() => handleRevoke(activeConnection.id)} className="text-destructive hover:text-destructive">
                <Unlink className="w-4 h-4 mr-1" />
                Disconnect
              </Button>
            </div>

            <Tabs defaultValue="mapping" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="mapping">
                  <Users className="w-4 h-4 mr-1" />
                  People Mapping
                </TabsTrigger>
                <TabsTrigger value="toggles">
                  Quick Toggles
                </TabsTrigger>
              </TabsList>

              <TabsContent value="mapping" className="mt-4">
                <SyncPeopleMapping connectionId={activeConnection.id} />
              </TabsContent>

              <TabsContent value="toggles" className="mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      People to sync
                    </h4>
                    <Button variant="outline" size="sm" onClick={() => handleSyncAll(activeConnection.id)}>
                      Sync All
                    </Button>
                  </div>

                  {partners.length > 5 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search people..."
                        className="pl-9 h-8 text-sm"
                      />
                    </div>
                  )}

                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {filteredPartners.map((p) => {
                      const link = personLinks.find(l => l.local_person_id === p.id);
                      const isEnabled = link?.is_enabled ?? false;
                      return (
                        <div key={p.id} className="flex items-center justify-between py-2 px-2 hover:bg-muted/30 rounded">
                          <Label htmlFor={`sync-${p.id}`} className="text-sm cursor-pointer">{p.name}</Label>
                          <Switch
                            id={`sync-${p.id}`}
                            checked={isEnabled}
                            onCheckedChange={() => handleTogglePersonLink(p.id, activeConnection.id, isEnabled)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
