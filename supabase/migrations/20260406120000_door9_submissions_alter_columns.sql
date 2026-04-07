-- door9_submissions: align with app / Edge — INTEGER domain scores, TEXT org_context, recommended_rung.
-- Idempotent: ADD IF NOT EXISTS, then fix types when columns already existed as numeric/jsonb.

ALTER TABLE public.door9_submissions
  ADD COLUMN IF NOT EXISTS team_human_readiness_score INTEGER,
  ADD COLUMN IF NOT EXISTS strategic_leadership_score INTEGER,
  ADD COLUMN IF NOT EXISTS org_context TEXT,
  ADD COLUMN IF NOT EXISTS recommended_rung INTEGER;

-- Earlier migration may have created these scores as numeric — cast to INTEGER.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'door9_submissions'
      AND column_name = 'team_human_readiness_score'
      AND udt_name = 'numeric'
  ) THEN
    ALTER TABLE public.door9_submissions
      ALTER COLUMN team_human_readiness_score TYPE INTEGER
      USING round(COALESCE(team_human_readiness_score, 0))::integer;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'door9_submissions'
      AND column_name = 'strategic_leadership_score'
      AND udt_name = 'numeric'
  ) THEN
    ALTER TABLE public.door9_submissions
      ALTER COLUMN strategic_leadership_score TYPE INTEGER
      USING round(COALESCE(strategic_leadership_score, 0))::integer;
  END IF;
END $$;

-- org_context may exist as jsonb from 20260405180000 — convert to TEXT for plain storage.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'door9_submissions'
      AND column_name = 'org_context'
      AND udt_name = 'jsonb'
  ) THEN
    ALTER TABLE public.door9_submissions
      ALTER COLUMN org_context TYPE TEXT USING (CASE WHEN org_context IS NULL THEN NULL ELSE org_context::text END);
  END IF;
END $$;
