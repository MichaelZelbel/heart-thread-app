import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, GripVertical, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserRole } from "@/hooks/useUserRole";
import { UpgradePrompt } from "@/components/UpgradePrompt";

interface ProfileDetail {
  id: string;
  category: string;
  label: string;
  value: string;
  position: number;
}

interface CategoryConfig {
  id: string;
  label: string;
  explainer: string;
  emptyState: string;
  valueOnly?: boolean;
  labelSuggestions?: string[];
  valueSuggestions?: string[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: "body",
    label: "Body",
    explainer: "Little details about how they look and carry themselves.",
    emptyState: "Add your first detail — height, eyes, style, anything you notice.",
    labelSuggestions: ["Height", "Weight", "Eye Color", "Hair Color", "Clothing Size", "Shoe Size", "Tattoo", "Piercing", "Body Type", "Skin Tone"],
  },
  {
    id: "favorites",
    label: "Favorites",
    explainer: "Their go-to joys — from food to music to guilty pleasures.",
    emptyState: "What lights them up? Add their favorite thing.",
    labelSuggestions: ["Food", "Drink", "Movie", "Music", "Perfume", "Destination", "Hobby", "Book", "Artist", "Flower"],
  },
  {
    id: "links",
    label: "Links",
    explainer: "Where to find them online when you're not together.",
    emptyState: "Add a link to their social profile or favorite place online.",
    labelSuggestions: ["TikTok", "Instagram", "Discord", "WhatsApp", "Twitter/X", "Facebook", "VRChat", "Steam", "Snapchat", "OnlyFans"],
  },
  {
    id: "nicknames",
    label: "Nicknames",
    explainer: "How you call them when it's just the two of you.",
    emptyState: "Add your first nickname — sweet, silly, or special.",
    valueOnly: true,
  },
  {
    id: "friends_family",
    label: "Friends & Family",
    explainer: "The other important people in their life.",
    emptyState: "Who matters to them? Add a friend or family member.",
    labelSuggestions: ["Mother", "Father", "Sister", "Brother", "Best Friend", "Close Friend", "Mentor", "Roommate", "Child", "Cousin"],
  },
  {
    id: "pets",
    label: "Pets",
    explainer: "Because the furry (or feathery, or scaly) ones count too.",
    emptyState: "Add their beloved companion — paws, claws, or fins.",
    labelSuggestions: ["Dog", "Cat", "Bird", "Fish", "Rabbit", "Reptile", "Hamster", "Horse", "Ferret", "Other"],
  },
  {
    id: "games",
    label: "Games",
    explainer: "The worlds they love to play in.",
    emptyState: "What game do they play? Add it here.",
    valueOnly: true,
    valueSuggestions: ["VRChat", "Roblox", "Fortnite", "Valorant", "Overwatch", "Minecraft", "League of Legends", "Genshin Impact", "Apex Legends", "World of Warcraft"],
  },
  {
    id: "relationship",
    label: "Relationship",
    explainer: "What kind of connection you share — poly, mono, long-distance, or something uniquely yours.",
    emptyState: "Define your bond — add a relationship detail.",
    valueOnly: true,
    valueSuggestions: ["Poly", "Monogamous", "Open", "Long Distance", "VR Relationship", "Casual", "Committed", "Situationship", "Exploring", "Toys"],
  },
];

interface ProfileDetailsManagerProps {
  partnerId: string;
  category: CategoryConfig;
}

interface SortableItemProps {
  detail: ProfileDetail;
  category: CategoryConfig;
  isEditing: boolean;
  editLabel: string;
  editValue: string;
  onEditLabelChange: (value: string) => void;
  onEditValueChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableItem({
  detail,
  category,
  isEditing,
  editLabel,
  editValue,
  onEditLabelChange,
  onEditValueChange,
  onSave,
  onCancel,
  onEdit,
  onDelete,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: detail.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderValue = () => {
    if (category.id === "links" && !isEditing) {
      const url = detail.value.startsWith("http://") || detail.value.startsWith("https://")
        ? detail.value
        : `https://${detail.value}`;
      
      // Extract domain as fallback if no label
      const getDomain = (urlString: string) => {
        try {
          const urlObj = new URL(urlString);
          return urlObj.hostname.replace('www.', '');
        } catch {
          return urlString;
        }
      };
      
      const linkText = detail.label || getDomain(url);
      
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline truncate block"
          onClick={(e) => e.stopPropagation()}
        >
          {linkText}
        </a>
      );
    }
    return <span className="break-words">{detail.value}</span>;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
    >
      {isEditing ? (
        <>
          <div className="flex-1 flex gap-2">
            {!category.valueOnly && (
              <Input
                value={editLabel}
                onChange={(e) => onEditLabelChange(e.target.value)}
                placeholder="Label"
                className="h-9 w-1/3"
              />
            )}
            <Input
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              placeholder="Value"
              className={`h-9 ${category.valueOnly ? 'flex-1' : 'flex-1'}`}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSave();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  onCancel();
                }
              }}
              autoFocus
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onSave}
            className="h-9 w-9 shrink-0"
            aria-label="Save changes"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onCancel}
            className="h-9 w-9 shrink-0"
            aria-label="Cancel edit"
          >
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 shrink-0"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            {category.valueOnly ? (
              renderValue()
            ) : category.id === "links" ? (
              renderValue()
            ) : (
              <span className="font-medium">
                {detail.label}: {renderValue()}
              </span>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onEdit}
            className="h-9 w-9 shrink-0"
            aria-label="Edit item"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
            aria-label="Delete item"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );
}

export const ProfileDetailsManager = ({ partnerId, category }: ProfileDetailsManagerProps) => {
  const { isPro } = useUserRole();
  const [details, setDetails] = useState<ProfileDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editValue, setEditValue] = useState("");
  const [customLabel, setCustomLabel] = useState(false);
  const [customValue, setCustomValue] = useState(false);

  // Check if this category is Pro-only
  const isProCategory = ['relationship', 'favorites', 'friends_family'].includes(category.id);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadDetails();
  }, [partnerId, category.id]);

  const loadDetails = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const { data, error } = await supabase
        .from("partner_profile_details")
        .select("*")
        .eq("partner_id", partnerId)
        .eq("category", category.id)
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

  const handleAdd = async () => {
    if (!category.valueOnly && !newLabel.trim()) {
      toast.error("Please add a label");
      return;
    }

    if (!newValue.trim()) {
      toast.error("Please add a value");
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error("You must be logged in");
        return;
      }

      const maxPosition = details.length > 0 ? Math.max(...details.map(d => d.position)) : -1;

      let finalValue = newValue.trim();
      // Auto-prefix https:// for links if not present
      if (category.id === "links" && !finalValue.startsWith("http://") && !finalValue.startsWith("https://")) {
        finalValue = `https://${finalValue}`;
      }

      const { error } = await supabase
        .from("partner_profile_details")
        .insert([{
          partner_id: partnerId,
          category: category.id,
          label: category.valueOnly ? "" : newLabel.trim(),
          value: finalValue,
          user_id: session.session.user.id,
          position: maxPosition + 1,
        }]);

      if (error) throw error;

      setNewLabel("");
      setNewValue("");
      setCustomLabel(false);
      setCustomValue(false);
      await loadDetails();
      toast.success("Added!");
    } catch (error) {
      console.error("Error adding profile detail:", error);
      toast.error("Failed to add field");
    }
  };

  const startEdit = (detail: ProfileDetail) => {
    setEditingId(detail.id);
    setEditLabel(detail.label);
    setEditValue(detail.value);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel("");
    setEditValue("");
  };

  const saveEdit = async (id: string) => {
    if (!category.valueOnly && !editLabel.trim()) {
      toast.error("Please add a label");
      return;
    }

    if (!editValue.trim()) {
      toast.error("Please add a value");
      return;
    }

    try {
      let finalValue = editValue.trim();
      // Auto-prefix https:// for links if not present
      if (category.id === "links" && !finalValue.startsWith("http://") && !finalValue.startsWith("https://")) {
        finalValue = `https://${finalValue}`;
      }

      const { error } = await supabase
        .from("partner_profile_details")
        .update({
          label: category.valueOnly ? "" : editLabel.trim(),
          value: finalValue,
        })
        .eq("id", id);

      if (error) throw error;

      setEditingId(null);
      setEditLabel("");
      setEditValue("");
      await loadDetails();
      toast.success("Updated!");
    } catch (error) {
      console.error("Error updating profile detail:", error);
      toast.error("Failed to update field");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("partner_profile_details")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Deleted");
      await loadDetails();
    } catch (error) {
      console.error("Error deleting profile detail:", error);
      toast.error("Failed to delete field");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = details.findIndex((d) => d.id === active.id);
    const newIndex = details.findIndex((d) => d.id === over.id);

    const reorderedDetails = arrayMove(details, oldIndex, newIndex);
    setDetails(reorderedDetails);

    // Update positions in database
    const updates = reorderedDetails.map((detail, index) =>
      supabase
        .from("partner_profile_details")
        .update({ position: index })
        .eq("id", detail.id)
    );

    await Promise.all(updates);
  };

  if (loading) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>{category.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  // Show upgrade prompt for Pro categories if user is not Pro
  if (isProCategory && !isPro) {
    return (
      <UpgradePrompt 
        featureName={category.label}
        description={category.explainer}
      />
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>{category.label}</CardTitle>
        <CardDescription>{category.explainer}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {details.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            {category.emptyState}
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={details.map(d => d.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {details.map((detail) => (
                  <SortableItem
                    key={detail.id}
                    detail={detail}
                    category={category}
                    isEditing={editingId === detail.id}
                    editLabel={editLabel}
                    editValue={editValue}
                    onEditLabelChange={setEditLabel}
                    onEditValueChange={setEditValue}
                    onSave={() => saveEdit(detail.id)}
                    onCancel={cancelEdit}
                    onEdit={() => startEdit(detail)}
                    onDelete={() => handleDelete(detail.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div className="flex gap-2 pt-2">
          {!category.valueOnly && (
            category.labelSuggestions ? (
              customLabel ? (
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Custom label"
                  className="w-1/3"
                  onBlur={() => {
                    if (!newLabel.trim()) {
                      setCustomLabel(false);
                    }
                  }}
                />
              ) : (
                <Select
                  value={newLabel}
                  onValueChange={(value) => {
                    if (value === "custom") {
                      setCustomLabel(true);
                      setNewLabel("");
                    } else {
                      setNewLabel(value);
                    }
                  }}
                >
                  <SelectTrigger className="w-1/3">
                    <SelectValue placeholder="Label" />
                  </SelectTrigger>
                  <SelectContent>
                    {category.labelSuggestions.map((suggestion) => (
                      <SelectItem key={suggestion} value={suggestion}>
                        {suggestion}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
              )
            ) : (
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label"
                className="w-1/3"
              />
            )
          )}
          {category.valueSuggestions ? (
            customValue ? (
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Custom value"
                className="flex-1"
                onBlur={() => {
                  if (!newValue.trim()) {
                    setCustomValue(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                autoFocus
              />
            ) : (
              <Select
                value={newValue}
                onValueChange={(value) => {
                  if (value === "custom") {
                    setCustomValue(true);
                    setNewValue("");
                  } else {
                    setNewValue(value);
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select or type custom" />
                </SelectTrigger>
                <SelectContent>
                  {category.valueSuggestions.map((suggestion) => (
                    <SelectItem key={suggestion} value={suggestion}>
                      {suggestion}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom...</SelectItem>
                </SelectContent>
              </Select>
            )
          ) : (
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={category.valueOnly ? `e.g., ${category.label === "Nicknames" ? "Sweetie" : "Value"}` : "Value"}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
          )}
          <Button onClick={handleAdd} size="icon" className="shrink-0 bg-destructive hover:bg-destructive/90">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export { CATEGORIES };
