import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Plus, Calendar, Sparkles, LogOut } from "lucide-react";
import { toast } from "sonner";
import { AllEventsCalendar } from "@/components/AllEventsCalendar";

interface Profile {
  display_name: string;
}

interface Partner {
  id: string;
  name: string;
  photo_url: string | null;
}

interface Event {
  id: string;
  title: string;
  event_date: string;
  partner_id: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    await Promise.all([
      loadProfile(session.user.id),
      loadPartners(session.user.id),
      loadUpcomingEvents(session.user.id),
    ]);
    setLoading(false);
  };

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();
    if (data) setProfile(data);
  };

  const loadPartners = async (userId: string) => {
    const { data } = await supabase
      .from("partners")
      .select("id, name, photo_url")
      .eq("user_id", userId)
      .limit(5);
    if (data) setPartners(data);
  };

  const loadUpcomingEvents = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const { data } = await supabase
      .from("events")
      .select("id, title, event_date, partner_id")
      .eq("user_id", userId)
      .gte("event_date", today)
      .lte("event_date", weekFromNow)
      .order("event_date");
    if (data) setUpcomingEvents(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <div className="text-center">
          <Heart className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse-soft" />
          <p className="text-muted-foreground">Loading your love hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <nav className="bg-card border-b border-border shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Chirishly
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.display_name || "Friend"}! 💕
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening in your relationship world
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="shadow-soft hover:shadow-glow transition-shadow animate-scale-in">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-primary" />
                <span>Partners</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary mb-2">
                {partners.length}
              </div>
              <p className="text-sm text-muted-foreground">
                Beautiful connections
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-glow transition-shadow animate-scale-in" style={{ animationDelay: "0.1s" }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-secondary" />
                <span>This Week</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-secondary mb-2">
                {upcomingEvents.length}
              </div>
              <p className="text-sm text-muted-foreground">
                Important dates
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-glow transition-shadow animate-scale-in" style={{ animationDelay: "0.2s" }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-accent" />
                <span>Moments</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-accent mb-2">
                0
              </div>
              <p className="text-sm text-muted-foreground">
                Memories logged
              </p>
            </CardContent>
          </Card>
        </div>

        {/* All Love Events Calendar */}
        <section className="mb-8">
          <AllEventsCalendar />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-soft animate-fade-in">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Partners</CardTitle>
                  <CardDescription>People who make your heart full</CardDescription>
                </div>
                <Button onClick={() => navigate("/partner/new")} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Partner
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {partners.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    No partners added yet. Start building your connection map!
                  </p>
                  <Button onClick={() => navigate("/partner/new")} variant="outline">
                    Add Your First Partner
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {partners.map((partner) => (
                    <div
                      key={partner.id}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => navigate(`/partner/${partner.id}`)}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                        {partner.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{partner.name}</p>
                      </div>
                    </div>
                  ))}
                  {partners.length >= 5 && (
                    <Button variant="ghost" className="w-full" onClick={() => navigate("/partners")}>
                      View All Partners
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <CardHeader>
              <CardTitle>This Week's Highlights</CardTitle>
              <CardDescription>Important dates coming up</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    No upcoming events this week
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Calendar className="w-5 h-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.event_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
