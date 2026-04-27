-- Roundtable v5 — group scheduling (Cal.com-backed). brief_token references partner_brief_tokens.token (text).

CREATE TABLE IF NOT EXISTS public.roundtable_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL,
  brief_topic TEXT NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes IN (20, 40, 60, 90)),
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  consideration_hours INT NOT NULL DEFAULT 72,
  quorum_threshold INT NOT NULL DEFAULT 3,
  total_partners_invited INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'lock_pending', 'locked', 'expired', 'cancelled')),
  locked_slot_start TIMESTAMPTZ,
  locked_slot_end TIMESTAMPTZ,
  calcom_event_type_id INT,
  calcom_booking_uid TEXT,
  calcom_meeting_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT window_order CHECK (window_end > window_start)
);

CREATE INDEX IF NOT EXISTS idx_rt_sessions_status ON public.roundtable_sessions(status)
  WHERE status IN ('open', 'lock_pending');

CREATE INDEX IF NOT EXISTS idx_rt_sessions_expires ON public.roundtable_sessions(expires_at)
  WHERE status = 'open';

CREATE TABLE IF NOT EXISTS public.roundtable_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.roundtable_sessions(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL,
  partner_name TEXT NOT NULL,
  partner_email TEXT NOT NULL,
  partner_timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  brief_token TEXT NOT NULL REFERENCES public.partner_brief_tokens(token) ON DELETE CASCADE,
  invite_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (invite_status IN ('pending', 'engaged', 'completed', 'declined')),
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, partner_id),
  UNIQUE(session_id, brief_token)
);

CREATE INDEX IF NOT EXISTS idx_rt_partners_token ON public.roundtable_partners(brief_token);
CREATE INDEX IF NOT EXISTS idx_rt_partners_session ON public.roundtable_partners(session_id);

CREATE TABLE IF NOT EXISTS public.roundtable_taps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.roundtable_sessions(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL,
  slot_start_utc TIMESTAMPTZ NOT NULL,
  slot_end_utc TIMESTAMPTZ NOT NULL,
  tapped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(session_id, partner_id, slot_start_utc)
);

CREATE INDEX IF NOT EXISTS idx_rt_taps_session_slot ON public.roundtable_taps(session_id, slot_start_utc)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_rt_taps_partner ON public.roundtable_taps(session_id, partner_id)
  WHERE is_active = true;

ALTER TABLE public.roundtable_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roundtable_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roundtable_taps ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.roundtable_sessions TO service_role;
GRANT ALL ON public.roundtable_partners TO service_role;
GRANT ALL ON public.roundtable_taps TO service_role;

CREATE OR REPLACE FUNCTION public.tg_rt_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.tg_rt_sessions_set_expires()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.consideration_hours <> OLD.consideration_hours
     OR NEW.created_at <> OLD.created_at THEN
    NEW.expires_at := NEW.created_at + (NEW.consideration_hours || ' hours')::interval;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rt_sessions_updated_at ON public.roundtable_sessions;
CREATE TRIGGER trg_rt_sessions_updated_at
  BEFORE UPDATE ON public.roundtable_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_rt_sessions_updated_at();

DROP TRIGGER IF EXISTS trg_rt_sessions_set_expires ON public.roundtable_sessions;
CREATE TRIGGER trg_rt_sessions_set_expires
  BEFORE INSERT OR UPDATE OF created_at, consideration_hours
  ON public.roundtable_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_rt_sessions_set_expires();

CREATE OR REPLACE VIEW public.v_roundtable_slot_overlaps AS
SELECT
  session_id,
  slot_start_utc,
  slot_end_utc,
  COUNT(DISTINCT partner_id) AS overlap_count
FROM public.roundtable_taps
WHERE is_active = true
GROUP BY session_id, slot_start_utc, slot_end_utc;

GRANT SELECT ON public.v_roundtable_slot_overlaps TO service_role;

-- Serialize lock per session (used from Edge Functions via RPC).
CREATE OR REPLACE FUNCTION public.roundtable_advisory_xact_lock(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(87234201, hashtext(p_session_id::text));
END;
$$;

GRANT EXECUTE ON FUNCTION public.roundtable_advisory_xact_lock(uuid) TO service_role;

COMMENT ON COLUMN public.roundtable_partners.brief_token IS 'Opaque token string; matches partner_brief_tokens.token for the partner brief URL.';
