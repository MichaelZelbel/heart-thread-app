import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Heart, ArrowLeft, Save, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoveLanguageHeartRatings } from "@/components/LoveLanguageHeartRatings";
import { ItemManager } from "@/components/ItemManager";
import { BirthdatePicker } from "@/components/BirthdatePicker";
import { EventManager } from "@/components/EventManager";
import { dateToYMDLocal } from "@/lib/utils";

interface LoveLanguages {
  physical: number;
  words: number;
  quality: number;
  acts: number;
  gifts: number;
}

const PartnerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    gifts: 3,
  });

  useEffect(() => {
    loadPartnerData();
  }, [id]);

  const loadPartnerData = async () => {
    if (!id) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

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
      gifts: data.love_language_gifts || 3,
    });
    setLoading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Partner name is required");
      return;
    }

    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("partners")
      .update({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        birthdate: birthdate ? dateToYMDLocal(birthdate) : null,
        love_language_physical: loveLanguages.physical,
        love_language_words: loveLanguages.words,
        love_language_quality: loveLanguages.quality,
        love_language_acts: loveLanguages.acts,
        love_language_gifts: loveLanguages.gifts,
      })
      .eq("id", id);

    // Handle birthdate event (Birthday)
    if (birthdate) {
      const birthdateStr = dateToYMDLocal(birthdate);
      
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
            title: `${name}'s Birthday`,
          })
          .eq("id", existingEvent.id);
      } else {
        // Create new Birthday event
        await supabase
          .from("events")
          .insert({
            user_id: session.user.id,
            partner_id: id,
            title: `${name}'s Birthday`,
            event_date: birthdateStr,
            event_type: "Birthday",
            is_recurring: true,
          });
      }
    }

    setSaving(false);

    if (error) {
      toast.error("Failed to save changes");
      return;
    }

    toast.success("Saved. Your secret wingman took notes.");
  };

  const handleArchive = async () => {
    if (!id) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("partners")
      .update({ archived: true })
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      toast.error("Failed to archive partner");
      return;
    }

    toast.success("Partner archived successfully");
    navigate("/dashboard");
  };

  const handleDelete = async () => {
    if (!id) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("partners")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      toast.error("Failed to delete partner");
      return;
    }

    toast.success("Partner deleted permanently");
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-soft">
        <div className="text-center">
          <Heart className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse-soft" />
          <p className="text-muted-foreground">Loading partner details...</p>
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
          <div className="flex gap-2">
            <Button onClick={handleArchive} variant="outline">
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </Button>
            <Button onClick={() => setShowDeleteDialog(true)} variant="outline">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
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

        <div className="space-y-6">
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
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Partner's name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partner@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City, State"
                />
              </div>
              <BirthdatePicker value={birthdate} onChange={setBirthdate} />
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="pt-6">
              <LoveLanguageHeartRatings
                values={loveLanguages}
                onChange={setLoveLanguages}
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
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special memories, preferences, important details..."
                rows={6}
                className="resize-none"
              />
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="pt-6">
              <EventManager partnerId={id!} partnerName={name} />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Likes & Dislikes</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <ItemManager
                partnerId={id!}
                type="likes"
                title="Likes"
                subtitle="Little things that make them light up."
                emptyState="Add the first like — e.g., 'Chocolate Cake' (Food)."
              />
              <ItemManager
                partnerId={id!}
                type="dislikes"
                title="Dislikes"
                subtitle="Things to avoid—because you care."
                emptyState="Add a gentle no — e.g., 'Crowded clubs' (Places)."
              />
            </div>
          </div>
        </div>
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
    </div>
  );
};

export default PartnerDetail;
