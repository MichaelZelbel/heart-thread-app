-- =============================================
-- DROP EXISTING BLOG POLICIES
-- =============================================

-- blog_posts
DROP POLICY IF EXISTS "Anyone can view published posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can insert posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can update posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON public.blog_posts;

-- blog_post_revisions
DROP POLICY IF EXISTS "Admins can view revisions" ON public.blog_post_revisions;
DROP POLICY IF EXISTS "Admins can insert revisions" ON public.blog_post_revisions;
DROP POLICY IF EXISTS "Admins can delete revisions" ON public.blog_post_revisions;

-- blog_categories (keep as-is, already correct)
-- blog_tags (keep as-is, already correct)
-- blog_media (keep as-is, already correct)
-- blog_post_categories / blog_post_tags need author access

DROP POLICY IF EXISTS "Anyone can view post categories" ON public.blog_post_categories;
DROP POLICY IF EXISTS "Admins can insert post categories" ON public.blog_post_categories;
DROP POLICY IF EXISTS "Admins can delete post categories" ON public.blog_post_categories;

DROP POLICY IF EXISTS "Anyone can view post tags" ON public.blog_post_tags;
DROP POLICY IF EXISTS "Admins can insert post tags" ON public.blog_post_tags;
DROP POLICY IF EXISTS "Admins can delete post tags" ON public.blog_post_tags;

-- =============================================
-- BLOG_POSTS RLS POLICIES
-- =============================================

-- Public read for published content
CREATE POLICY "Public can view published posts"
ON public.blog_posts FOR SELECT
USING (status = 'published' AND published_at <= now());

-- Admin full access (all operations)
CREATE POLICY "Admins have full access to posts"
ON public.blog_posts FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Authors can view their own posts (any status)
CREATE POLICY "Authors can view their own posts"
ON public.blog_posts FOR SELECT
USING (auth.uid() = author_id);

-- Authors can create posts (as drafts by default)
CREATE POLICY "Authors can create posts"
ON public.blog_posts FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- Authors can update their own drafts only
CREATE POLICY "Authors can update their drafts"
ON public.blog_posts FOR UPDATE
USING (auth.uid() = author_id AND status = 'draft')
WITH CHECK (auth.uid() = author_id AND status = 'draft');

-- Authors can delete their own drafts only
CREATE POLICY "Authors can delete their drafts"
ON public.blog_posts FOR DELETE
USING (auth.uid() = author_id AND status = 'draft');

-- =============================================
-- BLOG_POST_REVISIONS RLS POLICIES
-- =============================================

-- Admins can view all revisions
CREATE POLICY "Admins can view all revisions"
ON public.blog_post_revisions FOR SELECT
USING (is_admin(auth.uid()));

-- Authors can view revisions of their own posts
CREATE POLICY "Authors can view their post revisions"
ON public.blog_post_revisions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.blog_posts
    WHERE blog_posts.id = blog_post_revisions.post_id
    AND blog_posts.author_id = auth.uid()
  )
);

-- Admins can insert revisions
CREATE POLICY "Admins can insert revisions"
ON public.blog_post_revisions FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Authors can insert revisions for their own posts
CREATE POLICY "Authors can insert revisions for their posts"
ON public.blog_post_revisions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.blog_posts
    WHERE blog_posts.id = blog_post_revisions.post_id
    AND blog_posts.author_id = auth.uid()
  )
);

-- Only admins can delete revisions
CREATE POLICY "Admins can delete revisions"
ON public.blog_post_revisions FOR DELETE
USING (is_admin(auth.uid()));

-- =============================================
-- BLOG_POST_CATEGORIES RLS POLICIES
-- =============================================

-- Anyone can view post-category relationships (needed for public display)
CREATE POLICY "Anyone can view post categories"
ON public.blog_post_categories FOR SELECT
USING (true);

-- Admins can manage all post categories
CREATE POLICY "Admins can manage post categories"
ON public.blog_post_categories FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Authors can manage categories for their own draft posts
CREATE POLICY "Authors can manage categories for their drafts"
ON public.blog_post_categories FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.blog_posts
    WHERE blog_posts.id = blog_post_categories.post_id
    AND blog_posts.author_id = auth.uid()
    AND blog_posts.status = 'draft'
  )
);

CREATE POLICY "Authors can delete categories from their drafts"
ON public.blog_post_categories FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.blog_posts
    WHERE blog_posts.id = blog_post_categories.post_id
    AND blog_posts.author_id = auth.uid()
    AND blog_posts.status = 'draft'
  )
);

-- =============================================
-- BLOG_POST_TAGS RLS POLICIES
-- =============================================

-- Anyone can view post-tag relationships (needed for public display)
CREATE POLICY "Anyone can view post tags"
ON public.blog_post_tags FOR SELECT
USING (true);

-- Admins can manage all post tags
CREATE POLICY "Admins can manage post tags"
ON public.blog_post_tags FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Authors can manage tags for their own draft posts
CREATE POLICY "Authors can manage tags for their drafts"
ON public.blog_post_tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.blog_posts
    WHERE blog_posts.id = blog_post_tags.post_id
    AND blog_posts.author_id = auth.uid()
    AND blog_posts.status = 'draft'
  )
);

CREATE POLICY "Authors can delete tags from their drafts"
ON public.blog_post_tags FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.blog_posts
    WHERE blog_posts.id = blog_post_tags.post_id
    AND blog_posts.author_id = auth.uid()
    AND blog_posts.status = 'draft'
  )
);