import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
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
    setEmail(data.email || "");
    setPhone(data.phone || "");
    setAddress(data.address || "");
    setNotes(data.notes || "");
    setBirthdate(data.birthdate ? new Date(data.birthdate) : null);
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
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    birthdate?: Date | null;
    loveLanguages?: LoveLanguages;
  }) => {
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
    if (dataToSave.email !== undefined) updateData.email = dataToSave.email.trim() || null;
    if (dataToSave.phone !== undefined) updateData.phone = dataToSave.phone.trim() || null;
    if (dataToSave.address !== undefined) updateData.address = dataToSave.address.trim() || null;
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

    toast.success("Saved");
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

        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="moments">Moments</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
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
                  placeholder="Special memories, preferences, important details..." 
                  rows={6} 
                  className="resize-none" 
                />
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
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
                    placeholder="Partner's name" 
                    data-testid="what-do-you-call-them" 
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={e => {
                      const newEmail = e.target.value;
                      setEmail(newEmail);
                      debouncedSave({ email: newEmail });
                    }} 
                    placeholder="partner@example.com" 
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={phone} 
                    onChange={e => {
                      const newPhone = e.target.value;
                      setPhone(newPhone);
                      debouncedSave({ phone: newPhone });
                    }} 
                    placeholder="+1 (555) 000-0000" 
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input 
                    id="address" 
                    value={address} 
                    onChange={e => {
                      const newAddress = e.target.value;
                      setAddress(newAddress);
                      debouncedSave({ address: newAddress });
                    }} 
                    placeholder="123 Main St, City, State" 
                  />
                </div>
                <BirthdatePicker 
                  value={birthdate} 
                  onChange={(newBirthdate) => {
                    setBirthdate(newBirthdate);
                    savePartnerData({ birthdate: newBirthdate });
                  }} 
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