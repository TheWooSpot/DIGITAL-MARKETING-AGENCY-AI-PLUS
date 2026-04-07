-- DreamScape™ Door 13 — Vision Report email pipeline
-- dream_profile: JSON from Vapi end-of-call (vision summary, readiness, etc.)

ALTER TABLE layer5_prospects
  ADD COLUMN IF NOT EXISTS dream_report_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dream_report_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dream_profile JSONB;

COMMENT ON COLUMN layer5_prospects.dream_profile IS 'DreamScape session payload: vision summary, gaps, readiness_score, first_name, transcript snippet, etc.';
COMMENT ON COLUMN layer5_prospects.dream_report_sent IS 'Vision Report™ email successfully sent via Resend.';
COMMENT ON COLUMN layer5_prospects.dream_report_sent_at IS 'Timestamp when Vision Report™ was sent.';
