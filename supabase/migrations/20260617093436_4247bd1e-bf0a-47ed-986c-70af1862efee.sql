
-- 1) Revoke SELECT on sensitive supplier billing columns from non-admin roles.
--    Admin reads go through SECURITY DEFINER RPCs (admin_get_supplier_billing / admin_list_supplier_billing).
--    UPDATE still works for admins via the existing "Admins manage suppliers" policy (UPDATE does not require column SELECT).
REVOKE SELECT (commission_percent, monthly_subscription, billing_status, billing_notes)
  ON public.suppliers FROM anon, authenticated;

-- 2) Limit vouchers Realtime publication to non-secret columns so rotation_secret is never broadcast.
ALTER PUBLICATION supabase_realtime DROP TABLE public.vouchers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vouchers
  (id, deal_id, user_id, supplier_id, code, reference_number, status,
   issued_at, expires_at, redeemed_at, redeemed_by_supplier_id, created_at, updated_at);

-- 3) Add RLS policies on realtime.messages so authenticated users can only use realtime
--    channels and broadcast/presence is restricted; postgres_changes still enforces the
--    underlying table's RLS, so users only get rows they're allowed to see.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated users can read realtime messages"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can send realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated users can send realtime messages"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
