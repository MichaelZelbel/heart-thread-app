import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Image as ImageIcon, FileText, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const isImage = (mimeType: string | null) => {
    return mimeType?.startsWith("image/");
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
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          Upload Media
        </Button>
      </div>

      <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
        Media upload functionality requires a storage bucket to be configured. 
        Files will be stored and managed here once set up.
      </p>

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
      ) : media?.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No media files</h3>
          <p className="text-muted-foreground text-sm">
            Upload images and files to use in your blog posts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {media?.map((file) => (
            <Card key={file.id} className="overflow-hidden group">
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
                  <Button size="icon" variant="secondary">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">
                  {file.alt_text || "Untitled"}
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
    </div>
  );
}
