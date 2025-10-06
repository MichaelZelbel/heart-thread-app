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
import { format, addYears } from "date-fns";
import { dateToYMDLocal, parseYMDToLocalDate } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  description: string | null;
  is_recurring: boolean;
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
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("Custom");
  const [eventDate, setEventDate] = useState("");
  const [description, setDescription] = useState("");
  const [isRecurring, setIsRecurring] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [partnerId]);

  // Auto-populate title when event type changes (only for new events)
  useEffect(() => {
    if (!editingEvent && eventType !== "Custom") {
      setTitle(eventType);
    }
  }, [eventType, editingEvent]);

  const loadEvents = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("partner_id", partnerId)
      .eq("user_id", session.user.id)
      .order("event_date", { ascending: true });

    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !eventDate) {
      toast.error("Please fill in title and date");
      return;
    }

    // Parse and validate date (supports MM/DD or MM/DD/YYYY)
    const parsedDate = parseFlexibleDate(eventDate);
    if (!parsedDate) {
      toast.error("Please enter a valid date (MM/DD or MM/DD/YYYY)");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Special handling for Birthday events - ensure only one exists and sync with partner birthdate
    if (eventType === "Birthday") {
      // Check if another Birthday event already exists (only when creating new)
      if (!editingEvent) {
        const { data: existingBirthday } = await supabase
          .from("events")
          .select("id")
          .eq("partner_id", partnerId)
          .eq("event_type", "Birthday")
          .maybeSingle();

        if (existingBirthday) {
          toast.error("A birthday already exists for this person. Please edit the existing one.");
          return;
        }
      }

      // Update partner's birthdate field
      await supabase
        .from("partners")
        .update({ birthdate: parsedDate })
        .eq("id", partnerId);
    }

    const eventData = {
      title: title.trim(),
      event_date: parsedDate,
      event_type: eventType,
      description: description.trim() || null,
      partner_id: partnerId,
      user_id: session.user.id,
      is_recurring: eventType === "Birthday" ? true : isRecurring,
    };

    if (editingEvent) {
      const { error } = await supabase
        .from("events")
        .update(eventData)
        .eq("id", editingEvent.id);

      if (error) {
        toast.error("Failed to update event");
        return;
      }
      toast.success("Event updated");
    } else {
      const { error } = await supabase
        .from("events")
        .insert(eventData);

      if (error) {
        toast.error("Failed to create event");
        return;
      }
      toast.success("Event created");
    }

    resetForm();
    setIsDialogOpen(false);
    loadEvents();
  };

  const handleDelete = async (eventId: string) => {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (error) {
      toast.error("Failed to delete event");
      return;
    }

    toast.success("Event deleted");
    loadEvents();
  };

  const resetForm = () => {
    setTitle("");
    setEventType("Custom");
    setEventDate("");
    setDescription("");
    setIsRecurring(true);
    setEditingEvent(null);
  };

  const openEditDialog = (event: Event) => {
    setEditingEvent(event);
    setTitle(event.title);
    setEventType(event.event_type);
    setEventDate(formatDateForInput(event.event_date));
    setDescription(event.description || "");
    setIsRecurring(event.is_recurring);
    setIsDialogOpen(true);
  };

  // Helper to parse flexible date input (MM/DD or MM/DD/YYYY)
  const parseFlexibleDate = (input: string): string | null => {
    const trimmed = input.trim();
    
    // Try MM/DD/YYYY format
    const fullMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (fullMatch) {
      const [, month, day, year] = fullMatch;
      const m = month.padStart(2, '0');
      const d = day.padStart(2, '0');
      return `${year}-${m}-${d}`;
    }
    
    // Try MM/DD format (no year)
    const shortMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (shortMatch) {
      const [, month, day] = shortMatch;
      const m = month.padStart(2, '0');
      const d = day.padStart(2, '0');
      // Use 1900 as sentinel year for dates without year
      return `1900-${m}-${d}`;
    }
    
    return null;
  };

  // Helper to format date for input field
  const formatDateForInput = (dateStr: string): string => {
    const date = parseYMDToLocalDate(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // If year is 1900 (sentinel), show only MM/DD
    if (year === 1900) {
      return `${month}/${day}`;
    }
    return `${month}/${day}/${year}`;
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
        hasYear: originalDate.getFullYear() !== 1900,
      });
    }
    
    return occurrences;
  };

  // Helper to format event date for display
  const formatEventDate = (dateStr: string): string => {
    const date = parseYMDToLocalDate(dateStr);
    const year = date.getFullYear();
    
    // If year is 1900 (sentinel), show only month and day
    if (year === 1900) {
      return format(date, "MMMM d");
    }
    return format(date, "MMMM d, yyyy");
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
              <DialogTitle>{editingEvent ? "Edit Event" : "Add Event"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="eventType">Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypePresets.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., First Date"
                  data-testid="event-title-input"
                />
              </div>
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="text"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  placeholder="MM/DD or MM/DD/YYYY"
                  data-testid="event-date-input"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Year is optional (e.g., 09/30 or 09/30/1999)
                </p>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details..."
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="recurring">Yearly Recurring</Label>
                  <p className="text-xs text-muted-foreground">
                    Event repeats every year on this date
                  </p>
                </div>
                <Switch
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                  data-testid="event-recurrence-toggle"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingEvent ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            No events yet. Add your first event — like "Day we met" or "First kiss."
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <h4 className="font-medium">Upcoming Events (Next 6 Months)</h4>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events in the next 6 months.</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
                  >
                  <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{event.title}</span>
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
                        {formatEventDate(event.event_date)}
                      </p>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(event)}
                        disabled={event.event_type === "Birthday"}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(event.id)}
                        disabled={event.event_type === "Birthday"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">All Events</h4>
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 bg-card border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{event.title}</span>
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
                      {formatEventDate(event.event_date)}
                    </p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(event)}
                      disabled={event.event_type === "Birthday"}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(event.id)}
                      disabled={event.event_type === "Birthday"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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