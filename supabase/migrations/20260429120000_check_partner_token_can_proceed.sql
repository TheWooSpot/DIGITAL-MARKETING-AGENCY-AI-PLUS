-- Gate partner surfaces: validate_partner_token + active share_grants row.
-- Requires public.validate_partner_token(..., valid boolean, at_limit boolean, ...).

CREATE TABLE IF NOT EXISTS public.share_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_token text NOT NULL,
  surface text NOT NULL,
  granted_by text,
  revoked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_grants_partner_surface_active
  ON public.share_grants (partner_token, surface)
  WHERE revoked_at IS NULL;

CREATE OR REPLACE FUNCTION public.check_partner_token_can_proceed(p_token text, p_surface text)
RETURNS TABLE (can_proceed boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid boolean;
  v_at_limit boolean;
BEGIN
  IF p_token IS NULL OR btrim(p_token) = '' THEN
    RETURN QUERY SELECT false, 'token_invalid'::text;
    RETURN;
  END IF;

  SELECT v.valid, v.at_limit
    INTO v_valid, v_at_limit
  FROM public.validate_partner_token(p_token) AS v
  LIMIT 1;

  IF v_valid IS NULL THEN
    RETURN QUERY SELECT false, 'token_invalid'::text;
    RETURN;
  END IF;

  IF v_valid IS NOT TRUE THEN
    RETURN QUERY SELECT false, 'token_inactive'::text;
    RETURN;
  END IF;

  IF v_at_limit IS TRUE THEN
    RETURN QUERY SELECT false, 'at_limit'::text;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.share_grants sg
    WHERE sg.partner_token = p_token
      AND sg.surface = p_surface
      AND sg.revoked_at IS NULL
  ) THEN
    RETURN QUERY SELECT false, 'no_grant_for_surface'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_partner_token_can_proceed(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_partner_token_can_proceed(text, text) TO authenticated;
