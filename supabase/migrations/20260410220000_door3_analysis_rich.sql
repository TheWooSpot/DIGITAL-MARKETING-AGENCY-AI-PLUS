-- Door 3 — structured analysis (per-question reflections, grace note, etc.)
ALTER TABLE public.door3_submissions
ADD COLUMN IF NOT EXISTS analysis_rich JSONB;
