import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Sparkles, Loader2, Plus, X, Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoveLanguageHeartRatings } from "./LoveLanguageHeartRatings";
import cherishlyLogo from "@/assets/cherishly-logo.png";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";
import { validateEmail, passwordSchema, isTestUser } from "@/lib/auth-validation";

interface CherishWizardProps {
  onClose: () => void;
  isLoggedIn: boolean;
}

interface WizardData {
  nickname: string;
  specialDay: {
    day: number | null;
    month: number | null;
    year: number | null;
    eventType: string;
    customEventType?: string;
  };
  likes: string[];
  dislikes: string[];
  loveLanguages: {
    physical: number;
    words: number;
    quality: number;
    acts: number;
    gifts: number;
  };
  email?: string;
  password?: string;
  displayName?: string;
}

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const days = Array.from({ length: 31 }, (_, i) => i + 1);
const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

export const CherishWizard = ({ onClose, isLoggedIn }: CherishWizardProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const navigate = useNavigate();

  const [wizardData, setWizardData] = useState<WizardData>(() => {
    // Try to load from localStorage for anonymous users
    const saved = localStorage.getItem("cherishWizardData");
    return saved ? JSON.parse(saved) : {
      nickname: "",
      specialDay: { day: null, month: null, year: null, eventType: "Birthday" },
      likes: [],
      dislikes: [],
      loveLanguages: {
        physical: 3,
        words: 3,
        quality: 3,
        acts: 3,
        gifts: 3,
      },
    };
  });

  // Save to localStorage for anonymous users
  useEffect(() => {
    if (!isLoggedIn) {
      localStorage.setItem("cherishWizardData", JSON.stringify(wizardData));
    }
  }, [wizardData, isLoggedIn]);

  const totalSteps = isLoggedIn ? 3 : 4;
  const progress = (step / totalSteps) * 100;

  const updateWizardData = (updates: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (step === 1 && !wizardData.nickname.trim()) {
      toast.error("Please enter a nickname");
      return;
    }

    // Validate step 4 (authentication) before proceeding
    if (step === 4 && !isLoggedIn) {
      setEmailError("");
      setPasswordError("");

      if (!wizardData.email || !wizardData.password || !wizardData.displayName) {
        toast.error("Please fill in all fields");
        return;
      }

      // Validate email
      const emailValidation = validateEmail(wizardData.email);
      if (!emailValidation.valid) {
        setEmailError(emailValidation.error || "Invalid email");
        return;
      }

      // Validate password
      try {
        passwordSchema.parse(wizardData.password);
      } catch (error: any) {
        setPasswordError(error.errors[0]?.message || "Password does not meet requirements");
        return;
      }
    }
    
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      let user = null;
      let isNewUser = false;

      // If not logged in, handle signup first
      if (!isLoggedIn && wizardData.email && wizardData.password) {
        const { error: signUpError, data } = await supabase.auth.signUp({
          email: wizardData.email,
          password: wizardData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/email-verification-pending`,
            data: {
              display_name: wizardData.displayName || "User",
            },
          },
        });

        if (signUpError) throw signUpError;
        user = data.user;
        isNewUser = true;
        
        // Wait for auth to settle
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        // Get current user for logged-in users
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        user = currentUser;
      }
      
      if (!user) {
        toast.error("Authentication required");
        setLoading(false);
        return;
      }

      // For new users who need email verification, save wizard data and redirect
      if (isNewUser && !isTestUser(wizardData.email || "")) {
        // Save wizard data to localStorage for completion after email verification
        localStorage.setItem("pendingCherishData", JSON.stringify(wizardData));
        localStorage.removeItem("cherishWizardData");
        
        toast.info("Please check your email to verify your account");
        navigate("/email-verification-pending");
        return;
      }

      // Determine birthdate if creating a Birthday event
      let birthdate = null;
      if (wizardData.specialDay.day != null && wizardData.specialDay.month != null) {
        const eventType = wizardData.specialDay.eventType === "Custom..." 
          ? wizardData.specialDay.customEventType 
          : wizardData.specialDay.eventType;
        
        if (eventType === "Birthday") {
          const eventDate = new Date(
            wizardData.specialDay.year || new Date().getFullYear(),
            wizardData.specialDay.month,
            wizardData.specialDay.day
          );
          birthdate = eventDate.toISOString().split('T')[0];
        }
      }

      // Create partner profile
      const { data: partner, error: partnerError } = await supabase
        .from("partners")
        .insert({
          user_id: user.id,
          name: wizardData.nickname,
          love_language_physical: wizardData.loveLanguages.physical,
          love_language_words: wizardData.loveLanguages.words,
          love_language_quality: wizardData.loveLanguages.quality,
          love_language_acts: wizardData.loveLanguages.acts,
          love_language_gifts: wizardData.loveLanguages.gifts,
          birthdate: birthdate,
        })
        .select()
        .single();

      if (partnerError) throw partnerError;

      // Create event if date is provided
      if (wizardData.specialDay.day != null && wizardData.specialDay.month != null) {
        const eventDate = new Date(
          wizardData.specialDay.year || new Date().getFullYear(),
          wizardData.specialDay.month,
          wizardData.specialDay.day
        );
        
        const eventType = wizardData.specialDay.eventType === "Custom..." 
          ? wizardData.specialDay.customEventType 
          : wizardData.specialDay.eventType;

        await supabase.from("moments").insert({
          user_id: user.id,
          partner_ids: [partner.id],
          moment_date: eventDate.toISOString().split('T')[0],
          event_type: eventType || "custom",
          title: eventType || "Special Day",
          is_celebrated_annually: true,
        });
      }

      // Add likes
      if (wizardData.likes.length > 0) {
        const likesData = wizardData.likes.map((like, index) => ({
          partner_id: partner.id,
          item: like,
          position: index,
        }));
        await supabase.from("partner_likes").insert(likesData);
      }

      // Add dislikes
      if (wizardData.dislikes.length > 0) {
        const dislikesData = wizardData.dislikes.map((dislike, index) => ({
          partner_id: partner.id,
          item: dislike,
          position: index,
        }));
        await supabase.from("partner_dislikes").insert(dislikesData);
      }

      // Clear localStorage
      localStorage.removeItem("cherishWizardData");
      localStorage.removeItem("pendingCherishData");

      // Show success screen
      setShowSuccess(true);
      
      // Navigate after a moment
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);

    } catch (error: any) {
      console.error("Error completing wizard:", error);
      toast.error(error.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  const addItem = (field: 'likes' | 'dislikes', value: string) => {
    if (!value.trim()) return;
    updateWizardData({
      [field]: [...wizardData[field], value.trim()],
    });
  };

  const removeItem = (field: 'likes' | 'dislikes', index: number) => {
    updateWizardData({
      [field]: wizardData[field].filter((_, i) => i !== index),
    });
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="text-center space-y-6 animate-scale-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary shadow-glow animate-pulse-soft">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Beautiful.
            </h2>
            <p className="text-lg text-muted-foreground">
              You've started cherishing someone special.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-2xl my-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-3">
            <img src={cherishlyLogo} alt="Cherishly logo" className="w-full h-full" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Cherish a Lovely Person</h2>
          <p className="text-sm text-muted-foreground">
            Step {step} of {totalSteps}
          </p>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="mb-6 h-2" />

        {/* Step Content */}
        <Card className="shadow-soft border-2">
          <CardHeader>
            <CardTitle>
              {step === 1 && "Who do you cherish?"}
              {step === 2 && "Do they have a special day?"}
              {step === 3 && "Tell us what makes them light up"}
              {step === 4 && !isLoggedIn && "Save your connection"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Start simple — what do you call them?"}
              {step === 2 && "Cherish the moments that matter — birthdays, anniversaries, or first 'I love you's."}
              {step === 3 && "Share what they love, what they dislike, and how they receive love best."}
              {step === 4 && !isLoggedIn && "We'll keep what you just created safe. Create a free Cherishly account — or log in if you already have one — to revisit your loved ones anytime."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Step 1: Nickname */}
            {step === 1 && (
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname</Label>
                <Input
                  id="nickname"
                  placeholder="Sweetie, Alex, Mom..."
                  value={wizardData.nickname}
                  onChange={(e) => updateWizardData({ nickname: e.target.value })}
                  autoFocus
                />
              </div>
            )}

            {/* Step 2: Special Day */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select
                    value={wizardData.specialDay.eventType}
                    onValueChange={(val) => updateWizardData({
                      specialDay: { ...wizardData.specialDay, eventType: val }
                    })}
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
                  
                  {wizardData.specialDay.eventType === "Custom..." && (
                    <Input
                      placeholder="Enter custom event name"
                      value={wizardData.specialDay.customEventType || ""}
                      onChange={(e) => updateWizardData({
                        specialDay: { ...wizardData.specialDay, customEventType: e.target.value }
                      })}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={wizardData.specialDay.month?.toString()}
                      onValueChange={(val) => updateWizardData({
                        specialDay: { ...wizardData.specialDay, month: parseInt(val) }
                      })}
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
                      value={wizardData.specialDay.day?.toString()}
                      onValueChange={(val) => updateWizardData({
                        specialDay: { ...wizardData.specialDay, day: parseInt(val) }
                      })}
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
                      value={wizardData.specialDay.year?.toString() || "none"}
                      onValueChange={(val) => updateWizardData({
                        specialDay: { ...wizardData.specialDay, year: val === "none" ? null : parseInt(val) }
                      })}
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
            {step === 3 && (
              <div className="space-y-6">
                {/* Likes */}
                <DetailSection
                  title="Things they love"
                  placeholder="e.g., Chocolate cake"
                  items={wizardData.likes}
                  onAdd={(value) => addItem('likes', value)}
                  onRemove={(index) => removeItem('likes', index)}
                />

                {/* Dislikes */}
                <DetailSection
                  title="Things they dislike"
                  placeholder="e.g., Loud noises"
                  items={wizardData.dislikes}
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
                    values={wizardData.loveLanguages}
                    onChange={(newValues) => updateWizardData({ loveLanguages: newValues })}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Account Creation (for anonymous users) */}
            {step === 4 && !isLoggedIn && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Your Name</Label>
                  <Input
                    id="displayName"
                    placeholder="How should we greet you?"
                    value={wizardData.displayName || ""}
                    onChange={(e) => updateWizardData({ displayName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={wizardData.email || ""}
                    onChange={(e) => {
                      updateWizardData({ email: e.target.value });
                      setEmailError("");
                    }}
                    required
                    className={emailError ? "border-destructive" : ""}
                  />
                  {emailError && (
                    <p className="text-sm text-destructive">{emailError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={wizardData.password || ""}
                      onChange={(e) => {
                        updateWizardData({ password: e.target.value });
                        setPasswordError("");
                      }}
                      required
                      className={passwordError ? "border-destructive pr-10" : "pr-10"}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {passwordError && (
                    <p className="text-sm text-destructive">{passwordError}</p>
                  )}
                  <PasswordStrengthIndicator password={wizardData.password || ""} />
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link 
                    to="/auth" 
                    className="font-medium text-primary hover:underline"
                  >
                    Log in here
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6 gap-4">
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            {step === 1 && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {step === 2 && (
              <Button variant="ghost" onClick={handleSkip}>
                Skip this step
              </Button>
            )}
            
            <Button onClick={handleNext} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  {step === totalSteps ? "Save & Continue" : "Next"}
                  {step < totalSteps && <ArrowRight className="w-4 h-4 ml-2" />}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
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
