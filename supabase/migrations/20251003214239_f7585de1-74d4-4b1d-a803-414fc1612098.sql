-- Add archived column to partners table
ALTER TABLE public.partners 
ADD COLUMN archived boolean NOT NULL DEFAULT false;