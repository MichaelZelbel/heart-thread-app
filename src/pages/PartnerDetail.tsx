import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, ArrowLeft, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LoveLanguageHeartRatings } from "@/components/LoveLanguageHeartRatings";
import { ItemManager } from "@/components/ItemManager";
import { BirthdatePicker } from "@/components/BirthdatePicker";
import { EventManager } from "@/components/EventManager";
import { MomentManager } from "@/components/MomentManager";
import { ProfileDetailsManager, CATEGORIES } from "@/components/ProfileDetailsManager";
import { ClaireChat } from "@/components/ClaireChat";
import { MessageCoach } from "@/components/MessageCoach";
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
const PartnerDetail = () => {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const { isPro } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [name, setName] = useState("");
  const [relationshipType, setRelationshipType] = useState("partner");
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
    loadPartnerData();
  }, [id]);
  const loadPartnerData = async () => {
    if (!id) return;
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    const {
      data,
      error
    } = await supabase.from("partners").select("*").eq("id", id).eq("user_id", session.user.id).single();
    if (error || !data) {
      toast.error("Partner not found");
      navigate("/dashboard");
      return;
    }
    setName(data.name);
    setRelationshipType(data.relationship_type || "partner");
    setNotes(data.notes || "");
    
    // Load birthdate from partner record, or sync from Birthday event if not set
    if (data.birthdate) {
      setBirthdate(new Date(data.birthdate));
    } else {
      // Check if there's a Birthday event and sync it to the birthdate field
      const { data: birthdayEvent } = await supabase
        .from("events")
        .select("event_date")
        .eq("partner_id", id)
        .eq("event_type", "Birthday")
        .maybeSingle();
      
      if (birthdayEvent) {
        setBirthdate(new Date(birthdayEvent.event_date));
        // Also update the partner record with this birthdate
        await supabase
          .from("partners")
          .update({ birthdate: birthdayEvent.event_date })
          .eq("id", id);
      } else {
        setBirthdate(null);
      }
    }
    
    // Handle gender identity - check if it's a custom value
    const standardGenders = ["Woman 💐", "Man 🌹", "Nonbinary 🌈", "Trans Woman 💖", "Trans Man 💙", "Prefer not to say 🙊"];
    if (data.gender_identity && !standardGenders.includes(data.gender_identity)) {
      setGenderIdentity("Custom ✨");
      setCustomGender(data.gender_identity);
    } else {
      setGenderIdentity(data.gender_identity || "");
      setCustomGender("");
    }
    
    setCountry(data.country || "");
    setLoveLanguages({
      physical: data.love_language_physical || 3,
      words: data.love_language_words || 3,
      quality: data.love_language_quality || 3,
      acts: data.love_language_acts || 3,
      gifts: data.love_language_gifts || 3
    });
    setLoading(false);
  };
  const savePartnerData = useCallback(async (dataToSave: {
    name?: string;
    relationshipType?: string;
    genderIdentity?: string;
    country?: string;
    notes?: string;
    birthdate?: Date | null;
    loveLanguages?: LoveLanguages;
  }, showToast = false) => {
    if (!id) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Prepare update data
    const updateData: any = {};
    
    if (dataToSave.name !== undefined) {
      if (!dataToSave.name.trim()) {
        toast.error("Partner name is required");
        return;
      }
      updateData.name = dataToSave.name.trim();
    }
    if (dataToSave.relationshipType !== undefined) updateData.relationship_type = dataToSave.relationshipType;
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
      .eq("id", id);

    if (error) {
      toast.error("Failed to save changes");
      return;
    }

    // Handle birthdate event (Birthday) if birthdate was updated
    if (dataToSave.birthdate !== undefined) {
      const currentBirthdate = dataToSave.birthdate;
      const currentName = dataToSave.name !== undefined ? dataToSave.name : name;
      
      if (currentBirthdate) {
        const birthdateStr = dateToYMDLocal(currentBirthdate);

        // Check if Birthday event exists
        const { data: existingEvent } = await supabase
          .from("events")
          .select("id")
          .eq("partner_id", id)
          .eq("event_type", "Birthday")
          .single();
          
        if (existingEvent) {
          // Update existing Birthday event
          await supabase
            .from("events")
            .update({
              event_date: birthdateStr,
              title: `${currentName}'s Birthday`
            })
            .eq("id", existingEvent.id);
        } else {
          // Create new Birthday event
          await supabase
            .from("events")
            .insert({
              user_id: session.user.id,
              partner_id: id,
              title: `${currentName}'s Birthday`,
              event_date: birthdateStr,
              event_type: "Birthday",
              is_recurring: true
            });
        }
      }
    }

    if (showToast) {
      toast.success("Saved");
    }
  }, [id, name]);

  // Debounced save for text fields
  const debouncedSave = useCallback((dataToSave: any) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      savePartnerData(dataToSave);
    }, 1000); // 1 second debounce
  }, [savePartnerData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  const handleArchive = async () => {
    if (!id) return;
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    const {
      error
    } = await supabase.from("partners").update({
      archived: true
    }).eq("id", id).eq("user_id", session.user.id);
    if (error) {
      toast.error("Failed to archive partner");
      return;
    }
    toast.success("Partner archived successfully");
    navigate("/dashboard");
  };
  const handleDelete = async () => {
    if (!id) return;
    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();
    if (!session) return;
    const {
      error
    } = await supabase.from("partners").delete().eq("id", id).eq("user_id", session.user.id);
    if (error) {
      toast.error("Failed to delete cherished");
      return;
    }
    toast.success("Cherished deleted permanently");
    navigate("/dashboard");
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <div className="text-center">
          <Heart className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse-soft" />
          <p className="text-muted-foreground">Loading cherished details...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-soft">
      <nav className="bg-card border-b border-border shadow-soft">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleArchive} variant="outline">
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </Button>
            <Button onClick={() => setShowDeleteDialog(true)} variant="outline">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Heart className="w-8 h-8 mr-3 text-primary" />
            {name}
          </h1>
          <p className="text-muted-foreground">Edit partner details</p>
        </div>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="moments">Moments</TabsTrigger>
            <TabsTrigger value="messageCoach">Message Coach</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-6">
            <Card className="shadow-soft">
              <CardContent className="pt-6">
                <EventManager partnerId={id!} partnerName={name} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="moments" className="space-y-6">
            {isPro ? (
              <Card className="shadow-soft">
                <CardContent className="pt-6">
                  <MomentManager partnerId={id!} partnerName={name} />
                </CardContent>
              </Card>
            ) : (
              <UpgradePrompt 
                featureName="Moments Log"
                description="Capture and organize your special memories with your cherished ones."
              />
            )}
          </TabsContent>

          <TabsContent value="messageCoach" className="space-y-6">
            {isPro ? (
              <Card className="shadow-soft">
                <CardContent className="pt-6">
                  <MessageCoach partnerId={id!} partnerName={name} />
                </CardContent>
              </Card>
            ) : (
              <UpgradePrompt 
                featureName="Message Coach"
                description="Get AI-powered help crafting thoughtful messages with personalized tone and context."
              />
            )}
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <ItemManager partnerId={id!} type="likes" title="Likes" subtitle="Little things that make them light up." emptyState="No likes yet — Add your first like (e.g., Chocolate Cake)" />
                <ItemManager partnerId={id!} type="dislikes" title="Dislikes" subtitle="Things to avoid—because you care." emptyState="No dislikes yet — Add your first dislike (e.g., Loud noises)" />
              </div>
              {isPro ? (
                <div className="h-[600px]">
                  <ClaireChat partnerId={id} compact={false} />
                </div>
              ) : (
                <UpgradePrompt 
                  featureName="AI Chat with Claire"
                  description="Get personalized relationship advice and gift ideas from your AI companion, Claire."
                />
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {CATEGORIES.map((category) => (
                <ProfileDetailsManager key={category.id} partnerId={id!} category={category} />
              ))}
            </div>

            <Card className="shadow-soft">
              <CardContent className="pt-6">
                <LoveLanguageHeartRatings 
                  values={loveLanguages} 
                  onChange={(newValues) => {
                    setLoveLanguages(newValues);
                    savePartnerData({ loveLanguages: newValues });
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
                    savePartnerData({ notes: e.target.value }, true);
                  }}
                  placeholder="Special memories, preferences, important details..." 
                  rows={6} 
                  className="resize-none" 
                />
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  A few gentle details — nothing personal, just what makes them <em>them</em> 💗
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Name / Nickname *</Label>
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
                      savePartnerData({ name: e.target.value }, true);
                    }}
                    placeholder="What do you call them?" 
                    data-testid="what-do-you-call-them" 
                  />
                </div>
                <div>
                  <Label htmlFor="relationshipType">Relationship Type</Label>
                  <Select 
                    value={relationshipType} 
                    onValueChange={(value) => {
                      setRelationshipType(value);
                      savePartnerData({ relationshipType: value });
                    }}
                  >
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
                <div>
                  <Label htmlFor="genderIdentity">How do they identify, if you'd like to share? 💕</Label>
                  <Select 
                    value={genderIdentity} 
                    onValueChange={(value) => {
                      setGenderIdentity(value);
                      const finalValue = value === "Custom ✨" ? customGender : value;
                      if (value !== "Custom ✨") {
                        savePartnerData({ genderIdentity: finalValue });
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
                  <p className="text-xs text-muted-foreground mt-1">
                    This helps Cherishly personalize messages and suggestions — totally optional.
                  </p>
                  {genderIdentity === "Custom ✨" && (
                    <Input 
                      placeholder="Type anything that fits — we love unique identities! 🌸"
                      value={customGender}
                      onChange={e => {
                        const newCustomGender = e.target.value;
                        setCustomGender(newCustomGender);
                        debouncedSave({ genderIdentity: newCustomGender });
                      }}
                      onBlur={() => {
                        if (saveTimeoutRef.current) {
                          clearTimeout(saveTimeoutRef.current);
                        }
                        savePartnerData({ genderIdentity: customGender }, true);
                      }}
                      className="mt-2"
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="country">Where in the world do they live? 🌍</Label>
                  <Select 
                    value={country} 
                    onValueChange={(value) => {
                      setCountry(value);
                      savePartnerData({ country: value });
                    }}
                  >
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
                  <p className="text-xs text-muted-foreground mt-1">
                    So reminders and ideas fit their local time and vibe.
                  </p>
                </div>
                <div>
                  <Label htmlFor="birthdate">Birthday (optional)</Label>
                  <BirthdatePicker 
                    value={birthdate} 
                    onChange={(newBirthdate) => {
                      setBirthdate(newBirthdate);
                      savePartnerData({ birthdate: newBirthdate });
                    }} 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    We'll add their birthday to your Love Calendar
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {name} and all associated data including events, likes, and dislikes.
              <br /><br />
              <strong>Consider archiving instead</strong> if you want to preserve the data and restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
export default PartnerDetail;