import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const cacheHeaders = {
  "Cache-Control": "public, max-age=60, s-maxage=300",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  
  // Remove 'blog-api' from path
  const apiIndex = pathParts.indexOf("blog-api");
  const resourcePath = pathParts.slice(apiIndex + 1);

  try {
    // Route handling
    if (resourcePath[0] === "posts") {
      if (resourcePath[1]) {
        // GET /posts/:slug
        return await getPostBySlug(supabase, resourcePath[1]);
      } else {
        // GET /posts
        return await listPosts(supabase, url.searchParams);
      }
    } else if (resourcePath[0] === "categories") {
      // GET /categories
      return await listCategories(supabase);
    } else if (resourcePath[0] === "tags") {
      // GET /tags
      return await listTags(supabase);
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Blog API error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(status === 200 ? cacheHeaders : {}),
    },
  });
}

async function listPosts(supabase: any, params: URLSearchParams) {
  const limit = Math.min(parseInt(params.get("limit") || "10"), 100);
  const offset = parseInt(params.get("offset") || "0");
  const categorySlug = params.get("category");
  const tagSlug = params.get("tag");

  let postIds: string[] | null = null;

  // Filter by category if provided
  if (categorySlug) {
    const { data: category } = await supabase
      .from("blog_categories")
      .select("id")
      .eq("slug", categorySlug)
      .single();

    if (!category) {
      return jsonResponse({ error: "Category not found" }, 404);
    }

    const { data: postCats } = await supabase
      .from("blog_post_categories")
      .select("post_id")
      .eq("category_id", category.id);

    postIds = postCats?.map((pc: any) => pc.post_id) || [];
  }

  // Filter by tag if provided
  if (tagSlug) {
    const { data: tag } = await supabase
      .from("blog_tags")
      .select("id")
      .eq("slug", tagSlug)
      .single();

    if (!tag) {
      return jsonResponse({ error: "Tag not found" }, 404);
    }

    const { data: postTags } = await supabase
      .from("blog_post_tags")
      .select("post_id")
      .eq("tag_id", tag.id);

    const tagPostIds = postTags?.map((pt: any) => pt.post_id) || [];
    
    // Intersect with category filter if both are present
    if (postIds !== null) {
      postIds = postIds.filter((id) => tagPostIds.includes(id));
    } else {
      postIds = tagPostIds;
    }
  }

  // Build query
  let query = supabase
    .from("blog_posts")
    .select(
      `
      id,
      title,
      slug,
      excerpt,
      published_at,
      featured_image_id,
      author_id
    `,
      { count: "exact" }
    )
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (postIds !== null) {
    if (postIds.length === 0) {
      return jsonResponse({
        posts: [],
        pagination: { total: 0, limit, offset },
      });
    }
    query = query.in("id", postIds);
  }

  const { data: posts, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching posts:", error);
    return jsonResponse({ error: "Failed to fetch posts" }, 500);
  }

  // Enrich posts with related data
  const enrichedPosts = await Promise.all(
    (posts || []).map((post: any) => enrichPost(supabase, post))
  );

  return jsonResponse({
    posts: enrichedPosts,
    pagination: {
      total: count || 0,
      limit,
      offset,
    },
  });
}

async function getPostBySlug(supabase: any, slug: string) {
  const { data: post, error } = await supabase
    .from("blog_posts")
    .select(
      `
      id,
      title,
      slug,
      content,
      excerpt,
      published_at,
      featured_image_id,
      author_id,
      seo_title,
      seo_description,
      og_image_url
    `
    )
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .single();

  if (error || !post) {
    return jsonResponse({ error: "Post not found" }, 404);
  }

  const enrichedPost = await enrichPost(supabase, post, true);

  return jsonResponse({ post: enrichedPost });
}

async function enrichPost(supabase: any, post: any, includeContent = false) {
  const result: any = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    published_at: post.published_at,
  };

  if (includeContent) {
    result.content = post.content;
    result.seo_title = post.seo_title;
    result.seo_description = post.seo_description;
    result.og_image_url = post.og_image_url;
  }

  // Get author
  if (post.author_id) {
    const { data: author } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("id", post.author_id)
      .single();

    result.author = author
      ? {
          id: author.id,
          display_name: author.display_name,
          avatar_url: null, // Could add avatar_url to profiles if needed
        }
      : null;
  }

  // Get featured image
  if (post.featured_image_id) {
    const { data: image } = await supabase
      .from("blog_media")
      .select("url, alt_text")
      .eq("id", post.featured_image_id)
      .single();

    result.featured_image = image || null;
  } else {
    result.featured_image = null;
  }

  // Get categories
  const { data: postCats } = await supabase
    .from("blog_post_categories")
    .select("category:blog_categories(id, name, slug)")
    .eq("post_id", post.id);

  result.categories = postCats?.map((pc: any) => pc.category).filter(Boolean) || [];

  // Get tags
  const { data: postTags } = await supabase
    .from("blog_post_tags")
    .select("tag:blog_tags(id, name, slug)")
    .eq("post_id", post.id);

  result.tags = postTags?.map((pt: any) => pt.tag).filter(Boolean) || [];

  return result;
}

async function listCategories(supabase: any) {
  const { data: categories, error } = await supabase
    .from("blog_categories")
    .select("id, name, slug, description")
    .order("name");

  if (error) {
    console.error("Error fetching categories:", error);
    return jsonResponse({ error: "Failed to fetch categories" }, 500);
  }

  // Get post counts for each category
  const categoriesWithCounts = await Promise.all(
    (categories || []).map(async (cat: any) => {
      // Count only published posts
      const { data: postCats } = await supabase
        .from("blog_post_categories")
        .select("post_id")
        .eq("category_id", cat.id);

      const postIds = postCats?.map((pc: any) => pc.post_id) || [];
      
      let postCount = 0;
      if (postIds.length > 0) {
        const { count } = await supabase
          .from("blog_posts")
          .select("id", { count: "exact", head: true })
          .in("id", postIds)
          .eq("status", "published")
          .lte("published_at", new Date().toISOString());
        postCount = count || 0;
      }

      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        post_count: postCount,
      };
    })
  );

  return jsonResponse({ categories: categoriesWithCounts });
}

async function listTags(supabase: any) {
  const { data: tags, error } = await supabase
    .from("blog_tags")
    .select("id, name, slug")
    .order("name");

  if (error) {
    console.error("Error fetching tags:", error);
    return jsonResponse({ error: "Failed to fetch tags" }, 500);
  }

  // Get post counts for each tag
  const tagsWithCounts = await Promise.all(
    (tags || []).map(async (tag: any) => {
      const { data: postTags } = await supabase
        .from("blog_post_tags")
        .select("post_id")
        .eq("tag_id", tag.id);

      const postIds = postTags?.map((pt: any) => pt.post_id) || [];
      
      let postCount = 0;
      if (postIds.length > 0) {
        const { count } = await supabase
          .from("blog_posts")
          .select("id", { count: "exact", head: true })
          .in("id", postIds)
          .eq("status", "published")
          .lte("published_at", new Date().toISOString());
        postCount = count || 0;
      }

      return {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        post_count: postCount,
      };
    })
  );

  return jsonResponse({ tags: tagsWithCounts });
}
