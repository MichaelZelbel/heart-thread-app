import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  description: string | null;
}

interface EventManagerProps {
  partnerId: string;
  partnerName: string;
}

const eventTypePresets = [
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

  useEffect(() => {
    loadEvents();
  }, [partnerId]);

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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const eventData = {
      title: title.trim(),
      event_date: eventDate,
      event_type: eventType,
      description: description.trim() || null,
      partner_id: partnerId,
      user_id: session.user.id,
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
    setEditingEvent(null);
  };

  const openEditDialog = (event: Event) => {
    setEditingEvent(event);
    setTitle(event.title);
    setEventType(event.event_type);
    setEventDate(event.event_date);
    setDescription(event.description || "");
    setIsDialogOpen(true);
  };

  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.event_date);
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    return eventDate >= new Date() && eventDate <= sixMonthsFromNow;
  });

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading events...</div>;
  }

  return (
    <div className="space-y-6">
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
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add milestone
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edit Event" : "Add Milestone"}</DialogTitle>
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
                />
              </div>
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
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
            No events yet. Add your first milestone — like "Day we met" or "First kiss."
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
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{event.title}</span>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {event.event_type}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.event_date), "MMMM d, yyyy")}
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
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{event.title}</span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {event.event_type}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.event_date), "MMMM d, yyyy")}
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