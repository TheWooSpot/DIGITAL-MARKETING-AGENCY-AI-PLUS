-- AI IQ™ Door 4 — question bank + submissions (browser anon key)
-- Idempotent: safe to re-run.

-- ---------------------------------------------------------------------------
-- Questions: long format (4 rows per question). score 0 = unscored (AIQ22).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.door9_ai_iq_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id text NOT NULL,
  domain text NOT NULL,
  question text NOT NULL,
  option text NOT NULL,
  score numeric NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_door9_ai_iq_questions_qid
  ON public.door9_ai_iq_questions (question_id);

COMMENT ON TABLE public.door9_ai_iq_questions IS 'AI IQ v3 bank: app groups by question_id; 4 options per question.';

ALTER TABLE public.door9_ai_iq_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "door9_ai_iq_questions_select_anon" ON public.door9_ai_iq_questions;
CREATE POLICY "door9_ai_iq_questions_select_anon"
  ON public.door9_ai_iq_questions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- Submissions: create shell then add columns (works if table already existed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.door9_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.door9_submissions ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.door9_submissions ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.door9_submissions ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.door9_submissions ADD COLUMN IF NOT EXISTS total_score numeric;
ALTER TABLE public.door9_submissions ADD COLUMN IF NOT EXISTS org_context jsonb;
ALTER TABLE public.door9_submissions ADD COLUMN IF NOT EXISTS deployment_depth_score numeric;
ALTER TABLE public.door9_submissions ADD COLUMN IF NOT EXISTS integration_maturity_score numeric;
ALTER TABLE public.door9_submissions ADD COLUMN IF NOT EXISTS revenue_alignment_score numeric;
ALTER TABLE public.door9_submissions ADD COLUMN IF NOT EXISTS automation_orchestration_score numeric;
ALTER TABLE public.door9_submissions ADD COLUMN IF NOT EXISTS oversight_awareness_score numeric;
ALTER TABLE public.door9_submissions ADD COLUMN IF NOT EXISTS team_human_readiness_score numeric;
ALTER TABLE public.door9_submissions ADD COLUMN IF NOT EXISTS strategic_leadership_score numeric;
ALTER TABLE public.door9_submissions ADD COLUMN IF NOT EXISTS recommended_rung integer;
ALTER TABLE public.door9_submissions ADD COLUMN IF NOT EXISTS source text DEFAULT 'door4-ai-iq';

CREATE INDEX IF NOT EXISTS idx_door9_submissions_email ON public.door9_submissions (email);
CREATE INDEX IF NOT EXISTS idx_door9_submissions_created ON public.door9_submissions (created_at DESC);

ALTER TABLE public.door9_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "door9_submissions_insert_anon" ON public.door9_submissions;
CREATE POLICY "door9_submissions_insert_anon"
  ON public.door9_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- layer5_prospects: notes + anon insert for Door 4 funnel
-- ---------------------------------------------------------------------------
ALTER TABLE public.layer5_prospects
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.layer5_prospects
  ADD COLUMN IF NOT EXISTS source text;

DROP POLICY IF EXISTS "layer5_prospects_insert_door4_ai_iq" ON public.layer5_prospects;
CREATE POLICY "layer5_prospects_insert_door4_ai_iq"
  ON public.layer5_prospects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    coalesce(source, '') = 'door4-ai-iq'
    AND email IS NOT NULL
    AND length(trim(email)) > 3
  );
