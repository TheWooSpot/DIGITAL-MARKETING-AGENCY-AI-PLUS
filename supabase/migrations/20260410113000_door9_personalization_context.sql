ALTER TABLE public.door9_submissions
ADD COLUMN IF NOT EXISTS business_context jsonb;

ALTER TABLE public.door9_submissions
ADD COLUMN IF NOT EXISTS personalization_applied boolean DEFAULT false;
