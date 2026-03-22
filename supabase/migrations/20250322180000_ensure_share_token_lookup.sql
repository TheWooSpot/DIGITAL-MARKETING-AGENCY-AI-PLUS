-- Idempotent: ensure share_token column + get_prospect_by_share_token RPC (for /report/:token).
-- If you already ran 20250320120000_layer5_share_token.sql, this mainly refreshes the function + grants.
-- Run in Supabase SQL Editor if CLI migrations are not applied.

ALTER TABLE layer5_prospects
ADD COLUMN IF NOT EXISTS share_token text;

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
