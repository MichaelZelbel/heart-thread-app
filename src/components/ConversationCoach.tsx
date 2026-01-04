import { useState } from "react";
import { 
  Sparkles, 
  Send, 
  Heart,
  Feather,
  Target,
  Scissors,
  Smile,
  Copy,
  Check,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ConversationCoachProps {
  partnerName: string;
}

const PLACEHOLDER_RESPONSE = `I can see this is a delicate situation. Based on what you've shared, here's a thoughtful way to approach this conversation:

"Hey, I've been thinking about what happened, and I want you to know that I really value what we have. I realize I could have been more present lately, and I'm sorry if that made you feel overlooked. Can we find some time this weekend just for us?"

This opens the door without being defensive, acknowledges their feelings, and proposes a concrete next step.`;

const QUICK_ACTIONS = [
  { id: "softer", label: "Softer", icon: Feather, description: "Gentler tone" },
  { id: "clearer", label: "Clearer", icon: Target, description: "More direct" },
  { id: "shorter", label: "Shorter", icon: Scissors, description: "More concise" },
  { id: "playful", label: "More playful", icon: Smile, description: "Lighter mood" },
];

export const ConversationCoach = ({ partnerName }: ConversationCoachProps) => {
  const [context, setContext] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAskClaire = () => {
    setIsLoading(true);
    // Simulate AI response delay
    setTimeout(() => {
      setShowResponse(true);
      setIsLoading(false);
    }, 1200);
  };

  const handleQuickAction = (actionId: string) => {
    setActiveAction(actionId);
    setIsLoading(true);
    // Simulate refinement
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(PLACEHOLDER_RESPONSE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setContext("");
    setShowResponse(false);
    setActiveAction(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-border/50">
        <div className="p-2 rounded-full bg-primary/10">
          <Heart className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-medium text-sm">Message Coach</h3>
          <p className="text-xs text-muted-foreground">
            Get help crafting the right words for {partnerName}
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          Ephemeral
        </Badge>
      </div>

      {/* Main Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Context Input */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="context" className="text-sm font-medium flex items-center gap-2">
              Context
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              Paste recent messages or describe the situation. This is temporary context and is not saved.
            </p>
          </div>
          
          <Textarea
            id="context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={`e.g., "We had a small argument yesterday about plans for the weekend. They seemed distant this morning..."\n\nOr paste a recent text exchange...`}
            className="min-h-[200px] resize-none text-sm"
          />

          <div className="flex items-center gap-2">
            <Button 
              onClick={handleAskClaire}
              disabled={isLoading}
              className="flex-1 gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Coach me
                </>
              )}
            </Button>
            {showResponse && (
              <Button variant="outline" size="icon" onClick={handleReset}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground/70 text-center">
            Nothing you enter here is saved or stored
          </p>
        </div>

        {/* Right: Response Area */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {partnerName}&apos;s Claire
            </Label>
            {showResponse && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCopy}
                className="h-7 text-xs gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Response Container */}
          <div 
            className={cn(
              "min-h-[200px] rounded-lg border p-4 transition-all duration-300",
              showResponse 
                ? "bg-background border-primary/20" 
                : "bg-muted/30 border-dashed border-muted-foreground/20"
            )}
          >
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="relative">
                    <Sparkles className="w-8 h-8 text-primary/50 animate-pulse" />
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-ping" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Claire is thinking about {partnerName}...
                  </p>
                </div>
              </div>
            ) : showResponse ? (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {PLACEHOLDER_RESPONSE}
                </p>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div className="space-y-2 max-w-[200px]">
                  <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground/60">
                    Share some context and Claire will help you find the right words
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {showResponse && !isLoading && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Refine response</Label>
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.id}
                    variant={activeAction === action.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleQuickAction(action.id)}
                    className={cn(
                      "h-8 text-xs gap-1.5 transition-all",
                      activeAction === action.id && "ring-2 ring-primary/20"
                    )}
                  >
                    <action.icon className="w-3.5 h-3.5" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground/60 text-center">
          This is a safe space for drafting messages. Your context disappears when you leave this tab.
        </p>
      </div>
    </div>
  );
};
