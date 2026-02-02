import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Calendar, User } from "lucide-react";

interface BlogPostCardProps {
  post: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    published_at: string | null;
    featured_image?: {
      url: string;
      alt_text: string | null;
    } | null;
    author?: {
      display_name: string;
    } | null;
    categories?: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
    tags?: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
  };
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  const authorInitial = post.author?.display_name?.charAt(0).toUpperCase() || "A";

  return (
    <article className="group">
      <Link to={`/blog/${post.slug}`} className="block">
        {/* Featured Image */}
        {post.featured_image?.url && (
          <div className="aspect-video overflow-hidden rounded-lg mb-4 bg-muted">
            <img
              src={post.featured_image.url}
              alt={post.featured_image.alt_text || post.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}

        {/* Categories */}
        {post.categories && post.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {post.categories.map((cat) => (
              <Badge key={cat.id} variant="secondary" className="text-xs">
                {cat.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Title */}
        <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h2>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-muted-foreground mb-4 line-clamp-3">
            {post.excerpt}
          </p>
        )}
      </Link>

      {/* Meta */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {post.author && (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">{authorInitial}</AvatarFallback>
            </Avatar>
            <span>{post.author.display_name}</span>
          </div>
        )}
        {post.published_at && (
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <time dateTime={post.published_at}>
              {format(new Date(post.published_at), "MMM d, yyyy")}
            </time>
          </div>
        )}
      </div>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {post.tags.map((tag) => (
            <Link key={tag.id} to={`/blog/tag/${tag.slug}`}>
              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
                #{tag.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
