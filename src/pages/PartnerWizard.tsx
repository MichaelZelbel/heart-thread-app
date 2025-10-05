import { useState, useEffect } from "react";
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
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";
import { LoveLanguageHeartRatings } from "@/components/LoveLanguageHeartRatings";
import cherishlyLogo from "@/assets/cherishly-logo.png";
const PartnerWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const totalSteps = 4;

  // Form state
  const [name, setName] = useState("");
  const [relationshipType, setRelationshipType] = useState("partner");
  const [genderIdentity, setGenderIdentity] = useState("");
  const [customGender, setCustomGender] = useState("");
  const [country, setCountry] = useState("");
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
      const finalGenderIdentity = genderIdentity === "Custom ✨" ? customGender.trim() : genderIdentity;
      
      const {
        error
      } = await supabase.from("partners").insert({
        user_id: session.user.id,
        name: name.trim(),
        relationship_type: relationshipType,
        gender_identity: finalGenderIdentity || null,
        country: country || null,
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
              {currentStep === 1 && "Basic Information"}
              {currentStep === 2 && "Love Languages"}
              {currentStep === 3 && "Additional Details"}
              {currentStep === 4 && "Notes & Memories"}
            </CardTitle>
            
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 1 && <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  A few gentle details — nothing personal, just what makes them <em>them</em> 💗
                </p>
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name / Nickname <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="name" 
                    placeholder="What do you call them?" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                    data-testid="what-do-you-call-them" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationshipType">Relationship Type</Label>
                  <Select value={relationshipType} onValueChange={setRelationshipType}>
                    <SelectTrigger id="relationshipType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="crush">Crush</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="colleague">Colleague</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genderIdentity">How do they identify, if you'd like to share? 💕</Label>
                  <Select value={genderIdentity} onValueChange={setGenderIdentity}>
                    <SelectTrigger id="genderIdentity">
                      <SelectValue placeholder="Optional — skip if you prefer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Woman 💐">Woman 💐</SelectItem>
                      <SelectItem value="Man 🌹">Man 🌹</SelectItem>
                      <SelectItem value="Nonbinary 🌈">Nonbinary 🌈</SelectItem>
                      <SelectItem value="Trans Woman 💖">Trans Woman 💖</SelectItem>
                      <SelectItem value="Trans Man 💙">Trans Man 💙</SelectItem>
                      <SelectItem value="Prefer not to say 🙊">Prefer not to say 🙊</SelectItem>
                      <SelectItem value="Custom ✨">Custom ✨</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This helps Cherishly personalize messages and suggestions — totally optional.
                  </p>
                  {genderIdentity === "Custom ✨" && (
                    <Input 
                      placeholder="Type anything that fits — we love unique identities! 🌸"
                      value={customGender}
                      onChange={e => setCustomGender(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Where in the world do they live? 🌍</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Optional — skip if you prefer" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                      <SelectItem value="United States">United States 🇺🇸</SelectItem>
                      <SelectItem value="United Kingdom">United Kingdom 🇬🇧</SelectItem>
                      <SelectItem value="Canada">Canada 🇨🇦</SelectItem>
                      <SelectItem value="Australia">Australia 🇦🇺</SelectItem>
                      <SelectItem value="Germany">Germany 🇩🇪</SelectItem>
                      <SelectItem value="France">France 🇫🇷</SelectItem>
                      <SelectItem value="Spain">Spain 🇪🇸</SelectItem>
                      <SelectItem value="Italy">Italy 🇮🇹</SelectItem>
                      <SelectItem value="Netherlands">Netherlands 🇳🇱</SelectItem>
                      <SelectItem value="Sweden">Sweden 🇸🇪</SelectItem>
                      <SelectItem value="Norway">Norway 🇳🇴</SelectItem>
                      <SelectItem value="Denmark">Denmark 🇩🇰</SelectItem>
                      <SelectItem value="Finland">Finland 🇫🇮</SelectItem>
                      <SelectItem value="Belgium">Belgium 🇧🇪</SelectItem>
                      <SelectItem value="Switzerland">Switzerland 🇨🇭</SelectItem>
                      <SelectItem value="Austria">Austria 🇦🇹</SelectItem>
                      <SelectItem value="Poland">Poland 🇵🇱</SelectItem>
                      <SelectItem value="Portugal">Portugal 🇵🇹</SelectItem>
                      <SelectItem value="Greece">Greece 🇬🇷</SelectItem>
                      <SelectItem value="Ireland">Ireland 🇮🇪</SelectItem>
                      <SelectItem value="Japan">Japan 🇯🇵</SelectItem>
                      <SelectItem value="South Korea">South Korea 🇰🇷</SelectItem>
                      <SelectItem value="China">China 🇨🇳</SelectItem>
                      <SelectItem value="India">India 🇮🇳</SelectItem>
                      <SelectItem value="Singapore">Singapore 🇸🇬</SelectItem>
                      <SelectItem value="Malaysia">Malaysia 🇲🇾</SelectItem>
                      <SelectItem value="Thailand">Thailand 🇹🇭</SelectItem>
                      <SelectItem value="Philippines">Philippines 🇵🇭</SelectItem>
                      <SelectItem value="Indonesia">Indonesia 🇮🇩</SelectItem>
                      <SelectItem value="Vietnam">Vietnam 🇻🇳</SelectItem>
                      <SelectItem value="New Zealand">New Zealand 🇳🇿</SelectItem>
                      <SelectItem value="Brazil">Brazil 🇧🇷</SelectItem>
                      <SelectItem value="Mexico">Mexico 🇲🇽</SelectItem>
                      <SelectItem value="Argentina">Argentina 🇦🇷</SelectItem>
                      <SelectItem value="Chile">Chile 🇨🇱</SelectItem>
                      <SelectItem value="Colombia">Colombia 🇨🇴</SelectItem>
                      <SelectItem value="South Africa">South Africa 🇿🇦</SelectItem>
                      <SelectItem value="Egypt">Egypt 🇪🇬</SelectItem>
                      <SelectItem value="Nigeria">Nigeria 🇳🇬</SelectItem>
                      <SelectItem value="Kenya">Kenya 🇰🇪</SelectItem>
                      <SelectItem value="Israel">Israel 🇮🇱</SelectItem>
                      <SelectItem value="United Arab Emirates">United Arab Emirates 🇦🇪</SelectItem>
                      <SelectItem value="Saudi Arabia">Saudi Arabia 🇸🇦</SelectItem>
                      <SelectItem value="Turkey">Turkey 🇹🇷</SelectItem>
                      <SelectItem value="Russia">Russia 🇷🇺</SelectItem>
                      <SelectItem value="Ukraine">Ukraine 🇺🇦</SelectItem>
                      <SelectItem value="Czech Republic">Czech Republic 🇨🇿</SelectItem>
                      <SelectItem value="Hungary">Hungary 🇭🇺</SelectItem>
                      <SelectItem value="Romania">Romania 🇷🇴</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    So reminders and ideas fit their local time and vibe.
                  </p>
                </div>
              </div>}

            {currentStep === 2 && <LoveLanguageHeartRatings values={loveLanguages} onChange={setLoveLanguages} />}

            {currentStep === 3 && <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="chatHistory">Chat History (optional)</Label>
                  <Textarea id="chatHistory" placeholder="Paste important chat logs or messages here..." value={chatHistory} onChange={e => setChatHistory(e.target.value)} rows={8} />
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