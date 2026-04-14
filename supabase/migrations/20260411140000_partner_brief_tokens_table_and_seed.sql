-- Partner brief share links (?token=) — used by /partner-brief (PartnerBrief.tsx).
-- Apply with: supabase db push   OR paste into Supabase Dashboard → SQL Editor.

CREATE TABLE IF NOT EXISTS public.partner_brief_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  partner_name text,
  partner_first_name text,
  call_count integer NOT NULL DEFAULT 0,
  max_calls integer NOT NULL DEFAULT 100,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.partner_brief_tokens ENABLE ROW LEVEL SECURITY;

-- Anon must read rows to validate ?token= (opaque tokens only).
DROP POLICY IF EXISTS "partner_brief_tokens_anon_select" ON public.partner_brief_tokens;
CREATE POLICY "partner_brief_tokens_anon_select"
  ON public.partner_brief_tokens
  FOR SELECT
  TO anon
  USING (true);

-- Chris — share URL uses token below
INSERT INTO public.partner_brief_tokens (
  token,
  partner_name,
  partner_first_name,
  call_count,
  max_calls,
  is_active
) VALUES (
  'b91e5e41108492897140e0fec1fdbec1',
  'Chris',
  'Chris',
  0,
  99999,
  true
) ON CONFLICT (token) DO UPDATE SET
  partner_name = EXCLUDED.partner_name,
  partner_first_name = EXCLUDED.partner_first_name,
  max_calls = EXCLUDED.max_calls,
  is_active = EXCLUDED.is_active;

-- Will — share URL uses token below
INSERT INTO public.partner_brief_tokens (
  token,
  partner_name,
  partner_first_name,
  call_count,
  max_calls,
  is_active
) VALUES (
  'a954306bb3e9a4fc21e11ca678fd2598',
  'Will',
  'Will',
  0,
  99999,
  true
) ON CONFLICT (token) DO UPDATE SET
  partner_name = EXCLUDED.partner_name,
  partner_first_name = EXCLUDED.partner_first_name,
  max_calls = EXCLUDED.max_calls,
  is_active = EXCLUDED.is_active;
