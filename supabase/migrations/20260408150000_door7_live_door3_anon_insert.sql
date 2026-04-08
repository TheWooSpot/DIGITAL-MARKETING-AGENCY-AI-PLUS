-- Door 7 — DreamScape™: live on platform + Supabase anydoor_doors
UPDATE public.anydoor_doors
SET
  cta_route = '/dream',
  status = 'live',
  completion_pct = 75,
  updated_at = NOW()
WHERE door_id = 'D-7';

-- Door 3 — optional direct anon inserts (Edge Function continues to use service role)
GRANT INSERT ON public.door3_submissions TO anon;

DROP POLICY IF EXISTS "anon_insert_door3" ON public.door3_submissions;
CREATE POLICY "anon_insert_door3"
  ON public.door3_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);
