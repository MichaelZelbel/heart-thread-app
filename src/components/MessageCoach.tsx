import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Heart, Waves, Sparkles, Brain, Shield, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClaireChat } from "./ClaireChat";

interface MessageCoachProps {
  partnerId: string;
  partnerName: string;
  initialContext?: string;
}

const TONE_PRESETS = [
  { label: "Loving", value: "loving", icon: Heart },
  { label: "Calm", value: "calm", icon: Waves },
  { label: "Flirty", value: "flirty", icon: Sparkles },
  { label: "Thoughtful", value: "thoughtful", icon: Brain },
  { label: "Sincere", value: "sincere", icon: Shield }
];

export const MessageCoach = ({ partnerId, partnerName, initialContext = "" }: MessageCoachProps) => {
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [presetTone, setPresetTone] = useState("");
  const [customTone, setCustomTone] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [contextFromTimeline, setContextFromTimeline] = useState("");
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Update context when initialContext changes (from timeline navigation)
  useEffect(() => {
    if (initialContext && initialContext !== contextFromTimeline) {
      setTranscript(prev => initialContext + (prev ? "\n\n" + prev : ""));
      setContextFromTimeline(initialContext);
    }
  }, [initialContext, contextFromTimeline]);

  useEffect(() => {
    loadMessageCoachData();
  }, [partnerId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const loadMessageCoachData = async () => {
    try {
      const { data, error } = await supabase
        .from("partners")
        .select("message_coach_transcript, message_coach_notes, message_coach_preset_tone, message_coach_custom_tone, message_coach_updated_at")
        .eq("id", partnerId)
        .single();

      if (error) throw error;

      if (data) {
        setTranscript(data.message_coach_transcript || "");
        setNotes(data.message_coach_notes || "");
        setPresetTone(data.message_coach_preset_tone || "");
        setCustomTone(data.message_coach_custom_tone || "");
        setLastUpdated(data.message_coach_updated_at ? new Date(data.message_coach_updated_at) : null);
      }
    } catch (error) {
      console.error("Error loading message coach data:", error);
      toast.error("Failed to load message coach data");
    } finally {
      setLoading(false);
    }
  };

  const saveMessageCoachData = useCallback(async (dataToSave: {
    transcript?: string;
    notes?: string;
    presetTone?: string;
    customTone?: string;
  }, showToast = false) => {
    try {
      const updateData: any = {
        message_coach_updated_at: new Date().toISOString()
      };

      if (dataToSave.transcript !== undefined) {
        if (dataToSave.transcript.length > 5000) {
          toast.error("Transcript exceeds 5,000 character limit");
          return;
        }
        updateData.message_coach_transcript = dataToSave.transcript;
      }

      if (dataToSave.notes !== undefined) {
        if (dataToSave.notes.length > 800) {
          toast.error("Notes exceed 800 character limit");
          return;
        }
        updateData.message_coach_notes = dataToSave.notes;
      }

      if (dataToSave.presetTone !== undefined) updateData.message_coach_preset_tone = dataToSave.presetTone;
      if (dataToSave.customTone !== undefined) updateData.message_coach_custom_tone = dataToSave.customTone;

      const { error } = await supabase
        .from("partners")
        .update(updateData)
        .eq("id", partnerId);

      if (error) throw error;

      setLastUpdated(new Date());
      if (showToast) {
        toast.success("Saved");
      }
    } catch (error) {
      console.error("Error saving message coach data:", error);
      toast.error("Failed to save");
    }
  }, [partnerId]);

  const debouncedSave = useCallback((dataToSave: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveMessageCoachData(dataToSave);
    }, 1000);
  }, [saveMessageCoachData]);

  const handleClearFields = async () => {
    try {
      await supabase
        .from("partners")
        .update({
          message_coach_transcript: null,
          message_coach_notes: null,
          message_coach_updated_at: null
        })
        .eq("id", partnerId);

      setTranscript("");
      setNotes("");
      setLastUpdated(null);
      toast.success("Fields cleared");
    } catch (error) {
      console.error("Error clearing fields:", error);
      toast.error("Failed to clear fields");
    }
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return "";
    return lastUpdated.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left column: Context + Intent */}
        <div className="space-y-4">
          {/* Context (optional) */}
          <div>
            <Label htmlFor="transcript" className="flex items-center gap-2">
              Context
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              Paste recent messages or describe the situation if helpful.
            </p>
            <Textarea
              id="transcript"
              value={transcript}
              onChange={(e) => {
                const newValue = e.target.value.slice(0, 5000);
                setTranscript(newValue);
                debouncedSave({ transcript: newValue });
              }}
              onBlur={(e) => {
                if (saveTimeoutRef.current) {
                  clearTimeout(saveTimeoutRef.current);
                }
                saveMessageCoachData({ transcript: e.target.value }, true);
              }}
              placeholder="Paste a chat excerpt, diary note, or describe what's happening..."
              className="min-h-[280px] resize-none"
              maxLength={5000}
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                Saved to {partnerName} only
              </p>
              <p className="text-xs text-muted-foreground">
                {transcript.length} / 5,000
              </p>
            </div>
          </div>

          {/* Intent */}
          <div>
            <Label htmlFor="notes" className="flex items-center gap-2">
              Your Intent
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => {
                const newValue = e.target.value.slice(0, 800);
                setNotes(newValue);
                debouncedSave({ notes: newValue });
              }}
              onBlur={(e) => {
                if (saveTimeoutRef.current) {
                  clearTimeout(saveTimeoutRef.current);
                }
                saveMessageCoachData({ notes: e.target.value }, true);
              }}
              placeholder="What do you want to express or achieve?"
              className="min-h-[100px] resize-none"
              maxLength={800}
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                Saved to {partnerName} only
              </p>
              <p className="text-xs text-muted-foreground">
                {notes.length} / 800
              </p>
            </div>
          </div>

          {/* Tone Controls */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Quick Tone</Label>
                <div className="flex flex-wrap gap-2">
                  {TONE_PRESETS.map((tone) => {
                    const Icon = tone.icon;
                    return (
                      <Button
                        key={tone.value}
                        variant={presetTone === tone.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const newTone = presetTone === tone.value ? "" : tone.value;
                          setPresetTone(newTone);
                          saveMessageCoachData({ presetTone: newTone });
                        }}
                      >
                        <Icon className="w-4 h-4 mr-1" />
                        {tone.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="customTone">Describe your tone</Label>
                <Input
                  id="customTone"
                  value={customTone}
                  onChange={(e) => {
                    setCustomTone(e.target.value);
                    debouncedSave({ customTone: e.target.value });
                  }}
                  onBlur={(e) => {
                    if (saveTimeoutRef.current) {
                      clearTimeout(saveTimeoutRef.current);
                    }
                    saveMessageCoachData({ customTone: e.target.value }, true);
                  }}
                  placeholder="e.g., confident, warm, simple words"
                />
              </div>
            </CardContent>
          </Card>

          {lastUpdated && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last updated: {formatLastUpdated()}</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-xs">
                    <X className="w-3 h-3 mr-1" />
                    Clear fields
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear context and intent?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the context and intent for {partnerName}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearFields}>Clear</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Right column: Claire chat */}
        <div className="space-y-4">
          <div className="h-[600px]">
            <ClaireChat 
              partnerId={partnerId}
              partnerName={partnerName}
              compact={false}
              messageCoachContext={{
                transcript,
                notes,
                presetTone,
                customTone
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};