import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { BlogSEO } from "@/components/blog/BlogSEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

const POSTS_PER_PAGE = 10;

export default function BlogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);

  const { data, isLoading } = useQuery({
    queryKey: ["blog-posts", page],
    queryFn: async () => {
      const from = (page - 1) * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      // Get posts
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
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Get categories and tags for each post
      const postsWithMeta = await Promise.all(
        (posts || []).map(async (post) => {
          // Get featured image
          let featured_image = null;
          if (post.featured_image_id) {
            const { data: img } = await supabase
              .from("blog_media")
              .select("url, alt_text")
              .eq("id", post.featured_image_id)
              .single();
            featured_image = img;
          }

          // Get categories
          const { data: postCats } = await supabase
            .from("blog_post_categories")
            .select("category:blog_categories(id, name, slug)")
            .eq("post_id", post.id);
          const categories = postCats?.map((pc) => pc.category).filter(Boolean) || [];

          // Get tags
          const { data: postTags } = await supabase
            .from("blog_post_tags")
            .select("tag:blog_tags(id, name, slug)")
            .eq("post_id", post.id);
          const tags = postTags?.map((pt) => pt.tag).filter(Boolean) || [];

          return {
            ...post,
            featured_image,
            categories,
            tags,
          };
        })
      );

      return {
        posts: postsWithMeta,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / POSTS_PER_PAGE),
      };
    },
  });

  const goToPage = (newPage: number) => {
    setSearchParams({ page: newPage.toString() });
    window.scrollTo(0, 0);
  };

  return (
    <>
      <BlogSEO
        title="Blog | Cherishly"
        description="Read our latest articles about relationships, love languages, and building deeper connections."
        canonical="/blog"
      />
      <BlogLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Latest Posts</h1>
            <p className="text-muted-foreground">
              Insights on relationships, love languages, and meaningful connections
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-video w-full rounded-lg" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : data?.posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts published yet.</p>
            </div>
          ) : (
            <>
              <div className="space-y-12">
                {data?.posts.map((post) => (
                  <BlogPostCard key={post.id} post={post as any} />
                ))}
              </div>

              {/* Pagination */}
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
