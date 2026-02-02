import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export function BlogSidebar() {
  // Fetch recent posts
  const { data: recentPosts, isLoading: loadingPosts } = useQuery({
    queryKey: ["blog-recent-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, published_at")
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories with post counts
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["blog-categories-with-counts"],
    queryFn: async () => {
      const { data: cats, error: catsError } = await supabase
        .from("blog_categories")
        .select("id, name, slug")
        .order("name");
      if (catsError) throw catsError;

      // Get post counts for each category
      const categoriesWithCounts = await Promise.all(
        cats.map(async (cat) => {
          const { count } = await supabase
            .from("blog_post_categories")
            .select("post_id", { count: "exact", head: true })
            .eq("category_id", cat.id);
          return { ...cat, postCount: count || 0 };
        })
      );

      return categoriesWithCounts.filter((c) => c.postCount > 0);
    },
  });

  // Fetch tags with post counts
  const { data: tags, isLoading: loadingTags } = useQuery({
    queryKey: ["blog-tags-with-counts"],
    queryFn: async () => {
      const { data: allTags, error: tagsError } = await supabase
        .from("blog_tags")
        .select("id, name, slug")
        .order("name");
      if (tagsError) throw tagsError;

      // Get post counts for each tag
      const tagsWithCounts = await Promise.all(
        allTags.map(async (tag) => {
          const { count } = await supabase
            .from("blog_post_tags")
            .select("post_id", { count: "exact", head: true })
            .eq("tag_id", tag.id);
          return { ...tag, postCount: count || 0 };
        })
      );

      return tagsWithCounts.filter((t) => t.postCount > 0);
    },
  });

  return (
    <aside className="space-y-6">
      {/* Recent Posts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Posts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingPosts ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))
          ) : recentPosts?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts yet</p>
          ) : (
            recentPosts?.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="block group"
              >
                <h4 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                  {post.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(post.published_at!), "MMM d, yyyy")}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCategories ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-24" />
              ))}
            </div>
          ) : categories?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories</p>
          ) : (
            <ul className="space-y-2">
              {categories?.map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/blog/category/${category.slug}`}
                    className="text-sm hover:text-primary transition-colors flex items-center justify-between"
                  >
                    <span>{category.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({category.postCount})
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Tags Cloud */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Tags</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTags ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-16" />
              ))}
            </div>
          ) : tags?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags?.map((tag) => (
                <Link key={tag.id} to={`/blog/tag/${tag.slug}`}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                    {tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
