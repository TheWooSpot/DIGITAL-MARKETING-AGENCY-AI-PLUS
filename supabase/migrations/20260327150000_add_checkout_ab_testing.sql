-- A/B checkout scaffold: prospect flags + central config (Socialutely AnyDoor)

-- Add A/B test tracking columns to layer5_prospects
ALTER TABLE layer5_prospects
  ADD COLUMN IF NOT EXISTS checkout_variant TEXT DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS converted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Checkout config table for variant control + auto-promote logic
CREATE TABLE IF NOT EXISTS checkout_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default config values
INSERT INTO checkout_config (config_key, config_value)
VALUES
  ('active_checkout_variant', 'A'),
  ('variant_a_label', 'dynamic_session'),
  ('variant_b_label', 'payment_link'),
  ('auto_promote_threshold', '0.65'),
  ('auto_promote_min_sessions', '20')
ON CONFLICT (config_key) DO NOTHING;

-- Public read for anon clients (Vite + useCheckoutConfig); no inserts from browser
ALTER TABLE checkout_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkout_config_select_public" ON checkout_config;
CREATE POLICY "checkout_config_select_public"
  ON checkout_config
  FOR SELECT
  USING (true);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_prospects_checkout_variant
  ON layer5_prospects(checkout_variant);

CREATE INDEX IF NOT EXISTS idx_prospects_converted
  ON layer5_prospects(converted);
