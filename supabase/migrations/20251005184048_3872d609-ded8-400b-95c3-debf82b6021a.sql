-- Add relationship_type column to partners table
ALTER TABLE public.partners
ADD COLUMN relationship_type TEXT DEFAULT 'partner';

-- Remove PII columns from partners table
ALTER TABLE public.partners
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS address;