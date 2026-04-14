-- QA / verify token for partner-brief smoke test (STEP 6).
INSERT INTO public.partner_brief_tokens (
  token,
  partner_name,
  partner_first_name,
  call_count,
  max_calls,
  is_active
) VALUES (
  '32ca75ea387249ef',
  'Verify',
  'Verify',
  0,
  99999,
  true
) ON CONFLICT (token) DO UPDATE SET
  partner_name = EXCLUDED.partner_name,
  partner_first_name = EXCLUDED.partner_first_name,
  max_calls = EXCLUDED.max_calls,
  is_active = EXCLUDED.is_active;
