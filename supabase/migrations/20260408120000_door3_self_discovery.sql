-- Door 3 — The Self-Discovery: submissions table, rate-limit RPC, D-3 badge update (if table exists).

CREATE TABLE IF NOT EXISTS public.door3_submissions (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  url TEXT,
  industry TEXT,
  questions JSONB,
  responses JSONB,
  discovery_narrative TEXT,
  primary_gap TEXT,
  recommended_services JSONB,
  recommended_tier TEXT,
  next_step TEXT,
  next_step_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_door3_submissions_email ON public.door3_submissions (email);
CREATE INDEX IF NOT EXISTS idx_door3_submissions_created ON public.door3_submissions (created_at DESC);

ALTER TABLE public.door3_submissions ENABLE ROW LEVEL SECURITY;
-- No grants to anon/authenticated; Edge Functions use service_role (bypasses RLS).

CREATE OR REPLACE FUNCTION public.door3_can_start_discovery(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.layer5_prospects
    WHERE lower(trim(email)) = lower(trim(p_email))
      AND coalesce(source, '') = 'door3-self-discovery'
      AND created_at > NOW() - INTERVAL '24 hours'
  );
$$;

REVOKE ALL ON FUNCTION public.door3_can_start_discovery(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.door3_can_start_discovery(text) TO anon, authenticated;

-- Homepage metadata (skip if anydoor_doors not present in this database)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'anydoor_doors'
  ) THEN
    UPDATE public.anydoor_doors
    SET
      status = 'building',
      completion_pct = 55,
      cta_label = 'COMING SOON',
      cta_route = NULL,
      notes = 'Door3-questions + Door3-analyze Edge Functions deployed. React component built. Rate limiting active. Dynamic question generation via Claude.',
      updated_at = NOW()
    WHERE door_id = 'D-3';
  END IF;
END $$;
