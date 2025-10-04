import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Plus, Calendar, Sparkles, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AllEventsCalendar } from "@/components/AllEventsCalendar";
import { MomentManager } from "@/components/MomentManager";
import { ClaireChat } from "@/components/ClaireChat";
import { dateToYMDLocal, parseYMDToLocalDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  is_recurring: boolean;
}
interface EventOccurrence extends Event {
  originalDate: string;
  displayDate: string;
  partnerName?: string;
}

interface MomentSummary {
  id: string;
  title: string | null;
  moment_date: string;
  partner_ids: string[];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventOccurrence[]>([]);
  const [moments, setMoments] = useState<MomentSummary[]>([]);
  const [totalMoments, setTotalMoments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMomentsDialog, setShowMomentsDialog] = useState(false);
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await Promise.all([
      loadProfile(session.user.id), 
      loadPartners(session.user.id), 
      loadUpcomingEvents(session.user.id),
      loadMoments(session.user.id)
    ]);
    setLoading(false);
  };
  const loadProfile = async (userId: string) => {
    const {
      data
    } = await supabase.from("profiles").select("display_name").eq("id", userId).single();
    if (data) setProfile(data);
  };
  const loadPartners = async (userId: string) => {
    const {
      data
    } = await supabase.from("partners").select("id, name, photo_url").eq("user_id", userId).eq("archived", false).limit(5);
    if (data) setPartners(data);
  };

  const loadMoments = async (userId: string) => {
    const { data, count } = await supabase
      .from("moments")
      .select("id, title, moment_date, partner_ids", { count: 'exact' })
      .eq("user_id", userId)
      .order("moment_date", { ascending: false })
      .limit(3);
    
    if (data) {
      setMoments(data);
      setTotalMoments(count || 0);
    }
  };
  const loadUpcomingEvents = async (userId: string) => {
    // Use date-only window to avoid time-of-day exclusion
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfWindow = new Date(startOfToday);
    endOfWindow.setDate(endOfWindow.getDate() + 7);
    endOfWindow.setHours(23, 59, 59, 999);

    // Get all events and partners (partners include birthdates)
    const {
      data: events
    } = await supabase.from("events").select("id, title, event_date, partner_id, is_recurring").eq("user_id", userId);
    const {
      data: partnersData
    } = await supabase.from("partners").select("id, name, birthdate").eq("user_id", userId).eq("archived", false);
    if (!events && !partnersData) return;
    const partnerMap = new Map(partnersData?.map(p => [p.id, p.name]) || []);
    const occurrences: EventOccurrence[] = [];

    // Process regular events
    events?.forEach(event => {
      const eventDate = parseYMDToLocalDate(event.event_date);
      if (event.is_recurring) {
        // Generate occurrences for recurring events
        const currentYear = startOfToday.getFullYear();
        for (let year = currentYear; year <= currentYear + 1; year++) {
          const month = eventDate.getMonth();
          const day = eventDate.getDate();
          let occurrenceDate = new Date(year, month, day);

          // Handle Feb 29 in non-leap years
          if (month === 1 && day === 29 && !isLeapYear(year)) {
            occurrenceDate = new Date(year, 1, 28);
          }
          if (occurrenceDate >= startOfToday && occurrenceDate <= endOfWindow) {
            occurrences.push({
              ...event,
              originalDate: event.event_date,
              displayDate: dateToYMDLocal(occurrenceDate),
              partnerName: event.partner_id ? partnerMap.get(event.partner_id) : undefined
            });
          }
        }
      } else {
        // Non-recurring event
        if (eventDate >= startOfToday && eventDate <= endOfWindow) {
          occurrences.push({
            ...event,
            originalDate: event.event_date,
            displayDate: event.event_date,
            partnerName: event.partner_id ? partnerMap.get(event.partner_id) : undefined
          });
        }
      }
    });

    // Process birthdays from partners (always yearly recurring)
    partnersData?.forEach(partner => {
      if (!partner.birthdate) return;
      const birthdate = parseYMDToLocalDate(partner.birthdate);
      const currentYear = startOfToday.getFullYear();
      for (let year = currentYear; year <= currentYear + 1; year++) {
        const month = birthdate.getMonth();
        const day = birthdate.getDate();
        let occurrenceDate = new Date(year, month, day);

        // Handle Feb 29 in non-leap years
        if (month === 1 && day === 29 && !isLeapYear(year)) {
          occurrenceDate = new Date(year, 1, 28);
        }
        if (occurrenceDate >= startOfToday && occurrenceDate <= endOfWindow) {
          occurrences.push({
            id: `birthday-${partner.id}-${year}`,
            title: `${partner.name}'s Birthday`,
            event_date: partner.birthdate,
            partner_id: partner.id,
            is_recurring: true,
            originalDate: partner.birthdate,
            displayDate: dateToYMDLocal(occurrenceDate),
            partnerName: partner.name
          });
        }
      }
    });
    occurrences.sort((a, b) => a.displayDate.localeCompare(b.displayDate));
    setUpcomingEvents(occurrences);
  };
  const isLeapYear = (year: number) => {
    return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <div className="text-center">
          <Heart className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse-soft" />
          <p className="text-muted-foreground">Loading your love hub...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-soft">
      <nav className="bg-card border-b border-border shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">Cherishly</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/account")}>
              <User className="w-4 h-4 mr-2" />
              Account
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
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
                <span>Cherished</span>
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

          <Card className="shadow-soft hover:shadow-glow transition-shadow animate-scale-in" style={{
          animationDelay: "0.1s"
        }}>
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

          <Card 
            className="shadow-soft hover:shadow-glow transition-shadow animate-scale-in cursor-pointer" 
            style={{ animationDelay: "0.2s" }}
            onClick={() => setShowMomentsDialog(true)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <span>Moments</span>
                </div>
                <Button size="sm" variant="ghost" onClick={(e) => {
                  e.stopPropagation();
                  setShowMomentsDialog(true);
                }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-accent mb-2">
                {totalMoments}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Memories logged
              </p>
              {moments.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  {moments.map((moment) => {
                    const partnerNames = moment.partner_ids
                      .map((id) => partners.find((p) => p.id === id)?.name)
                      .filter(Boolean)
                      .join(", ");
                    
                    return (
                      <div key={moment.id} className="text-xs">
                        <p className="font-medium truncate">
                          {moment.title || "Untitled"}
                        </p>
                        <p className="text-muted-foreground">
                          {format(new Date(moment.moment_date), "MMM d")}
                          {partnerNames && ` • ${partnerNames}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            <Card className="shadow-soft animate-fade-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Cherished</CardTitle>
                    <CardDescription>People who make your heart full</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => navigate("/partner/new")} size="sm" data-testid="add-partner-button">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Cherished
                    </Button>
                    <Button onClick={() => navigate("/archive")} size="sm" variant="outline">
                      Archive
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {partners.length === 0 ? <div className="text-center py-8">
                    <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">
                      No cherished added yet. Start building your connection map!
                    </p>
                    <Button onClick={() => navigate("/partner/new")} variant="outline">
                      Add Your First Cherished
                    </Button>
                  </div> : <div className="space-y-3">
                    {partners.map(partner => <div key={partner.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer" onClick={() => navigate(`/partner/${partner.id}`)}>
                        <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                          {partner.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{partner.name}</p>
                        </div>
                      </div>)}
                    {partners.length >= 5 && <Button variant="ghost" className="w-full" onClick={() => navigate("/partners")}>
                        View All Cherished
                      </Button>}
                  </div>}
              </CardContent>
            </Card>

            <Card className="shadow-soft animate-fade-in" style={{
            animationDelay: "0.1s"
          }}>
              <CardHeader>
                <CardTitle>This Week's Highlights</CardTitle>
                <CardDescription>Important dates coming up</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? <div className="text-center py-8">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">
                      No upcoming events this week
                    </p>
                  </div> : <div className="space-y-3" data-testid="upcoming-list">
                    {upcomingEvents.map((event, index) => <div key={`${event.id}-${event.displayDate}-${index}`} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted transition-colors">
                        <Calendar className="w-5 h-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">
                            {event.title}
                            {event.partnerName && ` (${event.partnerName})`}
                            {event.is_recurring && <span className="ml-2 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                Recurring
                              </span>}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseYMDToLocalDate(event.displayDate), "EEEE, MMMM d")}
                            {event.partnerName && ` • ${event.partnerName}`}
                          </p>
                        </div>
                      </div>)}
                  </div>}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="h-[800px]">
              <ClaireChat compact={isMobile} />
            </div>
          </div>
        </div>
      </main>

      <Dialog open={showMomentsDialog} onOpenChange={setShowMomentsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Moments</DialogTitle>
          </DialogHeader>
          <MomentManager showPartnerColumn />
        </DialogContent>
      </Dialog>
    </div>;
};
export default Dashboard;