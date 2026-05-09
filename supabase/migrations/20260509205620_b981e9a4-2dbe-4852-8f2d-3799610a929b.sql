ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS offers_services boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offers_products boolean NOT NULL DEFAULT false;

-- Backfill from existing supplier_kind so we don't lose data
UPDATE public.suppliers SET offers_services = true  WHERE supplier_kind = 'service' AND offers_services = false;
UPDATE public.suppliers SET offers_products = true  WHERE supplier_kind = 'product' AND offers_products = false;