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
import { Heart, ArrowLeft, Archive, Trash2, FileText } from "lucide-react";
import { CherishedSwitcher } from "@/components/CherishedSwitcher";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LoveLanguageHeartRatings } from "@/components/LoveLanguageHeartRatings";
import { ItemManager } from "@/components/ItemManager";
import { BirthdatePicker } from "@/components/BirthdatePicker";
import { EventManager } from "@/components/EventManager";
import { CherishedTimeline } from "@/components/CherishedTimeline";
import { MomentManager } from "@/components/MomentManager";
import { ProfileDetailsManager, CATEGORIES } from "@/components/ProfileDetailsManager";
import { ClaireChat } from "@/components/ClaireChat";
import { MessageCoach } from "@/components/MessageCoach";
import { CherishedDocuments } from "@/components/CherishedDocuments";
import { ProfileReference } from "@/components/ProfileReference";
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
  
  const [activeTab, setActiveTab] = useState("conversation");
  const [conversationContext, setConversationContext] = useState("");
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle timeline "Ask Claire" action
  const handleAskClaireFromTimeline = (context: string) => {
    setConversationContext(context);
    setActiveTab("conversation");
  };
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
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div className="h-6 w-px bg-border" />
            <CherishedSwitcher currentPartnerId={id!} currentPartnerName={name} />
          </div>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="conversation" className="relative">
              Conversation
              {!isPro && (
                <span className="ml-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  Pro
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Conversation Tab (Primary Workspace with Claire) */}
          <TabsContent value="conversation" className="space-y-6">
            {isPro ? (
              <Card className="shadow-soft">
                <CardContent className="pt-6">
                  <MessageCoach 
                    partnerId={id!} 
                    partnerName={name} 
                    initialContext={conversationContext}
                  />
                </CardContent>
              </Card>
            ) : (
              <UpgradePrompt 
                featureName="Conversation with Claire"
                description="Get personalized advice, message coaching, and relationship insights from Claire."
              />
            )}
          </TabsContent>

          {/* Timeline Tab (Supporting Context) */}
          <TabsContent value="timeline" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Your Story with {name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  What happened before — tap any moment to ask Claire about it
                </p>
              </CardHeader>
              <CardContent>
                <CherishedTimeline partnerName={name} onAskClaire={handleAskClaireFromTimeline} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Long-term Memory
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Your personal notes and reflections that help Claire understand your relationship
                </p>
              </CardHeader>
              <CardContent>
                <CherishedDocuments partnerName={name} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile & Preferences Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="shadow-soft">
              <CardContent className="pt-6">
                <ProfileReference
                  partnerId={id!}
                  partnerName={name}
                  name={name}
                  setName={setName}
                  relationshipType={relationshipType}
                  setRelationshipType={setRelationshipType}
                  birthdate={birthdate}
                  setBirthdate={setBirthdate}
                  genderIdentity={genderIdentity}
                  setGenderIdentity={setGenderIdentity}
                  customGender={customGender}
                  setCustomGender={setCustomGender}
                  country={country}
                  setCountry={setCountry}
                  notes={notes}
                  setNotes={setNotes}
                  loveLanguages={loveLanguages}
                  setLoveLanguages={setLoveLanguages}
                  onSave={savePartnerData}
                  onDebouncedSave={debouncedSave}
                  saveTimeoutRef={saveTimeoutRef}
                />
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