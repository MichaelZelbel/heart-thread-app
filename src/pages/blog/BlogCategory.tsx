import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { BlogSEO } from "@/components/blog/BlogSEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

const POSTS_PER_PAGE = 10;

export default function BlogCategory() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);

  // Fetch category
  const { data: category } = useQuery({
    queryKey: ["blog-category", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("*")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch posts in category
  const { data, isLoading } = useQuery({
    queryKey: ["blog-category-posts", slug, page],
    queryFn: async () => {
      if (!category) return { posts: [], totalCount: 0, totalPages: 0 };

      // Get post IDs in this category
      const { data: postIds } = await supabase
        .from("blog_post_categories")
        .select("post_id")
        .eq("category_id", category.id);

      if (!postIds || postIds.length === 0) {
        return { posts: [], totalCount: 0, totalPages: 0 };
      }

      const ids = postIds.map((p) => p.post_id);
      const from = (page - 1) * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      const { data: posts, error, count } = await supabase
        .from("blog_posts")
        .select(
          `
          id,
          title,
          slug,
          excerpt,
          published_at,
          featured_image_id,
          author:profiles!blog_posts_author_id_fkey(display_name)
        `,
          { count: "exact" }
        )
        .in("id", ids)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Get metadata for each post
      const postsWithMeta = await Promise.all(
        (posts || []).map(async (post) => {
          let featured_image = null;
          if (post.featured_image_id) {
            const { data: img } = await supabase
              .from("blog_media")
              .select("url, alt_text")
              .eq("id", post.featured_image_id)
              .single();
            featured_image = img;
          }

          const { data: postCats } = await supabase
            .from("blog_post_categories")
            .select("category:blog_categories(id, name, slug)")
            .eq("post_id", post.id);
          const categories = postCats?.map((pc) => pc.category).filter(Boolean) || [];

          const { data: postTags } = await supabase
            .from("blog_post_tags")
            .select("tag:blog_tags(id, name, slug)")
            .eq("post_id", post.id);
          const tags = postTags?.map((pt) => pt.tag).filter(Boolean) || [];

          return { ...post, featured_image, categories, tags };
        })
      );

      return {
        posts: postsWithMeta,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / POSTS_PER_PAGE),
      };
    },
    enabled: !!category,
  });

  const goToPage = (newPage: number) => {
    setSearchParams({ page: newPage.toString() });
    window.scrollTo(0, 0);
  };

  if (!category && !isLoading) {
    return (
      <BlogLayout showBackLink>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Category Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The category you're looking for doesn't exist.
          </p>
          <Link to="/blog" className="text-primary hover:underline">
            ← Back to Blog
          </Link>
        </div>
      </BlogLayout>
    );
  }

  return (
    <>
      <BlogSEO
        title={`${category?.name || "Category"} | Blog`}
        description={category?.description || `Posts in the ${category?.name} category`}
        canonical={`/blog/category/${slug}`}
      />
      <BlogLayout showBackLink>
        <div className="space-y-8">
          <div>
            <Link
              to="/blog"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>
            <h1 className="text-3xl font-bold mb-2">Category: {category?.name}</h1>
            {category?.description && (
              <p className="text-muted-foreground">{category.description}</p>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-video w-full rounded-lg" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : data?.posts.length === 0 ? (
            <p className="text-muted-foreground">No posts in this category yet.</p>
          ) : (
            <>
              <div className="space-y-12">
                {data?.posts.map((post) => (
                  <BlogPostCard key={post.id} post={post as any} />
                ))}
              </div>

              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-4">
                    Page {page} of {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= data.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </BlogLayout>
    </>
  );
}
