-- Canonical surface names for share_grants and admin validation.
-- Keep in sync with src/lib/adminCampaignSurfaces.ts and admin-send-invitations.

DROP FUNCTION IF EXISTS public.validate_surface_name(text);

CREATE OR REPLACE FUNCTION public.validate_surface_name(p_surface text)
RETURNS TABLE (valid boolean, reason text)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p_surface IS NULL OR btrim(p_surface) = '' THEN
    RETURN QUERY SELECT false, 'empty'::text;
    RETURN;
  END IF;

  IF p_surface IN (
    'partner_brief_labs',
    'roundtable_calendar',
    'door_2_lens',
    'door_4_compass',
    'door_7_architect'
  ) THEN
    RETURN QUERY SELECT true, NULL::text;
  ELSE
    RETURN QUERY SELECT false, 'unknown_surface'::text;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_surface_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_surface_name(text) TO service_role;

COMMENT ON FUNCTION public.validate_surface_name(text) IS
  'Returns whether p_surface is a grantable canonical surface name.';
