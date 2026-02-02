import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Image as ImageIcon,
  FileText,
  Trash2,
  Upload,
  X,
  Copy,
  Check,
  Search,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MediaFile {
  id: string;
  url: string;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
}

export default function BlogAdminMedia() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editAltText, setEditAltText] = useState("");
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: media, isLoading } = useQuery({
    queryKey: ["blog-admin-media"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_media")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MediaFile[];
    },
  });

  const filteredMedia = media?.filter((file) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      file.url.toLowerCase().includes(searchLower) ||
      file.alt_text?.toLowerCase().includes(searchLower)
    );
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const isImage = (mimeType: string | null) => {
    return mimeType?.startsWith("image/");
  };

  const getFilenameFromUrl = (url: string) => {
    const parts = url.split("/");
    return parts[parts.length - 1] || "Untitled";
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const uploadedFiles: MediaFile[] = [];

      for (const file of files) {
        // Generate unique filename
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = fileName;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("blog-media")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("blog-media")
          .getPublicUrl(filePath);

        // Get image dimensions if it's an image
        let width: number | null = null;
        let height: number | null = null;

        if (file.type.startsWith("image/")) {
          const dimensions = await getImageDimensions(file);
          width = dimensions.width;
          height = dimensions.height;
        }

        // Insert metadata into blog_media table
        const { data: mediaData, error: mediaError } = await supabase
          .from("blog_media")
          .insert({
            url: urlData.publicUrl,
            alt_text: file.name.split(".")[0],
            width,
            height,
            mime_type: file.type,
            file_size: file.size,
          })
          .select()
          .single();

        if (mediaError) throw mediaError;
        uploadedFiles.push(mediaData);
      }

      return uploadedFiles;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-admin-media"] });
      toast.success("Files uploaded successfully");
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Failed to upload files");
    },
  });

  // Update alt text mutation
  const updateAltTextMutation = useMutation({
    mutationFn: async ({ id, altText }: { id: string; altText: string }) => {
      const { error } = await supabase
        .from("blog_media")
        .update({ alt_text: altText })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-admin-media"] });
      toast.success("Alt text updated");
      setIsDetailsOpen(false);
    },
    onError: () => {
      toast.error("Failed to update alt text");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (mediaFile: MediaFile) => {
      // Extract filename from URL
      const urlParts = mediaFile.url.split("/");
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("blog-media")
        .remove([fileName]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
        // Continue to delete from database even if storage delete fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("blog_media")
        .delete()
        .eq("id", mediaFile.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-admin-media"] });
      toast.success("File deleted");
      setIsDetailsOpen(false);
      setSelectedMedia(null);
    },
    onError: () => {
      toast.error("Failed to delete file");
    },
  });

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync(Array.from(files));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, []);

  const openDetails = (file: MediaFile) => {
    setSelectedMedia(file);
    setEditAltText(file.alt_text || "");
    setIsDetailsOpen(true);
    setCopied(false);
  };

  const copyUrl = async () => {
    if (!selectedMedia) return;
    await navigator.clipboard.writeText(selectedMedia.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("URL copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Media Library</h2>
          <p className="text-muted-foreground">
            Manage images and files for your blog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <label htmlFor="file-upload">
            <Button asChild disabled={isUploading}>
              <span className="cursor-pointer">
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Upload Media
              </span>
            </Button>
          </label>
          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
            disabled={isUploading}
          />
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
      >
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          Drag and drop files here, or{" "}
          <label htmlFor="file-upload-zone" className="text-primary cursor-pointer hover:underline">
            browse
          </label>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supports JPG, PNG, GIF, WebP
        </p>
        <input
          id="file-upload-zone"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
          disabled={isUploading}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square" />
              <CardContent className="p-3">
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMedia?.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">
            {searchQuery ? "No matching files" : "No media files"}
          </h3>
          <p className="text-muted-foreground text-sm">
            {searchQuery
              ? "Try a different search term"
              : "Upload images and files to use in your blog posts."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredMedia?.map((file) => (
            <Card
              key={file.id}
              className="overflow-hidden group cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => openDetails(file)}
            >
              <div className="aspect-square relative bg-muted">
                {isImage(file.mime_type) ? (
                  <img
                    src={file.url}
                    alt={file.alt_text || "Media file"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(file);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">
                  {file.alt_text || getFilenameFromUrl(file.url)}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span>{formatFileSize(file.file_size)}</span>
                  <span>{format(new Date(file.created_at), "MMM d")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Media Details</DialogTitle>
          </DialogHeader>
          {selectedMedia && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-muted rounded-lg overflow-hidden">
                {isImage(selectedMedia.mime_type) ? (
                  <img
                    src={selectedMedia.url}
                    alt={selectedMedia.alt_text || "Media file"}
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="aspect-square flex items-center justify-center">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={selectedMedia.url}
                      readOnly
                      className="text-xs font-mono"
                    />
                    <Button size="icon" variant="outline" onClick={copyUrl}>
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alt-text">Alt Text</Label>
                  <Textarea
                    id="alt-text"
                    value={editAltText}
                    onChange={(e) => setEditAltText(e.target.value)}
                    placeholder="Describe this image for accessibility..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">File Size:</span>
                    <p className="font-medium">{formatFileSize(selectedMedia.file_size)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium">{selectedMedia.mime_type || "Unknown"}</p>
                  </div>
                  {selectedMedia.width && selectedMedia.height && (
                    <div>
                      <span className="text-muted-foreground">Dimensions:</span>
                      <p className="font-medium">
                        {selectedMedia.width} × {selectedMedia.height}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Uploaded:</span>
                    <p className="font-medium">
                      {format(new Date(selectedMedia.created_at), "PPp")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="destructive"
              onClick={() => selectedMedia && deleteMutation.mutate(selectedMedia)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              onClick={() =>
                selectedMedia &&
                updateAltTextMutation.mutate({
                  id: selectedMedia.id,
                  altText: editAltText,
                })
              }
              disabled={updateAltTextMutation.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
