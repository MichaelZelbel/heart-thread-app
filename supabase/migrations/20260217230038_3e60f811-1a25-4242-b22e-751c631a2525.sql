-- Allow local_person_id to be null for excluded links (no local person exists)
ALTER TABLE public.sync_person_links ALTER COLUMN local_person_id DROP NOT NULL;

-- Drop the existing foreign key constraint
ALTER TABLE public.sync_person_links DROP CONSTRAINT sync_person_links_local_person_id_fkey;

-- Re-add it allowing null
ALTER TABLE public.sync_person_links ADD CONSTRAINT sync_person_links_local_person_id_fkey 
  FOREIGN KEY (local_person_id) REFERENCES public.partners(id) ON DELETE SET NULL;