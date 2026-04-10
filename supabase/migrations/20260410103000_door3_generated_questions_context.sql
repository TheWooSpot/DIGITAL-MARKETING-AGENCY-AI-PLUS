ALTER TABLE public.door3_submissions
ADD COLUMN IF NOT EXISTS questions_generated jsonb;

ALTER TABLE public.door3_submissions
ADD COLUMN IF NOT EXISTS business_context jsonb;
