-- Add is_demo flag to relevant tables for safe demo cleanup
ALTER TABLE public.waitlist_leads ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.suppliers       ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles        ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.deal_interests  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.deposits        ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_waitlist_leads_is_demo ON public.waitlist_leads(is_demo);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_demo ON public.suppliers(is_demo);
CREATE INDEX IF NOT EXISTS idx_profiles_is_demo ON public.profiles(is_demo);