import { useState } from "react";
import { 
  Heart, 
  Calendar, 
  Star, 
  Camera, 
  MessageCircle, 
  Sparkles,
  MapPin,
  Gift,
  Cake,
  Plane,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface TimelineItem {
  id: string;
  type: "milestone" | "event" | "moment" | "note";
  title: string;
  date: string;
  description?: string;
  icon: React.ReactNode;
  highlight?: boolean;
  photoPlaceholder?: boolean;
}

interface CherishedTimelineProps {
  partnerName: string;
  onAskClaire?: (context: string) => void;
}

const PLACEHOLDER_TIMELINE: TimelineItem[] = [
  {
    id: "1",
    type: "milestone",
    title: "First Met",
    date: "March 15, 2021",
    description: "At the coffee shop downtown. You were reading that book I loved.",
    icon: <Heart className="w-4 h-4" />,
    highlight: true,
  },
  {
    id: "2",
    type: "moment",
    title: "First Road Trip Together",
    date: "June 22, 2021",
    description: "Drove up the coast. Sang badly to 80s music. Perfect day.",
    icon: <Camera className="w-4 h-4" />,
    photoPlaceholder: true,
  },
  {
    id: "3",
    type: "event",
    title: "Birthday Celebration",
    date: "August 10, 2021",
    description: "Surprised you with that vintage record player.",
    icon: <Cake className="w-4 h-4" />,
  },
  {
    id: "4",
    type: "milestone",
    title: "Said 'I Love You'",
    date: "September 3, 2021",
    description: "Under the stars at the park. My heart was racing.",
    icon: <Star className="w-4 h-4" />,
    highlight: true,
  },
  {
    id: "5",
    type: "note",
    title: "A Quiet Reflection",
    date: "October 15, 2021",
    description: "Realized today how much lighter everything feels with you in my life.",
    icon: <MessageCircle className="w-4 h-4" />,
  },
  {
    id: "6",
    type: "event",
    title: "Trip to Paris",
    date: "December 20, 2021",
    description: "Our first international trip. The Eiffel Tower at sunset.",
    icon: <Plane className="w-4 h-4" />,
    photoPlaceholder: true,
  },
  {
    id: "7",
    type: "milestone",
    title: "One Year Anniversary",
    date: "March 15, 2022",
    description: "Back to where it all began. Same coffee shop, new us.",
    icon: <Gift className="w-4 h-4" />,
    highlight: true,
  },
  {
    id: "8",
    type: "moment",
    title: "Lazy Sunday",
    date: "April 8, 2022",
    description: "Made pancakes. Watched old movies. Nothing special, everything perfect.",
    icon: <Camera className="w-4 h-4" />,
  },
  {
    id: "9",
    type: "event",
    title: "Met Your Family",
    date: "May 28, 2022",
    description: "Nervous but worth it. Your mom's cooking is incredible.",
    icon: <MapPin className="w-4 h-4" />,
  },
  {
    id: "10",
    type: "milestone",
    title: "Moved In Together",
    date: "August 1, 2022",
    description: "Our little place. Still unpacking memories.",
    icon: <Heart className="w-4 h-4" />,
    highlight: true,
  },
];

const getTypeColor = (type: TimelineItem["type"]) => {
  switch (type) {
    case "milestone":
      return "bg-primary text-primary-foreground";
    case "event":
      return "bg-accent text-accent-foreground";
    case "moment":
      return "bg-secondary text-secondary-foreground";
    case "note":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getTypeLabel = (type: TimelineItem["type"]) => {
  switch (type) {
    case "milestone":
      return "Milestone";
    case "event":
      return "Event";
    case "moment":
      return "Memory";
    case "note":
      return "Note";
    default:
      return type;
  }
};

export const CherishedTimeline = ({ partnerName, onAskClaire }: CherishedTimelineProps) => {
  const [viewMode, setViewMode] = useState<string>("detailed");

  const handleAskAboutItem = (item: TimelineItem) => {
    const contextSummary = `I want to reflect on "${item.title}" from ${item.date}. ${item.description || ""}`;
    onAskClaire?.(contextSummary);
  };

  const filteredItems = viewMode === "milestones" 
    ? PLACEHOLDER_TIMELINE.filter(item => item.type === "milestone")
    : PLACEHOLDER_TIMELINE;

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">
            {filteredItems.length} moments in your story
          </span>
        </div>
        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(value) => value && setViewMode(value)}
          className="bg-muted/50 p-1 rounded-lg"
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
      </div>

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

      {/* Timeline Feed */}
      {viewMode !== "ai-summary" && (
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-primary/30 via-primary/20 to-transparent" />
          
          {/* Timeline Items */}
          <div className="space-y-1">
            {filteredItems.map((item, index) => (
              <div 
                key={item.id} 
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
                    item.highlight 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.highlight && (
                    <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
                  )}
                  <span className="relative z-10 scale-75">
                    {item.icon}
                  </span>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={cn(
                          "font-medium",
                          item.highlight && "text-primary"
                        )}>
                          {item.title}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] px-1.5 py-0 font-normal",
                            item.type === "milestone" && "border-primary/30 text-primary"
                          )}
                        >
                          {getTypeLabel(item.type)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.date}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* Photo Placeholder */}
                  {item.photoPlaceholder && (
                    <div className="mt-3 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/20 p-6 flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="w-6 h-6 mx-auto text-muted-foreground/40 mb-1" />
                        <span className="text-xs text-muted-foreground/60">Photo memory</span>
                      </div>
                    </div>
                  )}

                  {/* Ask Claire Action */}
                  {onAskClaire && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAskAboutItem(item)}
                      className="mt-2 h-7 text-xs gap-1.5 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Ask Claire about this
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Timeline End */}
          <div className="relative pl-14 pt-4">
            <div className="absolute left-4 w-5 h-5 rounded-full bg-gradient-to-b from-primary/20 to-transparent flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary/30" />
            </div>
            <p className="text-xs text-muted-foreground italic">
              Your story continues...
            </p>
          </div>
        </div>
      )}

      {/* Empty State for Milestones */}
      {viewMode === "milestones" && filteredItems.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Star className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <h3 className="font-medium text-lg mb-2">No Milestones Yet</h3>
            <p className="text-muted-foreground text-sm">
              Mark special moments as milestones to see them here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
