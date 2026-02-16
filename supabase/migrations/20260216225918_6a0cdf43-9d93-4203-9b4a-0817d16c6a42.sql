
-- 1. Add link_status enum for sync_person_links
CREATE TYPE public.sync_link_status AS ENUM ('linked', 'pending', 'excluded', 'conflict');

-- 2. Add link_status column to sync_person_links (default 'linked' for backward compat)
ALTER TABLE public.sync_person_links 
  ADD COLUMN IF NOT EXISTS link_status public.sync_link_status NOT NULL DEFAULT 'linked';

-- 3. Add merged_into_person_id to partners for local merges
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS merged_into_person_id uuid REFERENCES public.partners(id) DEFAULT NULL;

-- 4. Add conflict_type to sync_conflicts
ALTER TABLE public.sync_conflicts
  ADD COLUMN IF NOT EXISTS conflict_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS suggested_resolution text DEFAULT NULL;

-- 5. Create sync_person_candidates table (name-based suggestions only, never auto-matched)
CREATE TABLE public.sync_person_candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.sync_connections(id) ON DELETE CASCADE,
  remote_person_uid uuid NOT NULL,
  remote_person_name text NOT NULL,
  local_person_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  confidence numeric(3,2) DEFAULT 0,
  reasons text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id, remote_person_uid)
);

ALTER TABLE public.sync_person_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own candidates"
  ON public.sync_person_candidates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Create sync_merge_log table (for merge + undo)
CREATE TABLE public.sync_merge_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  kept_person_id uuid NOT NULL REFERENCES public.partners(id),
  merged_person_id uuid NOT NULL REFERENCES public.partners(id),
  merged_person_snapshot jsonb NOT NULL DEFAULT '{}',
  merged_links_snapshot jsonb NOT NULL DEFAULT '[]',
  merged_moments_snapshot jsonb NOT NULL DEFAULT '[]',
  undone_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_merge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own merge logs"
  ON public.sync_merge_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Index for performance
CREATE INDEX IF NOT EXISTS idx_sync_person_candidates_conn ON public.sync_person_candidates(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_merge_log_user ON public.sync_merge_log(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_merged_into ON public.partners(merged_into_person_id) WHERE merged_into_person_id IS NOT NULL;
