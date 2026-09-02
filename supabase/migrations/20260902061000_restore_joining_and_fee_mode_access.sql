-- Recover from an accidentally enabled global maintenance mode.
-- Per-deal fee overrides only apply while the global master mode is enabled.
UPDATE public.system_settings
SET participation_fee_mode = 'enabled',
    updated_at = now()
WHERE participation_fee_mode = 'maintenance';

GRANT EXECUTE ON FUNCTION public.get_participation_fee_mode()
TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_effective_participation_fee_mode(uuid)
TO anon, authenticated, service_role;
