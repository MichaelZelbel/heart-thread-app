import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, RefreshCw, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAICreditsGate } from "@/hooks/useAICreditsGate";

interface ActivitySuggestionProps {
  partnerId?: string;
  onOpenClaire?: (prefillMessage: string) => void;
  hasPartners: boolean;
  onAddPartner: () => void;
  isPro: boolean;
}

export const ActivitySuggestion = ({ 
  partnerId, 
  onOpenClaire, 
  hasPartners, 
  onAddPartner,
  isPro 
}: ActivitySuggestionProps) => {
  const [suggestion, setSuggestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { checkCredits, refetchCredits } = useAICreditsGate();

  const generateSuggestion = async () => {
    if (!hasPartners) return;
    if (!checkCredits()) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-activity', {
        body: {
          partnerId,
          nowIso: new Date().toISOString(),
          nowReadable: new Date().toLocaleString()
        }
      });

      if (error) throw error;
      
      if (data?.suggestion) {
        setSuggestion(data.suggestion);
        // Update credits display after successful AI call
        refetchCredits();
      }
    } catch (error: any) {
      console.error('Error generating suggestion:', error);
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        toast.error("Too many requests. Please try again in a moment.");
      } else if (error.message?.includes('402') || error.message?.includes('credits')) {
        toast.error("AI credits exhausted. Please add credits to continue.");
      } else {
        toast.error("Couldn't generate a suggestion right now. Try again?");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryThis = () => {
    if (onOpenClaire && suggestion) {
      const prefillMessage = `I got this activity idea: "${suggestion}". Can you help me plan this or make it even better?`;
      onOpenClaire(prefillMessage);
    }
  };

  // Auto-load on mount if has partners
  useState(() => {
    if (hasPartners && !suggestion) {
      generateSuggestion();
    }
  });

  if (!hasPartners) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-primary" />
            <span>Maybe This? 💕</span>
          </CardTitle>
          <CardDescription>Just a little idea—take it or twist it your way.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              Add someone special first 💕 and I'll have sweet ideas ready for you.
            </p>
            <Button onClick={onAddPartner} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Cherished
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Heart className="w-5 h-5 text-primary" />
          <span>Maybe This? 💕</span>
        </CardTitle>
        <CardDescription>Just a little idea—take it or twist it your way.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-6 text-center">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Thinking of something lovely...</p>
            </div>
          ) : suggestion ? (
            <>
              <p className="text-base leading-relaxed">
                {suggestion}
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={generateSuggestion} 
                  variant="outline" 
                  size="sm"
                  className="touch-target"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Another Idea
                </Button>
                {isPro && onOpenClaire && (
                  <Button 
                    onClick={handleTryThis} 
                    size="sm"
                    className="touch-target"
                  >
                    💗 Try This
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
                Send a one-line note about something you appreciate today 💌
              </p>
              <Button onClick={generateSuggestion} variant="outline" size="sm">
                Get an Idea
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
