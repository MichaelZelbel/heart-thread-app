-- Create the storage bucket for blog media
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-media', 'blog-media', true);

-- RLS for storage: Public read access
CREATE POLICY "Public read access for blog media"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-media');

-- RLS for storage: Admin upload access
CREATE POLICY "Admin upload access for blog media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'blog-media' AND is_admin(auth.uid()));

-- RLS for storage: Admin update access
CREATE POLICY "Admin update access for blog media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'blog-media' AND is_admin(auth.uid()));

-- RLS for storage: Admin delete access
CREATE POLICY "Admin delete access for blog media"
ON storage.objects FOR DELETE
USING (bucket_id = 'blog-media' AND is_admin(auth.uid()));