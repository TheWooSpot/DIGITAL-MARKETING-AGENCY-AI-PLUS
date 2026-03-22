-- Permanent public report links: prospect UUID + report_access_key (capability URL).
-- URL shape: /report/{id}?k={report_access_key}

ALTER TABLE layer5_prospects
ADD COLUMN IF NOT EXISTS report_access_key text;

CREATE UNIQUE INDEX IF NOT EXISTS layer5_prospects_report_access_key_key
ON layer5_prospects(report_access_key)
WHERE report_access_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_prospect_by_public_access(p_id uuid, p_key text)
RETURNS SETOF layer5_prospects
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM layer5_prospects
  WHERE id = p_id
    AND report_access_key IS NOT NULL
    AND report_access_key = p_key
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_prospect_by_public_access(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_prospect_by_public_access(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_prospect_by_public_access(uuid, text) TO authenticated;
