-- Exact equality on share_token (no btrim) — matches URL path segment 1:1.
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
