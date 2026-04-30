-- Unified timeline stream for admin command center (read via Edge Function + service role).
-- AI IQ (Door 4) rows live in layer5_prospects with source = door4-ai-iq when door9_submissions is not used.

CREATE OR REPLACE VIEW public.admin_unified_event_stream AS
SELECT
  p.created_at AS stream_at,
  CASE
    WHEN COALESCE(p.source, '') = 'door4-ai-iq' THEN 'submission'::text
    ELSE 'prospect'::text
  END AS kind,
  CASE
    WHEN COALESCE(p.source, '') = 'prospect-diagnostic' THEN 'url_diagnostic'::text
    WHEN COALESCE(p.source, '') = 'door4-ai-iq' THEN 'door4_ai_iq'::text
    ELSE COALESCE(p.source, 'layer5')::text
  END AS subtype,
  COALESCE(p.business_name, 'Prospect')::text AS title_hint,
  jsonb_build_object(
    'table', 'layer5_prospects',
    'source', p.source,
    'business_name', p.business_name,
    'url', p.url,
    'overall_score', p.overall_score,
    'id', p.id
  ) AS payload,
  p.id::text AS source_row_id
FROM public.layer5_prospects p

UNION ALL

SELECT
  d.created_at AS stream_at,
  'submission'::text AS kind,
  'door3_mirror'::text AS subtype,
  COALESCE(d.name, 'Mirror')::text AS title_hint,
  jsonb_build_object(
    'table', 'door3_submissions',
    'name', d.name,
    'email', d.email,
    'url', d.url,
    'id', d.id
  ) AS payload,
  d.id::text AS source_row_id
FROM public.door3_submissions d

UNION ALL

SELECT
  v.created_at AS stream_at,
  'voice_call'::text AS kind,
  COALESCE(v.agent_name, 'voice')::text AS subtype,
  (COALESCE(v.agent_name, 'Voice') || ' · call')::text AS title_hint,
  jsonb_build_object(
    'table', 'voice_events',
    'agent_name', v.agent_name,
    'duration_seconds', v.duration_seconds,
    'outcome', v.outcome,
    'call_id', v.call_id,
    'prospect_identifier', v.prospect_identifier,
    'id', v.id
  ) AS payload,
  v.id::text AS source_row_id
FROM public.voice_events v
WHERE v.event_type = 'end-of-call-report'

UNION ALL

SELECT
  r.created_at AS stream_at,
  'roundtable'::text AS kind,
  ('session_' || r.status)::text AS subtype,
  COALESCE(r.brief_topic, 'Roundtable')::text AS title_hint,
  jsonb_build_object(
    'table', 'roundtable_sessions',
    'status', r.status,
    'brief_topic', r.brief_topic,
    'id', r.id
  ) AS payload,
  r.id::text AS source_row_id
FROM public.roundtable_sessions r;

COMMENT ON VIEW public.admin_unified_event_stream IS 'Chronological union for admin timeline (service role / Edge Functions only).';
