CREATE TABLE IF NOT EXISTS voice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id text UNIQUE NOT NULL,
  agent_name text NOT NULL,
  vapi_assistant_id text NOT NULL,
  event_type text NOT NULL,
  prospect_identifier text,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  transcript text,
  summary text,
  outcome text,
  raw_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_events_agent ON voice_events(agent_name);
CREATE INDEX IF NOT EXISTS idx_voice_events_created ON voice_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_events_call_id ON voice_events(call_id);

ALTER TABLE voice_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_insert" ON voice_events 
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "service_role_read" ON voice_events 
  FOR SELECT TO service_role USING (true);
