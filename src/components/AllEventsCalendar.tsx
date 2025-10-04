import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { dateToYMDLocal, parseYMDToLocalDate } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  partner_id: string | null;
  is_recurring: boolean;
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

  // Helper to generate recurring event occurrences
  const getRecurringOccurrences = (event: Event) => {
    if (!event.is_recurring) return [event];
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const sixMonthsFromNow = new Date(now);
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    
    const originalDate = parseYMDToLocalDate(event.event_date);
    const occurrences = [];
    
    // Generate occurrences for the next 10 years
    for (let yearOffset = 0; yearOffset < 10; yearOffset++) {
      const year = now.getFullYear() + yearOffset;
      const month = originalDate.getMonth();
      const day = originalDate.getDate();
      
      let occurrenceDate = new Date(year, month, day);
      
      // Handle Feb 29 in non-leap years: show on Feb 28
      if (month === 1 && day === 29) {
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        if (!isLeapYear) {
          occurrenceDate = new Date(year, 1, 28); // Feb 28
        }
      }
      
      occurrences.push({
        ...event,
        event_date: dateToYMDLocal(occurrenceDate),
        displayYear: occurrenceDate.getFullYear(),
      });
    }
    
    return occurrences;
  };

  const upcomingEvents = events
    .flatMap(getRecurringOccurrences)
    .filter(e => {
      const eventDate = parseYMDToLocalDate(e.event_date);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const sixMonthsFromNow = new Date(now);
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      return eventDate >= now && eventDate <= sixMonthsFromNow;
    })
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

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
    <Card className="shadow-soft" data-testid="overall-calendar">
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
                      {event.is_recurring && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                          Recurring
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(parseYMDToLocalDate(event.event_date), "MMMM d, yyyy")}
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