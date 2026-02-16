import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { dateToYMDLocal, parseYMDToLocalDate } from "@/lib/utils";

interface Moment {
  id: string;
  title: string;
  moment_date: string;
  event_type: string | null;
  partner_ids: string[] | null;
  is_celebrated_annually: boolean;
}

interface Partner {
  id: string;
  name: string;
}

export const AllEventsCalendar = () => {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: partnersData } = await supabase
      .from("partners")
      .select("id, name")
      .eq("user_id", session.user.id);

    if (partnersData) setPartners(partnersData);

    // Load moments that are celebrated annually or are in the future
    const { data: momentsData } = await supabase
      .from("moments")
      .select("id, title, moment_date, event_type, partner_ids, is_celebrated_annually")
      .eq("user_id", session.user.id)
      .is("deleted_at", null)
      .order("moment_date", { ascending: true });

    if (momentsData) setMoments(momentsData);
    setLoading(false);
  };

  const getPartnerName = (partnerIds: string[] | null) => {
    if (!partnerIds || partnerIds.length === 0) return "";
    const partner = partners.find(p => partnerIds.includes(p.id));
    return partner ? partner.name : "";
  };

  const getRecurringOccurrences = (moment: Moment) => {
    if (!moment.is_celebrated_annually) return [moment];

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const originalDate = parseYMDToLocalDate(moment.moment_date);
    const occurrences = [];

    for (let yearOffset = 0; yearOffset < 10; yearOffset++) {
      const year = now.getFullYear() + yearOffset;
      const month = originalDate.getMonth();
      const day = originalDate.getDate();

      let occurrenceDate = new Date(year, month, day);

      if (month === 1 && day === 29) {
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        if (!isLeapYear) {
          occurrenceDate = new Date(year, 1, 28);
        }
      }

      occurrences.push({
        ...moment,
        moment_date: dateToYMDLocal(occurrenceDate),
      });
    }

    return occurrences;
  };

  const upcomingMoments = moments
    .filter(m => m.is_celebrated_annually || parseYMDToLocalDate(m.moment_date) >= new Date())
    .flatMap(getRecurringOccurrences)
    .filter(m => {
      const mDate = parseYMDToLocalDate(m.moment_date);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const sixMonthsFromNow = new Date(now);
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      return mDate >= now && mDate <= sixMonthsFromNow;
    })
    .sort((a, b) => a.moment_date.localeCompare(b.moment_date));

  const getPartnerColor = (partnerIds: string[] | null) => {
    if (!partnerIds || partnerIds.length === 0) return "hsl(var(--primary))";
    const index = partners.findIndex(p => partnerIds.includes(p.id));
    const hues = [340, 280, 200, 160, 25, 50];
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
        {upcomingMoments.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No upcoming events. Add milestones in your partner profiles.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingMoments.map((moment, idx) => {
              const partnerName = getPartnerName(moment.partner_ids);
              return (
                <div
                  key={`${moment.id}-${idx}`}
                  className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg hover:shadow-soft transition-shadow"
                >
                  <div
                    className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                    style={{ backgroundColor: getPartnerColor(moment.partner_ids) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {moment.title}
                        {partnerName && ` (${partnerName})`}
                      </span>
                      {moment.event_type && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {moment.event_type}
                        </span>
                      )}
                      {moment.is_celebrated_annually && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                          Yearly
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(parseYMDToLocalDate(moment.moment_date), "MMMM d, yyyy")}
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
