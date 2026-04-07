-- Door 5 Calculator — anon may INSERT into layer5_prospects when source = door5-calculator.
-- Depends on: notes + source columns (see 20260405180000_door4_ai_iq_assessment.sql).

DROP POLICY IF EXISTS "layer5_prospects_insert_door5_calculator" ON public.layer5_prospects;
CREATE POLICY "layer5_prospects_insert_door5_calculator"
  ON public.layer5_prospects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    coalesce(source, '') = 'door5-calculator'
    AND email IS NOT NULL
    AND length(trim(email)) > 3
  );
