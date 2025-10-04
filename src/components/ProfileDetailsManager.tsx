import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileDetail {
  id: string;
  category: string;
  label: string;
  value: string;
  position: number;
}

interface ProfileDetailsManagerProps {
  partnerId: string;
}

const CATEGORIES = [
  { id: "body", label: "Body" },
  { id: "favorites", label: "Favorites" },
  { id: "links", label: "Links" },
  { id: "nicknames", label: "Nicknames" },
];

export const ProfileDetailsManager = ({ partnerId }: ProfileDetailsManagerProps) => {
  const [details, setDetails] = useState<ProfileDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingDetail, setEditingDetail] = useState<ProfileDetail | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string>("");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");

  useEffect(() => {
    loadDetails();
  }, [partnerId]);

  const loadDetails = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data, error } = await supabase
        .from("partner_profile_details")
        .select("*")
        .eq("partner_id", partnerId)
        .order("position");

      if (error) throw error;
      setDetails(data || []);
    } catch (error) {
      console.error("Error loading profile details:", error);
      toast.error("Failed to load profile details");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category: string, detail?: ProfileDetail) => {
    setCurrentCategory(category);
    if (detail) {
      setEditingDetail(detail);
      setLabel(detail.label);
      setValue(detail.value);
    } else {
      setEditingDetail(null);
      setLabel("");
      setValue("");
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingDetail(null);
    setLabel("");
    setValue("");
    setCurrentCategory("");
  };

  const handleSave = async () => {
    if (!label.trim()) {
      toast.error("Please add a label");
      return;
    }

    if (!value.trim()) {
      toast.error("Please add a value");
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error("You must be logged in");
        return;
      }

      const detailData = {
        partner_id: partnerId,
        category: currentCategory,
        label: label.trim(),
        value: value.trim(),
        user_id: session.session.user.id,
        position: editingDetail?.position ?? details.filter(d => d.category === currentCategory).length,
      };

      if (editingDetail) {
        const { error } = await supabase
          .from("partner_profile_details")
          .update(detailData)
          .eq("id", editingDetail.id);

        if (error) throw error;
        toast.success("Field updated successfully");
      } else {
        const { error } = await supabase
          .from("partner_profile_details")
          .insert([detailData]);

        if (error) throw error;
        toast.success("Field added successfully");
      }

      await loadDetails();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving profile detail:", error);
      toast.error("Failed to save field");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("partner_profile_details")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Field deleted successfully");
      await loadDetails();
    } catch (error) {
      console.error("Error deleting profile detail:", error);
      toast.error("Failed to delete field");
    }
  };

  const getDetailsByCategory = (category: string) => {
    return details.filter(d => d.category === category);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {CATEGORIES.map((category) => {
          const categoryDetails = getDetailsByCategory(category.id);
          
          return (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="text-lg">{category.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryDetails.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No fields added yet</p>
                ) : (
                  categoryDetails.map((detail) => (
                    <Card key={detail.id} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-muted-foreground">{detail.label}</p>
                            <p className="text-base break-words">{detail.value}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenDialog(category.id, detail)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDelete(detail.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog(category.id)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDetail ? "Edit Field" : "Add Field"}
            </DialogTitle>
            <DialogDescription>
              {editingDetail ? "Update the field details" : "Add a new field to this category"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="field-label">Label *</Label>
              <Input
                id="field-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Eye color, Favorite food"
              />
            </div>
            <div>
              <Label htmlFor="field-value">Value *</Label>
              <Textarea
                id="field-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g., Green, Pizza"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingDetail ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
