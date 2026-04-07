-- AI IQ v3: optional columns for door9_submissions (Edge Function door9-score).
-- Safe if table is missing (e.g. local dev without this table).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'door9_submissions'
  ) THEN
    ALTER TABLE public.door9_submissions
      ADD COLUMN IF NOT EXISTS score_team_human_readiness numeric,
      ADD COLUMN IF NOT EXISTS score_strategic_leadership numeric,
      ADD COLUMN IF NOT EXISTS organizational_context jsonb,
      ADD COLUMN IF NOT EXISTS ai_iq_schema_version integer;
  END IF;
END $$;
