
-- Attach enqueue_moment_sync trigger to moments table
CREATE TRIGGER trg_enqueue_moment_sync
AFTER INSERT OR UPDATE OR DELETE ON public.moments
FOR EACH ROW EXECUTE FUNCTION public.enqueue_moment_sync();

-- Attach enqueue_partner_sync trigger to partners table
CREATE TRIGGER trg_enqueue_partner_sync
AFTER INSERT OR UPDATE OR DELETE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.enqueue_partner_sync();
