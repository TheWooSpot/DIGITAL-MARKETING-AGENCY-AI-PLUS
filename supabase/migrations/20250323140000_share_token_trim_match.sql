-- Match share_token using trimmed values (client sends raw path param trimmed only).
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
    AND btrim(share_token) = btrim(p_token)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_prospect_by_share_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_prospect_by_share_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_prospect_by_share_token(text) TO authenticated;
