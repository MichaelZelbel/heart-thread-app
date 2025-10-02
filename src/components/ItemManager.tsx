import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit2, X, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Item {
  id: string;
  item: string;
  tags: string[];
  created_at: string;
}

interface ItemManagerProps {
  partnerId: string;
  type: "likes" | "dislikes";
  title: string;
  subtitle: string;
  emptyState: string;
}

const STARTER_TAGS = [
  "Food", "Music", "Movies", "Drinks", "Books", 
  "Travel", "Fashion", "Tech", "Games", "Kinks"
];

export const ItemManager = ({ partnerId, type, title, subtitle, emptyState }: ItemManagerProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState("");
  const [editTag, setEditTag] = useState("");
  const [tagOpen, setTagOpen] = useState(false);
  const [editTagOpen, setEditTagOpen] = useState(false);

  const tableName = type === "likes" ? "partner_likes" : "partner_dislikes";

  useEffect(() => {
    loadItems();
  }, [partnerId, type]);

  const loadItems = async () => {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load items");
      return;
    }

    setItems(data || []);
    setLoading(false);
  };

  const allTags = Array.from(
    new Set([...STARTER_TAGS, ...items.flatMap(item => item.tags)])
  ).sort();

  const filteredItems = filterTag
    ? items.filter(item => item.tags.includes(filterTag))
    : items;

  const handleAdd = async () => {
    if (!newItem.trim() || !selectedTag.trim()) {
      toast.error("Please enter both item and tag");
      return;
    }

    const { error } = await supabase
      .from(tableName)
      .insert({
        partner_id: partnerId,
        item: newItem.trim(),
        tags: [selectedTag.trim()],
      });

    if (error) {
      toast.error("Failed to add item");
      return;
    }

    setNewItem("");
    setSelectedTag("");
    setTagSearch("");
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
    setEditItem(item.item);
    setEditTag(item.tags[0] || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditItem("");
    setEditTag("");
  };

  const handleEdit = async (id: string) => {
    if (!editItem.trim() || !editTag.trim()) {
      toast.error("Please enter both item and tag");
      return;
    }

    const { error } = await supabase
      .from(tableName)
      .update({
        item: editItem.trim(),
        tags: [editTag.trim()],
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update item");
      return;
    }

    setEditingId(null);
    setEditItem("");
    setEditTag("");
    loadItems();
    toast.success("Updated!");
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
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
        {/* Tag Filters */}
        {items.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2 border-b">
            <Badge
              variant={filterTag === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilterTag(null)}
            >
              All
            </Badge>
            {allTags.map(tag => (
              <Badge
                key={tag}
                variant={filterTag === tag ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFilterTag(tag === filterTag ? null : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Add New Item */}
        <div className="space-y-3">
          <div className="grid gap-3">
            <div>
              <Label htmlFor={`new-${type}-item`}>Item</Label>
              <Input
                id={`new-${type}-item`}
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="e.g., Chocolate Cake"
                onKeyDown={(e) => handleKeyDown(e, handleAdd)}
              />
            </div>
            <div>
              <Label>Tag</Label>
              <Popover open={tagOpen} onOpenChange={setTagOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedTag || "Choose or create tag..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search or create tag..." 
                      value={tagSearch}
                      onValueChange={setTagSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={() => {
                            setSelectedTag(tagSearch);
                            setTagOpen(false);
                            setTagSearch("");
                          }}
                        >
                          Create "{tagSearch}"
                        </Button>
                      </CommandEmpty>
                      <CommandGroup>
                        {allTags
                          .filter(tag => tag.toLowerCase().includes(tagSearch.toLowerCase()))
                          .map(tag => (
                            <CommandItem
                              key={tag}
                              onSelect={() => {
                                setSelectedTag(tag);
                                setTagOpen(false);
                              }}
                            >
                              {tag}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <Button onClick={handleAdd} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        {/* Items List */}
        <div className="space-y-2">
          {filteredItems.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              {filterTag ? `No items with tag "${filterTag}"` : emptyState}
            </p>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                {editingId === item.id ? (
                  <>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={editItem}
                        onChange={(e) => setEditItem(e.target.value)}
                        className="h-8"
                        onKeyDown={(e) => handleKeyDown(e, () => handleEdit(item.id))}
                      />
                      <Popover open={editTagOpen} onOpenChange={setEditTagOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-between"
                          >
                            {editTag || "Choose tag..."}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search or create tag..." />
                            <CommandList>
                              <CommandEmpty>
                                <Button
                                  variant="ghost"
                                  className="w-full"
                                  onClick={() => {
                                    setEditTagOpen(false);
                                  }}
                                >
                                  Create new tag
                                </Button>
                              </CommandEmpty>
                              <CommandGroup>
                                {allTags.map(tag => (
                                  <CommandItem
                                    key={tag}
                                    onSelect={() => {
                                      setEditTag(tag);
                                      setEditTagOpen(false);
                                    }}
                                  >
                                    {tag}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(item.id)}
                      className="h-8 w-8"
                      aria-label="Save changes"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={cancelEdit}
                      className="h-8 w-8"
                      aria-label="Cancel edit"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.item}</span>
                      <span className="text-muted-foreground">•</span>
                      <Badge variant="secondary">{item.tags[0]}</Badge>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(item)}
                      className="h-8 w-8"
                      aria-label="Edit item"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
