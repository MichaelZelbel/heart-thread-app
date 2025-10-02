import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  partner_id: string | null;
}

interface Partner {
  id: string;
  name: string;
}

export const AllEventsCalendar = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Load partners
    const { data: partnersData } = await supabase
      .from("partners")
      .select("id, name")
      .eq("user_id", session.user.id);

    if (partnersData) {
      setPartners(partnersData);
    }

    // Load all events
    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", session.user.id)
      .order("event_date", { ascending: true });

    if (eventsData) {
      setEvents(eventsData);
    }

    setLoading(false);
  };

  const getPartnerName = (partnerId: string | null) => {
    if (!partnerId) return "";
    const partner = partners.find(p => p.id === partnerId);
    return partner ? partner.name : "";
  };

  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.event_date);
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    return eventDate >= new Date() && eventDate <= sixMonthsFromNow;
  });

  const getPartnerColor = (partnerId: string | null) => {
    if (!partnerId) return "hsl(var(--primary))";
    // Generate consistent colors based on partner index
    const index = partners.findIndex(p => p.id === partnerId);
    const hues = [340, 280, 200, 160, 25, 50]; // Various hues from design system
    const hue = hues[index % hues.length];
    return `hsl(${hue} 70% 60%)`;
  };

  if (loading) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            All Love Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">Loading events...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          All Love Events
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Upcoming milestones across all your special people
        </p>
      </CardHeader>
      <CardContent>
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No upcoming events. Add milestones in your partner profiles.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event) => {
              const partnerName = getPartnerName(event.partner_id);
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg hover:shadow-soft transition-shadow"
                >
                  <div
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: getPartnerColor(event.partner_id) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {event.title}
                        {partnerName && ` (${partnerName})`}
                      </span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {event.event_type}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.event_date), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};