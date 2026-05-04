DROP TRIGGER IF EXISTS notify_on_deposit_change ON public.deposits;
DROP TRIGGER IF EXISTS trg_notify_deposit_change ON public.deposits;
CREATE TRIGGER trg_notify_deposit_change
AFTER INSERT OR UPDATE ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_deposit_change();