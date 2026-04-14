-- AnyDoor doors: five-stage status (planned | discovery | building | beta | live).
-- D-2 · The Mirror = engineering Door B1 URL diagnostic. Skips if `anydoor_doors` missing.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'anydoor_doors'
  ) THEN
    RETURN;
  END IF;

  UPDATE public.anydoor_doors SET
    status = 'live',
    cta_label = 'Run free diagnostic',
    cta_route = '/diagnostic',
    updated_at = NOW()
  WHERE door_id = 'D-2';

  UPDATE public.anydoor_doors SET
    status = 'discovery',
    updated_at = NOW()
  WHERE door_id = 'D-1';

  UPDATE public.anydoor_doors SET
    status = 'beta',
    cta_label = 'Start discovery',
    cta_route = '/self-discovery',
    updated_at = NOW()
  WHERE door_id = 'D-3';

  UPDATE public.anydoor_doors SET status = 'live', updated_at = NOW() WHERE door_id = 'D-4';
  UPDATE public.anydoor_doors SET status = 'live', updated_at = NOW() WHERE door_id = 'D-5';
  UPDATE public.anydoor_doors SET status = 'building', updated_at = NOW() WHERE door_id = 'D-6';
  UPDATE public.anydoor_doors SET status = 'live', updated_at = NOW() WHERE door_id = 'D-7';
  UPDATE public.anydoor_doors SET status = 'planned', updated_at = NOW() WHERE door_id IN ('D-8', 'D-9');
END $$;

-- Optional copy columns (only if present — avoids migration failure on older schemas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'anydoor_doors'
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'anydoor_doors' AND column_name = 'name'
  ) THEN
    UPDATE public.anydoor_doors SET name = 'The Mirror' WHERE door_id = 'D-2';
    UPDATE public.anydoor_doors SET name = 'The Self-Discovery' WHERE door_id = 'D-3';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'anydoor_doors' AND column_name = 'description'
  ) THEN
    UPDATE public.anydoor_doors SET
      description = 'Paste your URL. See how visible, credible, and conversion-ready your digital presence really is — engineering id: Door B1.'
    WHERE door_id = 'D-2';
    UPDATE public.anydoor_doors SET
      description = 'Seven open answers — then a reflection of what you actually said, not what you meant to say.'
    WHERE door_id = 'D-3';
  END IF;
END $$;
