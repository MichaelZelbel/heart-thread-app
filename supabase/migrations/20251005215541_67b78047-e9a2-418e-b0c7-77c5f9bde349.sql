-- Add gender identity and country columns to partners table
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS gender_identity TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;