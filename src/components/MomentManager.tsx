import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dateToYMDLocal, parseYMDToLocalDate } from "@/lib/utils";

interface Moment {
  id: string;
  title: string | null;
  description: string | null;
  moment_date: string;
  partner_ids: string[];
  created_at: string;
}

interface MomentManagerProps {
  partnerId?: string;
  partnerName?: string;
  showPartnerColumn?: boolean;
}

export const MomentManager = ({ partnerId, partnerName, showPartnerColumn = false }: MomentManagerProps) => {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMoment, setEditingMoment] = useState<Moment | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [momentDate, setMomentDate] = useState(dateToYMDLocal(new Date()));
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadMoments();
    if (showPartnerColumn) {
      loadPartners();
    }
  }, [partnerId]);

  const loadPartners = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("partners")
      .select("id, name")
      .eq("user_id", session.user.id)
      .eq("archived", false);

    if (data) setPartners(data);
  };

  const loadMoments = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let query = supabase
      .from("moments")
      .select("*")
      .eq("user_id", session.user.id)
      .order("moment_date", { ascending: false });

    if (partnerId) {
      query = query.contains("partner_ids", [partnerId]);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to load moments");
      console.error(error);
    } else {
      setMoments(data || []);
    }
    setLoading(false);
  };

  const handleOpenDialog = (moment?: Moment) => {
    if (moment) {
      setEditingMoment(moment);
      setTitle(moment.title || "");
      setDescription(moment.description || "");
      setMomentDate(moment.moment_date);
    } else {
      setEditingMoment(null);
      setTitle("");
      setDescription("");
      setMomentDate(dateToYMDLocal(new Date()));
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingMoment(null);
    setTitle("");
    setDescription("");
    setMomentDate(dateToYMDLocal(new Date()));
  };

  const handleSave = async () => {
    if (!title?.trim()) {
      toast.error("Please add a title");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const momentData = {
      title: title.trim(),
      description: description.trim() || null,
      moment_date: momentDate,
      partner_ids: partnerId ? [partnerId] : [],
      user_id: session.user.id,
    };

    if (editingMoment) {
      const { error } = await supabase
        .from("moments")
        .update(momentData)
        .eq("id", editingMoment.id);

      if (error) {
        toast.error("Failed to update moment");
        console.error(error);
      } else {
        toast.success("Moment updated");
        loadMoments();
        handleCloseDialog();
      }
    } else {
      const { error } = await supabase
        .from("moments")
        .insert(momentData);

      if (error) {
        toast.error("Failed to create moment");
        console.error(error);
      } else {
        toast.success("Moment created");
        loadMoments();
        handleCloseDialog();
      }
    }
  };

  const handleDelete = async (momentId: string) => {
    if (!confirm("Delete this moment? This cannot be undone.")) return;

    const { error } = await supabase
      .from("moments")
      .delete()
      .eq("id", momentId);

    if (error) {
      toast.error("Failed to delete moment");
      console.error(error);
    } else {
      toast.success("Moment deleted");
      loadMoments();
    }
  };

  const getPartnerNames = (partnerIds: string[]) => {
    return partnerIds
      .map((id) => partners.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading moments...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Moments</h3>
          <p className="text-sm text-muted-foreground">
            {partnerId ? `Special memories with ${partnerName}` : "Your cherished memories"}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Moment
        </Button>
      </div>

      {moments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              No moments yet — Add your first memory
            </p>
            <Button onClick={() => handleOpenDialog()} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Moment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {moments.map((moment) => (
            <Card key={moment.id} className="shadow-soft hover:shadow-glow transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {moment.title || "Untitled Moment"}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{format(parseYMDToLocalDate(moment.moment_date), "MMMM d, yyyy")}</span>
                      {showPartnerColumn && moment.partner_ids.length > 0 && (
                        <span className="text-primary">• {getPartnerNames(moment.partner_ids)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(moment)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(moment.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm whitespace-pre-wrap">{moment.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMoment ? "Edit Moment" : "Add Moment"}
            </DialogTitle>
            <DialogDescription>
              {partnerId
                ? `Record a special memory with ${partnerName}`
                : "Capture a cherished memory"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="moment-date">Date *</Label>
              <Input
                id="moment-date"
                type="date"
                value={momentDate}
                onChange={(e) => setMomentDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="moment-title">Title *</Label>
              <Input
                id="moment-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., First Date, Anniversary Dinner"
              />
            </div>
            <div>
              <Label htmlFor="moment-description">Note (optional)</Label>
              <Textarea
                id="moment-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What made this moment special?"
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingMoment ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
