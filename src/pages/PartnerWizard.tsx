import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Heart, Save, Loader2 } from "lucide-react";
import { LoveLanguageHeartRatings } from "@/components/LoveLanguageHeartRatings";
const PartnerWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const totalSteps = 4;

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loveLanguages, setLoveLanguages] = useState({
    physical: 3,
    words: 3,
    quality: 3,
    acts: 3,
    gifts: 3
  });
  const [notes, setNotes] = useState("");
  const [chatHistory, setChatHistory] = useState("");
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
    if (currentStep === 1 && !name.trim()) {
      toast.error("Cherished name is required");
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
    if (!name.trim()) {
      toast.error("Cherished name is required");
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
      const {
        error
      } = await supabase.from("partners").insert({
        user_id: session.user.id,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        love_language_physical: loveLanguages.physical,
        love_language_words: loveLanguages.words,
        love_language_quality: loveLanguages.quality,
        love_language_acts: loveLanguages.acts,
        love_language_gifts: loveLanguages.gifts,
        notes: notes.trim() || null,
        chat_history: chatHistory.trim() || null
      });
      if (error) throw error;
      toast.success(`${name} added to your cherished!`);
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  const progress = currentStep / totalSteps * 100;
  return <div className="min-h-screen bg-gradient-soft">
      <nav className="bg-card border-b border-border shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">Cherishly</span>
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
              {currentStep === 1 && "Basic Information"}
              {currentStep === 2 && "Love Languages"}
              {currentStep === 3 && "Additional Details"}
              {currentStep === 4 && "Notes & Memories"}
            </CardTitle>
            
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 1 && <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Cherished Name <span className="text-destructive">*</span>
                  </Label>
                  <Input id="name" placeholder="Their name" value={name} onChange={e => setName(e.target.value)} required data-testid="what-do-you-call-them" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input id="email" type="email" placeholder="their@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>}

            {currentStep === 2 && <LoveLanguageHeartRatings values={loveLanguages} onChange={setLoveLanguages} />}

            {currentStep === 3 && <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address (optional)</Label>
                  <Input id="address" placeholder="123 Main St, City, State" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chatHistory">Chat History (optional)</Label>
                  <Textarea id="chatHistory" placeholder="Paste important chat logs or messages here..." value={chatHistory} onChange={e => setChatHistory(e.target.value)} rows={6} />
                  <p className="text-xs text-muted-foreground">
                    A private space to store meaningful conversations
                  </p>
                </div>
              </div>}

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

              {currentStep < totalSteps ? <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button> : <Button onClick={handleSave} disabled={loading} data-testid="partner-wizard-save-button">
                  {loading ? <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </> : <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Cherished
                    </>}
                </Button>}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>;
};
export default PartnerWizard;