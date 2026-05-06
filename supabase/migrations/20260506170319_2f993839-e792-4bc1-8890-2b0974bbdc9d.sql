ALTER TABLE public.supplier_catalogs
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'pdf';

ALTER TABLE public.supplier_catalogs
  DROP CONSTRAINT IF EXISTS supplier_catalogs_kind_check;

ALTER TABLE public.supplier_catalogs
  ADD CONSTRAINT supplier_catalogs_kind_check CHECK (kind IN ('pdf','link'));

-- Validation trigger to ensure URL format is correct based on kind
CREATE OR REPLACE FUNCTION public.validate_supplier_catalog()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.file_url IS NULL OR length(trim(NEW.file_url)) = 0 THEN
    RAISE EXCEPTION 'קישור הקטלוג חובה';
  END IF;
  IF NEW.kind = 'link' THEN
    IF NEW.file_url !~* '^https?://' THEN
      RAISE EXCEPTION 'קישור חייב להתחיל ב-http:// או https://';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_supplier_catalog ON public.supplier_catalogs;
CREATE TRIGGER trg_validate_supplier_catalog
BEFORE INSERT OR UPDATE ON public.supplier_catalogs
FOR EACH ROW EXECUTE FUNCTION public.validate_supplier_catalog();