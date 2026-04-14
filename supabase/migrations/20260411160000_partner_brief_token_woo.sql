-- Woo — partner brief share link (?token=)
INSERT INTO public.partner_brief_tokens (
  token,
  partner_name,
  partner_first_name,
  call_count,
  max_calls,
  is_active
) VALUES (
  'bfd7e7bc176b91c7fb78a42ca672dc3a',
  'Woo',
  'Woo',
  0,
  99999,
  true
) ON CONFLICT (token) DO UPDATE SET
  partner_name = EXCLUDED.partner_name,
  partner_first_name = EXCLUDED.partner_first_name,
  max_calls = EXCLUDED.max_calls,
  is_active = EXCLUDED.is_active;
