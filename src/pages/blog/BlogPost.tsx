import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { BlogSEO } from "@/components/blog/BlogSEO";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Calendar, User, ArrowLeft } from "lucide-react";
import { marked } from "marked";
import { useMemo } from "react";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["blog-post-public", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          `
          id,
          title,
          slug,
          content,
          excerpt,
          published_at,
          seo_title,
          seo_description,
          og_image_url,
          featured_image_id,
          author:profiles!blog_posts_author_id_fkey(display_name)
        `
        )
        .eq("slug", slug)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .single();

      if (error) throw error;

      // Get featured image
      let featured_image = null;
      if (data.featured_image_id) {
        const { data: img } = await supabase
          .from("blog_media")
          .select("url, alt_text")
          .eq("id", data.featured_image_id)
          .single();
        featured_image = img;
      }

      // Get categories
      const { data: postCats } = await supabase
        .from("blog_post_categories")
        .select("category:blog_categories(id, name, slug)")
        .eq("post_id", data.id);
      const categories = postCats?.map((pc) => pc.category).filter(Boolean) || [];

      // Get tags
      const { data: postTags } = await supabase
        .from("blog_post_tags")
        .select("tag:blog_tags(id, name, slug)")
        .eq("post_id", data.id);
      const tags = postTags?.map((pt) => pt.tag).filter(Boolean) || [];

      return {
        ...data,
        featured_image,
        categories,
        tags,
      };
    },
    enabled: !!slug,
  });

  const htmlContent = useMemo(() => {
    if (!post?.content) return "";
    return marked(post.content, { async: false }) as string;
  }, [post?.content]);

  const authorInitial = post?.author?.display_name?.charAt(0).toUpperCase() || "A";

  if (isLoading) {
    return (
      <BlogLayout showBackLink>
        <div className="space-y-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="aspect-video w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </BlogLayout>
    );
  }

  if (error || !post) {
    return (
      <BlogLayout showBackLink>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Post Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The post you're looking for doesn't exist or has been removed.
          </p>
          <Link to="/blog" className="text-primary hover:underline">
            ← Back to Blog
          </Link>
        </div>
      </BlogLayout>
    );
  }

  const seoTitle = post.seo_title || post.title;
  const seoDescription = post.seo_description || post.excerpt || "";
  const ogImage = post.og_image_url || post.featured_image?.url;

  return (
    <>
      <BlogSEO
        title={`${seoTitle} | Cherishly Blog`}
        description={seoDescription}
        canonical={`/blog/${post.slug}`}
        ogImage={ogImage}
        ogType="article"
        publishedTime={post.published_at || undefined}
        author={post.author?.display_name}
        articleData={{
          headline: post.title,
          datePublished: post.published_at || new Date().toISOString(),
          author: post.author?.display_name,
          image: ogImage,
          description: seoDescription,
        }}
      />
      <BlogLayout showBackLink>
        <article className="max-w-none">
          {/* Back Link */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          {/* Categories */}
          {post.categories && post.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.categories.map((cat: any) => (
                <Link key={cat.id} to={`/blog/category/${cat.slug}`}>
                  <Badge variant="secondary">{cat.name}</Badge>
                </Link>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-4xl font-bold mb-4 leading-tight">{post.title}</h1>

          {/* Meta */}
          <div className="flex items-center gap-4 text-muted-foreground mb-8">
            {post.author && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{authorInitial}</AvatarFallback>
                </Avatar>
                <span>{post.author.display_name}</span>
              </div>
            )}
            {post.published_at && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <time dateTime={post.published_at}>
                  {format(new Date(post.published_at), "MMMM d, yyyy")}
                </time>
              </div>
            )}
          </div>

          {/* Featured Image */}
          {post.featured_image?.url && (
            <div className="aspect-video overflow-hidden rounded-lg mb-8 bg-muted">
              <img
                src={post.featured_image.url}
                alt={post.featured_image.alt_text || post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-lg max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-pre:bg-muted prose-pre:border prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t">
              <span className="text-sm text-muted-foreground mr-2">Tags:</span>
              {post.tags.map((tag: any) => (
                <Link key={tag.id} to={`/blog/tag/${tag.slug}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                    #{tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </article>
      </BlogLayout>
    </>
  );
}
