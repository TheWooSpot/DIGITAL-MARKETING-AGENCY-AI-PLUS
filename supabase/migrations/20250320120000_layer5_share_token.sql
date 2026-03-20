-- Run in Supabase SQL editor if migrations are not applied via CLI.
-- Shareable diagnostic report links (Door b1).

ALTER TABLE layer5_prospects
ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_share_token ON layer5_prospects(share_token);

-- Safe read for anon: one row by token only (SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.get_prospect_by_share_token(p_token text)
RETURNS SETOF layer5_prospects
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM layer5_prospects
  WHERE share_token IS NOT NULL
    AND share_token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_prospect_by_share_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_prospect_by_share_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_prospect_by_share_token(text) TO authenticated;
