import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { dateToYMDLocal } from "@/lib/utils";
import type { TimelineEntry } from "@/components/CherishedTimeline";

const EVENT_TYPE_PRESETS = [
  "Anniversary",
  "Day We Met",
  "First Kiss",
  "First 'I Love You'",
  "Special Trip",
  "Custom",
];

interface TimelineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "event" | "moment";
  editingEntry: TimelineEntry | null;
  partnerId: string;
  partnerName: string;
  onSaved: () => void;
}

export const TimelineItemDialog = ({
  open,
  onOpenChange,
  mode,
  editingEntry,
  partnerId,
  partnerName,
  onSaved,
}: TimelineItemDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [eventType, setEventType] = useState("Custom");
  const [isRecurring, setIsRecurring] = useState(true);

  useEffect(() => {
    if (open) {
      if (editingEntry) {
        setTitle(editingEntry.title);
        setDescription(editingEntry.description || "");
        setDate(editingEntry.date);
        setEventType(editingEntry.eventType || "Custom");
        setIsRecurring(editingEntry.isRecurring ?? true);
      } else {
        setTitle("");
        setDescription("");
        setDate(dateToYMDLocal(new Date()));
        setEventType("Custom");
        setIsRecurring(true);
      }
    }
  }, [open, editingEntry]);

  // Auto-populate title for new events
  useEffect(() => {
    if (!editingEntry && mode === "event" && eventType !== "Custom") {
      setTitle(eventType);
    }
  }, [eventType, editingEntry, mode]);

  const handleSave = async () => {
    if (!title.trim() || !date) {
      toast.error("Please fill in title and date");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (mode === "event") {
      const eventData = {
        title: title.trim(),
        event_date: date,
        event_type: eventType,
        description: description.trim() || null,
        partner_id: partnerId,
        user_id: session.user.id,
        is_recurring: isRecurring,
      };

      if (editingEntry) {
        const { error } = await supabase.from("events").update(eventData).eq("id", editingEntry.id);
        if (error) { toast.error("Failed to update event"); return; }
        toast.success("Event updated");
      } else {
        const { error } = await supabase.from("events").insert(eventData);
        if (error) { toast.error("Failed to create event"); return; }
        toast.success("Event created");
      }
    } else {
      const momentData = {
        title: title.trim(),
        moment_date: date,
        description: description.trim() || null,
        partner_ids: [partnerId],
        user_id: session.user.id,
      };

      if (editingEntry) {
        const { error } = await supabase.from("moments").update(momentData).eq("id", editingEntry.id);
        if (error) { toast.error("Failed to update memory"); return; }
        toast.success("Memory updated");
      } else {
        const { error } = await supabase.from("moments").insert(momentData);
        if (error) { toast.error("Failed to create memory"); return; }
        toast.success("Memory created");
      }
    }

    onOpenChange(false);
    onSaved();
  };

  const isEvent = mode === "event";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingEntry ? "Edit" : "Add"} {isEvent ? "Event" : "Memory"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isEvent && (
            <div>
              <Label>Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_PRESETS.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isEvent ? "e.g., First Date" : "e.g., Lazy Sunday"}
            />
          </div>
          <div>
            <Label>Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What made this special?"
              rows={3}
            />
          </div>
          {isEvent && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Yearly Recurring</Label>
                <p className="text-xs text-muted-foreground">Repeats every year</p>
              </div>
              <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingEntry ? "Update" : "Create"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
