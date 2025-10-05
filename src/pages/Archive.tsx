import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, ArrowLeft, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Partner {
  id: string;
  name: string;
  birthdate: string | null;
}

const Archive = () => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchivedPartners();
  }, []);

  const loadArchivedPartners = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("archived", true)
      .order("name");

    if (error) {
      console.error("Error loading archived partners:", error);
      toast.error("Failed to load archived partners");
      setLoading(false);
      return;
    }

    setPartners(data || []);
    setLoading(false);
  };

  const handleRecover = async (partnerId: string, partnerName: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("partners")
      .update({ archived: false })
      .eq("id", partnerId)
      .eq("user_id", session.user.id);

    if (error) {
      toast.error("Failed to recover cherished");
      return;
    }

    toast.success(`${partnerName} recovered successfully`);
    setPartners(partners.filter(p => p.id !== partnerId));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <div className="text-center">
          <Heart className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse-soft" />
          <p className="text-muted-foreground">Loading archive...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <nav className="bg-card border-b border-border shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Heart className="w-8 h-8 mr-3 text-primary" />
            Archive
          </h1>
          <p className="text-muted-foreground">
            Archived cherished and their events are hidden from your main dashboard
          </p>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Archived Cherished</CardTitle>
            <CardDescription>
              Click "Recover" to restore a cherished to your active list
            </CardDescription>
          </CardHeader>
          <CardContent>
            {partners.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  No archived cherished
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {partners.map(partner => (
                  <div
                    key={partner.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                        {partner.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{partner.name}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRecover(partner.id, partner.name)}
                      variant="outline"
                      size="sm"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Recover
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Archive;
