import { useState, useEffect } from "react";
import {
  Heart,
  Calendar,
  Star,
  Camera,
  Sparkles,
  Gift,
  Cake,
  Plane,
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { parseYMDToLocalDate } from "@/lib/utils";
import { TimelineItemDialog } from "@/components/timeline/TimelineItemDialog";

export interface TimelineEntry {
  id: string;
  type: "milestone" | "event" | "moment";
  title: string;
  date: string; // YYYY-MM-DD
  description?: string | null;
  eventType?: string | null;
  isCelebratedAnnually?: boolean;
}

interface CherishedTimelineProps {
  partnerId: string;
  partnerName: string;
  onAskClaire?: (context: string) => void;
}

const EVENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  Birthday: <Cake className="w-4 h-4" />,
  Anniversary: <Gift className="w-4 h-4" />,
  "Day We Met": <Heart className="w-4 h-4" />,
  "First Kiss": <Heart className="w-4 h-4" />,
  "First 'I Love You'": <Star className="w-4 h-4" />,
  "Special Trip": <Plane className="w-4 h-4" />,
};

const MILESTONE_TYPES = ["Birthday", "Anniversary", "Day We Met", "First Kiss", "First 'I Love You'"];

const getIcon = (entry: TimelineEntry) => {
  if (entry.eventType) {
    return EVENT_TYPE_ICONS[entry.eventType] || <Calendar className="w-4 h-4" />;
  }
  return <Camera className="w-4 h-4" />;
};

const isMilestone = (entry: TimelineEntry) => {
  return entry.eventType && MILESTONE_TYPES.includes(entry.eventType);
};

const getTypeLabel = (entry: TimelineEntry) => {
  return entry.eventType || "Moment";
};

const getTypeColor = (entry: TimelineEntry) => {
  if (isMilestone(entry)) return "bg-primary text-primary-foreground";
  if (entry.eventType) return "bg-accent text-accent-foreground";
  return "bg-secondary text-secondary-foreground";
};

const formatDisplayDate = (dateStr: string): string => {
  const date = parseYMDToLocalDate(dateStr);
  if (date.getFullYear() === 1900) {
    return format(date, "MMMM d");
  }
  return format(date, "MMMM d, yyyy");
};

export const CherishedTimeline = ({ partnerId, partnerName, onAskClaire }: CherishedTimelineProps) => {
  const [viewMode, setViewMode] = useState<string>("detailed");
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimelineEntry | null>(null);

  useEffect(() => {
    loadTimeline();
  }, [partnerId]);

  const loadTimeline = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("moments")
      .select("*")
      .eq("user_id", session.user.id)
      .contains("partner_ids", [partnerId])
      .is("deleted_at", null)
      .order("moment_date", { ascending: false });

    if (error) {
      toast.error("Failed to load timeline");
      setLoading(false);
      return;
    }

    const mapped: TimelineEntry[] = (data || []).map((m) => ({
      id: m.id,
      type: (m.event_type && MILESTONE_TYPES.includes(m.event_type) ? "milestone" : "moment") as TimelineEntry["type"],
      title: m.title,
      date: m.moment_date,
      description: m.description,
      eventType: m.event_type,
      isCelebratedAnnually: m.is_celebrated_annually,
    }));

    setEntries(mapped);
    setLoading(false);
  };

  const handleDelete = async (entry: TimelineEntry) => {
    if (!confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;

    const { error } = await supabase.from("moments").delete().eq("id", entry.id);

    if (error) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Deleted");
    loadTimeline();
  };

  const handleEdit = (entry: TimelineEntry) => {
    setEditingEntry(entry);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingEntry(null);
    setDialogOpen(true);
  };

  const handleAskAboutItem = (entry: TimelineEntry) => {
    const contextSummary = `I want to reflect on "${entry.title}" from ${formatDisplayDate(entry.date)}. ${entry.description || ""}`;
    onAskClaire?.(contextSummary);
  };

  const filteredEntries = viewMode === "milestones"
    ? entries.filter(isMilestone)
    : entries;

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading timeline...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">
            {filteredEntries.length} moments in your story
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Add Moment
        </Button>
      </div>

      {/* View Toggle */}
      <ToggleGroup
        type="single"
        value={viewMode}
        onValueChange={(value) => value && setViewMode(value)}
        className="bg-muted/50 p-1 rounded-lg w-fit"
      >
        <ToggleGroupItem
          value="milestones"
          aria-label="Milestones only"
          className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm"
        >
          <Star className="w-3.5 h-3.5 mr-1.5" />
          Milestones
        </ToggleGroupItem>
        <ToggleGroupItem
          value="detailed"
          aria-label="Detailed view"
          className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm"
        >
          <Calendar className="w-3.5 h-3.5 mr-1.5" />
          Detailed
        </ToggleGroupItem>
        <ToggleGroupItem
          value="ai-summary"
          aria-label="AI Summary"
          className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          AI Summary
        </ToggleGroupItem>
      </ToggleGroup>

      {/* AI Summary Placeholder */}
      {viewMode === "ai-summary" && (
        <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
          <CardContent className="py-8 text-center">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary/50" />
            <h3 className="font-medium text-lg mb-2">AI-Powered Story Summary</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Coming soon: A beautiful narrative of your journey with {partnerName},
              highlighting the moments that matter most.
            </p>
            <Badge variant="secondary" className="mt-4">
              Pro Feature
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {viewMode !== "ai-summary" && filteredEntries.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Heart className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <h3 className="font-medium text-lg mb-2">
              {viewMode === "milestones" ? "No Milestones Yet" : "Your Story Starts Here"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {viewMode === "milestones"
                ? "Add milestone moments like birthdays, anniversaries, or the day you met."
                : `Add moments to build your timeline with ${partnerName}.`}
            </p>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-1" /> Add Moment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Timeline Feed */}
      {viewMode !== "ai-summary" && filteredEntries.length > 0 && (
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-primary/30 via-primary/20 to-transparent" />

          <div className="space-y-1">
            {filteredEntries.map((entry) => {
              const highlight = isMilestone(entry);
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "relative pl-14 py-4 group",
                    "transition-all duration-200 ease-out",
                    "hover:bg-muted/30 rounded-lg -ml-2 px-2 pl-16"
                  )}
                >
                  {/* Timeline Node */}
                  <div
                    className={cn(
                      "absolute left-4 w-5 h-5 rounded-full flex items-center justify-center",
                      "ring-4 ring-background transition-transform group-hover:scale-110",
                      highlight
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {highlight && (
                      <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
                    )}
                    <span className="relative z-10 scale-75">{getIcon(entry)}</span>
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={cn("font-medium", highlight && "text-primary")}>
                            {entry.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 font-normal",
                              highlight && "border-primary/30 text-primary"
                            )}
                          >
                            {getTypeLabel(entry)}
                          </Badge>
                          {entry.isCelebratedAnnually && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                              Yearly
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDisplayDate(entry.date)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEdit(entry)}
                          disabled={entry.eventType === "Birthday"}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(entry)}
                          disabled={entry.eventType === "Birthday"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {entry.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {entry.description}
                      </p>
                    )}

                    {onAskClaire && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAskAboutItem(entry)}
                        className="mt-2 h-7 text-xs gap-1.5 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Ask Claire about this
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timeline End */}
          <div className="relative pl-14 pt-4">
            <div className="absolute left-4 w-5 h-5 rounded-full bg-gradient-to-b from-primary/20 to-transparent flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary/30" />
            </div>
            <p className="text-xs text-muted-foreground italic">Your story continues...</p>
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <TimelineItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingEntry={editingEntry}
        partnerId={partnerId}
        partnerName={partnerName}
        onSaved={loadTimeline}
      />
    </div>
  );
};
