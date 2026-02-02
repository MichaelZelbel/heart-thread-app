import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FolderTree, Tags, Image, Clock, CheckCircle, FileEdit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function BlogAdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["blog-admin-stats"],
    queryFn: async () => {
      const [postsRes, categoriesRes, tagsRes, mediaRes] = await Promise.all([
        supabase.from("blog_posts").select("id, status", { count: "exact" }),
        supabase.from("blog_categories").select("id", { count: "exact" }),
        supabase.from("blog_tags").select("id", { count: "exact" }),
        supabase.from("blog_media").select("id", { count: "exact" }),
      ]);

      const posts = postsRes.data || [];
      const publishedCount = posts.filter((p) => p.status === "published").length;
      const draftCount = posts.filter((p) => p.status === "draft").length;
      const scheduledCount = posts.filter((p) => p.status === "scheduled").length;

      return {
        totalPosts: postsRes.count || 0,
        publishedPosts: publishedCount,
        draftPosts: draftCount,
        scheduledPosts: scheduledCount,
        categories: categoriesRes.count || 0,
        tags: tagsRes.count || 0,
        media: mediaRes.count || 0,
      };
    },
  });

  const statCards = [
    {
      title: "Total Posts",
      value: stats?.totalPosts ?? 0,
      icon: FileText,
      description: "All blog posts",
    },
    {
      title: "Published",
      value: stats?.publishedPosts ?? 0,
      icon: CheckCircle,
      description: "Live on the blog",
      color: "text-green-600",
    },
    {
      title: "Drafts",
      value: stats?.draftPosts ?? 0,
      icon: FileEdit,
      description: "Work in progress",
      color: "text-amber-600",
    },
    {
      title: "Scheduled",
      value: stats?.scheduledPosts ?? 0,
      icon: Clock,
      description: "Pending publish",
      color: "text-blue-600",
    },
    {
      title: "Categories",
      value: stats?.categories ?? 0,
      icon: FolderTree,
      description: "Content organization",
    },
    {
      title: "Tags",
      value: stats?.tags ?? 0,
      icon: Tags,
      description: "Content labels",
    },
    {
      title: "Media Files",
      value: stats?.media ?? 0,
      icon: Image,
      description: "Images & assets",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your blog content and activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color || "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{card.value}</div>
              )}
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for managing your blog</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <a
              href="/blog/admin/posts/new"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted transition-colors"
            >
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Create New Post</div>
                <div className="text-sm text-muted-foreground">Start writing a new blog post</div>
              </div>
            </a>
            <a
              href="/blog/admin/categories"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted transition-colors"
            >
              <FolderTree className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Manage Categories</div>
                <div className="text-sm text-muted-foreground">Organize your content structure</div>
              </div>
            </a>
            <a
              href="/blog/admin/media"
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted transition-colors"
            >
              <Image className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">Upload Media</div>
                <div className="text-sm text-muted-foreground">Add images and files</div>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Tips for using the blog CMS</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Posts:</strong> Create and manage your blog articles. 
              Save as drafts, schedule for later, or publish immediately.
            </p>
            <p>
              <strong className="text-foreground">Categories:</strong> Organize posts into hierarchical 
              categories for better navigation and SEO.
            </p>
            <p>
              <strong className="text-foreground">Tags:</strong> Add tags to posts for flexible 
              cross-category organization.
            </p>
            <p>
              <strong className="text-foreground">Media:</strong> Upload and manage images and files 
              used in your blog posts.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
