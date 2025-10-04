import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit2, X, Check, GripVertical } from "lucide-react";
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

interface Item {
  id: string;
  item: string;
  position: number;
  created_at: string;
}

interface ItemManagerProps {
  partnerId: string;
  type: "likes" | "dislikes";
  title: string;
  subtitle: string;
  emptyState: string;
}

interface SortableItemProps {
  item: Item;
  isEditing: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableItem({
  item,
  isEditing,
  editValue,
  onEditChange,
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
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
      data-testid="item-row"
    >
      {isEditing ? (
        <>
          <div className="flex-1">
            <Input
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              className="h-9"
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
            data-testid="item-drag-handle"
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-medium break-words">{item.item}</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onEdit}
            className="h-9 w-9 shrink-0"
            aria-label="Edit item"
            data-testid="item-edit-button"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
            aria-label="Delete item"
            data-testid="item-delete-button"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );
}

export const ItemManager = ({ partnerId, type, title, subtitle, emptyState }: ItemManagerProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const tableName = type === "likes" ? "partner_likes" : "partner_dislikes";

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadItems();
  }, [partnerId, type]);

  const loadItems = async () => {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("partner_id", partnerId)
      .order("position", { ascending: true });

    if (error) {
      toast.error("Failed to load items");
      setLoading(false);
      return;
    }

    setItems(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newItem.trim()) {
      toast.error("Please enter an item");
      return;
    }

    const maxPosition = items.length > 0 ? Math.max(...items.map(i => i.position)) : -1;

    const { error } = await supabase
      .from(tableName)
      .insert({
        partner_id: partnerId,
        item: newItem.trim(),
        position: maxPosition + 1,
      });

    if (error) {
      toast.error("Failed to add item");
      return;
    }

    setNewItem("");
    loadItems();
    toast.success("Added!");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete item");
      return;
    }

    loadItems();
    toast.success("Deleted");
  };

  const startEdit = (item: Item) => {
    setEditingId(item.id);
    setEditValue(item.item);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) {
      toast.error("Please enter an item");
      return;
    }

    const { error } = await supabase
      .from(tableName)
      .update({ item: editValue.trim() })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update item");
      return;
    }

    setEditingId(null);
    setEditValue("");
    loadItems();
    toast.success("Updated!");
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    const reorderedItems = arrayMove(items, oldIndex, newIndex);
    setItems(reorderedItems);

    // Update positions in database
    const updates = reorderedItems.map((item, index) => 
      supabase
        .from(tableName)
        .update({ position: index })
        .eq("id", item.id)
    );

    await Promise.all(updates);
  };

  if (loading) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            {emptyState}
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2" data-testid={`${type}-list-container`}>
                {items.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    isEditing={editingId === item.id}
                    editValue={editValue}
                    onEditChange={setEditValue}
                    onSave={() => saveEdit(item.id)}
                    onCancel={cancelEdit}
                    onEdit={() => startEdit(item)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div className="flex gap-2 pt-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={type === "likes" ? "e.g., Chocolate Cake" : "e.g., Loud noises"}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            data-testid={`${type}-input`}
          />
          <Button onClick={handleAdd} size="icon" className="shrink-0" data-testid={`${type}-add-button`}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};