import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Save,
  Send,
  Clock,
  ChevronDown,
  Eye,
  Edit,
  Check,
  AlertCircle,
  Loader2,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PostFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  seo_title: string;
  seo_description: string;
  og_image_url: string;
  featured_image_id: string | null;
  status: "draft" | "published" | "scheduled";
  published_at: Date | null;
  category_ids: string[];
  tag_ids: string[];
}

const initialFormData: PostFormData = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  seo_title: "",
  seo_description: "",
  og_image_url: "",
  featured_image_id: null,
  status: "draft",
  published_at: null,
  category_ids: [],
  tag_ids: [],
};

export default function BlogPostEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState<PostFormData>(initialFormData);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview" | "split">("edit");
  const [isSeoOpen, setIsSeoOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // Fetch existing post
  const { data: existingPost, isLoading: isLoadingPost } = useQuery({
    queryKey: ["blog-post", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  // Fetch post categories
  const { data: postCategories } = useQuery({
    queryKey: ["blog-post-categories", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("blog_post_categories")
        .select("category_id")
        .eq("post_id", id);
      if (error) throw error;
      return data.map((pc) => pc.category_id);
    },
    enabled: isEditing,
  });

  // Fetch post tags
  const { data: postTags } = useQuery({
    queryKey: ["blog-post-tags", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("blog_post_tags")
        .select("tag_id")
        .eq("post_id", id);
      if (error) throw error;
      return data.map((pt) => pt.tag_id);
    },
    enabled: isEditing,
  });

  // Fetch all categories
  const { data: categories } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all tags
  const { data: tags } = useQuery({
    queryKey: ["blog-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Populate form with existing post data
  useEffect(() => {
    if (existingPost) {
      setFormData({
        title: existingPost.title || "",
        slug: existingPost.slug || "",
        content: existingPost.content || "",
        excerpt: existingPost.excerpt || "",
        seo_title: existingPost.seo_title || "",
        seo_description: existingPost.seo_description || "",
        og_image_url: existingPost.og_image_url || "",
        featured_image_id: existingPost.featured_image_id,
        status: existingPost.status as "draft" | "published" | "scheduled",
        published_at: existingPost.published_at ? new Date(existingPost.published_at) : null,
        category_ids: [],
        tag_ids: [],
      });
      setSlugManuallyEdited(true);
      if (existingPost.published_at) {
        const pubDate = new Date(existingPost.published_at);
        setScheduleDate(pubDate);
        setScheduleTime(format(pubDate, "HH:mm"));
      }
    }
  }, [existingPost]);

  useEffect(() => {
    if (postCategories) {
      setFormData((prev) => ({ ...prev, category_ids: postCategories }));
    }
  }, [postCategories]);

  useEffect(() => {
    if (postTags) {
      setFormData((prev) => ({ ...prev, tag_ids: postTags }));
    }
  }, [postTags]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && formData.title) {
      const newSlug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      setFormData((prev) => ({ ...prev, slug: newSlug }));
    }
  }, [formData.title, slugManuallyEdited]);

  // Validate slug uniqueness
  const validateSlug = useCallback(
    async (slug: string) => {
      if (!slug) {
        setSlugError("Slug is required");
        return false;
      }
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id")
        .eq("slug", slug)
        .neq("id", id || "00000000-0000-0000-0000-000000000000")
        .limit(1);

      if (error) {
        console.error("Error validating slug:", error);
        return true;
      }

      if (data && data.length > 0) {
        setSlugError("This slug is already in use");
        return false;
      }

      setSlugError(null);
      return true;
    },
    [id]
  );

  // Debounced slug validation
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (formData.slug) {
        validateSlug(formData.slug);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [formData.slug, validateSlug]);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  // Save post mutation
  const saveMutation = useMutation({
    mutationFn: async ({
      data,
      status,
      publishedAt,
    }: {
      data: PostFormData;
      status: "draft" | "published" | "scheduled";
      publishedAt: Date | null;
    }) => {
      const postData = {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        seo_title: data.seo_title,
        seo_description: data.seo_description,
        og_image_url: data.og_image_url,
        featured_image_id: data.featured_image_id,
        status,
        published_at: publishedAt?.toISOString() || null,
        author_id: currentUser?.id,
      };

      let postId = id;

      if (isEditing) {
        const { error } = await supabase
          .from("blog_posts")
          .update(postData)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data: newPost, error } = await supabase
          .from("blog_posts")
          .insert(postData)
          .select("id")
          .single();
        if (error) throw error;
        postId = newPost.id;
      }

      // Update categories
      await supabase.from("blog_post_categories").delete().eq("post_id", postId);
      if (data.category_ids.length > 0) {
        await supabase.from("blog_post_categories").insert(
          data.category_ids.map((categoryId) => ({
            post_id: postId,
            category_id: categoryId,
          }))
        );
      }

      // Update tags
      await supabase.from("blog_post_tags").delete().eq("post_id", postId);
      if (data.tag_ids.length > 0) {
        await supabase.from("blog_post_tags").insert(
          data.tag_ids.map((tagId) => ({
            post_id: postId,
            tag_id: tagId,
          }))
        );
      }

      return postId;
    },
    onSuccess: (postId) => {
      queryClient.invalidateQueries({ queryKey: ["blog-admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog-post", postId] });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: (error) => {
      console.error("Save error:", error);
      setSaveStatus("error");
      toast.error("Failed to save post");
    },
  });

  // Autosave
  useEffect(() => {
    if (!formData.title || !formData.slug) return;
    if (formData.status !== "draft") return;

    const timeout = setTimeout(async () => {
      const isValid = await validateSlug(formData.slug);
      if (!isValid) return;

      setSaveStatus("saving");
      saveMutation.mutate({
        data: formData,
        status: "draft",
        publishedAt: null,
      });
    }, 30000);

    return () => clearTimeout(timeout);
  }, [formData]);

  const handleSaveDraft = async () => {
    const isValid = await validateSlug(formData.slug);
    if (!isValid) {
      toast.error("Please fix the slug before saving");
      return;
    }

    setSaveStatus("saving");
    const postId = await saveMutation.mutateAsync({
      data: formData,
      status: "draft",
      publishedAt: null,
    });
    toast.success("Draft saved");
    if (!isEditing && postId) {
      navigate(`/blog/admin/posts/${postId}`, { replace: true });
    }
  };

  const handlePublish = async () => {
    const isValid = await validateSlug(formData.slug);
    if (!isValid) {
      toast.error("Please fix the slug before publishing");
      return;
    }

    setSaveStatus("saving");
    const postId = await saveMutation.mutateAsync({
      data: formData,
      status: "published",
      publishedAt: new Date(),
    });
    toast.success("Post published!");
    if (!isEditing && postId) {
      navigate(`/blog/admin/posts/${postId}`, { replace: true });
    }
  };

  const handleSchedule = async () => {
    if (!scheduleDate) {
      toast.error("Please select a date");
      return;
    }

    const isValid = await validateSlug(formData.slug);
    if (!isValid) {
      toast.error("Please fix the slug before scheduling");
      return;
    }

    const [hours, minutes] = scheduleTime.split(":").map(Number);
    const scheduledDate = new Date(scheduleDate);
    scheduledDate.setHours(hours, minutes, 0, 0);

    if (scheduledDate <= new Date()) {
      toast.error("Scheduled date must be in the future");
      return;
    }

    setSaveStatus("saving");
    const postId = await saveMutation.mutateAsync({
      data: formData,
      status: "scheduled",
      publishedAt: scheduledDate,
    });
    toast.success(`Post scheduled for ${format(scheduledDate, "PPp")}`);
    setIsScheduleOpen(false);
    if (!isEditing && postId) {
      navigate(`/blog/admin/posts/${postId}`, { replace: true });
    }
  };

  const toggleCategory = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      category_ids: prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter((id) => id !== categoryId)
        : [...prev.category_ids, categoryId],
    }));
  };

  const toggleTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter((id) => id !== tagId)
        : [...prev.tag_ids, tagId],
    }));
  };

  // Simple markdown to HTML (basic)
  const renderMarkdown = useMemo(() => {
    let html = formData.content
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline">$1</a>')
      .replace(/\n/g, "<br />");
    return html;
  }, [formData.content]);

  if (isEditing && isLoadingPost) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/blog/admin/posts")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {isEditing ? "Edit Post" : "New Post"}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {saveStatus === "saving" && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Saved
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Error saving
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Popover open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" disabled={saveMutation.isPending}>
                <Clock className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="end">
              <div className="space-y-4">
                <div className="font-medium">Schedule publish</div>
                <Calendar
                  mode="single"
                  selected={scheduleDate}
                  onSelect={setScheduleDate}
                  disabled={(date) => date < new Date()}
                />
                <div className="flex items-center gap-2">
                  <Label>Time:</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-32"
                  />
                </div>
                <Button onClick={handleSchedule} className="w-full" disabled={saveMutation.isPending}>
                  Schedule Post
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button onClick={handlePublish} disabled={saveMutation.isPending}>
            <Send className="h-4 w-4 mr-2" />
            Publish Now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
        {/* Main Editor */}
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Input
              placeholder="Post title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="text-2xl font-bold h-14 border-0 border-b rounded-none px-0 focus-visible:ring-0"
            />
          </div>

          {/* Slug */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/blog/</span>
              <Input
                value={formData.slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setFormData({ ...formData, slug: e.target.value });
                }}
                className={cn(
                  "font-mono text-sm h-8",
                  slugError && "border-destructive focus-visible:ring-destructive"
                )}
              />
            </div>
            {slugError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {slugError}
              </p>
            )}
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              placeholder="Brief summary of the post..."
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              rows={2}
            />
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Content</Label>
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={previewMode === "edit" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewMode("edit")}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewMode === "split" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewMode("split")}
                >
                  Split
                </Button>
                <Button
                  variant={previewMode === "preview" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewMode("preview")}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div
              className={cn(
                "grid gap-4",
                previewMode === "split" && "grid-cols-2"
              )}
            >
              {(previewMode === "edit" || previewMode === "split") && (
                <Textarea
                  placeholder="Write your post content in Markdown..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="min-h-[500px] font-mono text-sm resize-none"
                />
              )}
              {(previewMode === "preview" || previewMode === "split") && (
                <div
                  className="min-h-[500px] p-4 border rounded-md bg-card prose prose-sm max-w-none overflow-auto"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown || "<p class='text-muted-foreground'>Preview will appear here...</p>" }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          {existingPost && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent className="py-3 pt-0">
                <Badge
                  variant={
                    existingPost.status === "published"
                      ? "default"
                      : existingPost.status === "scheduled"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {existingPost.status}
                </Badge>
                {existingPost.published_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {existingPost.status === "scheduled" ? "Scheduled for " : "Published "}
                    {format(new Date(existingPost.published_at), "PPp")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Categories */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent className="py-3 pt-0 max-h-48 overflow-auto">
              {categories?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories yet</p>
              ) : (
                <div className="space-y-2">
                  {categories?.map((category) => (
                    <div key={category.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`cat-${category.id}`}
                        checked={formData.category_ids.includes(category.id)}
                        onCheckedChange={() => toggleCategory(category.id)}
                      />
                      <Label
                        htmlFor={`cat-${category.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {category.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Tags</CardTitle>
            </CardHeader>
            <CardContent className="py-3 pt-0">
              {tags?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags?.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={formData.tag_ids.includes(tag.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                      {formData.tag_ids.includes(tag.id) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Featured Image</CardTitle>
            </CardHeader>
            <CardContent className="py-3 pt-0">
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Select from media library
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Collapsible open={isSeoOpen} onOpenChange={setIsSeoOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="py-3 cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">SEO Settings</CardTitle>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isSeoOpen && "rotate-180"
                      )}
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="py-3 pt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="seo_title">SEO Title</Label>
                    <Input
                      id="seo_title"
                      value={formData.seo_title}
                      onChange={(e) =>
                        setFormData({ ...formData, seo_title: e.target.value })
                      }
                      placeholder={formData.title || "Post title"}
                    />
                    <p className="text-xs text-muted-foreground">
                      {(formData.seo_title || formData.title).length}/60 characters
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seo_description">Meta Description</Label>
                    <Textarea
                      id="seo_description"
                      value={formData.seo_description}
                      onChange={(e) =>
                        setFormData({ ...formData, seo_description: e.target.value })
                      }
                      placeholder={formData.excerpt || "Post excerpt"}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      {(formData.seo_description || formData.excerpt).length}/160 characters
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="og_image">OG Image URL</Label>
                    <Input
                      id="og_image"
                      value={formData.og_image_url}
                      onChange={(e) =>
                        setFormData({ ...formData, og_image_url: e.target.value })
                      }
                      placeholder="https://..."
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
