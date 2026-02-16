
-- =============================================================
-- Cherishly Sync Schema: align with Temerio canonical model
-- =============================================================

-- 1. Add person_uid to partners (Cherishly's "people" equivalent)
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS person_uid uuid UNIQUE DEFAULT gen_random_uuid();
UPDATE public.partners SET person_uid = gen_random_uuid() WHERE person_uid IS NULL;
ALTER TABLE public.partners ALTER COLUMN person_uid SET NOT NULL;

-- 2. Add moment_uid to moments
ALTER TABLE public.moments
  ADD COLUMN IF NOT EXISTS moment_uid uuid UNIQUE DEFAULT gen_random_uuid();
UPDATE public.moments SET moment_uid = gen_random_uuid() WHERE moment_uid IS NULL;
ALTER TABLE public.moments ALTER COLUMN moment_uid SET NOT NULL;

-- 3. Add impact_level (1-4, default 2 = Noticeable)
ALTER TABLE public.moments
  ADD COLUMN IF NOT EXISTS impact_level integer NOT NULL DEFAULT 2;
ALTER TABLE public.moments ADD CONSTRAINT moments_impact_level_check CHECK (impact_level BETWEEN 1 AND 4);

-- 4. Add attachments jsonb array
ALTER TABLE public.moments
  ADD COLUMN IF NOT EXISTS attachments jsonb;

-- 5. Add deleted_at tombstone
ALTER TABLE public.moments
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 6. Add happened_at timestamptz (derived from moment_date for compat)
ALTER TABLE public.moments
  ADD COLUMN IF NOT EXISTS happened_at timestamptz;
UPDATE public.moments SET happened_at = moment_date::timestamptz WHERE happened_at IS NULL;

-- 7. Add source column for tracking origin
ALTER TABLE public.moments
  ADD COLUMN IF NOT EXISTS source text;

-- =============================================================
-- Sync tables (matching Temerio exactly)
-- =============================================================

-- sync_connections
CREATE TABLE public.sync_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  remote_app text NOT NULL CHECK (remote_app IN ('cherishly', 'temerio')),
  remote_base_url text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  shared_secret_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sync_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sync connections" ON public.sync_connections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- sync_pairing_codes
CREATE TABLE public.sync_pairing_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sync_pairing_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pairing codes" ON public.sync_pairing_codes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- sync_person_links (references partners instead of people)
CREATE TABLE public.sync_person_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.sync_connections(id) ON DELETE CASCADE,
  local_person_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  remote_person_uid uuid NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sync_person_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own person links" ON public.sync_person_links FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- sync_outbox
CREATE TABLE public.sync_outbox (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.sync_connections(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('person', 'moment')),
  entity_uid uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('upsert', 'delete')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  delivery_attempts integer NOT NULL DEFAULT 0
);
ALTER TABLE public.sync_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own outbox" ON public.sync_outbox FOR SELECT USING (auth.uid() = user_id);

-- sync_cursors
CREATE TABLE public.sync_cursors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.sync_connections(id) ON DELETE CASCADE,
  last_pulled_outbox_id bigint NOT NULL DEFAULT 0,
  last_pushed_outbox_id bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connection_id)
);
ALTER TABLE public.sync_cursors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cursors" ON public.sync_cursors FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- sync_conflicts
CREATE TABLE public.sync_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.sync_connections(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_uid uuid NOT NULL,
  local_payload jsonb NOT NULL,
  remote_payload jsonb NOT NULL,
  resolved_at timestamptz,
  resolution text CHECK (resolution IN ('local', 'remote')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own conflicts" ON public.sync_conflicts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- Updated_at triggers for sync tables
-- =============================================================
CREATE TRIGGER update_sync_connections_updated_at BEFORE UPDATE ON public.sync_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sync_person_links_updated_at BEFORE UPDATE ON public.sync_person_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sync_cursors_updated_at BEFORE UPDATE ON public.sync_cursors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- Outbox trigger: enqueue sync events on moment changes
-- =============================================================
CREATE OR REPLACE FUNCTION public.enqueue_moment_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conn RECORD;
  _partner_id uuid;
  _op text;
BEGIN
  -- Determine operation
  IF TG_OP = 'DELETE' THEN
    _op := 'delete';
  ELSIF NEW.deleted_at IS NOT NULL AND (OLD.deleted_at IS NULL OR TG_OP = 'INSERT') THEN
    _op := 'delete';
  ELSE
    _op := 'upsert';
  END IF;

  -- Get the relevant row
  IF TG_OP = 'DELETE' THEN
    _partner_id := NULL; -- can't determine from deleted row easily
  ELSE
    -- Get first partner_id from partner_ids array
    IF NEW.partner_ids IS NOT NULL AND array_length(NEW.partner_ids, 1) > 0 THEN
      _partner_id := NEW.partner_ids[1];
    END IF;
  END IF;

  -- For each active sync connection, check if person is linked and enqueue
  FOR _conn IN
    SELECT sc.id AS connection_id, spl.remote_person_uid
    FROM sync_connections sc
    JOIN sync_person_links spl ON spl.connection_id = sc.id AND spl.is_enabled = true
    WHERE sc.user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND sc.status = 'active'
      AND spl.local_person_id = _partner_id
  LOOP
    INSERT INTO sync_outbox (user_id, connection_id, entity_type, entity_uid, operation, payload)
    VALUES (
      COALESCE(NEW.user_id, OLD.user_id),
      _conn.connection_id,
      'moment',
      COALESCE(NEW.moment_uid, OLD.moment_uid),
      _op,
      CASE WHEN _op = 'delete' THEN '{}'::jsonb
      ELSE jsonb_build_object(
        'title', NEW.title,
        'description', NEW.description,
        'happened_at', COALESCE(NEW.happened_at, NEW.moment_date::timestamptz)::text,
        'impact_level', NEW.impact_level,
        'attachments', NEW.attachments,
        'event_type', NEW.event_type,
        'is_celebrated_annually', NEW.is_celebrated_annually,
        'person_uid', _conn.remote_person_uid,
        'updated_at', NEW.updated_at::text
      )
      END
    );
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER moment_sync_outbox_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.moments
FOR EACH ROW EXECUTE FUNCTION public.enqueue_moment_sync();

-- Partner changes trigger
CREATE OR REPLACE FUNCTION public.enqueue_partner_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conn RECORD;
BEGIN
  FOR _conn IN
    SELECT sc.id AS connection_id, spl.remote_person_uid
    FROM sync_connections sc
    JOIN sync_person_links spl ON spl.connection_id = sc.id AND spl.is_enabled = true
    WHERE sc.user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND sc.status = 'active'
      AND spl.local_person_id = COALESCE(NEW.id, OLD.id)
  LOOP
    INSERT INTO sync_outbox (user_id, connection_id, entity_type, entity_uid, operation, payload)
    VALUES (
      COALESCE(NEW.user_id, OLD.user_id),
      _conn.connection_id,
      'person',
      COALESCE(NEW.person_uid, OLD.person_uid),
      CASE WHEN TG_OP = 'DELETE' THEN 'delete' ELSE 'upsert' END,
      CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb
      ELSE jsonb_build_object(
        'name', NEW.name,
        'relationship_label', NEW.relationship_type,
        'updated_at', NEW.updated_at::text
      )
      END
    );
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER partner_sync_outbox_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.enqueue_partner_sync();

-- Allow service role to insert into sync_outbox (needed by triggers)
CREATE POLICY "Service can insert outbox" ON public.sync_outbox FOR INSERT WITH CHECK (true);
