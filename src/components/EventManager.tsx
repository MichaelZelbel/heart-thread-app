import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Calendar, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { dateToYMDLocal, parseYMDToLocalDate } from "@/lib/utils";

interface Moment {
  id: string;
  title: string;
  moment_date: string;
  event_type: string | null;
  description: string | null;
  is_celebrated_annually: boolean;
}

interface EventManagerProps {
  partnerId: string;
  partnerName: string;
}

const eventTypePresets = [
  "Birthday",
  "Anniversary",
  "Day We Met",
  "First Kiss",
  "First 'I Love You'",
  "Special Trip",
  "Custom"
];

export const EventManager = ({ partnerId, partnerName }: EventManagerProps) => {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("Custom");
  const [momentDate, setMomentDate] = useState("");
  const [description, setDescription] = useState("");
  const [isCelebratedAnnually, setIsCelebratedAnnually] = useState(true);

  useEffect(() => {
    loadMoments();
  }, [partnerId]);

  useEffect(() => {
    if (!editingMoment && eventType !== "Custom") {
      setTitle(eventType);
    }
  }, [eventType, editingMoment]);

  const loadMoments = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("moments")
      .select("id, title, moment_date, event_type, description, is_celebrated_annually")
      .eq("user_id", session.user.id)
      .contains("partner_ids", [partnerId])
      .not("event_type", "is", null)
      .order("moment_date", { ascending: true });

    if (!error && data) {
      setMoments(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !momentDate) {
      toast.error("Please fill in title and date");
      return;
    }

    const parsedDate = parseFlexibleDate(momentDate);
    if (!parsedDate) {
      toast.error("Please enter a valid date (MM/DD or MM/DD/YYYY)");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Birthday uniqueness check
    if (eventType === "Birthday" && !editingMoment) {
      const { data: existingBirthday } = await supabase
        .from("moments")
        .select("id")
        .eq("user_id", session.user.id)
        .contains("partner_ids", [partnerId])
        .eq("event_type", "Birthday")
        .maybeSingle();

      if (existingBirthday) {
        toast.error("A birthday already exists for this person. Please edit the existing one.");
        return;
      }
    }

    // Sync partner birthdate
    if (eventType === "Birthday") {
      await supabase
        .from("partners")
        .update({ birthdate: parsedDate })
        .eq("id", partnerId);
    }

    const momentData = {
      title: title.trim(),
      moment_date: parsedDate,
      event_type: eventType === "Custom" ? null : eventType,
      description: description.trim() || null,
      partner_ids: [partnerId],
      user_id: session.user.id,
      is_celebrated_annually: eventType === "Birthday" ? true : isCelebratedAnnually,
    };

    if (editingMoment) {
      const { error } = await supabase.from("moments").update(momentData).eq("id", editingMoment.id);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("moments").insert(momentData);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Created");
    }

    resetForm();
    setIsDialogOpen(false);
    loadMoments();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("moments").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Deleted");
    loadMoments();
  };

  const resetForm = () => {
    setTitle("");
    setEventType("Custom");
    setMomentDate("");
    setDescription("");
    setIsCelebratedAnnually(true);
    setEditingMoment(null);
  };

  const openEditDialog = (m: Moment) => {
    setEditingMoment(m);
    setTitle(m.title);
    setEventType(m.event_type || "Custom");
    setMomentDate(formatDateForInput(m.moment_date));
    setDescription(m.description || "");
    setIsCelebratedAnnually(m.is_celebrated_annually);
    setIsDialogOpen(true);
  };

  const parseFlexibleDate = (input: string): string | null => {
    const trimmed = input.trim();
    const fullMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (fullMatch) {
      const [, month, day, year] = fullMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    const shortMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (shortMatch) {
      const [, month, day] = shortMatch;
      return `1900-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return null;
  };

  const formatDateForInput = (dateStr: string): string => {
    const date = parseYMDToLocalDate(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    if (year === 1900) return `${month}/${day}`;
    return `${month}/${day}/${year}`;
  };

  const formatEventDate = (dateStr: string): string => {
    const date = parseYMDToLocalDate(dateStr);
    if (date.getFullYear() === 1900) return format(date, "MMMM d");
    return format(date, "MMMM d, yyyy");
  };

  const getRecurringOccurrences = (m: Moment) => {
    if (!m.is_celebrated_annually) return [m];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const originalDate = parseYMDToLocalDate(m.moment_date);
    const occurrences = [];
    for (let yearOffset = 0; yearOffset < 10; yearOffset++) {
      const year = now.getFullYear() + yearOffset;
      const month = originalDate.getMonth();
      const day = originalDate.getDate();
      let occurrenceDate = new Date(year, month, day);
      if (month === 1 && day === 29) {
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        if (!isLeapYear) occurrenceDate = new Date(year, 1, 28);
      }
      occurrences.push({ ...m, moment_date: dateToYMDLocal(occurrenceDate) });
    }
    return occurrences;
  };

  const upcomingMoments = moments
    .flatMap(getRecurringOccurrences)
    .filter(m => {
      const d = parseYMDToLocalDate(m.moment_date);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const sixMonths = new Date(now);
      sixMonths.setMonth(sixMonths.getMonth() + 6);
      return d >= now && d <= sixMonths;
    })
    .sort((a, b) => a.moment_date.localeCompare(b.moment_date));

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading events...</div>;
  }

  return (
    <div className="space-y-6" data-testid="partner-calendar-container">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Love Calendar</h3>
          <p className="text-sm text-muted-foreground">
            Track milestones and special moments with {partnerName}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="calendar-add-event-button">
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMoment ? "Edit Event" : "Add Event"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="eventType">Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {eventTypePresets.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., First Date" data-testid="event-title-input" />
              </div>
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input id="date" type="text" value={momentDate} onChange={(e) => setMomentDate(e.target.value)} placeholder="MM/DD or MM/DD/YYYY" data-testid="event-date-input" />
                <p className="text-xs text-muted-foreground mt-1">Year is optional (e.g., 09/30 or 09/30/1999)</p>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional details..." rows={3} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="recurring">Celebrated Annually</Label>
                  <p className="text-xs text-muted-foreground">Triggers reminders & appears in calendar</p>
                </div>
                <Switch id="recurring" checked={isCelebratedAnnually} onCheckedChange={setIsCelebratedAnnually} data-testid="event-recurrence-toggle" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                <Button onClick={handleSave}>{editingMoment ? "Update" : "Create"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {moments.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No events yet. Add your first event — like "Day we met" or "First kiss."</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <h4 className="font-medium">Upcoming Events (Next 6 Months)</h4>
            {upcomingMoments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events in the next 6 months.</p>
            ) : (
              <div className="space-y-2">
                {upcomingMoments.map((m, idx) => (
                  <div key={`${m.id}-${idx}`} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{m.title}</span>
                        {m.event_type && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{m.event_type}</span>}
                        {m.is_celebrated_annually && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">Yearly</span>}
                      </div>
                      <p className="text-sm text-muted-foreground">{formatEventDate(m.moment_date)}</p>
                      {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(m)} disabled={m.event_type === "Birthday"}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} disabled={m.event_type === "Birthday"}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">All Events</h4>
            <div className="space-y-2">
              {moments.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{m.title}</span>
                      {m.event_type && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{m.event_type}</span>}
                      {m.is_celebrated_annually && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">Yearly</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{formatEventDate(m.moment_date)}</p>
                    {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(m)} disabled={m.event_type === "Birthday"}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)} disabled={m.event_type === "Birthday"}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
