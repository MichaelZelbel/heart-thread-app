import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { LoveLanguageHeartRatings } from "@/components/LoveLanguageHeartRatings";
import { ItemManager } from "@/components/ItemManager";
import { BirthdatePicker } from "@/components/BirthdatePicker";
import { ProfileDetailsManager, CATEGORIES } from "@/components/ProfileDetailsManager";
import { ClaireChat } from "@/components/ClaireChat";
import { dateToYMDLocal } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { UpgradePrompt } from "@/components/UpgradePrompt";

interface LoveLanguages {
  physical: number;
  words: number;
  quality: number;
  acts: number;
  gifts: number;
}

const SelfProfile = () => {
  const navigate = useNavigate();
  const { isPro } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [selfPartnerId, setSelfPartnerId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [genderIdentity, setGenderIdentity] = useState("");
  const [customGender, setCustomGender] = useState("");
  const [country, setCountry] = useState("");
  const [notes, setNotes] = useState("");
  const [birthdate, setBirthdate] = useState<Date | null>(null);
  const [loveLanguages, setLoveLanguages] = useState<LoveLanguages>({
    physical: 3,
    words: 3,
    quality: 3,
    acts: 3,
    gifts: 3
  });
  
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadSelfProfile();
  }, []);

  const loadSelfProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Try to find self-partner (partner where user_id = partner_id semantically, 
    // or we use a special flag like relationship_type = 'self')
    const { data: existingPartner } = await supabase
      .from("partners")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("relationship_type", "self")
      .single();

    if (existingPartner) {
      setSelfPartnerId(existingPartner.id);
      setName(existingPartner.name);
      setNotes(existingPartner.notes || "");
      setBirthdate(existingPartner.birthdate ? new Date(existingPartner.birthdate) : null);
      
      const standardGenders = ["Woman 💐", "Man 🌹", "Nonbinary 🌈", "Trans Woman 💖", "Trans Man 💙", "Prefer not to say 🙊"];
      if (existingPartner.gender_identity && !standardGenders.includes(existingPartner.gender_identity)) {
        setGenderIdentity("Custom ✨");
        setCustomGender(existingPartner.gender_identity);
      } else {
        setGenderIdentity(existingPartner.gender_identity || "");
        setCustomGender("");
      }
      
      setCountry(existingPartner.country || "");
      setLoveLanguages({
        physical: existingPartner.love_language_physical || 3,
        words: existingPartner.love_language_words || 3,
        quality: existingPartner.love_language_quality || 3,
        acts: existingPartner.love_language_acts || 3,
        gifts: existingPartner.love_language_gifts || 3
      });
    } else {
      // Create a new self-partner entry
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", session.user.id)
        .single();

      const defaultName = profile?.display_name || "You";

      const { data: newPartner, error } = await supabase
        .from("partners")
        .insert({
          user_id: session.user.id,
          name: defaultName,
          relationship_type: "self",
          archived: false
        })
        .select()
        .single();

      if (error) {
        toast.error("Failed to create self-profile");
        navigate("/dashboard");
        return;
      }

      if (newPartner) {
        setSelfPartnerId(newPartner.id);
        setName(defaultName);
      }
    }

    setLoading(false);
  };

  const saveSelfProfile = useCallback(async (dataToSave: {
    name?: string;
    genderIdentity?: string;
    country?: string;
    notes?: string;
    birthdate?: Date | null;
    loveLanguages?: LoveLanguages;
  }, showToast = false) => {
    if (!selfPartnerId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const updateData: any = {};
    
    if (dataToSave.name !== undefined) {
      if (!dataToSave.name.trim()) {
        toast.error("Name is required");
        return;
      }
      updateData.name = dataToSave.name.trim();
    }
    if (dataToSave.genderIdentity !== undefined) updateData.gender_identity = dataToSave.genderIdentity.trim() || null;
    if (dataToSave.country !== undefined) updateData.country = dataToSave.country || null;
    if (dataToSave.notes !== undefined) updateData.notes = dataToSave.notes.trim() || null;
    if (dataToSave.birthdate !== undefined) {
      updateData.birthdate = dataToSave.birthdate ? dateToYMDLocal(dataToSave.birthdate) : null;
    }
    if (dataToSave.loveLanguages) {
      updateData.love_language_physical = dataToSave.loveLanguages.physical;
      updateData.love_language_words = dataToSave.loveLanguages.words;
      updateData.love_language_quality = dataToSave.loveLanguages.quality;
      updateData.love_language_acts = dataToSave.loveLanguages.acts;
      updateData.love_language_gifts = dataToSave.loveLanguages.gifts;
    }

    const { error } = await supabase
      .from("partners")
      .update(updateData)
      .eq("id", selfPartnerId);

    if (error) {
      toast.error("Failed to save changes");
      return;
    }

    if (showToast) {
      toast.success("Saved");
    }
  }, [selfPartnerId]);

  const debouncedSave = useCallback((dataToSave: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveSelfProfile(dataToSave);
    }, 1000);
  }, [saveSelfProfile]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <div className="text-center">
          <Heart className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse-soft" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!selfPartnerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load profile</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <nav className="bg-card border-b border-border shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Heart className="w-8 h-8 mr-3 text-primary" />
            {name}
          </h1>
          <p className="text-muted-foreground">Your personal profile</p>
        </div>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <ItemManager partnerId={selfPartnerId} type="likes" title="Likes" subtitle="Little things that make you light up." emptyState="No likes yet — Add your first like (e.g., Chocolate Cake)" />
                <ItemManager partnerId={selfPartnerId} type="dislikes" title="Dislikes" subtitle="Things you prefer to avoid." emptyState="No dislikes yet — Add your first dislike (e.g., Loud noises)" />
              </div>
              {isPro ? (
                <div className="h-[600px]">
                  <ClaireChat partnerId={selfPartnerId} compact={false} />
                </div>
              ) : (
                <UpgradePrompt 
                  featureName="AI Chat with Claire"
                  description="Get personalized advice and insights from your AI companion, Claire."
                />
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {CATEGORIES.map((category) => (
                <ProfileDetailsManager key={category.id} partnerId={selfPartnerId} category={category} />
              ))}
            </div>

            <Card className="shadow-soft">
              <CardContent className="pt-6">
                <LoveLanguageHeartRatings 
                  values={loveLanguages} 
                  onChange={(newValues) => {
                    setLoveLanguages(newValues);
                    saveSelfProfile({ loveLanguages: newValues });
                  }} 
                />
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Notes & Thoughts</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={notes} 
                  onChange={e => {
                    const newNotes = e.target.value;
                    setNotes(newNotes);
                    debouncedSave({ notes: newNotes });
                  }}
                  onBlur={(e) => {
                    if (saveTimeoutRef.current) {
                      clearTimeout(saveTimeoutRef.current);
                    }
                    saveSelfProfile({ notes: e.target.value }, true);
                  }}
                  placeholder="Personal reflections, goals, things to remember about yourself..." 
                  rows={6} 
                  className="resize-none" 
                />
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  A few details about you 💗
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={e => {
                      const newName = e.target.value;
                      setName(newName);
                      debouncedSave({ name: newName });
                    }}
                    onBlur={(e) => {
                      if (saveTimeoutRef.current) {
                        clearTimeout(saveTimeoutRef.current);
                      }
                      saveSelfProfile({ name: e.target.value }, true);
                    }}
                    placeholder="Your name" 
                  />
                </div>
                <div>
                  <Label htmlFor="genderIdentity">How do you identify? 💕</Label>
                  <Select 
                    value={genderIdentity} 
                    onValueChange={(value) => {
                      setGenderIdentity(value);
                      const finalValue = value === "Custom ✨" ? customGender : value;
                      if (value !== "Custom ✨") {
                        saveSelfProfile({ genderIdentity: finalValue });
                      }
                    }}
                  >
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
                  {genderIdentity === "Custom ✨" && (
                    <Input 
                      placeholder="Type anything that fits — we love unique identities! 🌸"
                      value={customGender}
                      onChange={e => {
                        const newCustomGender = e.target.value;
                        setCustomGender(newCustomGender);
                        debouncedSave({ genderIdentity: newCustomGender });
                      }}
                      onBlur={(e) => {
                        if (saveTimeoutRef.current) {
                          clearTimeout(saveTimeoutRef.current);
                        }
                        saveSelfProfile({ genderIdentity: e.target.value }, true);
                      }}
                      className="mt-2"
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="country">Country / Location</Label>
                  <Input 
                    id="country" 
                    value={country} 
                    onChange={e => {
                      const newCountry = e.target.value;
                      setCountry(newCountry);
                      debouncedSave({ country: newCountry });
                    }} 
                    placeholder="e.g., United States, Japan, etc." 
                  />
                </div>
                <div>
                  <BirthdatePicker
                    value={birthdate}
                    onChange={(date) => {
                      setBirthdate(date || null);
                      saveSelfProfile({ birthdate: date || null });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SelfProfile;
