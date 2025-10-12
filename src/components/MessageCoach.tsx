import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Info, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClaireChat } from "./ClaireChat";

interface MessageCoachProps {
  partnerId: string;
  partnerName: string;
}

const TONE_PRESETS = [
  { label: "Loving", value: "loving" },
  { label: "Calm", value: "calm" },
  { label: "Flirty", value: "flirty" },
  { label: "Thoughtful", value: "thoughtful" },
  { label: "Sincere", value: "sincere" }
];

export const MessageCoach = ({ partnerId, partnerName }: MessageCoachProps) => {
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [presetTone, setPresetTone] = useState("");
  const [customTone, setCustomTone] = useState("");
  const [useDefaultTone, setUseDefaultTone] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

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
        .select("message_coach_transcript, message_coach_notes, message_coach_preset_tone, message_coach_custom_tone, message_coach_use_default_tone, message_coach_updated_at")
        .eq("id", partnerId)
        .single();

      if (error) throw error;

      if (data) {
        setTranscript(data.message_coach_transcript || "");
        setNotes(data.message_coach_notes || "");
        setPresetTone(data.message_coach_preset_tone || "");
        setCustomTone(data.message_coach_custom_tone || "");
        setUseDefaultTone(data.message_coach_use_default_tone || false);
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
    useDefaultTone?: boolean;
  }) => {
    try {
      const updateData: any = {
        message_coach_updated_at: new Date().toISOString()
      };

      if (dataToSave.transcript !== undefined) {
        if (dataToSave.transcript.length > 3000) {
          toast.error("Transcript exceeds 3,000 character limit");
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
      if (dataToSave.useDefaultTone !== undefined) updateData.message_coach_use_default_tone = dataToSave.useDefaultTone;

      const { error } = await supabase
        .from("partners")
        .update(updateData)
        .eq("id", partnerId);

      if (error) throw error;

      setLastUpdated(new Date());
      toast.success("Saved");
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
    return <div className="p-4 text-center text-muted-foreground">Loading message coach...</div>;
  }

  const isEmpty = !transcript && !notes;

  return (
    <div className="space-y-4">
      {/* Privacy notice */}
      <Card className="bg-muted/50 border-primary/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex gap-2 items-start">
            <Info className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong>Private by design:</strong> These fields are saved to {partnerName} only and are used here to help craft replies. They are not added to your global memory.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left column: Text inputs */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="transcript">Recent Conversation or Reflection</Label>
            <Textarea
              id="transcript"
              value={transcript}
              onChange={(e) => {
                const newValue = e.target.value.slice(0, 3000);
                setTranscript(newValue);
                debouncedSave({ transcript: newValue });
              }}
              placeholder="Paste a chat excerpt, diary note, or anything you want help replying to…"
              className="min-h-[200px] resize-none"
              maxLength={3000}
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                Saved to {partnerName} only. Not included in your global memory.
              </p>
              <p className="text-xs text-muted-foreground">
                {transcript.length} / 3,000
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Your Notes or Intent</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => {
                const newValue = e.target.value.slice(0, 800);
                setNotes(newValue);
                debouncedSave({ notes: newValue });
              }}
              placeholder="What do you want to express? Any constraints or do/don't?"
              className="min-h-[120px] resize-none"
              maxLength={800}
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                Saved to {partnerName} only.
              </p>
              <p className="text-xs text-muted-foreground">
                {notes.length} / 800
              </p>
            </div>
          </div>

          {lastUpdated && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last updated: {formatLastUpdated()}</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-xs">
                    <X className="w-3 h-3 mr-1" />
                    Clear both fields
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear both fields?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the transcript and notes for {partnerName}'s Message Coach. This action cannot be undone.
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

        {/* Right column: Claire chat + tone controls */}
        <div className="space-y-4">
          <div className="h-[400px]">
            <ClaireChat 
              partnerId={partnerId}
              compact={false}
              messageCoachContext={{
                transcript,
                notes,
                presetTone,
                customTone,
                useDefaultTone
              }}
            />
          </div>

          <Card>
            <CardContent className="pt-4 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Quick Tone</Label>
                <div className="flex flex-wrap gap-2">
                  {TONE_PRESETS.map((tone) => (
                    <Button
                      key={tone.value}
                      variant={presetTone === tone.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setPresetTone(tone.value);
                        saveMessageCoachData({ presetTone: tone.value });
                      }}
                      disabled={useDefaultTone}
                    >
                      {tone.label}
                    </Button>
                  ))}
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
                  placeholder="e.g., like George Clooney — confident, warm, simple words, never needy"
                  disabled={useDefaultTone}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="useDefaultTone"
                  checked={useDefaultTone}
                  onCheckedChange={(checked) => {
                    setUseDefaultTone(checked);
                    saveMessageCoachData({ useDefaultTone: checked });
                  }}
                />
                <Label htmlFor="useDefaultTone" className="text-sm font-normal cursor-pointer">
                  Use my default tone
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {isEmpty && (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-6 pb-5 text-center">
            <p className="text-sm text-muted-foreground">
              Paste a snippet or write a short note to begin.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};