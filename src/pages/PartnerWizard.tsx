import { useState, useEffect } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save, Loader2, Plus, X } from "lucide-react";
import { LoveLanguageHeartRatings } from "@/components/LoveLanguageHeartRatings";
import cherishlyLogo from "@/assets/cherishly-logo.png";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const days = Array.from({ length: 31 }, (_, i) => i + 1);
const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
const PartnerWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const totalSteps = 4;

  // Form state
  const [nickname, setNickname] = useState("");
  const [specialDay, setSpecialDay] = useState({
    day: null as number | null,
    month: null as number | null,
    year: null as number | null,
    eventType: "Birthday",
    customEventType: ""
  });
  const [likes, setLikes] = useState<string[]>([]);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [loveLanguages, setLoveLanguages] = useState({
    physical: 3,
    words: 3,
    quality: 3,
    acts: 3,
    gifts: 3
  });
  const [notes, setNotes] = useState("");
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };
  const handleNext = () => {
    if (currentStep === 1 && !nickname.trim()) {
      toast.error("Please enter a nickname");
      return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate("/dashboard");
    }
  };
  const handleSave = async () => {
    if (!nickname.trim()) {
      toast.error("Nickname is required");
      return;
    }
    setLoading(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Determine birthdate if creating a Birthday event
      let birthdate = null;
      if (specialDay.day && specialDay.month) {
        const eventType = specialDay.eventType === "Custom..." 
          ? specialDay.customEventType 
          : specialDay.eventType;
        
        if (eventType === "Birthday") {
          const eventDate = new Date(
            specialDay.year || new Date().getFullYear(),
            specialDay.month,
            specialDay.day
          );
          birthdate = eventDate.toISOString().split('T')[0];
        }
      }

      // Create partner profile
      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .insert({
          user_id: session.user.id,
          name: nickname.trim(),
          love_language_physical: loveLanguages.physical,
          love_language_words: loveLanguages.words,
          love_language_quality: loveLanguages.quality,
          love_language_acts: loveLanguages.acts,
          love_language_gifts: loveLanguages.gifts,
          birthdate: birthdate,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (partnerError) throw partnerError;

      // Create event if date is provided
      if (specialDay.day && specialDay.month) {
        const eventDate = new Date(
          specialDay.year || new Date().getFullYear(),
          specialDay.month,
          specialDay.day
        );
        
        const eventType = specialDay.eventType === "Custom..." 
          ? specialDay.customEventType 
          : specialDay.eventType;

        await supabase.from("events").insert({
          user_id: session.user.id,
          partner_id: partner.id,
          event_date: eventDate.toISOString().split('T')[0],
          event_type: eventType || "custom",
          title: eventType || "Special Day",
          is_recurring: true,
        });
      }

      // Add likes
      if (likes.length > 0) {
        const likesData = likes.map((like, index) => ({
          partner_id: partner.id,
          item: like,
          position: index,
        }));
        await supabase.from("partner_likes").insert(likesData);
      }

      // Add dislikes
      if (dislikes.length > 0) {
        const dislikesData = dislikes.map((dislike, index) => ({
          partner_id: partner.id,
          item: dislike,
          position: index,
        }));
        await supabase.from("partner_dislikes").insert(dislikesData);
      }

      toast.success(`${nickname} added to your cherished!`);
      navigate(`/partner/${partner.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = (field: 'likes' | 'dislikes', value: string) => {
    if (!value.trim()) return;
    if (field === 'likes') {
      setLikes([...likes, value.trim()]);
    } else {
      setDislikes([...dislikes, value.trim()]);
    }
  };

  const removeItem = (field: 'likes' | 'dislikes', index: number) => {
    if (field === 'likes') {
      setLikes(likes.filter((_, i) => i !== index));
    } else {
      setDislikes(dislikes.filter((_, i) => i !== index));
    }
  };
  const progress = currentStep / totalSteps * 100;
  return <><SEOHead title="Add a Cherished | Cherishly" noIndex />
    <div className="min-h-screen bg-gradient-soft">
      <nav className="bg-card border-b border-border shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={cherishlyLogo} alt="Cherishly logo" className="w-10 h-10" />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">CHERISHLY</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            Cancel
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">Add a New Cherished</h1>
          <p className="text-muted-foreground mb-4">
            Let's capture what makes this relationship special
          </p>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        <Card className="shadow-soft animate-scale-in">
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Who do you cherish?"}
              {currentStep === 2 && "Do they have a special day?"}
              {currentStep === 3 && "Tell us what makes them light up"}
              {currentStep === 4 && "Notes & Memories"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Start simple — what do you call them?"}
              {currentStep === 2 && "Cherish the moments that matter — birthdays, anniversaries, or first 'I love you's."}
              {currentStep === 3 && "Share what they love, what they dislike, and how they receive love best."}
              {currentStep === 4 && "These notes are completely private and secure"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Nickname */}
            {currentStep === 1 && (
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname</Label>
                <Input
                  id="nickname"
                  placeholder="Sweetie, Alex, Mom..."
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  autoFocus
                  data-testid="what-do-you-call-them"
                />
              </div>
            )}

            {/* Step 2: Special Day */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select
                    value={specialDay.eventType}
                    onValueChange={(val) => setSpecialDay({ ...specialDay, eventType: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Birthday">Birthday</SelectItem>
                      <SelectItem value="Anniversary">Anniversary</SelectItem>
                      <SelectItem value="Day We Met">Day We Met</SelectItem>
                      <SelectItem value="First 'I Love You'">First 'I Love You'</SelectItem>
                      <SelectItem value="Special Day">Special Day</SelectItem>
                      <SelectItem value="Custom...">Custom...</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {specialDay.eventType === "Custom..." && (
                    <Input
                      placeholder="Enter custom event name"
                      value={specialDay.customEventType || ""}
                      onChange={(e) => setSpecialDay({ ...specialDay, customEventType: e.target.value })}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={specialDay.month?.toString()}
                      onValueChange={(val) => setSpecialDay({ ...specialDay, month: parseInt(val) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((m, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={specialDay.day?.toString()}
                      onValueChange={(val) => setSpecialDay({ ...specialDay, day: parseInt(val) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Day" />
                      </SelectTrigger>
                      <SelectContent>
                        {days.map((d) => (
                          <SelectItem key={d} value={d.toString()}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={specialDay.year?.toString() || "none"}
                      onValueChange={(val) => setSpecialDay({ ...specialDay, year: val === "none" ? null : parseInt(val) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Year (opt)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No year</SelectItem>
                        {years.map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Likes */}
                <DetailSection
                  title="Things they love"
                  placeholder="e.g., Chocolate cake"
                  items={likes}
                  onAdd={(value) => addItem('likes', value)}
                  onRemove={(index) => removeItem('likes', index)}
                />

                {/* Dislikes */}
                <DetailSection
                  title="Things they dislike"
                  placeholder="e.g., Loud noises"
                  items={dislikes}
                  onAdd={(value) => addItem('dislikes', value)}
                  onRemove={(index) => removeItem('dislikes', index)}
                />

                {/* Love Languages */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">How do they like to receive love?</Label>
                    <p className="text-xs text-muted-foreground">
                      Rate what matters most to them — 1 to 5 hearts each.
                    </p>
                  </div>
                  <LoveLanguageHeartRatings
                    values={loveLanguages}
                    onChange={setLoveLanguages}
                  />
                </div>
              </div>
            )}

            {currentStep === 4 && <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Private Notes</Label>
                  <Textarea id="notes" placeholder="Any special notes, reminders, or things to remember..." value={notes} onChange={e => setNotes(e.target.value)} rows={8} />
                  <p className="text-xs text-muted-foreground">
                    These notes are completely private and secure
                  </p>
                </div>
              </div>}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {currentStep === 1 ? "Cancel" : "Back"}
              </Button>

              {currentStep < totalSteps ? (
                <div className="flex gap-2">
                  {currentStep === 2 && (
                    <Button variant="ghost" onClick={() => setCurrentStep(currentStep + 1)}>
                      Skip this step
                    </Button>
                  )}
                  <Button onClick={handleNext}>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <Button onClick={handleSave} disabled={loading} data-testid="partner-wizard-save-button">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Cherished
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div></>;
};

// Helper component for detail sections in step 3
interface DetailSectionProps {
  title: string;
  placeholder: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
}

const DetailSection = ({ title, placeholder, items, onAdd, onRemove }: DetailSectionProps) => {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue);
      setInputValue("");
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{title}</Label>
      
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-2 rounded-lg border bg-card/50">
              <span className="flex-1 text-sm">{item}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onRemove(index)}
                className="h-7 w-7 shrink-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="text-sm"
        />
        <Button onClick={handleAdd} size="icon" className="shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">Add 1-2 items to get started</p>
      )}
    </div>
  );
};

export default PartnerWizard;