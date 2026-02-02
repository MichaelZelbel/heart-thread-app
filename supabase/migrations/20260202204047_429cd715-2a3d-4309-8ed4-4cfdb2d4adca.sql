-- Blog CMS Schema for Cherishly

-- =============================================
-- BLOG MEDIA TABLE
-- =============================================
CREATE TABLE public.blog_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  mime_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media" ON public.blog_media
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert media" ON public.blog_media
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update media" ON public.blog_media
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete media" ON public.blog_media
  FOR DELETE USING (is_admin(auth.uid()));

-- =============================================
-- BLOG CATEGORIES TABLE (hierarchical)
-- =============================================
CREATE TABLE public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON public.blog_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert categories" ON public.blog_categories
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update categories" ON public.blog_categories
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete categories" ON public.blog_categories
  FOR DELETE USING (is_admin(auth.uid()));

-- =============================================
-- BLOG TAGS TABLE
-- =============================================
CREATE TABLE public.blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tags" ON public.blog_tags
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert tags" ON public.blog_tags
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update tags" ON public.blog_tags
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete tags" ON public.blog_tags
  FOR DELETE USING (is_admin(auth.uid()));

-- =============================================
-- BLOG POSTS TABLE
-- =============================================
CREATE TYPE public.blog_post_status AS ENUM ('draft', 'published', 'scheduled');

CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT, -- markdown
  excerpt TEXT,
  status public.blog_post_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  featured_image_id UUID REFERENCES public.blog_media(id) ON DELETE SET NULL,
  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can only see published posts with published_at <= now()
CREATE POLICY "Anyone can view published posts" ON public.blog_posts
  FOR SELECT USING (
    status = 'published' AND published_at <= now()
    OR is_admin(auth.uid())
  );

CREATE POLICY "Admins can insert posts" ON public.blog_posts
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update posts" ON public.blog_posts
  FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete posts" ON public.blog_posts
  FOR DELETE USING (is_admin(auth.uid()));

-- =============================================
-- BLOG POST REVISIONS TABLE
-- =============================================
CREATE TABLE public.blog_post_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, revision_number)
);

ALTER TABLE public.blog_post_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view revisions" ON public.blog_post_revisions
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert revisions" ON public.blog_post_revisions
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete revisions" ON public.blog_post_revisions
  FOR DELETE USING (is_admin(auth.uid()));

-- =============================================
-- JUNCTION: BLOG POST CATEGORIES
-- =============================================
CREATE TABLE public.blog_post_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, category_id)
);

ALTER TABLE public.blog_post_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post categories" ON public.blog_post_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert post categories" ON public.blog_post_categories
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete post categories" ON public.blog_post_categories
  FOR DELETE USING (is_admin(auth.uid()));

-- =============================================
-- JUNCTION: BLOG POST TAGS
-- =============================================
CREATE TABLE public.blog_post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, tag_id)
);

ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post tags" ON public.blog_post_tags
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert post tags" ON public.blog_post_tags
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete post tags" ON public.blog_post_tags
  FOR DELETE USING (is_admin(auth.uid()));

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at);
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_author ON public.blog_posts(author_id);
CREATE INDEX idx_blog_categories_slug ON public.blog_categories(slug);
CREATE INDEX idx_blog_categories_parent ON public.blog_categories(parent_id);
CREATE INDEX idx_blog_tags_slug ON public.blog_tags(slug);
CREATE INDEX idx_blog_post_revisions_post ON public.blog_post_revisions(post_id);

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_categories_updated_at
  BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_tags_updated_at
  BEFORE UPDATE ON public.blog_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_media_updated_at
  BEFORE UPDATE ON public.blog_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();