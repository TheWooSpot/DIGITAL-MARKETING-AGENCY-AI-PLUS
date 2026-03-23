-- Public share links: browser uses anon key + .from('layer5_prospects').eq('share_token', ...).
-- Idempotent: safe to re-run after manual dashboard edits.

ALTER TABLE layer5_prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_select_by_share_token ON layer5_prospects;

CREATE POLICY anon_select_by_share_token ON layer5_prospects
  FOR SELECT
  TO anon
  USING (share_token IS NOT NULL);
