ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS supplier_kind text;

ALTER TABLE public.suppliers
DROP CONSTRAINT IF EXISTS suppliers_supplier_kind_check;

ALTER TABLE public.suppliers
ADD CONSTRAINT suppliers_supplier_kind_check
CHECK (supplier_kind IS NULL OR supplier_kind IN ('service','product'));

CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_kind ON public.suppliers(supplier_kind);